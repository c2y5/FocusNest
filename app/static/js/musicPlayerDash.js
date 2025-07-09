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

    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    let audioSource = null;
    let isPlaying = false;
    let isLoading = false;
    let currentStreamUrl = null;

    const playBtn = musicPlayer.querySelector(".play-pause-btn");
    const albumArt = musicPlayer.querySelector(".music-art");
    const loadingSpinner = musicPlayer.querySelector(".loading-spinner");

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
        currentStreamUrl = `/music/play/${playlist.id}`;
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

    async function playAudioStream() {
        try {
            isLoading = true;
            playBtn.style.display = "none";
            loadingSpinner.style.display = "block";
            
            if (audioContext.state === 'suspended') {
                await audioContext.resume();
            }
            
            if (audioSource) {
                audioSource.stop();
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
                    playBtn.style.display = "block";
                    loadingSpinner.style.display = "none";
                    isLoading = false;
                });
                
            audioElement.addEventListener('ended', () => {
                isPlaying = false;
                playBtn.innerHTML = '<i class="fas fa-play"></i>';
            });
            
        } catch (err) {
            console.error("Error playing audio:", err);
            playBtn.style.display = "block";
            loadingSpinner.style.display = "none";
            isLoading = false;
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

    let isDragging = false;
    let offsetX, offsetY;

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
});