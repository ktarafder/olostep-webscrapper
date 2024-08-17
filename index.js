const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const puppeteer = require('puppeteer');
const tf = require('@tensorflow/tfjs-node'); // Correct Node.js backend
const use = require('@tensorflow-models/universal-sentence-encoder'); // Import USE model
const Data = require('./models/Schema');

const app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static('pub'));

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/olostep');

// Example route to scrape data and analyze
app.post('/scrape', async (req, res) => {
    const { url } = req.body;
    console.log('Received URL:', url);


    try {
        // Launch Puppeteer and scrape the data
        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        await page.goto(url, { timeout: 60000, waitUntil: 'networkidle2' });

        const scrapedData = await page.evaluate(() => {
            return {
                title: document.title,
                content: document.body.innerText,
            };
        });

        console.log(scrapedData);
        

        await browser.close();

        // Analyze data with Universal Sentence Encoder (USE)
        const model = await use.load(); // Load the USE model
        const embeddings = await model.embed([scrapedData.content]); // Get embeddings for the scraped content

        // Save data and analysis to MongoDB
        const newData = new Data({
            url,
            scrapedData,
            analysis: embeddings.arraySync()[0], // Convert embeddings to a regular array and store it
        });
        await newData.save();

        // Send the result back to the client
        res.json({ scrapedData, analysis: embeddings.arraySync()[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'An error occurred while processing your request.' });
    }
});

// Start the server
app.listen(3000, () => {
    console.log('Server is running on http://localhost:3000');
});
