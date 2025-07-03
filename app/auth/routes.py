# app/auth/routes.py
# type: ignore

from flask import Blueprint, redirect, session, url_for, jsonify, request
from authlib.integrations.flask_client import OAuth
from flask import current_app as cpp
import requests
import re
from datetime import datetime, timedelta, timezone
from app import mongo

auth_bp = Blueprint("auth", __name__)
oauth = OAuth()

def config_oauth(app):
    oauth.init_app(app)

    oauth.register(
        "auth0",
        client_id=app.config["AUTH0_CLIENT_ID"],
        client_secret=app.config["AUTH0_CLIENT_SECRET"],
        client_kwargs={
            "scope": "openid profile email offline_access user-read-playback-state user-modify-playback-state user-read-currently-playing streaming"
        },
        server_metadata_url=f"https://{app.config['AUTH0_DOMAIN']}/.well-known/openid-configuration"
    )

@auth_bp.route("/login")
def login():
    return oauth.auth0.authorize_redirect(redirect_uri=cpp.config["AUTH0_CALLBACK_URL"], prompt="login")

@auth_bp.route("/callback")
def callback():
    token = oauth.auth0.authorize_access_token()
    userinfo = token["userinfo"]
    session["user"] = {
        "id": userinfo["sub"],
        "name": userinfo["name"],
        "email": userinfo["email"],
        "picture": userinfo["picture"],
        "nickname": userinfo["nickname"]
    }

    return redirect("/dashboard")

@auth_bp.route("/logout")
def logout():
    if "user" not in session:
        return redirect("/")
    
    if re.match("^guest_[A-Z0-9]{8}$", session["user"]["id"]):
        session.clear()
        return redirect("/")

    session.clear()
    return redirect(
        f"https://{cpp.config['AUTH0_DOMAIN']}/v2/logout?returnTo={url_for('index', _external=True)}&client_id={cpp.config['AUTH0_CLIENT_ID']}"
    )

@auth_bp.route("/link/<provider>")
def link_account(provider):
    if "user" not in session:
        return redirect("/login")
    
    if re.match("^guest_[A-Z0-9]{8}$", session["user"]["id"]):
        return jsonify({"error": "Guest accounts cannot link to other providers"}), 403
    
    if "return_to" in request.args:
        session["return_to"] = request.args["return_to"]
    
    session["linking_provider"] = provider

    return oauth.auth0.authorize_redirect(
        redirect_uri=cpp.config["AUTH0_LINK_CALLBACK_URL"],
        prompt="login",
        connection=provider,
        max_age=0
    )

@auth_bp.route("/link-callback")
def link_callback():
    if "user" not in session or "linking_provider" not in session:
        return redirect("/login")

    if re.match("^guest_[A-Z0-9]{8}$", session["user"]["id"]):
        return jsonify({"error": "Guest accounts cannot link to other providers"}), 403
    
    error = request.args.get("error")
    if error == "access_denied":
        return redirect("/settings")

    return_to = session.pop("return_to", None)

    token = oauth.auth0.authorize_access_token()

    secondary_info = token.get("userinfo", {})
    secondary_user_id = secondary_info.get("user_id") or secondary_info.get("sub")

    if not secondary_user_id:
        return jsonify({"error": "No secondary identity returned"}), 400

    if secondary_user_id == session["user"]["id"]:
        return jsonify({"error": "Cannot link the same account"}), 400

    parts = secondary_user_id.split("|")
    if len(parts) == 2:
        provider, user_id = parts
    elif len(parts) == 3:
        provider = parts[0]
        user_id = f"{parts[1]}|{parts[2]}"
    else:
        return jsonify({"error": "Unknown identity format", "sub": secondary_user_id}), 400

    domain = cpp.config["AUTH0_DOMAIN"]
    mgmt_token = get_management_api_token()
    headers = {"Authorization": f"Bearer {mgmt_token}"}
    payload = {
        "provider": provider,
        "user_id": user_id
    }

    primary_user_id = session["user"]["id"]
    url = f"https://{domain}/api/v2/users/{primary_user_id}/identities"
    response = requests.post(url, json=payload, headers=headers)

    if response.status_code == 201:
        return redirect(return_to or "/settings")
    else:
        return jsonify({
            "error": "Failed to link account",
            "details": response.json()
        }), 400

@auth_bp.route("/is_linked/<provider>")
def is_linked(provider):
    if "user" not in session:
        return jsonify({"is_linked": False}), 200
    
    if re.match("^guest_[A-Z0-9]{8}$", session["user"]["id"]):
        return jsonify({"is_linked": False}), 200
    
    user_id = session["user"]["id"]
    domain = cpp.config["AUTH0_DOMAIN"]
    mgmt_token = get_management_api_token()
    headers = {"Authorization": f"Bearer {mgmt_token}"}

    try:
        url = f"https://{domain}/api/v2/users/{user_id}"
        response = requests.get(url, headers=headers)
        response.raise_for_status()

        user_data = response.json()
        identities = user_data.get("identities", [])

        linked = any(
            identity["connection"] == provider for identity in identities
        )

        return jsonify({"is_linked": linked}), 200
    except requests.exceptions.RequestException as e:
        cpp.logger.error(f"Error checking linked accounts: {e}")
        return jsonify({"error": "Failed to check linked accounts"}), 500

@auth_bp.route("/unlink/<provider>", methods=["POST"])
def unlink_account(provider):
    if "user" not in session:
        return redirect("/login")
    
    if re.match("^guest_[A-Z0-9]{8}$", session["user"]["id"]):
        return jsonify({"error": "Guest accounts cannot unlink providers"}), 403
    
    user_id = session["user"]["id"]
    domain = cpp.config["AUTH0_DOMAIN"]
    mgmt_token = get_management_api_token()
    headers = {"Authorization": f"Bearer {mgmt_token}"}

    url = f"https://{domain}/api/v2/users/{user_id}"
    response = requests.get(url, headers=headers)

    if response.status_code != 200:
        return jsonify({"error": "Failed to retrieve user identities"}), 500
    
    identities = response.json().get("identities", [])
    target_identity = next(
        (identity for identity in identities if identity["connection"] == provider), None
    )

    if not target_identity:
        return jsonify({"error": "Provider not linked"}), 400
    
    if len(identities) <= 1:
        return jsonify({"error": "Cannot unlink the only identity"}), 400
    
    provider_name = target_identity["provider"]
    user_id_unlink = target_identity["user_id"]

    unlink_url = f"https://{domain}/api/v2/users/{user_id}/identities/{provider_name}/{user_id_unlink}"
    unlink_response = requests.delete(unlink_url, headers=headers)

    if unlink_response.status_code == 200:
        return jsonify({"success": True}), 200
    else:
        return jsonify({"error": "Failed to unlink account", "details": unlink_response.json()}), 400

def get_management_api_token():
    domain = cpp.config["AUTH0_DOMAIN"]
    audience_domain = cpp.config["AUTH0_AUDIENCE_DOMAIN"]
    client_id = cpp.config["AUTH0_CLIENT_ID"]
    client_secret = cpp.config["AUTH0_CLIENT_SECRET"]
    audience = f"https://{audience_domain}/api/v2/"
    token_url = f"https://{domain}/oauth/token"

    response = requests.post(token_url, json={
        "grant_type": "client_credentials",
        "client_id": client_id,
        "client_secret": client_secret,
        "audience": audience
    })

    return response.json()["access_token"]