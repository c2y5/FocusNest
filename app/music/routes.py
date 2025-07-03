# app/music/routes.py
# type: ignore

from flask import Blueprint, render_template, session, redirect, url_for, jsonify, current_app
import os
import random
import base64
from mutagen.mp3 import MP3
from mutagen.id3 import ID3
mus_bp = Blueprint("music", __name__, url_prefix="/music")

@mus_bp.route("/")
def home():
    if not session.get("user"):
        return redirect(url_for("auth.login"))
    return render_template("music.html")

@mus_bp.route("/get_music")
def get_music():
    if not session.get("user"):
        return redirect(url_for("auth.login"))
    
    MUSIC_FOLDER = os.path.join(current_app.root_path, "static", "music")

    music_files = [f for f in os.listdir(MUSIC_FOLDER) if f.endswith(".mp3")]
    if not music_files:
        return jsonify({"error": "No music files found"}), 404

    previous = session.get("previous_music")
    choices = [f for f in music_files if f != previous] or music_files
    selected_file = random.choice(choices)
    session["previous_music"] = selected_file

    audio_url = url_for("static", filename=f"music/{selected_file}")
    file_path = os.path.join(MUSIC_FOLDER, selected_file)

    title = os.path.splitext(selected_file)[0]
    artist = "Unknown Artist"
    image_data_url = "/static/img/music-placeholder.jpg"

    try:
        audio = MP3(file_path, ID3=ID3)
        tags = ID3(file_path)

        title = tags.get("TIT2").text[0] if tags.get("TIT2") else title
        artist = tags.get("TPE1").text[0] if tags.get("TPE1") else "Unknown Artist"

        if tags.get("APIC:"):
            album_art = tags.get("APIC:").data
            encoded_image = base64.b64encode(album_art).decode("utf-8")
            mime = tags.get("APIC:").mime
            image_data_url = f"data:{mime};base64,{encoded_image}"
    except Exception as e:
        print(f"Error reading metadata: {e}")

    return jsonify({
        "audio_url": audio_url,
        "title": title,
        "artist": artist,
        "image": image_data_url
    })
