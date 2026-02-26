from datetime import datetime, timezone
from bson import ObjectId
from ..extensions import mongo

class ConversationsRepo:
    def __init__(self):
        self.col = mongo.db["conversations"]

    def save_turn(self, user_message: str, assistant_message: str, brand: dict) -> ObjectId:
        doc = {
            "brand": brand,
            "turn": {"user": user_message, "assistant": assistant_message},
            "created_at": datetime.now(timezone.utc),
        }
        result = self.col.insert_one(doc)
        return result.inserted_id
