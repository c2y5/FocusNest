# app/auth/routes.py
# type: ignore

from flask import Blueprint, redirect, session, url_for
from authlib.integrations.flask_client import OAuth
from flask import current_app as cpp

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
    return oauth.auth0.authorize_redirect(redirect_uri=cpp.config["AUTH0_CALLBACK_URL"])

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
