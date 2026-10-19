"""Flask API for ChainTrace Bitcoin transaction risk classification."""
from pathlib import Path

import joblib
from flask import Flask, jsonify, request
from flask_cors import CORS

from model_code import TransactionLookupError, fetch_transaction_data, predict_transaction

BASE_DIR = Path(__file__).resolve().parent
app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": ["http://localhost:3000", "http://127.0.0.1:3000"]}})


def load_artifacts():
    required = ["xgboost_model.pkl", "scaler.pkl", "feature_columns.pkl"]
    missing = [name for name in required if not (BASE_DIR / name).is_file()]
    if missing:
        raise RuntimeError(
            "Missing model artifacts: " + ", ".join(missing) + ". Run train_model.py first."
        )
    return (
        joblib.load(BASE_DIR / required[0]),
        joblib.load(BASE_DIR / required[1]),
        joblib.load(BASE_DIR / required[2]),
    )


try:
    model, scaler, feature_columns = load_artifacts()
    MODEL_LOAD_ERROR = None
except Exception as exc:  # Keep /health useful even if model files are missing/corrupt.
    model = scaler = feature_columns = None
    MODEL_LOAD_ERROR = str(exc)


@app.get("/")
def home():
    return jsonify({
        "name": "ChainTrace API",
        "message": "Bitcoin transaction risk classification API.",
        "endpoints": {"health": "GET /health", "prediction": "POST /predict"},
    })


@app.get("/health")
def health():
    return jsonify({"status": "ok" if MODEL_LOAD_ERROR is None else "degraded",
                    "model_loaded": MODEL_LOAD_ERROR is None,
                    **({"error": MODEL_LOAD_ERROR} if MODEL_LOAD_ERROR else {})}), (200 if MODEL_LOAD_ERROR is None else 503)


@app.post("/predict")
def predict():
    if MODEL_LOAD_ERROR:
        return jsonify({"error": "Model artifacts are unavailable. See backend setup instructions."}), 503

    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify({"error": "Send a JSON object containing transaction_hash."}), 400
    tx_hash = data.get("transaction_hash")
    if not isinstance(tx_hash, str) or not tx_hash.strip():
        return jsonify({"error": "transaction_hash is required."}), 400

    try:
        transaction = fetch_transaction_data(tx_hash)
        label, probabilities = predict_transaction(model, scaler, feature_columns, transaction)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    except TransactionLookupError as exc:
        return jsonify({"error": str(exc)}), 502
    except Exception:
        app.logger.exception("Prediction failed")
        return jsonify({"error": "Prediction failed. Check the server logs."}), 500

    return jsonify({
        "transaction_hash": tx_hash.strip().lower(),
        "label": label,
        "probability": {
            "Normal": float(probabilities[0]),
            "Suspicious": float(probabilities[1]),
        },
        "disclaimer": "This is a model estimate, not proof of illicit activity.",
    })


if __name__ == "__main__":
    # Debug mode is intentionally off by default.
    app.run(host="127.0.0.1", port=5000, debug=False)
