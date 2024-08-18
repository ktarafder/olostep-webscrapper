const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const puppeteer = require('puppeteer');
const tf = require('@tensorflow/tfjs-node');
const use = require('@tensorflow-models/universal-sentence-encoder');
const Data = require('./models/Schema');
const sentiment = require('sentiment');
const { JSDOM } = require('jsdom');
const Readability = require('@mozilla/readability').Readability;  // Use Mozilla's Readability
const routes = require('./routes/olostep');

const app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static('index'));
app.use("/api", routes);

mongoose.connect('mongodb://localhost:27017/olostep');

app.post('/scrape', async (req, res) => {
    const { url } = req.body;

    console.log('Received URL:', url);

    if (!url) {
        return res.status(400).json({ error: 'URL is required' });
    }

    try {
        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        const response = await page.goto(url, { timeout: 60000, waitUntil: 'networkidle2' });
        
        if (response.status() === 404) {
            console.log('Page not found (404)');
            await browser.close();
            return res.status(404).json({ error: 'Page not found (404)' });
        }

        // Get the HTML content of the page
        const htmlContent = await page.content();
        await browser.close();

        // Use JSDOM to parse the HTML and then use Mozilla's Readability
        const dom = new JSDOM(htmlContent, { url });
        const reader = new Readability(dom.window.document);
        const article = reader.parse();

        if (!article || !article.textContent) {
            return res.status(500).json({ error: 'Failed to extract content' });
        }

        console.log('Extracted Content:', article.textContent);

        // Analyze data with Universal Sentence Encoder (USE)
        const model = await use.load();
        const embeddings = await model.embed([article.textContent]);

        // Content Type Categorization (Simple heuristic-based)
        const contentType = determineContentType(article);

        // Topic/Subject Categorization (using embeddings and additional models or APIs)
        const topic = await categorizeByTopic(embeddings);

        // Sentiment Analysis
        const sentimentResult = analyzeSentiment(article.textContent);

        // Save data and analysis to MongoDB
        const newData = new Data({
            url,
            scrapedData: article,
            analysis: embeddings.arraySync()[0],
            contentType,
            topic,
            sentiment: sentimentResult,
        });
        await newData.save();

        // Send the result back to the client
        res.json({
            scrapedData: article,
            contentType,
            topic,
            sentiment: sentimentResult,
        });
    } catch (error) {
        console.error('Error during processing.', error);
        res.status(500).json('An error occurred. Please check your URL!');
    }
});

app.listen(3000, () => {
    console.log('Server is running on http://localhost:3000');
});

// Helper functions remain the same
function determineContentType(article) {
    const { title, textContent } = article;
    if (title.toLowerCase().includes('blog')) {
        return 'Blog Post';
    } else if (title.toLowerCase().includes('product')) {
        return 'Product Page';
    } else if (textContent.length > 2000) {
        return 'Long-form Article';
    } else {
        return 'General Web Page';
    }
}

async function categorizeByTopic(embeddings) {
    if (embeddings.length === 0) {
        return 'General';
    }
    return 'General';
}

function analyzeSentiment(content) {
    const sentimentAnalyzer = new sentiment();
    const result = sentimentAnalyzer.analyze(content);
    return result.score > 0 ? 'Positive' : result.score < 0 ? 'Negative' : 'Neutral';
}
