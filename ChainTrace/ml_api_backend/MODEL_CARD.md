# ChainTrace model card

## Intended use

Educational demonstration of a machine-learning inference workflow for Bitcoin transaction data. The output is a risk-like class estimate, not a factual accusation, attribution, or legal conclusion.

## Data and label handling

The model was retrained from `Ransomware_Transaction_Dataset.csv`, a source dataset that is not bundled in this repository. The training script aggregates multiple rows per `Transaction Hash` before splitting, uses the first sent amount, sums received amounts, uses the first timestamp, and assigns `Suspicious` if any row for a transaction has that label. This is a pragmatic aggregation rule and can affect labels and amounts.

## Features

- Sent amount (BTC)
- Received amount (BTC)
- Difference between sent and received amount
- UTC year, month, day, and hour

Amount fields and amount difference are standardized using a saved `StandardScaler`. The inference pipeline builds the same seven-column schema.

## Evaluation

A stratified 80/20 holdout split over 5,074 transaction hashes produced the following metrics in the cleanup environment:

- Accuracy: 0.95
- ROC-AUC: 0.9654
- Suspicious precision: 0.90
- Suspicious recall: 0.72
- Suspicious F1: 0.80

This is a single exploratory split, not an independent or temporal validation. It does not establish operational reliability.

## Limitations and risks

- Labels are inherited from the source dataset and may be noisy or incomplete.
- Aggregating related output rows can alter the meaning of sent/received amounts.
- The model does not inspect transaction graph structure, wallet history, ownership, intent, or off-chain context.
- Transaction patterns may shift over time and across populations.
- A false positive could unfairly stigmatize a legitimate transaction; a false negative could miss harmful activity.
- The probabilities are model outputs and are not guaranteed to be calibrated.

## Recommended safeguards

Use the output only for demonstration or research. Do not automatically block, report, or accuse a person based on the result. Any real-world use would require verified data rights, domain review, robust temporal/external validation, calibration, monitoring, and a human review process.
