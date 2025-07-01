document.addEventListener("DOMContentLoaded", function() {
    checkEmotionLogStatus();
    
    const emotionOptions = document.querySelectorAll(".emotion-option");
    emotionOptions.forEach(option => {
        option.addEventListener("click", handleEmotionSelection);
    });
});

async function checkEmotionLogStatus() {
    try {
        const response = await fetch("/api/emotion", {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            if (!data.can_log && data.remaining_time) {
                startCooldown(data.remaining_time);
            }
        } else {
            console.error("Error checking emotion log status:", data.error);
            document.querySelector(".emotion-instruction").textContent = "Error checking mood log status";
        }
    } catch (error) {
        console.error("Network error:", error);
        document.querySelector(".emotion-instruction").textContent = "Network error";
    }
}

async function handleEmotionSelection() {
    const emotion = this.getAttribute("data-emotion");
    
    updateSelectedEmotion(this, emotion);
    document.querySelector(".emotion-instruction").textContent = "Logging mood...";
    
    try {
        const response = await fetch("/api/emotion", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ emotion: emotion })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            if (data.error === "cooldown" && data.remaining_time) {
                startCooldown(data.remaining_time);
                throw new Error(`Please wait ${formatTime(data.remaining_time)}`);
            }
            throw new Error(data.error || "Failed to log mood");
        }
        
        document.querySelector(".emotion-instruction").textContent = `Logged: ${formatEmotionText(emotion)}`;
        startCooldown(1800);
        
    } catch (error) {
        console.error("Error:", error);
        document.querySelector(".emotion-instruction").textContent = error.message;
    }
}

function updateSelectedEmotion(selectedElement) {
    document.querySelectorAll(".emotion-option").forEach(opt => {
        opt.classList.remove("selected");
        opt.style.transform = "scale(1)";
    });
    
    selectedElement.classList.add("selected");
    selectedElement.style.transform = "scale(1.2)";
}

function startCooldown(secondsLeft) {
    document.querySelectorAll(".emotion-option").forEach(opt => {
        opt.disabled = true;
    });
    
    updateCooldownDisplay(secondsLeft);
    
    const timerInterval = setInterval(() => {
        secondsLeft--;
        
        if (secondsLeft <= 0) {
            clearInterval(timerInterval);
            endCooldown();
        } else {
            updateCooldownDisplay(secondsLeft);
        }
    }, 1000);
}

function updateCooldownDisplay(secondsLeft) {
    document.querySelector(".emotion-instruction").textContent = 
        `Next log in ${formatTime(secondsLeft)}`;
}

function endCooldown() {
    document.querySelectorAll(".emotion-option").forEach(opt => {
        opt.disabled = false;
    });
    
    document.querySelector(".emotion-instruction").textContent = "Select your current mood";
    
    document.querySelectorAll(".emotion-option").forEach(opt => {
        opt.classList.remove("selected");
        opt.style.transform = "scale(1)";
    });
}

function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds.toString().padStart(2, "0")}s`;
}

function formatEmotionText(emotion) {
    return emotion.split("-").map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
    ).join(" ");
}