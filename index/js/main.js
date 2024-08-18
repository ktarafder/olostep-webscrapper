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

        const result = await response.json();
        document.getElementById('result').innerText = JSON.stringify(result, null, 2);
    }, 1000); // Simulate delay for better user experience
});
