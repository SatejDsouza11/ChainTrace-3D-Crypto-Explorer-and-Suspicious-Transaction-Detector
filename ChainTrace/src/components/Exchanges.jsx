import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import Header from './Header';
import OurModel from './OurModel';
import { Baseurl } from './baseUrl';
import './Exchanges.css';

export default function Exchanges() {
  const [exchanges, setExchanges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    axios.get(`${Baseurl}/exchanges?per_page=8`, { signal: controller.signal })
      .then(({ data }) => setExchanges(Array.isArray(data) ? data : []))
      .catch((err) => {
        if (err.code !== 'ERR_CANCELED') setError('Exchange data could not be loaded. The public market API may be rate-limited; try again shortly.');
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  return (
    <>
      <Header />
      <main className="page home-page">
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow">CRYPTO MARKET INTELLIGENCE</p>
            <h1>Explore the blockchain.<br /><span>Look beyond the surface.</span></h1>
            <p>Market snapshots, interactive 3D visualization, and an experimental Bitcoin transaction risk classifier in one workspace.</p>
            <div className="hero-actions">
              <Link className="primary-button" to="/coins">Explore markets</Link>
              <Link className="secondary-button" to="/investigate">Analyze a transaction</Link>
            </div>
          </div>
          <OurModel />
        </section>
        <section className="market-section">
          <div className="section-title"><div><p className="eyebrow">MARKET DIRECTORY</p><h2>Popular exchanges</h2></div><span className="muted">Data from CoinGecko</span></div>
          {error && <p className="status-message">{error}</p>}
          {loading ? <p className="muted">Loading exchange data…</p> : exchanges.length === 0 ? (!error && <p className="muted">No exchange data is currently available.</p>) : (
            <div className="exchange-grid">
              {exchanges.map((item) => (
                <article className="exchange-card" key={item.id}>
                  <img src={item.image} alt="" loading="lazy" />
                  <div className="exchange-main"><strong>{item.name}</strong><span className="muted">Trust score rank: {item.trust_score_rank ?? '—'}</span></div>
                  <div className="exchange-volume"><span className="muted">24h volume</span><strong>{Number.isFinite(item.trade_volume_24h_btc) ? `${item.trade_volume_24h_btc.toLocaleString(undefined, { maximumFractionDigits: 0 })} BTC` : '—'}</strong></div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </>
  );
}
