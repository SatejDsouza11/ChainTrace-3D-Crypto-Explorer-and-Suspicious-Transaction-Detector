import React, { useState } from 'react';
import axios from 'axios';
import Header from './Header';
import './DeAnonymizer.css';

const API_BASE_URL = process.env.REACT_APP_ML_API_URL || 'http://127.0.0.1:5000';
const HASH_PATTERN = /^[0-9a-fA-F]{64}$/;

export default function DeAnonymizer() {
  const [hash, setHash] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    const normalized = hash.trim();
    setResult(null);
    setError('');
    if (!HASH_PATTERN.test(normalized)) {
      setError('Enter a valid 64-character Bitcoin transaction hash.');
      return;
    }
    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/predict`, { transaction_hash: normalized }, { timeout: 25000 });
      setResult(response.data);
    } catch (err) {
      const message = err.response?.data?.error || (err.code === 'ECONNABORTED'
        ? 'The request timed out. Check that the backend and transaction provider are available.'
        : 'Could not reach the analysis API. Start the Flask backend and try again.');
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return <><Header /><main className="page">
    <div className="page-heading"><p className="eyebrow">EXPERIMENTAL ML TOOL</p><h1>Bitcoin transaction analysis</h1><p>Submit a Bitcoin mainnet transaction hash to retrieve public transaction data and run the project's experimental classifier.</p></div>
    <section className="panel analysis-panel">
      <form onSubmit={handleSubmit}>
        <label htmlFor="transaction-hash">Transaction hash</label>
        <input id="transaction-hash" className="text-input" value={hash} onChange={(event) => setHash(event.target.value)} placeholder="64-character hexadecimal hash" autoComplete="off" spellCheck="false" aria-describedby="hash-help" />
        <p id="hash-help" className="muted form-help">Bitcoin mainnet only. The API retrieves data from BlockCypher.</p>
        <button className="primary-button" type="submit" disabled={loading}>{loading ? 'Analyzing…' : 'Analyze transaction'}</button>
      </form>
      {error && <p className="analysis-error" role="alert">{error}</p>}
      {result && <div className="analysis-result" aria-live="polite">
        <div className="result-heading"><div><p className="eyebrow">MODEL OUTPUT</p><h2 className={result.label === 'Suspicious' ? 'risk-high' : 'risk-normal'}>{result.label}</h2></div><span className="result-score">{(100 * Number(result.probability?.[result.label] || 0)).toFixed(1)}% model probability</span></div>
        <p className="muted result-hash">Transaction: <code>{result.transaction_hash}</code></p>
        <div className="probability-list"><div><span>Normal</span><strong>{(100 * Number(result.probability?.Normal || 0)).toFixed(1)}%</strong></div><div><span>Suspicious</span><strong>{(100 * Number(result.probability?.Suspicious || 0)).toFixed(1)}%</strong></div></div>
        <p className="disclaimer">Important: {result.disclaimer || 'This is an experimental model estimate, not proof of illicit activity.'} Do not use this output alone to make legal, financial, or investigative decisions.</p>
      </div>}
    </section>
    <p className="analysis-note">This prototype uses a limited set of transaction-level features. Its output is not a forensic attribution and may be wrong, especially for transactions unlike those in its training data.</p>
  </main></>;
}
