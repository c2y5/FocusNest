document.addEventListener("DOMContentLoaded", function() {
    const hamburgerMenu = document.querySelector(".hamburger-menu");
    const mobileNav = document.querySelector(".mobile-nav");
    const overlay = document.querySelector(".overlay");
    
    hamburgerMenu.addEventListener("click", function(e) {
        e.stopPropagation();
        this.classList.toggle("open");
        mobileNav.classList.toggle("open");
        overlay.classList.toggle("open");
    });
    
    overlay.addEventListener("click", function() {
        hamburgerMenu.classList.remove("open");
        mobileNav.classList.remove("open");
        this.classList.remove("open");
    });
    
    const currentPath = window.location.pathname;
    const navItems = document.querySelectorAll(".mobile-nav-item");
    
    navItems.forEach(item => {
        item.classList.remove("active");
        if (item.getAttribute("href") === currentPath) {
            item.classList.add("active");
        }
    });
            
    navItems.forEach(item => {
        item.addEventListener("click", function() {
            hamburgerMenu.classList.remove("open");
            mobileNav.classList.remove("open");
            overlay.classList.remove("open");
        });
    });

    document.addEventListener("keydown", function(e) {
        if (e.key === "Escape") {
            hamburgerMenu.classList.remove("open");
            mobileNav.classList.remove("open");
            overlay.classList.remove("open");
        }
    });
});