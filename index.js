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

mongoose.connect('mongodb+srv://ktarafder01:_dYvX4F_m.Sb-G.@olostep-webscrapper.8iq0y.mongodb.net/?retryWrites=true&w=majority&appName=olostep-webscrapper');

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
        const topic = await categorizeByTopic(article.textContent);

        // Sentiment Analysis
        const sentimentResult = analyzeSentiment(article.textContent);

        // Save data and analysis to MongoDB
        const newData = new Data({
            url,
            scrapedData: article,
            contentType,
            topic,
            sentiment: sentimentResult,
        });
        await newData.save();

        // Send the result back to the client
        res.json({
            title: article["title"],
            topic,
            sentiment: sentimentResult,
            contentType,
            content: article["content"],
            textContent: article["textContent"],
        });
    } catch (error) {
        console.error('Error during processing.', error);
        res.status(500).json('An error occurred. Please check your URL!');
    }
});

app.listen(3000, () => {
    console.log('Server is running on 3000');
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

async function categorizeByTopic(textContent) {
    // Define keywords for each category
    const categories = {
        technology: ['software', 'AI', 'blockchain', 'hardware', 'web development', 'cloud computing', 'cybersecurity', 'data science', 'IoT', 'machine learning', 'robotics', 'quantum computing', 'DevOps', 'networking', 'mobile development', 'AR/VR', 'automation', '5G technology', 'open source software', 'IT infrastructure'],
        business: ['stock market', 'finance', 'startups', 'corporate strategy', 'marketing', 'sales', 'e-commerce', 'leadership', 'operations', 'supply chain management', 'entrepreneurship', 'human resources', 'project management', 'venture capital', 'customer relations', 'business analytics', 'risk management', 'accounting', 'business law', 'consulting'],
        health: ['nutrition', 'mental health', 'fitness', 'medicine', 'wellness', 'public health', 'diseases', 'healthcare industry', 'alternative medicine', 'exercise', 'diet', 'pharmacy', 'therapy', 'preventive health', 'chronic illnesses', 'medical research', 'health technology', 'telemedicine', 'healthcare policy', 'biotech'],
        science: ['biology', 'space exploration', 'physics', 'environmental science', 'chemistry', 'astronomy', 'geology', 'genetics', 'ecology', 'meteorology', 'paleontology', 'oceanography', 'scientific research', 'anthropology', 'forensic science', 'neuroscience', 'biochemistry', 'zoology', 'botany', 'evolution'],
        religion: ['islam', 'christianity', 'judaism', 'hinduism', 'buddhism', 'sikhism', 'zoroastrianism', 'jainism', 'taoism', 'shinto', 'confucianism', 'bahá\'í', 'animism', 'paganism', 'indigenous religions', 'new age spirituality', 'spiritualism', 'agnosticism', 'atheism', 'mysticism'],
        education: ['university education', 'online courses', 'edtech', 'learning techniques', 'K-12 education', 'higher education', 'vocational training', 'homeschooling', 'professional development', 'certifications', 'adult education', 'tutoring', 'special education', 'language learning', 'educational policy', 'curriculum development', 'study techniques', 'distance learning', 'lifelong learning', 'extracurricular activities'],
        entertainment: ['movies', 'music', 'gaming', 'books', 'sports', 'theater', 'television shows', 'comedy', 'art', 'dance', 'fashion shows', 'events', 'concerts', 'festivals', 'celebrity news', 'streaming services', 'animation', 'cultural events', 'magazines', 'podcasts'],
        travel: ['hotels', 'destinations', 'cultural tourism', 'adventure travel', 'cruises', 'backpacking', 'luxury travel', 'business travel', 'eco-tourism', 'road trips', 'vacation planning', 'travel tips', 'travel photography', 'travel agencies', 'airlines', 'travel insurance', 'budget travel', 'travel blogging', 'guided tours', 'local experiences'],
        news: ['politics', 'economy', 'breaking news', 'local news', 'international news', 'weather', 'crime', 'social issues', 'science & technology', 'entertainment news', 'opinion pieces', 'editorials', 'investigative journalism', 'environmental news', 'health news', 'business news', 'sports news', 'legal news', 'educational news', 'celebrity news'],
        lifestyle: ['fashion', 'food', 'relationships', 'home improvement', 'beauty', 'self-care', 'parenting', 'hobbies', 'DIY projects', 'travel', 'sustainability', 'minimalism', 'personal finance', 'gardening', 'interior design', 'fitness', 'work-life balance', 'productivity', 'social etiquette', 'mindfulness']
    };

    let categoryScores = {
        technology: 0,
        business: 0,
        health: 0,
        science: 0,
        religion: 0,
        education: 0,
        entertainment: 0,
        travel: 0,
        news: 0,
        lifestyle: 0
    };

    // Analyze the text content for each category
    for (let category in categories) {
        categories[category].forEach(keyword => {
            if (textContent.toLowerCase().includes(keyword)) {
                categoryScores[category]++;
            }
        });
    }

    // Determine the category with the highest score
    let maxCategory = 'general';
    let maxScore = 0;
    for (let category in categoryScores) {
        if (categoryScores[category] > maxScore) {
            maxScore = categoryScores[category];
            maxCategory = category;
        }
    }

    return maxCategory;
}

function analyzeSentiment(content) {
    const sentimentAnalyzer = new sentiment();
    const result = sentimentAnalyzer.analyze(content);
    return result.score > 0 ? 'Positive' : result.score < 0 ? 'Negative' : 'Neutral';
}
