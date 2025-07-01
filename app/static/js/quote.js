document.addEventListener("DOMContentLoaded", function() {
    fetchMotivationalQuote();
    setInterval(fetchMotivationalQuote, 600000);
});

async function fetchMotivationalQuote() {
    try {
        const response = await fetch("/api/quote", {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            const quoteElement = document.querySelector(".streak-quote");
            if (quoteElement) {
                let quote = data.quote;
                quoteElement.textContent = quote;
            }
        } else {
            console.error("Error fetching quote:", data.error);
        }
    } catch (error) {
        console.error("Network error fetching quote:", error);
    }
}