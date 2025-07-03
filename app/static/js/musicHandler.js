const audioPlayer = new Audio();

const trackName = document.getElementById("music-track-name");
const trackArtist = document.getElementById("music-track-artist");
const albumArt = document.getElementById("music-album-art");

const playBtn = document.getElementById("music-play");
const nextBtn = document.getElementById("music-next");
const prevBtn = document.getElementById("music-prev");

const progressFill = document.getElementById("music-progress");
const currentTimeDisplay = document.getElementById("music-current-time");
const durationDisplay = document.getElementById("music-duration");

let currentTrackData = null;
let previousTrackData = null;

function loadNewTrack() {
  fetch("/music/get_music?" + new Date().getTime())
    .then(response => response.json())
    .then(data => {
      if (data.error) {
        alert(data.error);
        return;
      }

      previousTrackData = currentTrackData;
      currentTrackData = data;

      audioPlayer.src = data.audio_url;
      audioPlayer.play();

      updateTrackInfo(data.title, data.artist, data.image);
      updatePlayButton();
    })
    .catch(err => console.error("Error loading track:", err));
}

function updateTrackInfo(title, artist, image) {
  trackName.textContent = title || "Unknown Title";
  trackArtist.textContent = artist || "Unknown Artist";
  albumArt.src = image || "/static/img/music-placeholder.jpg";
}

function updatePlayButton() {
  if (audioPlayer.paused) {
    playBtn.innerHTML = '<i class="fas fa-play"></i>';
  } else {
    playBtn.innerHTML = '<i class="fas fa-pause"></i>';
  }
}

playBtn.addEventListener("click", () => {
  if (!audioPlayer.src) {
    loadNewTrack();
  } else if (audioPlayer.paused) {
    audioPlayer.play();
  } else {
    audioPlayer.pause();
  }
  updatePlayButton();
});

nextBtn.addEventListener("click", () => {
  loadNewTrack();
});

prevBtn.addEventListener("click", () => {
  if (previousTrackData) {
    const { audio_url, title, artist, image } = previousTrackData;
    currentTrackData = previousTrackData;

    audioPlayer.src = audio_url;
    audioPlayer.play();

    updateTrackInfo(title, artist, image);
    updatePlayButton();
  }
});

audioPlayer.addEventListener("timeupdate", () => {
  if (audioPlayer.duration) {
    const progressPercent = (audioPlayer.currentTime / audioPlayer.duration) * 100;
    progressFill.style.width = `${progressPercent}%`;

    currentTimeDisplay.textContent = formatTime(audioPlayer.currentTime);
    durationDisplay.textContent = formatTime(audioPlayer.duration);
  }
});

audioPlayer.addEventListener("ended", () => {
  loadNewTrack();
});

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60) || 0;
  const secs = Math.floor(seconds % 60) || 0;
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

window.onload = loadNewTrack;
