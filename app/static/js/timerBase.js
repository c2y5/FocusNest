function updateTimer() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const seconds = String(now.getSeconds()).padStart(2, "0");

    document.getElementById("timer-hours").textContent = hours;
    document.getElementById("timer-minutes").textContent = minutes;
    document.getElementById("timer-seconds").textContent = seconds;
}

updateTimer();
setInterval(updateTimer, 500);