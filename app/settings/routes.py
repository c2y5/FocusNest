# app/settings/routes.py
# type: ignore

from flask import Blueprint, render_template, session, redirect, url_for
import re

set_bp = Blueprint("settings", __name__)

@set_bp.route("/settings")
def home():
    if not session.get("user"):
        return redirect(url_for("auth.login"))

    if re.match("^guest_[A-Z0-9]{8}$", session["user"]["id"]):
        return render_template("settingsLocked.html")

    return render_template("settings.html")
