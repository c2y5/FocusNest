# config.py

import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    SECRET_KEY = os.getenv("SECRET_KEY")

    MONGO_URI = os.getenv("MONGO_URI")
    MONGO_CONNECT = False

    AUTH0_CLIENT_ID = os.getenv("AUTH0_CLIENT_ID")
    AUTH0_CLIENT_SECRET = os.getenv("AUTH0_CLIENT_SECRET")
    AUTH0_DOMAIN = os.getenv("AUTH0_DOMAIN")
    AUTH0_CALLBACK_URL = os.getenv("AUTH0_CALLBACK_URL")
    AUTH0_LINK_CALLBACK_URL = os.getenv("AUTH0_LINK_CALLBACK_URL")
    AUTH0_AUDIENCE_DOMAIN = os.getenv("AUTH0_AUDIENCE_DOMAIN")