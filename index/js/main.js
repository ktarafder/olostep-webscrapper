document.getElementById('urlForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData(e.target);
    const url = formData.get('url');

    // Clear previous result
    document.getElementById('result').innerText = "Scraping data, please wait...";

    // Simulate a loading effect
    setTimeout(async () => {
        const response = await fetch('/scrape', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url }),
        });

        if (response.ok) {
            const result = await response.json();
            displayResult(result);
            saveScrapedData(result);
        } else {
            document.getElementById('result').innerText = "Failed to scrape data.";
        }
    }, 1000); // Simulate delay for better user experience
});

function displayResult(data) {
    const resultDiv = document.getElementById('result');
    resultDiv.innerHTML = ''; // Clear previous content

    // Display the title
    const titleElement = document.createElement('h2');
    titleElement.innerText = `Title: ${data.title}`;
    resultDiv.appendChild(titleElement);

    // Display the topic/subject categorization
    const topicElement = document.createElement('p');
    topicElement.innerText = `Topic: ${data.topic}`;
    resultDiv.appendChild(topicElement);

    // Display the content type
    const contentTypeElement = document.createElement('p');
    contentTypeElement.innerText = `Content Type: ${data.contentType}`;
    resultDiv.appendChild(contentTypeElement);

    // Display the sentiment analysis
    const sentimentElement = document.createElement('p');
    sentimentElement.innerText = `Sentiment: ${data.sentiment}`;
    resultDiv.appendChild(sentimentElement);

    // Create a link to view the full scraped content
    const viewContentLink = document.createElement('a');
    viewContentLink.href = 'scrapedData.html';
    viewContentLink.target = '_blank'; // Opens the link in a new tab
    viewContentLink.innerText = 'View Scraped Data';
    resultDiv.appendChild(viewContentLink);
}

// Function to save scraped data to localStorage
function saveScrapedData(data) {
    console.log('Saving scraped data:', data); // Log the data being saved
    localStorage.setItem('scrapedData', JSON.stringify(data));
}
