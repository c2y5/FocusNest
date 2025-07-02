# app/__init__.py
# type: ignore

from flask import Flask, render_template
from config import Config
from flask_pymongo import PyMongo
import certifi

mongo = PyMongo()

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    
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
        return render_template("404.html"), 404

    return app