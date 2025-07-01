class StreakHandler {
  constructor() {
    this.currentStreak = 0;
    this.lastLogged = null;
    this.canLog = true;

    this.init();
  }

  async init() {
    await this.fetchStreakData();
    this.renderStreak();
    this.updateFireIcon();
  }

  async fetchStreakData() {
    try {
      const response = await fetch("/api/streak", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        }
      });
      
      const data = await response.json();
      
      if (response.ok) {
        this.currentStreak = data.streak || 0;
        this.lastLogged = data.last_logged ? new Date(data.last_logged) : null;
        this.canLog = data.can_log !== false;
      }
    } catch (error) {
      console.error("Error fetching streak:", error);
    }
  }

  renderStreak() {
    const streakCountElement = document.querySelector(".streak-count");
    
    if (streakCountElement) {
      streakCountElement.textContent = `${this.currentStreak} day${this.currentStreak === 1 ? "" : this.currentStreak === 0 ? "" : "s"}`;
    }
    
  }

  updateFireIcon() {
    const fireIcon = document.querySelector(".streak-emoji");
    if (!fireIcon) return;

    if (this.currentStreak > 0 && !this.canLog) {
      fireIcon.style.filter = "none";
      fireIcon.style.transform = "scale(1.1)";
      fireIcon.style.animation = "pulse 1.5s infinite alternate";
    } else {
      fireIcon.style.filter = "grayscale(1) opacity(0.7)";
      fireIcon.style.transform = "scale(1)";
      fireIcon.style.animation = "none";
    }
  }

  async updateStreak() {
    if (!this.canLog) return false;

    try {
      const response = await fetch("/api/streak", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        }
      });
      
      const data = await response.json();
      
      if (response.ok) {
        this.currentStreak = data.streak;
        this.canLog = false;
        this.renderStreak();
        this.updateFireIcon();
        return true;
      }
    } catch (error) {
      console.error("Error updating streak:", error);
    }
    return false;
  }
}

const style = document.createElement("style");
style.textContent = `
  @keyframes pulse {
    0% { transform: scale(1); }
    100% { transform: scale(1.15); }
  }
`;
document.head.appendChild(style);

const streakHandler = new StreakHandler();