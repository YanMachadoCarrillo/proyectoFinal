import os
import json
from http.server import BaseHTTPRequestHandler, HTTPServer
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure

# ======================================================
# CONFIG
# ======================================================

PORT = int(os.getenv("PORT", 3003))

# REEMPLAZA ESTA URI POR LA REAL DE MONGODB ATLAS
MONGO_URI = os.getenv(
    "MONGO_URI",
    "mongodb+srv://YanCarlos:1234567890@pokeapibd.crjoj9o.mongodb.net/?appName=pokeapiBD"
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
        serverSelectionTimeoutMS=10000,
        connectTimeoutMS=10000,
        socketTimeoutMS=10000,
        retryWrites=True
    )

    # TEST CONNECTION
    client.admin.command("ping")

    db = client[DB_NAME]

    collection = db[COLLECTION_NAME]

    print("MongoDB Atlas Connected")

except ConnectionFailure as error:

    print("MongoDB Connection Error")

    print(error)

    exit(1)

# ======================================================
# SEND JSON RESPONSE
# ======================================================

def send_json(handler, status_code, data):

    handler.send_response(status_code)

    handler.send_header(
        "Content-Type",
        "application/json; charset=utf-8"
    )

    handler.send_header(
        "Access-Control-Allow-Origin",
        "*"
    )

    handler.send_header(
        "Access-Control-Allow-Methods",
        "GET, OPTIONS"
    )

    handler.send_header(
        "Access-Control-Allow-Headers",
        "Content-Type"
    )

    handler.end_headers()

    handler.wfile.write(
        json.dumps(
            data,
            ensure_ascii=False
        ).encode("utf-8")
    )

# ======================================================
# REQUEST HANDLER
# ======================================================

class RequestHandler(BaseHTTPRequestHandler):

    # ==================================================
    # REMOVE TERMINAL LOGS
    # ==================================================

    def log_message(self, format, *args):
        return

    # ==================================================
    # OPTIONS
    # ==================================================

    def do_OPTIONS(self):

        self.send_response(204)

        self.send_header(
            "Access-Control-Allow-Origin",
            "*"
        )

        self.send_header(
            "Access-Control-Allow-Methods",
            "GET, OPTIONS"
        )

        self.send_header(
            "Access-Control-Allow-Headers",
            "Content-Type"
        )

        self.end_headers()

    # ==================================================
    # GET
    # ==================================================

    def do_GET(self):

        # ==============================================
        # ROOT
        # ==============================================

        if self.path == "/":

            return send_json(
                self,
                200,
                {
                    "service": "Dragon Ball API",
                    "status": "running",
                    "database": DB_NAME,
                    "collection": COLLECTION_NAME
                }
            )

        # ==============================================
        # DRAGON BALL API
        # ==============================================

        if self.path == "/api/dragonball":

            try:

                characters = list(
                    collection.find(
                        {},
                        {
                            "_id": 0
                        }
                    )
                )

                return send_json(
                    self,
                    200,
                    characters
                )

            except Exception as error:

                print("Query Error")

                print(error)

                return send_json(
                    self,
                    500,
                    {
                        "error": "Internal Server Error"
                    }
                )

        # ==============================================
        # SWAGGER
        # ==============================================

        if self.path == "/api-docs":

            try:

                with open(
                    "swagger.json",
                    "r",
                    encoding="utf-8"
                ) as file:

                    swagger_data = json.load(file)

                return send_json(
                    self,
                    200,
                    swagger_data
                )

            except FileNotFoundError:

                return send_json(
                    self,
                    404,
                    {
                        "error": "swagger.json not found"
                    }
                )

        # ==============================================
        # 404
        # ==============================================

        return send_json(
            self,
            404,
            {
                "error": "Route not found"
            }
        )

# ======================================================
# START SERVER
# ======================================================

def run():

    server_address = ("", PORT)

    httpd = HTTPServer(
        server_address,
        RequestHandler
    )

    print(f"Dragon Ball Service running on port {PORT}")

    print(f"http://localhost:{PORT}/api/dragonball")

    httpd.serve_forever()

# ======================================================
# MAIN
# ======================================================

if __name__ == "__main__":

    run()