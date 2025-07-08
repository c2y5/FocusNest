document.addEventListener("DOMContentLoaded", function() {
    const dropdowns = document.querySelectorAll(".custom-dropdown");
    const audioPlayer = document.getElementById("audio-player");
    const playBtn = document.getElementById("music-play");
    const albumArt = document.querySelector(".album-art");
    const trackNameElement = document.getElementById("music-track-name");

    const loadingElement = document.createElement("div");
    loadingElement.className = "loading-spinner";
    loadingElement.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    loadingElement.style.display = "none";
    document.querySelector(".music-display").appendChild(loadingElement);

    let isLoading = false;

    fetch("/music/list")
        .then(response => response.json())
        .then(playlists => {
            if (playlists.length > 0) {
                populateDropdown(playlists);
                const storedData = localStorage.getItem("lastSelectedPlaylist");
                if (storedData) {
                    const lastSelected = JSON.parse(storedData);
                    const lastPlaylist = playlists.find(p => p.id === lastSelected.id);
                    if (lastPlaylist) {
                        selectDefaultPlaylist(lastPlaylist);
                    } else {
                        selectDefaultPlaylist(playlists[0]);
                    }
                }
            }
        })
        .catch(err => {
            console.error("Error loading playlists:", err);
            const defaultPlaylists = [{ name: "Error Loading List", id: "error" }];
            populateDropdown(defaultPlaylists);
            selectDefaultPlaylist(defaultPlaylists[0]);
        });

    function populateDropdown(playlists) {
        dropdowns.forEach(dropdown => {
            const menu = dropdown.querySelector(".dropdown-menu");
            const toggle = dropdown.querySelector(".dropdown-toggle");
            menu.innerHTML = "";

            playlists.forEach(playlist => {
                const li = document.createElement("li");
                li.textContent = playlist.name;
                li.dataset.value = playlist.id;
                menu.appendChild(li);
            });

            const selectedOption = dropdown.querySelector(".selected-option");
            const options = dropdown.querySelectorAll(".dropdown-menu li");

            toggle.addEventListener("click", function(e) {
                e.stopPropagation();
                dropdown.classList.toggle("active");
            });

            options.forEach(option => {
                option.addEventListener("click", function() {
                    selectedOption.textContent = this.textContent;
                    selectedOption.dataset.value = this.dataset.value;
                    dropdown.classList.remove("active");
                    trackNameElement.textContent = this.textContent;
                    loadAlbumArt(this.dataset.value);
                    audioPlayer.src = `/music/play/${this.dataset.value}`;
                    audioPlayer.pause();
                    playBtn.innerHTML = '<i class="fas fa-play"></i>';
                });
            });
        });
    }

    function selectDefaultPlaylist(firstPlaylist) {
        dropdowns.forEach(dropdown => {
            const selectedOption = dropdown.querySelector(".selected-option");
            selectedOption.textContent = firstPlaylist.name;
            selectedOption.dataset.value = firstPlaylist.id;
            trackNameElement.textContent = firstPlaylist.name;
            loadAlbumArt(firstPlaylist.id);
            audioPlayer.src = `/music/play/${firstPlaylist.id}`;
        });
    }

    function loadAlbumArt(trackId) {
        localStorage.setItem("lastSelectedPlaylist", JSON.stringify({ id: trackId }));

        fetch(`/music/get_img/${trackId}`)
            .then(response => response.json())
            .then(data => {
                if (data.image) {
                    albumArt.src = data.image;
                }
            })
            .catch(err => {
                console.error("Error loading album art:", err);
                albumArt.src = "/static/img/music-placeholder.jpg";
            });
    }

    playBtn.addEventListener("click", () => {
        if (isLoading) return;
        
        if (audioPlayer.paused) {
            isLoading = true;
            loadingElement.style.display = "block";
            playBtn.disabled = true;
            playBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            
            audioPlayer.play()
                .then(() => {
                    playBtn.innerHTML = '<i class="fas fa-pause"></i>';
                })
                .catch(err => {
                    console.error("Playback failed:", err);
                    playBtn.innerHTML = '<i class="fas fa-play"></i>';
                })
                .finally(() => {
                    loadingElement.style.display = "none";
                    playBtn.disabled = false;
                    isLoading = false;
                });
        } else {
            audioPlayer.pause();
            playBtn.innerHTML = '<i class="fas fa-play"></i>';
        }
    });

    audioPlayer.addEventListener("playing", () => {
        loadingElement.style.display = "none";
        playBtn.innerHTML = '<i class="fas fa-pause"></i>';
        playBtn.disabled = false;
        isLoading = false;
    });

    document.addEventListener("click", function() {
        dropdowns.forEach(dropdown => {
            dropdown.classList.remove("active");
        });
    });
});