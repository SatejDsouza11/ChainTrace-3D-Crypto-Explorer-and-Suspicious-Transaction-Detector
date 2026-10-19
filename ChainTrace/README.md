# ChainTrace

**A cryptocurrency market explorer with interactive 3D visualization and an experimental Bitcoin transaction risk classifier.**

ChainTrace combines a React market dashboard, a React Three Fiber Bitcoin model, and a Flask/XGBoost API that retrieves public Bitcoin transaction data and estimates whether a transaction resembles examples labelled suspicious in the training dataset.

> **Research prototype:** a model prediction is not proof of criminal activity or wallet ownership. Do not use this project as the sole basis for legal, financial, or investigative decisions. The model uses a small set of numeric features and has not been independently validated for real-world forensic use.

## Features

- Cryptocurrency market list with name/symbol search and USD/INR display.
- Coin detail pages with price history for 24 hours, 30 days, or one year.
- Interactive Bitcoin 3D model powered by Three.js and React Three Fiber.
- Transaction analysis page that accepts a Bitcoin mainnet transaction hash.
- Flask API with input validation, health status, consistent training/inference features, and explicit error responses.
- Transaction-level training split to avoid putting rows for the same transaction hash into both train and test partitions.

## Tech stack

- **Frontend:** React 18, React Router, Axios, Chart.js, Three.js, React Three Fiber
- **Backend:** Python, Flask, Flask-CORS, pandas, scikit-learn, XGBoost, joblib
- **Data source:** CoinGecko public API for market data; BlockCypher public API for Bitcoin transaction details

## Project structure

```text
chaintrace/
├── public/
│   └── bitcoin.glb
├── src/
│   ├── components/
│   │   ├── CoinChart.jsx
│   │   ├── CoinDetails.jsx
│   │   ├── Coins.jsx
│   │   ├── DeAnonymizer.jsx
│   │   ├── Exchanges.jsx
│   │   └── OurModel.jsx
│   ├── App.js
│   └── index.js
├── ml_api_backend/
│   ├── app.py
│   ├── model_code.py
│   ├── train_model.py
│   ├── test_model_code.py
│   ├── requirements.txt
│   └── *.pkl                  # trained model artifacts
├── .env.example
└── package.json
```

## Run the frontend

Requirements: Node.js and npm.

```bash
npm install
cp .env.example .env
npm start
```

On Windows PowerShell, copy the example file with:

```powershell
Copy-Item .env.example .env
```

The React development server normally runs at `http://localhost:3000`. Market pages use CoinGecko's public API; API rate limits or service outages can temporarily affect live data.

## Run the machine-learning API

Open a second terminal:

```bash
cd ml_api_backend
python -m venv .venv
```

Activate the environment:

```powershell
# Windows PowerShell
.\.venv\Scripts\Activate.ps1
```

```bash
# macOS/Linux
source .venv/bin/activate
```

Install dependencies and start the API:

```bash
python -m pip install -r requirements.txt
python app.py
```

The API listens on `http://127.0.0.1:5000` by default. Check its status at `GET /health`. The frontend reads `REACT_APP_ML_API_URL` from `.env`; restart the React development server after changing environment variables.

### Predict a transaction

```bash
curl -X POST http://127.0.0.1:5000/predict \
  -H "Content-Type: application/json" \
  -d '{"transaction_hash":"YOUR_64_CHARACTER_BITCOIN_TRANSACTION_HASH"}'
```

The API retrieves transaction details from BlockCypher and returns a `Normal` or `Suspicious` label with class probabilities. A real, confirmed Bitcoin mainnet transaction hash is required for an end-to-end request.

## Model training

The trained model, scaler, and feature schema are included so the API can start without the original training CSV. The dataset is **not included** in this repository because it is approximately 89 MB and its redistribution licence has not been verified. Obtain it from an authorized source before retraining.

Place `Ransomware_Transaction_Dataset.csv` inside `ml_api_backend/`, then run:

```bash
cd ml_api_backend
python train_model.py
```

Or pass an explicit path:

```bash
python train_model.py --data /path/to/Ransomware_Transaction_Dataset.csv
```

The training script aggregates rows by transaction hash before splitting the data, derives the same seven features used at inference, and saves the artifacts consumed by `app.py`. It reports held-out metrics, but these metrics should be treated as exploratory: the data is limited, labels may be noisy, and the feature set does not establish illicit intent.

The bundled artifacts were retrained from the supplied source CSV during cleanup. On a stratified 20% holdout of 5,074 aggregated transaction hashes, the run reported **95% accuracy**, **0.9654 ROC-AUC**, and **0.72 recall for the Suspicious class**. These figures are dataset-specific and should not be interpreted as real-world detection performance; duplicate/related transaction records, noisy labels, and limited features can affect results.

## Tests

From the backend directory, after installing the requirements:

```bash
pytest -q
```

These tests cover feature-schema consistency, hash validation, and a local model inference smoke test. They do not call the external BlockCypher service.

## Notes and limitations

- The transaction model uses sent amount, received amount, their difference, and UTC date/time components. It does not inspect full wallet history, ownership, or transaction-graph relationships.
- A suspicious prediction is only a statistical estimate based on the training labels; false positives and false negatives are possible.
- External APIs can rate-limit requests and may change their response format.
- The 3D asset is stored in `public/bitcoin.glb`; check its licence/attribution before redistributing the repository publicly.
- Check the licence and attribution requirements for all third-party assets and the training dataset before publishing.

## Suggested GitHub description

> 3D cryptocurrency market explorer and experimental Bitcoin transaction risk analysis using React, React Three Fiber, Flask, and XGBoost.
