class PopupHandler {
    constructor() {
        this.initPopup();
    }

    initPopup() {
        this.popup = document.createElement("div");
        this.popup.id = "global-popup";
        this.popup.className = "popup-hidden";

        this.popup.innerHTML = `
            <div class="popup-overlay"></div>
            <div class="popup-content">
                <div class="popup-message"></div>
                <div class="popup-buttons">
                    <button class="popup-button popup-confirm">Yes</button>
                    <button class="popup-button popup-cancel">No</button>
                </div>
            </div>
        `;

        document.body.appendChild(this.popup);

        this.popup.querySelector(".popup-confirm").addEventListener("click", () => this.resolve(true));
        this.popup.querySelector(".popup-cancel").addEventListener("click", () => this.resolve(false));
        this.popup.querySelector(".popup-overlay").addEventListener("click", () => this.resolve(false));
    }

    show(message) {
        this.popup.querySelector(".popup-message").textContent = message;
        this.popup.classList.remove("popup-hidden");
        
        return new Promise((resolve) => {
            this.resolve = (result) => {
                this.popup.classList.add("popup-hidden");
                resolve(result);
            };
        });
    }
}

window.popupHandler = new PopupHandler();
window.showConfirmation = function(message) {
    return window.popupHandler.show(message);
};