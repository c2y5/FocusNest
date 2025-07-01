async function updateGlobalAppUserCount() {
  const dot = document.querySelector(".live-dot");
  const count = document.querySelector(".live-count");
  
  if (!dot || !count) return;
  
  try {
    const response = await fetch("https://live.alimad.xyz/ping?app=focusnest");
    if (response.ok) {
      const userCount = await response.text();
      dot.style.background = "#4caf50";
      count.textContent = `${userCount} student${userCount !== '1' ? 's' : ''} studying`;
      
      dot.classList.add("pulse-animation");
    } else {
      throw new Error("API error");
    }
  } catch (error) {
    dot.style.background = "#f44336";
    count.textContent = "Offline";
    
    dot.classList.remove("pulse-animation");
  }
}

updateGlobalAppUserCount();
setInterval(updateGlobalAppUserCount, 20000);