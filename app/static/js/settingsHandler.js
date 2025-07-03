document.addEventListener("DOMContentLoaded", function() {
    class SettingsHandler {
        constructor() {
            this.saveButton = document.querySelector(".save-button");
            this.cancelButton = document.querySelector(".cancel-button");
            this.settingsPage = document.querySelector(".settings-page");
            
            this.preferredNameInput = document.getElementById("preferredName");
            this.uploadButton = document.getElementById("uploadButton");
            this.avatarUpload = document.getElementById("avatarUpload");
            this.avatarImage = document.getElementById("avatarImage");
            this.avatarPreview = document.getElementById("avatarPreview");
            
            this.workDurationInput = document.getElementById("workDuration");
            this.shortBreakInput = document.getElementById("shortBreakDuration");
            this.longBreakInput = document.getElementById("longBreakDuration");
            this.longBreakIntervalInput = document.getElementById("longBreakInterval");
            this.autoStartShortBreakInput = document.getElementById("autoStartShortBreak");
            this.autoStartLongBreakInput = document.getElementById("autoStartLongBreak");
            this.autoStartWorkInput = document.getElementById("autoStartWork");
            
            this.defaultSettings = {
                preferredName: "",
                preferredPicture: "/static/img/default-profile.png",
                pomodoroTimer: {
                    workDuration: 25,
                    shortBreakDuration: 5,
                    longBreakDuration: 15,
                    longBreakInterval: 4,
                    autoStartShortBreak: true,
                    autoStartLongBreak: true,
                    autoStartWork: true,
                    autoSwitchTabs: true
                }
            };
            
            this.currentSettings = {...this.defaultSettings};
            
            this.init();
        }
        
        async init() {
            await this.loadSettings();
            this.setupEventListeners();
        }
        
        async loadSettings() {
            try {
                const response = await fetch("/api/settings");
                if (!response.ok) throw new Error("Failed to load settings from API");
                
                const data = await response.json();
                if (data) {
                    this.currentSettings = {
                        ...this.defaultSettings,
                        ...data
                    };
                    this.updateUI();
                }
            } catch (error) {
                console.error("Error loading settings from API:", error);
                try {
                    const localSettings = localStorage.getItem("userSettings");
                    if (localSettings) {
                        this.currentSettings = {
                            ...this.defaultSettings,
                            ...JSON.parse(localSettings)
                        };
                        this.updateUI();
                    }
                } catch (e) {
                    console.error("Error loading settings from localStorage:", e);
                    this.currentSettings = {...this.defaultSettings};
                    this.updateUI();
                }
            }
        }
        
        updateUI() {
            this.preferredNameInput.value = this.currentSettings.preferredName || "";
            this.avatarImage.src = this.currentSettings.preferredPicture || "/static/img/default-profile.png";
            
            const pomodoroSettings = this.currentSettings.pomodoroTimer || this.defaultSettings.pomodoroTimer;
            
            this.workDurationInput.value = pomodoroSettings.workDuration;
            this.shortBreakInput.value = pomodoroSettings.shortBreakDuration;
            this.longBreakInput.value = pomodoroSettings.longBreakDuration;
            this.longBreakIntervalInput.value = pomodoroSettings.longBreakInterval;
            this.autoStartShortBreakInput.checked = pomodoroSettings.autoStartShortBreak;
            this.autoStartLongBreakInput.checked = pomodoroSettings.autoStartLongBreak;
            this.autoStartWorkInput.checked = pomodoroSettings.autoStartWork;
        }
        
        setupEventListeners() {
            this.saveButton.addEventListener("click", async () => {
                await this.saveSettings();
            });
            
            this.cancelButton.addEventListener("click", () => {
                this.loadSettings();
            });

            this.uploadButton.addEventListener("click", () => {
                this.avatarUpload.click();
            });

            this.avatarUpload.addEventListener("change", async (e) => {
                await this.handleAvatarUpload(e.target.files[0]);
                e.target.value = "";
            });

            this.removeButton.addEventListener("click", async () => {
                await this.removeAvatar();
            });
        }
        
        async saveSettings() {
            const newSettings = {
                preferredName: this.preferredNameInput.value.trim(),
                pomodoroTimer: {
                    workDuration: parseInt(this.workDurationInput.value),
                    shortBreakDuration: parseInt(this.shortBreakInput.value),
                    longBreakDuration: parseInt(this.longBreakInput.value),
                    longBreakInterval: parseInt(this.longBreakIntervalInput.value),
                    autoStartShortBreak: this.autoStartShortBreakInput.checked,
                    autoStartLongBreak: this.autoStartLongBreakInput.checked,
                    autoStartWork: this.autoStartWorkInput.checked,
                    autoSwitchTabs: true
                }
            };
            
            this.clearValidationErrors();
            
            let isValid = this.validateSettings(newSettings.pomodoroTimer);
            
            if (!isValid) {
                this.settingsPage.classList.add("shake-animation");
                
                setTimeout(() => {
                    this.settingsPage.classList.remove("shake-animation");
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
                    body: JSON.stringify(newSettings)
                });
                
                if (!response.ok) throw new Error("Failed to save settings to API");
                
                localStorage.setItem("userSettings", JSON.stringify(newSettings));
                
                this.currentSettings = newSettings;
                this.showNotification("Settings Saved", "Your settings have been updated successfully");
                
                setTimeout(() => {
                    window.location.href = "/settings";
                }, 1500);
                
            } catch (error) {
                console.error("Error saving settings:", error);
                this.showNotification("Error", "Failed to save settings. Please try again.");
            }
        }
        
        validateSettings(pomodoroSettings) {
            let isValid = true;
            
            if (isNaN(pomodoroSettings.workDuration) || pomodoroSettings.workDuration < 1 || pomodoroSettings.workDuration > 120) {
                this.showValidationError(this.workDurationInput);
                isValid = false;
            }
            
            if (isNaN(pomodoroSettings.shortBreakDuration) || pomodoroSettings.shortBreakDuration < 1 || pomodoroSettings.shortBreakDuration > 30) {
                this.showValidationError(this.shortBreakInput);
                isValid = false;
            }
            
            if (isNaN(pomodoroSettings.longBreakDuration) || pomodoroSettings.longBreakDuration < 1 || pomodoroSettings.longBreakDuration > 60) {
                this.showValidationError(this.longBreakInput);
                isValid = false;
            }
            
            if (isNaN(pomodoroSettings.longBreakInterval) || pomodoroSettings.longBreakInterval < 1 || pomodoroSettings.longBreakInterval > 10) {
                this.showValidationError(this.longBreakIntervalInput);
                isValid = false;
            }
            
            return isValid;
        }
        
        showValidationError(inputElement) {
            inputElement.classList.add("invalid-input");
            setTimeout(() => {
                inputElement.classList.remove("invalid-input");
            }, 1500);
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
        
        showNotification(title, body = "") {
            if (!("Notification" in window)) {
                alert(`${title}: ${body}`);
                return;
            }
            
            if (Notification.permission === "granted") {
                new Notification(title, { body });
            } 
            else if (Notification.permission !== "denied") {
                Notification.requestPermission().then(permission => {
                    if (permission === "granted") {
                        new Notification(title, { body });
                    } else {
                        alert(`${title}: ${body}`);
                    }
                });
            } else {
                alert(`${title}: ${body}`);
            }
        }

        async handleAvatarUpload(file) {
            if (!file) return;

            const validTypes = ["image/jpeg", "image/png"];
            if (!validTypes.includes(file.type)) {
                this.showNotification("Invalid File", "Please upload a JPG or PNG image");
                return;
            }

            if (file.size > 1024 * 1024) {
                this.showNotification("File Too Large", "Maximum size is 1MB");
                return;
            }

            const formData = new FormData();
            formData.append("file", file);

            try {
                const response = await fetch("/api/avatar/upload", {
                    method: "POST",
                    body: formData
                });

                if (!response.ok) throw new Error("Upload failed");

                const result = await response.json();
                
                this.avatarImage.src = result.file_path;
                
                this.showNotification("Success", "Profile picture updated");
            } catch (error) {
                console.error("Avatar upload error:", error);
                this.showNotification("Error", "Failed to upload profile picture");
            }
        }
    }
    
    new SettingsHandler();
});