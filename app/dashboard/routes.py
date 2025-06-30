# app/dashboard/routes.py
# type: ignore

from flask import Blueprint, render_template, session, redirect, url_for, request, jsonify
from app import mongo
from bson.objectid import ObjectId

dashboard_bp = Blueprint("dashboard", __name__)

@dashboard_bp.route("/dashboard")
def home():
    if not session.get("user"):
        return redirect(url_for("auth.login"))

    return render_template("dashboard.html")
