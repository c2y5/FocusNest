# app/guest/routes.py
# type: ignore

from flask import Blueprint, session, redirect
import string
import random

guest_bp = Blueprint("guest", __name__)

@guest_bp.route("/guest_mode")
def set_demo_user():
    if "user" in session:
        return redirect("/dashboard")

    gid = "".join(random.choices(string.ascii_uppercase + string.digits, k=8))
    session["user"] = {
        "id": f"guest_{gid}",
        "name": f"Guest {gid}",
        "nickname": f"Guest {gid}",
        "picture": "https://focusnest.amsky.xyz/static/img/default-profile.png",
        "email": f"guest_{gid}@focusnest.amsky.xyz"
    }
    return redirect("/dashboard")