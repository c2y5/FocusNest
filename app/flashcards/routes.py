# app/flashcards/routes.py
# type: ignore

from flask import Blueprint, render_template, session, redirect, url_for

flashcard_bp = Blueprint("flashcards", __name__)

@flashcard_bp.route("/flashcards")
def home():
    if not session.get("user"):
        return redirect(url_for("auth.login"))

    return render_template("flashcards.html")
