document.addEventListener("DOMContentLoaded", function() {
    const musicPlayer = document.createElement("div");
    musicPlayer.className = "music-player";
    musicPlayer.innerHTML = `
        <img src="/static/img/music-placeholder.jpg" alt="Album Art" class="music-art">
        <div class="music-controls">
            <button class="play-pause-btn">▶</button>
            <div class="loading-spinner" style="display: none;">
                <i class="fas fa-spinner fa-spin"></i>
            </div>
        </div>
    `;
    document.body.appendChild(musicPlayer);

    const audioPlayer = document.createElement("audio");
    audioPlayer.id = "audio-player";
    document.body.appendChild(audioPlayer);

    const playBtn = musicPlayer.querySelector(".play-pause-btn");
    const albumArt = musicPlayer.querySelector(".music-art");
    const loadingSpinner = musicPlayer.querySelector(".loading-spinner");
    let isDragging = false;
    let offsetX, offsetY;
    let isLoading = false;

    fetch("/music/list")
        .then(response => response.json())
        .then(playlists => {
            if (playlists.length > 0) {
                const storedData = localStorage.getItem("lastSelectedPlaylist");
                if (storedData) {
                    const lastSelected = JSON.parse(storedData);
                    const lastPlaylist = playlists.find(p => p.id === lastSelected.id);
                    if (lastPlaylist) {
                        loadTrack(lastPlaylist);
                    } else {
                        loadTrack(playlists[0]);
                    }
                } else {
                    loadTrack(playlists[0]);
                }
            }
        })
        .catch(err => {
            console.error("Error loading playlists:", err);
            albumArt.src = "/static/img/music-placeholder.jpg";
        });

    function loadTrack(playlist) {
        localStorage.setItem("lastSelectedPlaylist", JSON.stringify({ id: playlist.id }));
        audioPlayer.src = `/music/play/${playlist.id}`;
        loadingSpinner.style.display = "block";
        
        fetch(`/music/get_img/${playlist.id}`)
            .then(response => response.json())
            .then(data => {
                if (data.image) {
                    albumArt.src = data.image;
                }
            })
            .catch(err => {
                console.error("Error loading album art:", err);
                albumArt.src = "/static/img/music-placeholder.jpg";
            })
            .finally(() => {
                loadingSpinner.style.display = "none";
            });
    }

    playBtn.addEventListener("click", () => {
        if (isLoading) return;
        
        if (audioPlayer.paused) {
            isLoading = true;
            playBtn.style.display = "none";
            loadingSpinner.style.display = "block";
            
            audioPlayer.play()
                .then(() => {
                    playBtn.textContent = "❚❚";
                })
                .catch(err => {
                    console.error("Playback failed:", err);
                    playBtn.textContent = "▶";
                })
                .finally(() => {
                    playBtn.style.display = "block";
                    loadingSpinner.style.display = "none";
                    isLoading = false;
                });
        } else {
            audioPlayer.pause();
            playBtn.textContent = "▶";
        }
    });

    musicPlayer.addEventListener("mousedown", (e) => {
        isDragging = true;
        musicPlayer.classList.add("dragging");
        offsetX = e.clientX - musicPlayer.getBoundingClientRect().left;
        offsetY = e.clientY - musicPlayer.getBoundingClientRect().top;
        e.preventDefault();
    });

    document.addEventListener("mousemove", (e) => {
        if (!isDragging) return;
        
        const x = e.clientX - offsetX;
        const y = e.clientY - offsetY;
        
        musicPlayer.style.left = `${x}px`;
        musicPlayer.style.top = `${y}px`;
        musicPlayer.style.right = "auto";
        musicPlayer.style.bottom = "auto";
    });

    document.addEventListener("mouseup", () => {
        isDragging = false;
        musicPlayer.classList.remove("dragging");
    });

    audioPlayer.addEventListener("playing", () => {
        playBtn.textContent = "❚❚";
        playBtn.style.display = "block";
        loadingSpinner.style.display = "none";
        isLoading = false;
    });

    audioPlayer.addEventListener("ended", () => {
        playBtn.textContent = "▶";
    });
});