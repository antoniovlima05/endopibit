from app import app
from flask_cors import CORS
from flask import request, jsonify


@app.route("/api/test", methods=["GET"])
def test_function():
    return jsonify({"mensagem" : "Endpoint de test funcionando!"})

