const express = require('express');
const router = express.Router();
require('dotenv').config();

// Example route for the Olostep API
router.get('/test', (req, res) => {
    res.json({ message: 'Olostep API is working!' });
});

// Add your Olostep API routes here

let API_KEY = process.env.API_KEY; // Replace <YOUR_API_KEY> with your API key
let url_to_scrape = "https://www.mirzamohammedbaig.com/"; // Here put the url that you want to scrape

router.get('/start_olostep', (req, res) => {
function start_olostep(url_to_scrape){
    console.log('Starting Olostep...');
    const options = {
        method: 'GET',
        headers: {
            Authorization: 'Bearer ' + API_KEY,
        }
    };

    fetch('https://agent.olostep.com/olostep-p2p-incomingAPI?' + new URLSearchParams({
        "url_to_scrape": url_to_scrape,

        // Optional parameters. Already set to default values.
        // If you want to change them, see the available options at https://docs.olostep.com/api-reference/start-agent

        // "timeout": 65,
        // "waitBeforeScraping": 1,
        // "expandMarkdown": true,
        // "expandHtml": false,
        // "saveHtml": true,
        // "saveMarkdown": true,
        // "removeImages": true,
        // "fastLane": false,
        // "removeCSSselectors": 'default',
        // "htmlTransformer": 'none'
      }), options)
        .then(response => response.json())
        .then(response => {
            console.log(response)
            // response is an object with the following structure:
            // {
            //    "defaultDatasetId": "defaultDatasetId_mngjljq1qc",
            //    "html_content": "",
            //    "markdown_content": " Alexander the Great - Wikipedia...",
            //    "text_content": "",
            //    "usedProvidedNodeCountry": True
            // }
            //
        }).catch(err => console.error(err));
    }
    start_olostep(url_to_scrape);
});


module.exports = router;
