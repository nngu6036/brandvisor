from bson import ObjectId
from ..extensions import mongo
from ..models import Brand

class BrandsRepo:
    def __init__(self):
        self.col = mongo.db["brands"]

    def list_brands(self, limit: int = 200) -> list[Brand]:
        cursor = self.col.find({}, {"name": 1, "logo_url": 1}).limit(limit)
        return [
            Brand(
                id=str(b.get("_id")),
                name=b.get("name", ""),
                logo_url=b.get("logo_url", "")
            )
            for b in cursor
        ]

    def get_by_id(self, brand_id: str) -> Brand | None:
        try:
            _id = ObjectId(brand_id)
        except Exception:
            return None

        b = self.col.find_one({"_id": _id}, {"name": 1, "logo_url": 1})
        if not b:
            return None
        return Brand(
            id=str(b["_id"]),
            name=b.get("name", ""),
            logo_url=b.get("logo_url", "")
        )
