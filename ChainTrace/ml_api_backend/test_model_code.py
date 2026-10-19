"""Offline tests for ChainTrace's feature pipeline and bundled model artifacts."""
from pathlib import Path

import joblib
import pandas as pd
import pytest

from model_code import FEATURE_COLUMNS, build_feature_frame, fetch_transaction_data, predict_transaction

BASE_DIR = Path(__file__).resolve().parent


def test_feature_schema_is_stable():
    transaction = {
        "Sent Amount(BTC)": 1.25,
        "Received Amount(BTC)": 1.20,
        "Date and Time": pd.Timestamp("2024-03-02T14:30:00Z"),
    }
    frame = build_feature_frame(transaction)
    assert list(frame.columns) == FEATURE_COLUMNS
    assert frame.loc[0, "amount_diff"] == pytest.approx(0.05)
    assert frame.loc[0, "year"] == 2024
    assert frame.loc[0, "hour"] == 14


def test_invalid_transaction_hash_is_rejected_before_network_call():
    with pytest.raises(ValueError, match="64 hexadecimal"):
        fetch_transaction_data("not-a-transaction-hash")


def test_saved_model_can_predict_with_training_schema():
    model = joblib.load(BASE_DIR / "xgboost_model.pkl")
    scaler = joblib.load(BASE_DIR / "scaler.pkl")
    columns = joblib.load(BASE_DIR / "feature_columns.pkl")
    transaction = {
        "Sent Amount(BTC)": 1.25,
        "Received Amount(BTC)": 1.20,
        "Date and Time": pd.Timestamp("2024-03-02T14:30:00Z"),
    }
    label, probabilities = predict_transaction(model, scaler, columns, transaction)
    assert label in {"Normal", "Suspicious"}
    assert len(probabilities) == 2
    assert sum(probabilities) == pytest.approx(1.0, abs=1e-5)
