from flask import Flask, jsonify
from flask_cors import CORS
from flasgger import Swagger
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure
import os
import logging

# ======================================================
# APP CONFIG
# ======================================================

app = Flask(__name__)

CORS(app)

Swagger(app)

logging.basicConfig(level=logging.INFO)

PORT = int(os.getenv("PORT", 3003))

MONGO_URI = os.getenv(
    "MONGO_URI",
    "mongodb+srv://TU_USUARIO:TU_PASSWORD@cluster.mongodb.net/?retryWrites=true&w=majority"
)

DB_NAME = os.getenv(
    "DB_NAME",
    "dragonBall"
)

COLLECTION_NAME = os.getenv(
    "COLLECTION_NAME",
    "dragonball"
)

# ======================================================
# MONGODB CONNECTION
# ======================================================

try:

    client = MongoClient(
        MONGO_URI,
        serverSelectionTimeoutMS=5000
    )

    client.admin.command("ping")

    db = client[DB_NAME]

    collection = db[COLLECTION_NAME]

    logging.info("MongoDB Connected")

except ConnectionFailure as error:

    logging.error(error)

    raise error

# ======================================================
# HOME
# ======================================================

@app.route("/", methods=["GET"])
def home():
    """
    Home Endpoint
    ---
    responses:
      200:
        description: API funcionando correctamente
    """

    return jsonify({
        "service": "Dragon Ball API",
        "status": "running"
    })

# ======================================================
# GET CHARACTERS
# ======================================================

@app.route("/api/dragonball", methods=["GET"])
def get_characters():
    """
    Obtener personajes Dragon Ball
    ---
    tags:
      - Dragon Ball
    responses:
      200:
        description: Lista de personajes
    """

    try:

        characters = list(
            collection.find(
                {},
                {
                    "_id": 0
                }
            )
        )

        return jsonify(characters)

    except Exception as error:

        logging.error(error)

        return jsonify({
            "error": "Internal Server Error"
        }), 500

# ======================================================
# ERROR 404
# ======================================================

@app.errorhandler(404)
def not_found(error):

    return jsonify({
        "error": "Route not found"
    }), 404

# ======================================================
# START SERVER
# ======================================================

if __name__ == "__main__":

    app.run(
        host="0.0.0.0",
        port=PORT
    )
