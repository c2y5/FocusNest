# app/music/routes.py
# type: ignore

from flask import Blueprint, render_template, session, redirect, url_for, jsonify, stream_with_context, Response, current_app
import subprocess
from threading import Lock
from collections import defaultdict
from ytmusicapi import YTMusic
import sys
import os
import http.cookiejar

mus_bp = Blueprint("music", __name__, url_prefix="/music")
STREAM_LIST = {
    "SleepAmbient": ["xORCbIptqcc", "Sleep Ambient Radio 💤"],
    "MedievalLofi": ["IxPANmjPaek", "Medieval Lofi Radio 🏰"],
    "SadLofi": ["P6Segk8cr-c", "Sad Lofi Radio ☔"],
    "JazzLofi": ["HuFYqnbVbzY", "Jazz Lofi Radio 🎷"],
    "LofiHipHop": ["jfKfPfyJRdk", "Lofi Hip Hop Radio 📚"],
    "PeacefulPiano": ["TtkFsfOP9QI", "Peaceful Piano Radio 🎹"],
    "AsianLofi": ["Na0w3Mz46GA", "Asian Lofi Radio ⛩️"],
    "DarkAmbient": ["S_MOd40zlYU", "Dark Ambient Radio 🌃"],
    "Synthwave": ["4xDzrJKXOOY", "Synthwave Radio 🌌 "],
}
process_cache = defaultdict(dict)
cache_lock = Lock()

@mus_bp.route("/")
def home():
    print(current_app.root_path)
    if not session.get("user"):
        return redirect(url_for("auth.login"))
    return render_template("music.html")

@mus_bp.route("/list")
def list_streams():
    if not session.get("user"):
        return {"error": "Unauthorized"}, 401
    
    streams = [{"name": data[1], "id": name} for name, data in STREAM_LIST.items()]
    return jsonify(streams)

@mus_bp.route("/get_img/<stream_id>")
def get_stream_data(stream_id):
    if not session.get("user"):
        return {"error": "Unauthorized"}, 401
    
    stream = STREAM_LIST.get(stream_id)
    if not stream:
        return {"error": "Stream not found"}, 404
    
    if os.path.exists(os.path.join(current_app.root_path, "cookies.json")):
        cookie_jar = http.cookiejar.MozillaCookieJar(os.path.join(current_app.root_path, "cookies.json"))
        cookie_jar.load()
        cookies_dict = {cookie.name: cookie.value for cookie in cookie_jar}

        ytmusic = YTMusic(cookies=cookies_dict)
    else:
        ytmusic = YTMusic()
    
    try:
        data = ytmusic.get_song(STREAM_LIST[stream_id][0])
        if not data:
            return {"error": "Song data not found"}, 404
        
        print(data)
        
        thumbnail = data.get("videoDetails", {}).get("thumbnail", {}).get("thumbnails", [])[3]["url"]

        return jsonify({
            "image": thumbnail or "/static/img/music-placeholder.jpg",
        })
    except Exception as e:
        return {"error": str(e)}, 500

@mus_bp.route("/play/<stream_id>")
def play_stream(stream_id):
    track_url = f"https://music.youtube.com/watch?v={STREAM_LIST.get(stream_id, [None])[0]}"
    cmd = [sys.executable, "-m", "yt_dlp",
        "-g", "--no-playlist",
        "--cookies", os.path.join(current_app.root_path, "cookies.txt"),
        track_url
    ]

    if os.path.exists(os.path.join(current_app.root_path, "cookies.txt")):
        cmd.append("--cookies")
        cmd.append(os.path.join(current_app.root_path, "cookies.txt"))

    try:
        stream_url = subprocess.check_output(cmd).decode().strip()

        def generate():
            ffmpeg_cmd = [
                "ffmpeg",
                "-i", stream_url,
                "-f", "mp3",
                "-vn",
                "-loglevel", "quiet",
                "-"
            ]
            with subprocess.Popen(ffmpeg_cmd, stdout=subprocess.PIPE) as proc:
                while True:
                    chunk = proc.stdout.read(1024)
                    if not chunk:
                        break
                    yield chunk

        return Response(stream_with_context(generate()), mimetype="audio/mpeg")

    except subprocess.CalledProcessError as e:
        return jsonify({"error": "Failed to get stream URL", "details": str(e)}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500