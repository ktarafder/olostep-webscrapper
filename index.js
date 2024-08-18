const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const puppeteer = require('puppeteer');
const tf = require('@tensorflow/tfjs-node'); // Correct Node.js backend
const use = require('@tensorflow-models/universal-sentence-encoder'); // Import USE model
const Data = require('./models/Schema');
const sentiment = require('sentiment'); // Import a sentiment analysis library

const app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static('index'));

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/olostep');

// Example route to scrape data and analyze
app.post('/scrape', async (req, res) => {
    const { url } = req.body;

    console.log('Received URL:', url);

    if (!url) {
        return res.status(400).json({ error: 'URL is required' });
    }

    try {
        // Launch Puppeteer and navigate to the URL
        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        const response = await page.goto(url, { timeout: 60000, waitUntil: 'networkidle2' });
        
        if (response.status() === 404) {
            console.log('Page not found (404)');
            await browser.close();
            return res.status(404).json({ error: 'Page not found (404)' });
        } 
        
        // Scrape the data if the page is successfully loaded
        const scrapedData = await page.evaluate(() => {
            return {
                title: document.title,
                content: document.body.innerText,
            };
        });

        console.log('Scraped Data:', scrapedData);

        await browser.close();

        // Analyze data with Universal Sentence Encoder (USE)
        const model = await use.load();
        const embeddings = await model.embed([scrapedData.content]);

        // Content Type Categorization (Simple heuristic-based)
        const contentType = determineContentType(scrapedData);

        // Topic/Subject Categorization (using embeddings and additional models or APIs)
        const topic = await categorizeByTopic(embeddings);

        // Sentiment Analysis
        const sentimentResult = analyzeSentiment(scrapedData.content);

        // Save data and analysis to MongoDB
        const newData = new Data({
            url,
            scrapedData,
            analysis: embeddings.arraySync()[0],
            contentType,
            topic,
            sentiment: sentimentResult,
        });
        await newData.save();

        // Send the result back to the client
        res.json({
            scrapedData,
            contentType,
            topic,
            sentiment: sentimentResult,
        });
    } catch (error) {
        console.error('Error during processing.', error);
        res.status(500).json('An error occurred. Please check your URL!');
    }
});

// Start the server
app.listen(3000, () => {
    console.log('Server is running on http://localhost:3000');
});

// Helper function to determine content type
function determineContentType(scrapedData) {
    const { title, content } = scrapedData;
    if (title.toLowerCase().includes('blog')) {
        return 'Blog Post';
    } else if (title.toLowerCase().includes('product')) {
        return 'Product Page';
    } else if (content.length > 2000) {
        return 'Long-form Article';
    } else {
        return 'General Web Page';
    }
}

// Helper function to categorize by topic
async function categorizeByTopic(embeddings) {
    if (embeddings.length === 0) {
        return 'General';
    }
    return 'General';
}

// Helper function to analyze sentiment
function analyzeSentiment(content) {
    const sentimentAnalyzer = new sentiment();
    const result = sentimentAnalyzer.analyze(content);
    return result.score > 0 ? 'Positive' : result.score < 0 ? 'Negative' : 'Neutral';
}
