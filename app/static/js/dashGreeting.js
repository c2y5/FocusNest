document.addEventListener("DOMContentLoaded", function() {
    fetch("/api/@me").then(response => response.json()).then(data => {

        document.getElementById("profile-picture").hidden = false;

        const username = document.getElementById("username");
        fetch("/api/settings").then(response => response.json()).then(sdata => {
            if (sdata.preferredPicture) {
                document.getElementById("profile-picture").src = sdata.preferredPicture;
            } else if (data.picture) {
                document.getElementById("profile-picture").src = data.picture;
            } else {
                document.getElementById("profile-picture").src = "/static/img/default-profile.png";
            }
            
            if (sdata.preferredName) {
                username.textContent = sdata.preferredName;
            } else if (data.name.includes("@")) {
                username.textContent = data.nickname
            } else {
                username.textContent = data.name;
            }
        }).catch(error => {
            console.error("Error fetching settings:", error);
            if (data.name.includes("@")) {
                username.textContent = data.nickname
            } else {
                username.textContent = data.name;
            }
        });

        const greeting = document.getElementById("greeting");
        const hour = new Date().getHours();
        let greetingText;

        if (hour < 12) {
            greetingText = "Good morning";
        } else if (hour < 18) {
            greetingText = "Good afternoon";
        } else {
            greetingText = "Good evening";
        }

        greeting.textContent = greetingText
    }).catch(error => {
        console.error("Error fetching user data:", error);
        document.getElementById("username").textContent = "User";
        document.getElementById("greeting").textContent = "Welcome back";
        document.getElementById("profile-picture").src = "/static/img/default-profile.png";
    })
})