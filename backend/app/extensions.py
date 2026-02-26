from flask_cors import CORS
from pymongo import MongoClient

cors = CORS()

class Mongo:
    def __init__(self):
        self.client: MongoClient | None = None

    def init_app(self, app):
        uri = app.config["MONGO_URI"]
        self.client = MongoClient(uri)

    @property
    def db(self):
        if not self.client:
            raise RuntimeError("Mongo is not initialized")
        return self.client.get_default_database()

mongo = Mongo()
