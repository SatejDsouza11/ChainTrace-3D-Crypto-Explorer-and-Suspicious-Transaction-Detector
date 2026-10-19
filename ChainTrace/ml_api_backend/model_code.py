"""Bitcoin transaction retrieval and model inference helpers for ChainTrace."""
from __future__ import annotations

import re
from typing import Any

import pandas as pd
import requests

BLOCKCYPHER_TX_URL = "https://api.blockcypher.com/v1/btc/main/txs/{tx_hash}"
TX_HASH_PATTERN = re.compile(r"^[0-9a-fA-F]{64}$")
FEATURE_COLUMNS = [
    "Sent Amount(BTC)",
    "Received Amount(BTC)",
    "amount_diff",
    "year",
    "month",
    "day",
    "hour",
]
SCALED_COLUMNS = ["Sent Amount(BTC)", "Received Amount(BTC)", "amount_diff"]


class TransactionLookupError(Exception):
    """Raised when a transaction cannot be retrieved or parsed."""


def fetch_transaction_data(tx_hash: str) -> dict[str, Any]:
    """Fetch a Bitcoin transaction and derive features matching the training pipeline."""
    if not isinstance(tx_hash, str) or not TX_HASH_PATTERN.fullmatch(tx_hash.strip()):
        raise ValueError("Transaction hash must be exactly 64 hexadecimal characters.")

    normalized_hash = tx_hash.strip().lower()
    try:
        response = requests.get(
            BLOCKCYPHER_TX_URL.format(tx_hash=normalized_hash), timeout=15
        )
        if response.status_code == 404:
            raise TransactionLookupError("Transaction was not found on the Bitcoin mainnet.")
        response.raise_for_status()
        payload = response.json()
    except requests.Timeout as exc:
        raise TransactionLookupError("The transaction provider timed out. Please try again.") from exc
    except requests.RequestException as exc:
        raise TransactionLookupError("Could not reach the transaction provider.") from exc

    # BlockCypher reports input values under inputs[].output_value (or prev_output.value
    # on some responses) and output values under outputs[].value. Values are in satoshis.
    inputs = payload.get("inputs") or []
    outputs = payload.get("outputs") or []
    sent_satoshis = sum(
        int(item.get("output_value", (item.get("prev_output") or {}).get("value", 0)) or 0)
        for item in inputs
    )
    received_satoshis = sum(int(item.get("value", 0) or 0) for item in outputs)

    timestamp_value = payload.get("confirmed") or payload.get("received")
    if timestamp_value:
        timestamp = pd.to_datetime(timestamp_value, utc=True, errors="coerce")
    else:
        timestamp = pd.NaT
    if pd.isna(timestamp):
        raise TransactionLookupError("The provider did not return a usable transaction timestamp.")

    return {
        "Sent Amount(BTC)": sent_satoshis / 100_000_000,
        "Received Amount(BTC)": received_satoshis / 100_000_000,
        "Date and Time": timestamp,
    }


def build_feature_frame(transaction: dict[str, Any]) -> pd.DataFrame:
    """Create the exact feature schema used by train_model.py."""
    timestamp = pd.to_datetime(transaction.get("Date and Time"), utc=True, errors="coerce")
    if pd.isna(timestamp):
        raise ValueError("Transaction timestamp is missing or invalid.")

    sent = float(transaction["Sent Amount(BTC)"])
    received = float(transaction["Received Amount(BTC)"])
    values = {
        "Sent Amount(BTC)": sent,
        "Received Amount(BTC)": received,
        "amount_diff": sent - received,
        "year": int(timestamp.year),
        "month": int(timestamp.month),
        "day": int(timestamp.day),
        "hour": int(timestamp.hour),
    }
    frame = pd.DataFrame([values], columns=FEATURE_COLUMNS)
    return frame


def predict_transaction(model, scaler, feature_columns, input_data: dict[str, Any]):
    """Return the model's predicted class and two-class probabilities."""
    features = build_feature_frame(input_data)
    columns = list(feature_columns)
    if columns != FEATURE_COLUMNS:
        raise ValueError(
            "The saved model uses an incompatible feature schema. Retrain it with train_model.py."
        )
    features.loc[:, SCALED_COLUMNS] = scaler.transform(features[SCALED_COLUMNS])
    prediction = int(model.predict(features)[0])
    probabilities = model.predict_proba(features)[0]
    return ("Suspicious" if prediction == 1 else "Normal"), probabilities
