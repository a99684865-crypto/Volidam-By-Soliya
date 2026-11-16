import os
from datetime import datetime, timezone

from flask import Flask, jsonify, request
from pymongo import MongoClient

app = Flask(__name__)

# Render'dagi o'zgaruvchi nomi qanday bo'lsa ham topadi
MONGO_URI = (
    os.environ.get("MONGODB_URI")
    or os.environ.get("MONGO_URI")
    or os.environ.get("mongo-uri")
)

client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000) if MONGO_URI else None
db = client["volidam_by_soliya"] if client is not None else None


@app.route("/")
def home():
    return jsonify(message="Volidam-By-Soliya ishlayapti", mongo_uri_set=bool(MONGO_URI))


@app.route("/health")
def health():
    if client is None:
        return jsonify(ok=False, error="MongoDB URI o'rnatilmagan"), 500
    try:
        client.admin.command("ping")
        return jsonify(ok=True, mongo="connected")
    except Exception as e:
        return jsonify(ok=False, error=str(e)), 500


@app.route("/items", methods=["GET", "POST"])
def items():
    if db is None:
        return jsonify(error="MongoDB URI o'rnatilmagan"), 500
    if request.method == "POST":
        data = request.get_json(silent=True) or {}
        data["created_at"] = datetime.now(timezone.utc).isoformat()
        result = db.items.insert_one(data)
        return jsonify(inserted_id=str(result.inserted_id)), 201
    docs = []
    for d in db.items.find().limit(50):
        d["_id"] = str(d["_id"])
        docs.append(d)
    return jsonify(docs)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)))
