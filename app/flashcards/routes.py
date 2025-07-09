# app/flashcards/routes.py
# type: ignore

from gevent import monkey
monkey.patch_all()

from flask import Blueprint, render_template, session, redirect, url_for, request, jsonify, current_app
import json
import requests
import pymupdf

flashcard_bp = Blueprint("flashcards", __name__)

@flashcard_bp.route("/flashcards")
def home():
    if not session.get("user"):
        return redirect(url_for("auth.login"))

    return render_template("flashcards.html")

def get_api_headers():
    headers = {
        "Content-Type": "application/json"
    }
    api_key = current_app.config.get("AI_API_KEY")
    if api_key and api_key.strip() != "your_api_key_here":
        headers["Authorization"] = f"Bearer {api_key.strip()}"
    return headers

@flashcard_bp.route("/flashcards/generate", methods=["POST"])
def generate_flashcards():
    if not session.get("user"):
        return jsonify({"error": "Unauthorized"}), 401
    
    data = request.json

    if not data:
        return jsonify({"error": "No data provided"}), 400
    
    topic = data.get("topic")
    details = data.get("details")

    if not topic or not details:
        return jsonify({"error": "Topic and details are required"}), 400

    prompt = f"The topic is \"{topic}\". Details: \"{details}\""
    payload = {
        "messages": [
            {
                "role": "system",
                "content": (
                    "You must ONLY respond with a valid JSON object and nothing else. "
                    "Do not include explanations, extra text, or markdown. "
                    "Your task is to generate flashcards based on the provided topic and details. "
                    "Your response must follow this exact structure:\n"
                    "{\"SetName\": \"The name of the set of cards\", \"flashcards\": [{\"question\": \"Question text\", \"answer\": \"Answer text\"}]}"
                )
            },
            {
                "role": "user",
                "content": prompt
            }
        ]
    }

    base_url = current_app.config.get("AI_API_URL")
    if not base_url:
        return jsonify({"error": "AI API URL is not set in configuration"}), 500

    try:
        response = requests.post(base_url, json=payload, headers=get_api_headers())
        
        if response.status_code == 200:
            data = response.json()
            content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
            content = json.loads(content)
            if not isinstance(content, dict) or "SetName" not in content or "flashcards" not in content:
                return jsonify({"error": "Invalid response format from AI API"}), 500
            
            return jsonify(content), 200
        else:
            return jsonify({"error": "Failed to generate flashcards", "status_code": response.status_code}), response.status_code
    except requests.RequestException as e:
        return jsonify({"error": "AI API request failed"}), 500
    
    
@flashcard_bp.route("/flashcards/generate_note", methods=["POST"])
def generate_flashcard_from_notes():
    if not session.get("user"):
        return jsonify({"error": "Unauthorized"}), 401
    
    file = request.files.get("file")

    if not file:
        return jsonify({"error": "No file provided"}), 400

    if not file.filename.endswith((".txt", ".pdf")):
        return jsonify({"error": "Invalid file type. Only .txt and .pdf files are allowed"}), 400
    
    try:
        if file.filename.endswith(".txt"):
            text_content = file.read().decode("utf-8")
        else:
            doc = pymupdf.open(stream=file.read(), filetype="pdf")
            text_content = ""
            for page in doc:
                text_content += page.get_text()
        
        if not text_content.strip():
            return jsonify({"error": "File is empty or couldn't be processed"}), 400
        
        prompt = f"Generate flashcards from the following notes:\n{text_content}"
        payload = {
            "messages": [
                {
                    "role": "system",
                    "content": (
                        "You must ONLY respond with a valid JSON object and nothing else. "
                        "Do not include explanations, extra text, or markdown. "
                        "Your task is to generate flashcards based on the provided notes. "
                        "Create a comprehensive set of flashcards covering key concepts. "
                        "Your response must follow this exact structure:\n"
                        "{\"SetName\": \"The name of the set of cards\", \"flashcards\": [{\"question\": \"Question text\", \"answer\": \"Answer text\"}]}"
                    )
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ]
        }

        base_url = current_app.config.get("AI_API_URL")
        if not base_url:
            return jsonify({"error": "AI API URL is not set in configuration"}), 500

        response = requests.post(base_url, json=payload, headers=get_api_headers())
        
        if response.status_code == 200:
            data = response.json()
            content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
            content = json.loads(content)
            if not isinstance(content, dict) or "SetName" not in content or "flashcards" not in content:
                return jsonify({"error": "Invalid response format from AI API"}), 500
            
            return jsonify(content), 200
        else:
            return jsonify({"error": "Failed to generate flashcards", "status_code": response.status_code}), response.status_code
    
    except Exception as e:
        return jsonify({"error": f"File processing failed: {str(e)}"}), 500