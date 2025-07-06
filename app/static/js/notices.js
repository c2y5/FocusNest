document.addEventListener("DOMContentLoaded", function() {
    const announcementBar = document.getElementById("announcementBar");
    const announcementText = document.getElementById("announcementText");
    
    fetch("https://projectnotices.amsky.xyz/_notices.txt")
        .then(response => {
            if (!response.ok) throw new Error("Network response was not ok");
            return response.text();
        })
        .then(text => {
            const notices = text.trim();
            if (notices) {
                announcementText.textContent = notices;
                announcementBar.removeAttribute("hidden");
            }
        })
        .catch(error => {
            console.error("Failed to fetch notices:", error);
        });
});