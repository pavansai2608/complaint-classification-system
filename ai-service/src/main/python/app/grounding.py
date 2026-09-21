import os
from functools import lru_cache

from pymongo import MongoClient

TEXT_INDEX_FIELD = "description"


def _mongo_uri() -> str:
    uri = os.getenv("MONGODB_URI")
    if not uri:
        raise RuntimeError("MONGODB_URI is not set")
    return uri


@lru_cache(maxsize=1)
def _get_collection():
    client = MongoClient(_mongo_uri(), serverSelectionTimeoutMS=3000)
    db = client.get_default_database()
    collection = db["complaints"]
    # Safe to call every startup: MongoDB no-ops if this exact index
    # already exists.
    collection.create_index([(TEXT_INDEX_FIELD, "text")], name="description_text")
    return collection


def find_similar_complaints(text: str, limit: int = 3) -> list:
    """Simple MongoDB full-text search for grounding: returns up to `limit`
    past complaint descriptions closest to the given complaint text, most
    relevant first. Returns an empty list on any DB problem instead of
    failing the whole reply - grounding is a nice-to-have, not required.
    """
    try:
        collection = _get_collection()
        cursor = (
            collection.find(
                {"$text": {"$search": text}},
                {"score": {"$meta": "textScore"}, "description": 1},
            )
            .sort([("score", {"$meta": "textScore"})])
            .limit(limit)
        )
        return [doc["description"] for doc in cursor if doc.get("description") and doc["description"] != text]
    except Exception:
        return []
