# app/music/routes.py
# type: ignore

from flask import Blueprint, render_template, session, redirect, url_for

mus_bp = Blueprint("music", __name__)

@mus_bp.route("/music")
def home():
    if not session.get("user"):
        return redirect(url_for("auth.login"))

    return render_template("music.html")
