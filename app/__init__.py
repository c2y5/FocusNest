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

    config_oauth(app)

    app.register_blueprint(auth_bp)
    app.register_blueprint(dashboard_bp)
    app.register_blueprint(api_bp)

    @app.route("/")
    def index():
        return render_template("index.html")
    
    @app.route("/debug-routes")
    def debug_routes():
        return str([str(p) for p in app.url_map.iter_rules()])

    return app