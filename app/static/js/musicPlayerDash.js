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

    let currentSessionId = null;
    let currentStreamId = null;
    let isPlaying = false;
    let isLoading = false;
    let audioElement = null;
    let mediaSource = null;

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
        currentStreamId = playlist.id;
        localStorage.setItem("lastSelectedPlaylist", JSON.stringify({ id: playlist.id }));
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

            if (audioElement) {
                stopAudio();
            }

            if (!currentStreamId) {
                const playlists = await fetch("/music/list").then(r => r.json());
                currentStreamId = playlists[0].id;
            }

            const response = await fetch(`/music/play/${currentStreamId}`);
            currentSessionId = response.headers.get('X-Stream-Session-ID');

            audioElement = new Audio();
            audioElement.crossOrigin = "anonymous";

            if (window.MediaSource) {
                mediaSource = new MediaSource();
                audioElement.src = URL.createObjectURL(mediaSource);

                mediaSource.addEventListener('sourceopen', () => {
                    const sourceBuffer = mediaSource.addSourceBuffer('audio/mpeg');
                    const reader = response.body.getReader();

                    function pushToStream() {
                        reader.read().then(({ done, value }) => {
                            if (done) {
                                if (mediaSource.readyState === 'open') {
                                    mediaSource.endOfStream();
                                }
                                return;
                            }

                            if (!sourceBuffer.updating) {
                                sourceBuffer.appendBuffer(value);
                            }

                            sourceBuffer.addEventListener('updateend', pushToStream, { once: true });
                        }).catch(err => {
                            console.error("Stream error:", err);
                            stopAudio();
                        });
                    }

                    pushToStream();
                });
            } else {
                audioElement.src = `/music/play/${currentStreamId}`;
            }

            audioElement.play()
                .then(() => {
                    isPlaying = true;
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

        } catch (err) {
            console.error("Stream setup failed:", err);
            playBtn.style.display = "block";
            loadingSpinner.style.display = "none";
            isLoading = false;
        }
    }

    function stopAudio() {
        if (audioElement) {
            audioElement.pause();
            audioElement.src = "";
            audioElement.remove();
            audioElement = null;
        }

        if (mediaSource && mediaSource.readyState === "open") {
            mediaSource.endOfStream();
        }
        mediaSource = null;

        isPlaying = false;
        playBtn.textContent = "▶";
    }

    function stopStreamSession(destinationUrl) {

        const nextUrl = (destinationUrl && typeof destinationUrl === 'string') 
            ? destinationUrl 
            : window.location.href;

        if (currentSessionId) {
            const formData = new FormData();
            formData.append('next_url', nextUrl);
            navigator.sendBeacon(`/music/stop_stream/${currentSessionId}`, formData);
            currentSessionId = null;
        }
        stopAudio();

        if (nextUrl !== window.location.href) {
            setTimeout(() => {
                window.location.href = nextUrl;
            }, 100);
        }
    }

    playBtn.addEventListener("click", () => {
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

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
            stopStreamSession();
        }
    });

    window.addEventListener('beforeunload', () => stopStreamSession());

    document.addEventListener('click', (e) => {
        const link = e.target.closest('a');
        if (link && link.href && !link.hasAttribute('data-no-reload')) {

            if (link.protocol === 'javascript:' || 
                link.hasAttribute('download') || 
                link.target === '_blank') {
                return;
            }

            e.preventDefault();
            stopStreamSession(link.href);
        }
    });

    document.addEventListener('submit', (e) => {
        if (e.target.method.toLowerCase() === 'get') {
            e.preventDefault();
            const formData = new FormData(e.target);
            const params = new URLSearchParams(formData).toString();
            const actionUrl = e.target.action.includes('?') 
                ? `${e.target.action}&${params}`
                : `${e.target.action}?${params}`;
            stopStreamSession(actionUrl);
        }
    });

});