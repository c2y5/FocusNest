# app/auth/routes.py
# type: ignore

from flask import Blueprint, redirect, session, url_for, jsonify
from authlib.integrations.flask_client import OAuth
from flask import current_app as cpp
import requests

auth_bp = Blueprint("auth", __name__)
oauth = OAuth()

def config_oauth(app):
    oauth.init_app(app)
    oauth.register(
        "auth0",
        client_id=app.config["AUTH0_CLIENT_ID"],
        client_secret=app.config["AUTH0_CLIENT_SECRET"],
        client_kwargs={"scope": "openid profile email"},
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
    session.clear()
    return redirect(
        f"https://{cpp.config['AUTH0_DOMAIN']}/v2/logout?returnTo={url_for('index', _external=True)}&client_id={cpp.config['AUTH0_CLIENT_ID']}"
    )

@auth_bp.route("/link/<provider>")
def link_account(provider):
    if "user" not in session:
        return redirect("/login")
    
    session["linking_provider"] = provider

    return oauth.auth0.authorize_redirect(
        redirect_uri=cpp.config["AUTH0_LINK_CALLBACK_URL"],
        prompt="login",
        connection=provider
    )

@auth_bp.route("/link-callback")
def link_callback():
    if "user" not in session or "linking_provider" not in session:
        return redirect("/login")
    
    token = oauth.auth0.authorize_access_token()
    secondary_info = token["userinfo"]

    primary_user_id = session["user"]["id"]
    secondary_user_id = secondary_info["sub"]

    domain = cpp.config["AUTH0_DOMAIN"]
    mgmt_token = get_management_api_token()
    headers = {"Authorization": f"Bearer {mgmt_token}"}

    url = f"https://{domain}/api/v2/users/{primary_user_id}/identities"
    payload = {
        "provider": secondary_user_id.split("|")[0],
        "user_id": secondary_user_id.split("|")[1],
    }

    response = requests.post(url, json=payload, headers=headers)

    if response.status_code == 201:
        return redirect("/dashboard")
    else:
        return jsonify({"error": "Failed to link account", "details": response.json()}), 400
    
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