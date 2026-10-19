"""Train ChainTrace's transaction-level XGBoost classifier.

The source dataset is intentionally not committed because it is large and its
redistribution terms have not been verified. Place it beside this script or pass
--data /path/to/Ransomware_Transaction_Dataset.csv.
"""
from __future__ import annotations

import argparse
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.metrics import classification_report, roc_auc_score
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from xgboost import XGBClassifier

from model_code import FEATURE_COLUMNS, SCALED_COLUMNS

BASE_DIR = Path(__file__).resolve().parent
DEFAULT_DATA = BASE_DIR / "Ransomware_Transaction_Dataset.csv"
REQUIRED_COLUMNS = [
    "Transaction Hash", "Sent Amount(BTC)", "Received Amount(BTC)",
    "Date and Time", "Transaction Flag",
]


def load_transaction_level_data(path: Path) -> tuple[pd.DataFrame, pd.Series]:
    if not path.is_file():
        raise FileNotFoundError(
            f"Dataset not found: {path}\nObtain the dataset and pass its path with --data."
        )
    frame = pd.read_csv(path, usecols=REQUIRED_COLUMNS)
    frame["Sent Amount(BTC)"] = pd.to_numeric(frame["Sent Amount(BTC)"], errors="coerce")
    frame["Received Amount(BTC)"] = pd.to_numeric(frame["Received Amount(BTC)"], errors="coerce")
    frame["Date and Time"] = pd.to_datetime(frame["Date and Time"], errors="coerce", utc=True)
    frame["Transaction Flag"] = frame["Transaction Flag"].astype(str).str.strip().str.lower()
    frame = frame.dropna(subset=["Transaction Hash", "Sent Amount(BTC)", "Received Amount(BTC)", "Date and Time"])
    frame = frame[frame["Transaction Flag"].isin(["normal", "suspicious"])]
    if frame.empty:
        raise ValueError("No usable rows found in the dataset.")

    # The source file has many rows per transaction hash. Collapse them first so
    # the same transaction cannot appear in both train and test partitions.
    # Sent amount is repeated on multiple output/address rows, so use the first;
    # received amounts are output-level rows and are summed.
    grouped = frame.groupby("Transaction Hash", sort=False).agg(
        **{
            "Sent Amount(BTC)": ("Sent Amount(BTC)", "first"),
            "Received Amount(BTC)": ("Received Amount(BTC)", "sum"),
            "Date and Time": ("Date and Time", "first"),
            "Transaction Flag": ("Transaction Flag", lambda values: "suspicious" if (values == "suspicious").any() else "normal"),
        }
    ).reset_index(drop=True)
    grouped["amount_diff"] = grouped["Sent Amount(BTC)"] - grouped["Received Amount(BTC)"]
    timestamp = grouped["Date and Time"]
    grouped["year"] = timestamp.dt.year
    grouped["month"] = timestamp.dt.month
    grouped["day"] = timestamp.dt.day
    grouped["hour"] = timestamp.dt.hour
    features = grouped[FEATURE_COLUMNS].replace([np.inf, -np.inf], np.nan)
    features = features.fillna(features.median(numeric_only=True))
    labels = (grouped["Transaction Flag"] == "suspicious").astype(int)
    if labels.nunique() < 2:
        raise ValueError("Training requires both Normal and Suspicious labels.")
    return features, labels


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data", type=Path, default=DEFAULT_DATA, help="CSV dataset path")
    args = parser.parse_args()

    X, y = load_transaction_level_data(args.data)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    scaler = StandardScaler()
    X_train = X_train.copy()
    X_test = X_test.copy()
    X_train.loc[:, SCALED_COLUMNS] = scaler.fit_transform(X_train[SCALED_COLUMNS])
    X_test.loc[:, SCALED_COLUMNS] = scaler.transform(X_test[SCALED_COLUMNS])

    model = XGBClassifier(
        n_estimators=250,
        max_depth=4,
        learning_rate=0.05,
        subsample=0.9,
        colsample_bytree=0.9,
        objective="binary:logistic",
        eval_metric="logloss",
        random_state=42,
        n_jobs=-1,
    )
    model.fit(X_train, y_train, verbose=False)
    predictions = model.predict(X_test)
    probabilities = model.predict_proba(X_test)[:, 1]
    print(f"Transaction-level samples: {len(X)}")
    print("Class counts:", y.value_counts().sort_index().to_dict(), "(0=Normal, 1=Suspicious)")
    print(classification_report(y_test, predictions, target_names=["Normal", "Suspicious"], zero_division=0))
    print(f"ROC-AUC: {roc_auc_score(y_test, probabilities):.4f}")
    print("Caution: features are limited; these metrics do not establish forensic reliability.")

    joblib.dump(model, BASE_DIR / "xgboost_model.pkl")
    joblib.dump(scaler, BASE_DIR / "scaler.pkl")
    joblib.dump(FEATURE_COLUMNS, BASE_DIR / "feature_columns.pkl")
    print(f"Saved model artifacts to {BASE_DIR}")


if __name__ == "__main__":
    main()
