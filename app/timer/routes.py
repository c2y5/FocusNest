# app/timer/routes.py
# type: ignore

from flask import Blueprint, render_template, session, redirect, url_for

timer_bp = Blueprint("timer", __name__)

@timer_bp.route("/timer")
def home():
    if not session.get("user"):
        return redirect(url_for("auth.login"))

    return render_template("timer.html")
