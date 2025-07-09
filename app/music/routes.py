from flask import Blueprint, render_template, session, redirect, url_for, jsonify, stream_with_context, Response, current_app
import subprocess
from threading import Lock
from collections import defaultdict
import sys
import os
from threading import Thread, Event
from queue import Queue, Empty
import uuid
import time

mus_bp = Blueprint("music", __name__, url_prefix="/music")
STREAM_LIST = {
    "SleepAmbient": ["xORCbIptqcc", "Sleep Ambient Radio 💤", "https://hc-cdn.hel1.your-objectstorage.com/s/v3/4ee10b4146dd2d98b71a981fceaf647c62c33237_image.png"],
    "MedievalLofi": ["IxPANmjPaek", "Medieval Lofi Radio 🏰", "https://hc-cdn.hel1.your-objectstorage.com/s/v3/fdcbd7379b8e25842138047a89fbc2b4f5bbf066_image.png"],
    "SadLofi": ["P6Segk8cr-c", "Sad Lofi Radio ☔", "https://hc-cdn.hel1.your-objectstorage.com/s/v3/b2b997a6c75d3f904c2ccf8b6cb47dd3abd696c4_image.png"],
    "JazzLofi": ["HuFYqnbVbzY", "Jazz Lofi Radio 🎷", "https://hc-cdn.hel1.your-objectstorage.com/s/v3/6cb7855e38c930d8a714f88a5c638e9fc5fad335_image.png"],
    "LofiHipHop": ["jfKfPfyJRdk", "Lofi Hip Hop Radio 📚", "https://hc-cdn.hel1.your-objectstorage.com/s/v3/8385b18409de45d06dfdc20199d2d8ee95f8072a_image.png"],
    "PeacefulPiano": ["TtkFsfOP9QI", "Peaceful Piano Radio 🎹", "https://hc-cdn.hel1.your-objectstorage.com/s/v3/91842587e09607fe599ecb291aed3bfb3075eb2c_image.png"],
    "AsianLofi": ["Na0w3Mz46GA", "Asian Lofi Radio ⛩️", "https://hc-cdn.hel1.your-objectstorage.com/s/v3/6dae2c9a96d67d9c69c3ba8cf445423f5a511354_image.png"],
    "DarkAmbient": ["S_MOd40zlYU", "Dark Ambient Radio 🌃", "https://hc-cdn.hel1.your-objectstorage.com/s/v3/f5e1e8045b71469c2551b768b621d7283908edc5_image.png"],
    "Synthwave": ["4xDzrJKXOOY", "Synthwave Radio 🌌 ", "https://hc-cdn.hel1.your-objectstorage.com/s/v3/f3520bf7d57f1cebc53f5a024d7c8974f38adf2f_image.png"],
}

ACTIVE_STREAMS = {}

process_cache = defaultdict(dict)
cache_lock = Lock()

@mus_bp.route("/")
def home():
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

    try:
        thumbnail = STREAM_LIST[stream_id][2]
        return jsonify({
            "image": thumbnail or "/static/img/music-placeholder.jpg",
        })
    except Exception as e:
        return {"error": str(e)}, 500

def ffmpeg_worker(app_context, session_id, stream_url, stream_id, data_queue, stop_event):
    """Worker function that runs in its own thread"""
    with app_context:
        try:
            ffmpeg_cmd = [
                "ffmpeg",
                "-i", stream_url,
                "-f", "mp3",
                "-vn",
                "-loglevel", "quiet",
                "-"
            ]
            proc = subprocess.Popen(ffmpeg_cmd, 
                                  stdout=subprocess.PIPE,
                                  stderr=subprocess.PIPE,
                                  bufsize=1024)

            ACTIVE_STREAMS[session_id] = {
                'process': proc,
                'stop_event': stop_event,
                'last_active': time.time(),
                'stream_id': stream_id  
            }

            while not stop_event.is_set():
                chunk = proc.stdout.read(1024)
                if not chunk:
                    data_queue.put(None)
                    break
                data_queue.put(chunk)
                ACTIVE_STREAMS[session_id]['last_active'] = time.time()

        except Exception as e:
            current_app.logger.error(f"FFmpeg worker error in session {session_id}: {e}")
            data_queue.put(None)
        finally:
            if proc.poll() is None:
                proc.terminate()
                try:
                    proc.wait(timeout=2)
                except subprocess.TimeoutExpired:
                    proc.kill()
            ACTIVE_STREAMS.pop(session_id, None)

@mus_bp.route("/play/<stream_id>")
def play_stream(stream_id):
    if not stream_id or stream_id not in STREAM_LIST:
        return jsonify({"error": "Invalid stream ID"}), 400

    session_id = str(uuid.uuid4())
    track_url = f"https://music.youtube.com/watch?v={STREAM_LIST.get(stream_id, [None])[0]}"
    cmd = [sys.executable, "-m", "yt_dlp",
           "-g", "--no-playlist"
          ]

    if os.path.exists(os.path.join(current_app.root_path, "cookies.txt")):
        cmd.append("--cookies")
        cmd.append(os.path.join(current_app.root_path, "cookies.txt"))

    cmd.append(track_url)

    try:
        stream_url = subprocess.check_output(cmd).decode().strip()
        current_app.logger.info(f"Stream URL obtained for session {session_id}")

        def generate():
            data_queue = Queue(maxsize=10)
            stop_event = Event()
            app_context = current_app.app_context()

            worker = Thread(
                target=ffmpeg_worker,
                args=(app_context, session_id, stream_url, stream_id, data_queue, stop_event),  
                daemon=True
            )
            worker.start()

            try:
                while True:

                    if time.time() - ACTIVE_STREAMS.get(session_id, {}).get('last_active', time.time()) > 5:
                        current_app.logger.info(f"Inactivity timeout for {session_id}")
                        stop_event.set()
                        break

                    try:
                        chunk = data_queue.get(timeout=1)
                        if chunk is None:
                            break
                        yield chunk
                    except Empty:
                        continue
            except GeneratorExit:
                current_app.logger.info(f"Client disconnected from {session_id}")
                stop_event.set()
            finally:
                stop_event.set()
                worker.join(timeout=1)
                ACTIVE_STREAMS.pop(session_id, None)
                current_app.logger.info(f"Session {session_id} terminated")

        return Response(
            stream_with_context(generate()),
            mimetype="audio/mpeg",
            headers={
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                'X-Stream-Session-ID': session_id
            }
        )

    except subprocess.CalledProcessError as e:
        current_app.logger.error(f"Failed to get stream URL: {e}")
        return jsonify({"error": "Failed to get stream URL", "details": str(e)}), 500
    except Exception as e:
        current_app.logger.error(f"Unexpected error: {e}")
        return jsonify({"error": str(e)}), 500

@mus_bp.route("/stop_stream/<session_id>", methods=['POST'])
def stop_stream(session_id):
    stream_info = ACTIVE_STREAMS.get(session_id)
    if not stream_info:
        return jsonify({"status": "not found"}), 404

    stream_info['stop_event'].set()
    if stream_info['process'].poll() is None:
        stream_info['process'].terminate()

    ACTIVE_STREAMS.pop(session_id, None)
    return jsonify({"status": "stopped"})