document.addEventListener("DOMContentLoaded", function() {
    class PomodoroTimer {
        constructor() {
            this.triggeredStreak = false;
            this.timerInterval = null;
            this.timeLeft = 0;
            this.isRunning = false;
            this.currentMode = "work";
            this.pomodoroCount = 0;
            this.defaultSettings = {
                workDuration: 25,
                shortBreakDuration: 5,
                longBreakDuration: 15,
                longBreakInterval: 4,
                autoStartShortBreak: true,
                autoStartLongBreak: true,
                autoStartWork: true,
                autoSwitchTabs: true
            };
            this.settings = {...this.defaultSettings};
            
            this.completionSound = new Audio("/static/sounds/complete.mp3");
            this.completionSound.preload = "auto";
            
            this.timerDisplay = document.querySelector(".ctimer-display");
            this.minutesDisplay = document.querySelector(".ctimer-minutes");
            this.secondsDisplay = document.querySelector(".ctimer-seconds");
            this.pomodoroCountDisplay = document.querySelector(".pomodoro-count");
            this.startBtn = document.querySelector(".start-btn");
            this.resetBtn = document.querySelector(".reset-btn");
            this.modeButtons = {
                work: document.querySelector("[data-mode='work']"),
                shortBreak: document.querySelector("[data-mode='shortBreak']"),
                longBreak: document.querySelector("[data-mode='longBreak']")
            };
            
            this.initTimer();
        }

        async initTimer() {
            await this.loadSettings();
            await this.loadTimerSession();
            this.setupEventListeners();
            this.setupSyncInterval();
            
            try {
                await this.completionSound.play().then(() => {
                    this.completionSound.pause();
                    this.completionSound.currentTime = 0;
                });
            } catch (e) {
                console.log("Audio preloading failed:", e);
            }
        }

        async loadTimerSession() {
            try {
                const storedData = localStorage.getItem("timer_session");
                
                if (!storedData) {
                    console.log("No existing timer session");
                    this.resetTimer();
                    this.setActiveMode("work");
                    return;
                }

                const data = JSON.parse(storedData);
                
                if (data.current_state === "work") {
                    this.timeLeft = data.work_time || this.settings.workDuration * 60;
                }

                this.pomodoroCount = data.current_phase || 0;
                this.updatePomodoroCount();

                if (this.pomodoroCount % this.settings.longBreakInterval === 0 && this.pomodoroCount > 0) {
                    this.currentMode = "longBreak";
                    this.timeLeft = data.long_break_time || this.settings.longBreakDuration * 60;
                } else if (data.current_state !== "work") {
                    this.currentMode = "shortBreak";
                    this.timeLeft = data.short_break_time || this.settings.shortBreakDuration * 60;
                } else {
                    this.currentMode = "work";
                }

                this.setActiveMode(this.currentMode);

                if (data.is_running !== undefined) {
                    this.isRunning = data.is_running;
                    if (this.isRunning) {
                        this.startBtn.textContent = "Pause";
                        this.startTimer();
                    }
                }
                
                this.updateDisplay();
                console.log("Loaded timer session:", data);
            } catch (error) {
                console.error("Error loading timer session:", error);
                this.resetTimer();
                this.setActiveMode("work");
            }
        }

        setupSyncInterval() {
            if (this.syncInterval) {
                clearInterval(this.syncInterval);
            }

            this.syncInterval = setInterval(() => {
                this.syncTimerSession();
            }, 1000);
        }

        async syncTimerSession(f = false) {
            if (!f && !this.isRunning) {
                return;
            }

            try {
                const sessionData = {
                    current_state: this.currentMode,
                    current_phase: this.pomodoroCount,
                    is_running: this.isRunning,
                    work_time: this.currentMode === "work" ? this.timeLeft : this.settings.workDuration * 60,
                    short_break_time: this.currentMode === "shortBreak" ? this.timeLeft : this.settings.shortBreakDuration * 60,
                    long_break_time: this.currentMode === "longBreak" ? this.timeLeft : this.settings.longBreakDuration * 60
                };

                localStorage.setItem("timer_session", JSON.stringify(sessionData));
            } catch (error) {
                console.error("Error syncing timer session:", error);
            }
        }

        async loadSettings() {
            try {
                const response = await fetch("/api/settings");
                if (!response.ok) throw new Error("Failed to load settings");
                
                const data = await response.json();
                if (data.pomodoroTimer) {
                    this.settings = {
                        ...this.defaultSettings,
                        ...data.pomodoroTimer
                    };
                    console.log("Loaded settings:", this.settings);
                }
            } catch (error) {
                console.error("Error loading settings:", error);
            }
        }

        setupEventListeners() {
            Object.values(this.modeButtons).forEach(button => {
                button.addEventListener("click", () => {
                    this.setActiveMode(button.dataset.mode);
                    this.resetTimer();
                });
            });

            this.startBtn.addEventListener("click", () => {
                if (!this.triggeredStreak) {
                    streakHandler.updateStreak();
                    this.triggeredStreak = true;
                }

                if (this.isRunning) {
                    this.pauseTimer();
                } else {
                    this.startTimer();
                }
            });

            this.resetBtn.addEventListener("click", () => {
                this.resetTimer();
            });
        }

        setActiveMode(mode) {
            this.currentMode = mode;
            
            Object.values(this.modeButtons).forEach(button => {
                button.classList.remove("active", "pulse-animation");
                if (button.dataset.mode === mode) {
                    button.classList.add("active");
                    
                    if (this.isRunning) {
                        button.classList.add("pulse-animation");
                        setTimeout(() => {
                            button.classList.remove("pulse-animation");
                        }, 1000);
                    }
                }
            });
        }

        startTimer() {
            if (this.timeLeft <= 0) return;
            
            this.isRunning = true;
            this.startBtn.textContent = "Pause";

            this.syncTimerSession();
            
            this.timerInterval = setInterval(() => {
                this.timeLeft--;
                this.updateDisplay();
                
                if (this.timeLeft <= 0) {
                    clearInterval(this.timerInterval);
                    this.timerComplete();
                }
            }, 1000);
        }

        pauseTimer() {
            this.isRunning = false;
            this.syncTimerSession(true);
            this.startBtn.textContent = "Start";
            clearInterval(this.timerInterval);
        }

        resetTimer() {
            this.pauseTimer();
            this.timeLeft = this.getCurrentDuration() * 60;
            this.updateDisplay();
            this.startBtn.textContent = "Start";
            this.syncTimerSession(true);
        }

        async timerComplete() {
            this.isRunning = false;
            this.syncTimerSession(true);
            await this.playCompletionSound();
            
            if (this.currentMode === "work") {
                await this.handleWorkCompletion();
            } else {
                await this.handleBreakCompletion();
            }
        }

        playCompletionSound() {
            return new Promise((resolve) => {
                this.completionSound.currentTime = 0;
                
                const onEnded = () => {
                    this.completionSound.removeEventListener("ended", onEnded);
                    resolve();
                };
                
                this.completionSound.addEventListener("ended", onEnded);
                
                this.completionSound.play().catch(e => {
                    console.log("Audio playback failed:", e);
                    resolve();
                });
            });
        }

        handleWorkCompletion() {
            this.pomodoroCount++;
            this.updatePomodoroCount();
            
            const shouldTakeLongBreak = this.pomodoroCount % this.settings.longBreakInterval === 0;
            const nextMode = shouldTakeLongBreak ? "longBreak" : "shortBreak";
            const shouldAutoStart = shouldTakeLongBreak ? 
                this.settings.autoStartLongBreak : 
                this.settings.autoStartShortBreak;
            
            if (this.settings.autoSwitchTabs) {
                this.setActiveMode(nextMode);
                this.resetTimer();
                if (shouldAutoStart) {
                    this.startTimer();
                }
            }

            this.syncTimerSession();
            
            this.showNotification(
                `Time for a ${shouldTakeLongBreak ? "long" : "short"} break!`,
                shouldAutoStart ? "Starting break automatically..." : "Click to start break"
            );
        }

        handleBreakCompletion() {
            const shouldAutoStartWork = this.settings.autoStartWork;
            
            if (this.settings.autoSwitchTabs) {
                this.setActiveMode("work");
                this.resetTimer();
                if (shouldAutoStartWork) {
                    this.startTimer();
                }
            }
            
            this.showNotification(
                "Break over! Time to work!",
                shouldAutoStartWork ? "Starting work session automatically..." : "Click to start working"
            );
        }

        updatePomodoroCount() {
            this.pomodoroCountDisplay.textContent = `Pomodoros: ${this.pomodoroCount}`;
        }

        showNotification(title, body = "") {
            if (!("Notification" in window)) return;
            
            if (Notification.permission === "granted") {
                new Notification(title, { body });
            } 
            else if (Notification.permission !== "denied") {
                Notification.requestPermission().then(permission => {
                    if (permission === "granted") {
                        new Notification(title, { body });
                    }
                });
            }
        }

        updateDisplay() {
            const minutes = Math.floor(this.timeLeft / 60);
            const seconds = this.timeLeft % 60;
            
            this.minutesDisplay.textContent = minutes.toString().padStart(2, "0");
            this.secondsDisplay.textContent = seconds.toString().padStart(2, "0");
        }

        getCurrentDuration() {
            return this.getDurationForMode(this.currentMode);
        }

        getDurationForMode(mode) {
            switch(mode) {
                case "work": return this.settings.workDuration;
                case "shortBreak": return this.settings.shortBreakDuration;
                case "longBreak": return this.settings.longBreakDuration;
                default: return this.settings.workDuration;
            }
        }
    }

    new PomodoroTimer();
});