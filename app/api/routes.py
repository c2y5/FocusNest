# app/api/routes.py
# type: ignore

from flask import Blueprint, session, request, jsonify, current_app
from app import mongo
from bson.objectid import ObjectId
import datetime
import math
import requests
import re
from PIL import Image
import imghdr
import os
import random
import string
from io import BytesIO

api_bp = Blueprint("api", __name__, url_prefix="/api")

ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg"}

def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS

def is_image(file_stream):
    file_type = imghdr.what(file_stream)
    if file_type not in ALLOWED_EXTENSIONS:
        return False
    
    try:
        img = Image.open(file_stream)
        img.verify()
        file_stream.seek(0)
        return True
    except:
        return False

@api_bp.route("tasks", methods=["GET", "POST", "DELETE", "PATCH"])
def tasks():
    if not session.get("user"):
        return jsonify({"error": "Unauthorized"}), 401
    
    if request.method == "GET":
        tasks = list(mongo.db.tasks.find({"user_id": session["user"]["id"]}))

        for task in tasks:
            task["_id"] = str(task["_id"])

        return jsonify(tasks)
    elif request.method == "POST":
        data = request.json
        data["user_id"] = session["user"]["id"]
        data["completed"] = False

        if "title" not in data or not data["title"]:
            return jsonify({"error": "Title is required"}), 400
        
        result = mongo.db.tasks.insert_one(data)

        return jsonify({"_id": str(result.inserted_id)}), 200
    elif request.method == "DELETE":
        task_id = request.json.get("task_id")

        if not task_id:
            return jsonify({"error": "Task ID is required"}), 400
        
        try:
            obj_id = ObjectId(task_id)
        except Exception as e:
            return jsonify({"error": f"Invalid ObjectId: {e}"}), 400
        
        task = mongo.db.tasks.find_one({"_id": obj_id, "user_id": session["user"]["id"]})

        if not task:
            return jsonify({"error": "No task found with that ID"}), 404
        
        mongo.db.tasks.delete_one({"_id": ObjectId(task_id), "user_id": session["user"]["id"]})

        return jsonify({"status": "success"}), 200
    elif request.method == "PATCH":
        task_id = request.json.get("task_id")
        update_data = request.json.get("update_data", {})

        try:
            obj_id = ObjectId(task_id)
        except Exception as e:
            return jsonify({"error": f"Invalid ObjectId: {e}"}), 400
        
        task = mongo.db.tasks.find_one({"_id": obj_id})

        if not task:
            return jsonify({"error": "No task found with that ID"}), 404
        
        result = mongo.db.tasks.update_one(
            {"_id": obj_id, "user_id": session["user"]["id"]},
            {"$set": update_data}
        )

        if result.matched_count == 0:
            return jsonify({"error": "No matching task found"}), 404

        return jsonify({"status": "success"}), 200
    
    return jsonify({"error": "Method not allowed"}), 405

@api_bp.route("settings", methods=["GET", "POST"])
def settings():
    if not session.get("user"):
        return jsonify({"error": "Unauthorized"}), 401
    
    if request.method == "GET":
        settings = mongo.db.settings.find_one({"user_id": session["user"]["id"]})

        if not settings:
            settings = {
                "preferredName": "",
                "preferredPicture": "",
                "pomodoroTimer": {
                    "workDuration": 25,
                    "shortBreakDuration": 5,
                    "longBreakDuration": 15,
                    "longBreakInterval": 4,
                    "autoStartShortBreak": True,
                    "autoStartLongBreak": True,
                    "autoStartWork": True
                }
            }

            mongo.db.settings.update_one(
                {"user_id": session["user"]["id"]},
                {"$set": settings},
                upsert=True
            )

            return settings, 200
        
        settings["_id"] = str(settings["_id"])
        if not settings["preferredPicture"]:
            settings["preferredPicture"] = session["user"]["picture"]

        return jsonify(settings)
    elif request.method == "POST":
        data = request.json
        data["user_id"] = session["user"]["id"]

        if re.match("^guest_[A-Z0-9]{8}$", session["user"]["id"]):
            if "preferredName" in data and data["preferredName"]:
                return jsonify({"error": "Guest users cannot change their preferred name"}), 403

        mongo.db.settings.update_one(
            {"user_id": session["user"]["id"]},
            {"$set": data},
            upsert=True
        )

        return jsonify({"status": "success"}), 200
    
    return jsonify({"error": "Method not allowed"}), 405

