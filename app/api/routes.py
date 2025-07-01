# app/api/routes.py
# type: ignore

from flask import Blueprint, session, request, jsonify
from app import mongo
from bson.objectid import ObjectId
import datetime
import math

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
            return jsonify({"error": "Settings not found"}), 404
        
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
        
    return jsonify({"error": "Method not allowed"}), 405