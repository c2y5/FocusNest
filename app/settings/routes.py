# app/settings/routes.py
# type: ignore

from flask import Blueprint, render_template, session, redirect, url_for

set_bp = Blueprint("settings", __name__)

@set_bp.route("/settings")
def home():
    if not session.get("user"):
        return redirect(url_for("auth.login"))

    return render_template("settings.html")