@api_bp.route("@me", methods=["GET"])
def me():
    if not session.get("user"):
        return jsonify({"error": "Unauthorized"}), 401

    data = {
        "name": session["user"]["name"],
        "nickname": session["user"]["nickname"],
        "picture": session["user"]["picture"]
    }
    return data

@api_bp.route("emotion", methods=["POST", "GET"])
def log_emotion():
    if not session.get("user"):
        return jsonify({"error": "Unauthorized"}), 401
    
    if request.method == "POST":
        data = request.json
        emotion = data.get("emotion")

        if not emotion:
            return jsonify({"error": "Emotion is required"}), 400
        
        user_id = session["user"]["id"]
        last_log = mongo.db.emotions.find_one(
            {"user_id": user_id},
            sort=[("timestamp", -1)]
        )
        
        if last_log:
            last_log_time = last_log["timestamp"]
            current_time = datetime.datetime.now(datetime.timezone.utc)
            
            if last_log_time.tzinfo is None:
                last_log_time = last_log_time.replace(tzinfo=datetime.timezone.utc)
                
            time_since_last = (current_time - last_log_time).total_seconds()

            if time_since_last < 1800:
                remaining_time = 1800 - time_since_last
                minutes = int(remaining_time // 60)
                seconds = int(remaining_time % 60)
                return jsonify({
                    "error": f"You can only log emotions once every 30 minutes. Please wait {minutes}m {seconds}s."
                }), 429

        log_entry = {
            "user_id": user_id,
            "emotion": emotion,
            "timestamp": datetime.datetime.now(datetime.timezone.utc)
        }

        try:
            mongo.db.emotions.insert_one(log_entry)
        except Exception as e:
            return jsonify({"error": f"Failed to log emotion: {e}"}), 500

        return jsonify({"status": "success"}), 200
    elif request.method == "GET":
        user_id = session["user"]["id"]
        last_log = mongo.db.emotions.find_one(
            {"user_id": user_id},
            sort=[("timestamp", -1)]
        )

        if not last_log:
            return jsonify({"can_log": True}), 200
        
        last_log_time = last_log["timestamp"]
        current_time = datetime.datetime.now(datetime.timezone.utc)
            
        if last_log_time.tzinfo is None:
            last_log_time = last_log_time.replace(tzinfo=datetime.timezone.utc)
            
        time_since_last = (current_time - last_log_time).total_seconds()
        
        if time_since_last < 1800:
            remaining_time = 1800 - time_since_last
            return jsonify({
                "can_log": False,
                "remaining_time": math.ceil(remaining_time)
            }), 200
        
        return jsonify({"can_log": True}), 200
    
    return jsonify({"error": "Method not allowed"}), 405

@api_bp.route("streak", methods=["GET", "POST"])
def streak():
    if not session.get("user"):
        return jsonify({"error": "Unauthorized"}), 401
    
    if request.method == "GET":
        user_id = session["user"]["id"]
        streak_data = mongo.db.streaks.find_one({"user_id": user_id})

        if not streak_data:
            return jsonify({"streak": 0, "last_logged": None, "can_log": True}), 200
        
        last_logged = streak_data["last_logged"]

        if last_logged.tzinfo is None:
            last_logged = last_logged.replace(tzinfo=datetime.timezone.utc)

        current_time = datetime.datetime.now(datetime.timezone.utc)

        if (current_time - last_logged).days == 1:
            streak_data["can_log"] = True
        elif (current_time - last_logged).days >= 2:
            streak_data["can_log"] = True
            streak_data["streak"] = 0
            mongo.db.streaks.update_one(
                {"user_id": user_id},
                {"$set": streak_data},
                upsert=True
            )
        else:
            streak_data["can_log"] = False
            streak_data["remaining_time"] = math.ceil((last_logged + datetime.timedelta(days=1) - current_time).total_seconds())

        return jsonify(streak_data), 200
    elif request.method == "POST":
        user_id = session["user"]["id"]
        
        streak_data = mongo.db.streaks.find_one({"user_id": user_id})

        if not streak_data:
            streak_data = {
                "user_id": user_id,
                "streak": 1,
                "last_logged": datetime.datetime.now(datetime.timezone.utc)
            }
        else:
            last_logged = streak_data["last_logged"]

            if last_logged.tzinfo is None:
                last_logged = last_logged.replace(tzinfo=datetime.timezone.utc)

            current_time = datetime.datetime.now(datetime.timezone.utc)

            if (current_time - last_logged).days == 1:
                streak_data["streak"] += 1
            elif (current_time - last_logged).days >= 2:
                streak_data["streak"] = 1
            else:
                return jsonify({"error": "Streak can only be updated once per day"}), 400
            
            streak_data["last_logged"] = current_time

        try:
            mongo.db.streaks.update_one(
                {"user_id": user_id},
                {"$set": streak_data},
                upsert=True
            )
        except Exception as e:
            return jsonify({"error": f"Failed to update streak: {e}"}), 500
            
        return jsonify({"status": "success", "streak": streak_data["streak"]}), 200
    
@api_bp.route("quote", methods=["GET"])
def get_quote():
    if not session.get("user"):
        return jsonify({"error": "Unauthorized"}), 401
    
    try:
        r = requests.get(url="https://api.realinspire.live/v1/quotes/random", timeout=2).json()
        return jsonify({
            "quote": r[0]["content"] if r[0]["content"].startswith('"') else f'"{r[0]["content"]}"',
        }), 200
    except:
        return jsonify({"quote": '"The secret of getting ahead is getting started."'}), 200
    
@api_bp.route("avatar/upload", methods=["POST"])
def upload_avatar():
    if not session.get("user"):
        return jsonify({"error": "Unauthorized"}), 401
    
    if "file" not in request.files:
        return jsonify({"error": "No file part"}), 400
    
    file = request.files["file"]

    if file.filename == "":
        return jsonify({"error": "No selected file"}), 400
    
    if file and allowed_file(file.filename):
        settings = mongo.db.settings.find_one({"user_id": session["user"]["id"]})

        if settings["preferredPicture"] and settings["preferredPicture"].startswith("/static/avatars/"):
            old_avatar_path = os.path.join(current_app.root_path, settings["preferredPicture"].lstrip("/"))
            if os.path.exists(old_avatar_path):
                os.remove(old_avatar_path)

        ext = file.filename.rsplit(".", 1)[1].lower()
        _r = "".join(random.choices(string.ascii_letters + string.digits, k=12))
        filename = f"avatar_{_r}.{ext}"

        if not is_image(file.stream):
            return jsonify({"error": "File is not a valid image"}), 400
        
        file.stream.seek(0)

        try:
            img = Image.open(file.stream).convert("RGBA" if ext=="png" else "RGB")
        except Exception:
            return jsonify({"error": "Failed to process image"}), 400

        img = img.resize((512, 512))

        img_io = BytesIO()
        img.save(img_io, format=img.format or "PNG")
        img_io.seek(0)

        upload_folder = os.path.join(current_app.root_path, "static", "avatars")

        os.makedirs(upload_folder, exist_ok=True)

        file_path = os.path.join(upload_folder, filename)
        with open(file_path, "wb") as f:
            f.write(img_io.read())

        settings["preferredPicture"] = f"/static/avatars/{filename}"

        mongo.db.settings.update_one(
            {"user_id": session["user"]["id"]},
            {"$set": settings},
            upsert=True
        )

        return jsonify({
            "status": "success",
            "file_path": f"/static/avatars/{filename}"
        }), 200
    
    return jsonify({"error": "Invalid file type"}), 400

@api_bp.route("timer_session", methods=["GET", "POST"])
def timer_session():
    if not session.get("user"):
        return jsonify({"error": "Unauthorized"}), 401
    
    if not session.get("timer_session"):
        return jsonify({"error": "No timer session found"}), 404

    if request.method == "GET":
        return jsonify(session["timer_session"]), 200
    elif request.method == "POST":
        if not request.json:
            return jsonify({"error": "Invalid request"}), 400
        
        data = request.json

        session["timer_session"] = {
            "current_state": data.get("current_state"),
            "work_time": data.get("work_time"),
            "short_break_time": data.get("short_break_time"),
            "long_break_time": data.get("long_break_time"),
            "current_phase": data.get("current_phase"),
            "is_running": data.get("is_running")
        }

        return "", 200
    
    return jsonify({"error": "Method not allowed"}), 405
