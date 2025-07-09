# app/__init__.py
# type: ignore

from gevent import monkey
monkey.patch_all()

from flask import Flask, render_template, send_from_directory
import os
from config import Config
from flask_pymongo import PyMongo
import certifi

mongo = PyMongo()


def verify_config(app):
    required_vars = [
        "SECRET_KEY", "MONGO_URI", "AUTH0_CLIENT_ID", "AUTH0_CLIENT_SECRET",
        "AUTH0_DOMAIN", "AUTH0_CALLBACK_URL", "AUTH0_LINK_CALLBACK_URL",
        "AUTH0_AUDIENCE_DOMAIN", "AI_API_URL", "AI_API_KEY"
    ]
    
    for var in required_vars:
        if not app.config.get(var):
            print(f"Missing configuration variable: {var}")
            return False
    return True

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    if not verify_config(app):
        raise ValueError("Configuration verification failed. Please check your environment variables.")
    
    mongo.init_app(app, tls=True, tlsCAFile=certifi.where())
    
    try:
        with app.app_context():
            mongo.db.command("ping")
            print("MongoDB Atlas connection successful!")
    except Exception as e:
        print(f"MongoDB Atlas connection failed: {e}")
        raise e

    from .auth.routes import auth_bp, config_oauth
    from .dashboard.routes import dashboard_bp
    from .api.routes import api_bp
    from .music.routes import mus_bp
    from .flashcards.routes import flashcard_bp
    from .settings.routes import set_bp
    from .timer.routes import timer_bp
    from .guest.routes import guest_bp

    config_oauth(app)

    app.register_blueprint(auth_bp)
    app.register_blueprint(dashboard_bp)
    app.register_blueprint(api_bp)
    app.register_blueprint(mus_bp)
    app.register_blueprint(flashcard_bp)
    app.register_blueprint(set_bp)
    app.register_blueprint(timer_bp)
    app.register_blueprint(guest_bp)
    
    @app.route("/")
    def index():
        return render_template("index.html")
    
    @app.errorhandler(404)
    def page_not_found(e):
        return render_template("error.html",
                               error_code = 404,
                               error_title = "Page Not Found",
                               error_message = "The page you're looking for doesn't exist or has been moved."), 404

    @app.errorhandler(500)
    def internal_server_error(e):
        return render_template("error.html",
                            error_code=500,
                            error_title="Internal Server Error",
                            error_message="Something went wrong on our side. Please try again later."), 500

    @app.errorhandler(403)
    def forbidden(e):
        return render_template("error.html",
                            error_code=403,
                            error_title="Forbidden",
                            error_message="You do not have permission to access this resource."), 403

    @app.errorhandler(401)
    def unauthorized(e):
        return render_template("error.html",
                            error_code=401,
                            error_title="Unauthorized",
                            error_message="You need to log in to access this page."), 401

    @app.errorhandler(400)
    def bad_request(e):
        return render_template("error.html",
                            error_code=400,
                            error_title="Bad Request",
                            error_message="The server could not understand your request. Please check the input."), 400

    @app.errorhandler(408)
    def request_timeout(e):
        return render_template("error.html",
                            error_code=408,
                            error_title="Request Timeout",
                            error_message="The request took too long to process. Please try again."), 408

    @app.errorhandler(429)
    def too_many_requests(e):
        return render_template("error.html",
                            error_code=429,
                            error_title="Too Many Requests",
                            error_message="You have made too many requests. Please try again later."), 429

    @app.errorhandler(503)
    def service_unavailable(e):
        return render_template("error.html",
                            error_code=503,
                            error_title="Service Unavailable",
                            error_message="The server is temporarily unavailable. Please try again later."), 503
    
    @app.route("/robots.txt")
    def robots():
        return send_from_directory(os.path.join(app.root_path, "static"), "robots.txt")

    return app