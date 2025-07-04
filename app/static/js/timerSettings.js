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
            
            this.settingsBtn = document.querySelector(".settings-btn");
            this.settingsModal = document.querySelector(".settings-modal");
            this.saveSettingsBtn = document.querySelector(".save-settings");
            this.cancelSettingsBtn = document.querySelector(".cancel-settings");
            this.workDurationInput = document.getElementById("work-duration");
            this.shortBreakInput = document.getElementById("short-break-duration");
            this.longBreakInput = document.getElementById("long-break-duration");
            this.longBreakIntervalInput = document.getElementById("long-break-interval");
            this.autoStartShortBreakInput = document.getElementById("auto-start-short-break");
            this.autoStartLongBreakInput = document.getElementById("auto-start-long-break");
            this.autoStartWorkInput = document.getElementById("auto-start-work");
            this.autoSwitchTabsInput = document.getElementById("auto-switch-tabs");
            
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
                const response = await fetch("/api/timer_session");

                if (!response.ok) throw new Error("Failed to load timer session");

                const data = await response.json();
                if (data.error) {
                    console.log("No existing timer session");
                    this.resetTimer();
                    this.setActiveMode("work");
                    return;
                }

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
                console.log("Loaded timer session:", data)
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
                const response = await fetch("/api/timer_session", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        current_state: this.currentMode,
                        current_phase: this.pomodoroCount,
                        is_running: this.isRunning,
                        work_time: this.currentMode === "work" ? this.timeLeft : this.settings.workDuration * 60,
                        short_break_time: this.currentMode === "shortBreak" ? this.timeLeft : this.settings.shortBreakDuration * 60,
                        long_break_time: this.currentMode === "longBreak" ? this.timeLeft : this.settings.longBreakDuration * 60
                    })
                });

                if (!response.ok) throw new Error("Failed to sync timer session");
            } catch (error) {
                console.error("Error syncing timer session:", error);
            }
        }

        async loadSettings() {
            try {
                const response = await fetch("/api/settings");
                if (!response.ok) throw new Error("Failed to load settings from API");
                
                const data = await response.json();
                if (data.pomodoroTimer) {
                    this.settings = {
                        ...this.defaultSettings,
                        ...data.pomodoroTimer
                    };
                    this.updateSettingsUI();
                    console.log("Loaded settings from API:", this.settings);
                }
            } catch (error) {
                console.error("Error loading settings from API:", error);
                try {
                    const localSettings = localStorage.getItem("pomodoroSettings");
                    if (localSettings) {
                        this.settings = {
                            ...this.defaultSettings,
                            ...JSON.parse(localSettings)
                        };
                        this.updateSettingsUI();
                        console.log("Loaded settings from localStorage:", this.settings);
                    }
                } catch (e) {
                    console.error("Error loading settings from localStorage:", e);
                    this.settings = {...this.defaultSettings};
                    this.updateSettingsUI();
                }
            }
        }

        updateSettingsUI() {
            this.workDurationInput.value = this.settings.workDuration;
            this.shortBreakInput.value = this.settings.shortBreakDuration;
            this.longBreakInput.value = this.settings.longBreakDuration;
            this.longBreakIntervalInput.value = this.settings.longBreakInterval;
            this.autoStartShortBreakInput.checked = this.settings.autoStartShortBreak;
            this.autoStartLongBreakInput.checked = this.settings.autoStartLongBreak;
            this.autoStartWorkInput.checked = this.settings.autoStartWork;
            this.autoSwitchTabsInput.checked = this.settings.autoSwitchTabs;
            
            if (!this.isRunning) {
                this.resetTimer();
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

            this.settingsBtn.addEventListener("click", () => {
                this.settingsModal.classList.remove("hidden");
                this.updateSettingsUI();
            });

            this.cancelSettingsBtn.addEventListener("click", () => {
                this.settingsModal.classList.add("hidden");
            });

            this.saveSettingsBtn.addEventListener("click", async () => {
                await this.saveSettings();
            });
        }

        async saveSettings() {
            const newSettings = {
                workDuration: parseInt(this.workDurationInput.value) || -1,
                shortBreakDuration: parseInt(this.shortBreakInput.value) || -1,
                longBreakDuration: parseInt(this.longBreakInput.value) || -1,
                longBreakInterval: parseInt(this.longBreakIntervalInput.value) || -1,
                autoStartShortBreak: this.autoStartShortBreakInput.checked,
                autoStartLongBreak: this.autoStartLongBreakInput.checked,
                autoStartWork: this.autoStartWorkInput.checked,
                autoSwitchTabs: this.autoSwitchTabsInput.checked
            };

            this.clearValidationErrors();

            let isValid = true;
            
            console.log(newSettings);

            if (newSettings.workDuration < 1 || newSettings.workDuration > 60) {
                this.showValidationError(this.workDurationInput);
                isValid = false;
            }
            
            if (newSettings.shortBreakDuration < 1 || newSettings.shortBreakDuration > 30) {
                this.showValidationError(this.shortBreakInput);
                isValid = false;
            }
            
            if (newSettings.longBreakDuration < 1 || newSettings.longBreakDuration > 60) {
                this.showValidationError(this.longBreakInput);
                isValid = false;
            }
            
            if (newSettings.longBreakInterval < 1) {
                this.showValidationError(this.longBreakIntervalInput);
                isValid = false;
            }

            if (!isValid) {
                this.settingsModal.classList.add("shake-animation");
                
                setTimeout(() => {
                    this.settingsModal.classList.remove("shake-animation");
                }, 500);
                
                this.showNotification("Invalid Settings", "Please check your values and try again");
                return;
            }

            try {
                const response = await fetch("/api/settings", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ pomodoroTimer: newSettings })
                });

                if (!response.ok) throw new Error("Failed to save settings to API");

                localStorage.setItem("pomodoroSettings", JSON.stringify(newSettings));

                this.settings = newSettings;
                
                const currentMode = this.currentMode;
                
                this.resetTimer();
                
                this.setActiveMode(currentMode);
                this.timeLeft = this.getCurrentDuration() * 60;
                this.updateDisplay();
                
                this.settingsModal.classList.add("hidden");
                
                this.showNotification("Settings Saved", "Your timer settings have been updated");
            } catch (error) {
                console.error("Error saving settings:", error);
                this.showNotification("Error", "Failed to save settings. Please try again.");
            }
        }

        showValidationError(inputElement) {
            inputElement.classList.add("invalid-input");
            setTimeout(() => {
                inputElement.classList.remove("invalid-input");
            }, 500);
        }

        clearValidationErrors() {
            const inputs = [
                this.workDurationInput,
                this.shortBreakInput,
                this.longBreakInput,
                this.longBreakIntervalInput
            ];
            
            inputs.forEach(input => {
                input.classList.remove("invalid-input");
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
            this.pauseTimer(true);
            this.timeLeft = this.getCurrentDuration() * 60;
            this.updateDisplay();
            this.startBtn.textContent = "Start";
            this.syncTimerSession();
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