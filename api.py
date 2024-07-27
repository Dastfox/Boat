from flask import Flask, jsonify, request, send_from_directory
from flask_socketio import SocketIO, emit


import os

app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="*")

WEAPONS = {
    "Canon": {
        "type": "Canon",
        "count": 10,
        "damage": "4d12+2",
        "reloadTime": 4,
        "range": "300 m",
        "positions": [
            {1: "gauche"},
            {2: "gauche"},
            {3: "gauche"},
            {4: "gauche"},
            {5: "gauche"},
            {6: "droite"},
            {7: "droite"},
            {8: "droite"},
            {9: "droite"},
            {10: "droite"},
        ],
    },
    "Caronade": {
        "type": "Caronade",
        "count": 2,
        "damage": "2d10+2",
        "reloadTime": 2,
        "range": "120 m",
        "positions": [{1: "gauche"}, {2: "droite"}],
    },
    "Arbalète Lourde": {
        "type": "Arbalète Lourde",
        "count": 4,
        "damage": "1d6+2",
        "reloadTime": 1,
        "range": "60 m",
        "positions": [{1: "avant"}, {2: "avant"}, {3: "arrière"}, {4: "arrière"}],
    },
    "Canon de Givre": {
        "type": "Canon de Givre",
        "count": 1,
        "damage": "4d8+2",
        "reloadTime": 3,
        "range": "240 m",
        "positions": [{1: "avant"}],
    },
}

# Initial state
state = {
    "availableCannoneers": 8,
    "assignedCannoneers": 0,
    "draconicShellsCharges": 6,
    "weapons": [
        {
            "id": f"canon-{i+1}",
            "type": "Canon",
            "currentReload": 0,
            "hasCannoneer": False,
            "hasDraconicShells": False,
            "damage": "4d12+2",
            "reloadTime": 4,
            "range": "300 m",
            "position": next(iter(WEAPONS["Canon"]["positions"][i].values())),
        }
        for i in range(WEAPONS["Canon"]["count"])
    ]
    + [
        {
            "id": f"caronade-{i+1}",
            "type": "Caronade",
            "currentReload": 0,
            "hasCannoneer": False,
            "hasDraconicShells": False,
            "damage": "2d10+2",
            "reloadTime": 2,
            "range": "120 m",
            "position": next(iter(WEAPONS["Caronade"]["positions"][i].values())),
        }
        for i in range(WEAPONS["Caronade"]["count"])
    ]
    + [
        {
            "id": f"arbalete-lourde-{i+1}",
            "type": "Arbalète Lourde",
            "currentReload": 0,
            "hasCannoneer": False,
            "hasDraconicShells": False,
            "damage": "1d6+2",
            "reloadTime": 1,
            "range": "60 m",
            "position": next(iter(WEAPONS["Arbalète Lourde"]["positions"][i].values())),
        }
        for i in range(WEAPONS["Arbalète Lourde"]["count"])
    ]
    + [
        {
            "id": "canon-de-givre-1",
            "type": "Canon de Givre",
            "currentReload": 0,
            "hasCannoneer": False,
            "hasDraconicShells": False,
            "damage": "4d8+2",
            "reloadTime": 3,
            "range": "240 m",
            "position": next(iter(WEAPONS["Canon de Givre"]["positions"][0].values())),
        }
        for i in range(WEAPONS["Canon de Givre"]["count"])
    ],
}


@app.route("/")
def index():
    return send_from_directory(".", "index.html")


@app.route("/style.css")
def style():
    return send_from_directory(".", "style.css")


@app.route("/script.js")
def script():
    return send_from_directory(".", "script.js")


@app.route("/state", methods=["GET"])
def get_state():
    return jsonify(state)


@app.route("/update", methods=["POST"])
def update_state():
    print(WEAPONS["Canon"]["positions"][4])
    global state
    state = request.json
    socketio.emit("state_update", state)
    return jsonify(state)


@socketio.on("connect")
def handle_connect():
    emit("state_update", state)


if __name__ == "__main__":
    socketio.run(app, host="0.0.0.0", port=8000, debug=True)
