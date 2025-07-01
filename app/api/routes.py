# app/api/routes.py
# type: ignore

from flask import Blueprint, session, request, jsonify
from app import mongo
from bson.objectid import ObjectId
import datetime
import math
import requests

api_bp = Blueprint("api", __name__, url_prefix="/api")

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
                "preferedName": "",
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

        return jsonify(settings)
    elif request.method == "POST":
        data = request.json
        data["user_id"] = session["user"]["id"]

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