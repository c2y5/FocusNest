document.addEventListener("DOMContentLoaded", function() {
    initLinkingButtons();
    checkLinkStatus();
});

function initLinkingButtons() {
    const providers = {
        "linkGoogle": "google-oauth2",
        "linkGithub": "github",
        "linkSpotify": "spotify",
        "linkSlack": "sign-in-with-slack"
    };

    for (const [buttonId, provider] of Object.entries(providers)) {
        const button = document.getElementById(buttonId);
        if (button) {
            button.addEventListener("click", () => handleLinkClick(provider));
        }
    }
}

function handleLinkClick(provider) {
    fetch(`/is_linked/${provider}`)
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                showLinkingError(data.error);
                return;
            }

            if (data.is_linked) {
                if (confirm(`Unlink ${provider}?`)) {
                    fetch(`/unlink/${provider}`, { method: "POST" })
                        .then(res => res.json())
                        .then(result => {
                            if (result.error) {
                                showLinkingError(result.error);
                            } else {
                                checkLinkStatus();
                            }
                        })
                        .catch(err => {
                            console.error("Error unlinking:", err);
                            showLinkingError("Failed to unlink provider");
                        });
                }
            } else {
                window.location.href = `/link/${provider}`;
            }
        })
        .catch(error => {
            console.error("Error checking link status:", error);
            showLinkingError("Failed to check link status");
        });
}

function checkLinkStatus() {
    const providers = ["google-oauth2", "github", "spotify", "sign-in-with-slack"];
    
    providers.forEach(provider => {
        fetch(`/is_linked/${provider}`)
            .then(response => response.json())
            .then(data => {
                if (!data.error) {
                    updateLinkButton(provider, data.is_linked);
                }
            })
            .catch(error => {
                console.error(`Error checking ${provider} link status:`, error);
            });
    });
}

function updateLinkButton(provider, isLinked) {
    const buttonMap = {
        "google-oauth2": "linkGoogle",
        "github": "linkGithub",
        "spotify": "linkSpotify",
        "sign-in-with-slack": "linkSlack"
    };
    
    const buttonId = buttonMap[provider];
    if (!buttonId) return;

    const button = document.getElementById(buttonId);
    if (!button) return;

    if (isLinked) {
        button.textContent = "Unlink";
        button.classList.remove("link-button");
        button.classList.add("connected-button");
    } else {
        button.textContent = "Connect";
        button.classList.remove("connected-button");
        button.classList.add("link-button");
    }
}

function showLinkingError(message) {
    alert("Linking error: " + message);
}
