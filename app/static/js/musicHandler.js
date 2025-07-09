document.addEventListener("DOMContentLoaded", function() {
    const dropdowns = document.querySelectorAll(".custom-dropdown");
    const playBtn = document.getElementById("music-play");
    const albumArt = document.querySelector(".album-art");
    const trackNameElement = document.getElementById("music-track-name");

    const loadingElement = document.createElement("div");
    loadingElement.className = "loading-spinner";
    loadingElement.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    loadingElement.style.display = "none";
    document.querySelector(".music-display").appendChild(loadingElement);

    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    let audioSource = null;
    let isPlaying = false;
    let isLoading = false;
    let currentStreamUrl = null;

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
                    
                    if (isPlaying) {
                        stopAudio();
                    }
                    
                    currentStreamUrl = `/music/play/${this.dataset.value}`;
                    loadAlbumArt(this.dataset.value);
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
            currentStreamUrl = `/music/play/${firstPlaylist.id}`;
            loadAlbumArt(firstPlaylist.id);
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

    async function playAudioStream() {
        try {
            isLoading = true;
            playBtn.disabled = true;
            playBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            loadingElement.style.display = "block";
            
            if (audioContext.state === 'suspended') {
                await audioContext.resume();
            }
            
            if (audioSource) {
                audioSource.disconnect();
            }
            
            const audioElement = new Audio();
            audioElement.crossOrigin = "anonymous";
            audioElement.src = currentStreamUrl;
            
            audioSource = audioContext.createMediaElementSource(audioElement);
            audioSource.connect(audioContext.destination);
            
            audioElement.play()
                .then(() => {
                    isPlaying = true;
                    playBtn.innerHTML = '<i class="fas fa-pause"></i>';
                })
                .catch(err => {
                    console.error("Playback failed:", err);
                    playBtn.innerHTML = '<i class="fas fa-play"></i>';
                })
                .finally(() => {
                    playBtn.disabled = false;
                    loadingElement.style.display = "none";
                    isLoading = false;
                });
                
            audioElement.addEventListener('ended', () => {
                isPlaying = false;
                playBtn.innerHTML = '<i class="fas fa-play"></i>';
            });
            
        } catch (err) {
            console.error("Error playing audio:", err);
            playBtn.disabled = false;
            loadingElement.style.display = "none";
            isLoading = false;
            playBtn.innerHTML = '<i class="fas fa-play"></i>';
        }
    }

    function stopAudio() {
        if (audioSource) {
            audioSource.disconnect();
        }
        isPlaying = false;
        playBtn.innerHTML = '<i class="fas fa-play"></i>';
    }

    playBtn.addEventListener("click", () => {
        if (isLoading) return;
        
        if (isPlaying) {
            stopAudio();
        } else {
            playAudioStream();
        }
    });

    document.addEventListener("click", function() {
        dropdowns.forEach(dropdown => {
            dropdown.classList.remove("active");
        });
    });
});