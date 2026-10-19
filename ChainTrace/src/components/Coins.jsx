import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import Header from './Header';
import Loader from './Loader';
import { Baseurl } from './baseUrl';
import './Res.css';

export default function Coins() {
  const [coins, setCoins] = useState([]);
  const [currency, setCurrency] = useState('usd');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    axios.get(`${Baseurl}/coins/markets`, {
      params: { vs_currency: currency, order: 'market_cap_desc', per_page: 50, page: 1, sparkline: false },
      signal: controller.signal,
    })
      .then(({ data }) => setCoins(Array.isArray(data) ? data : []))
      .catch((err) => {
        if (err.code !== 'ERR_CANCELED') setError('Market data could not be loaded. The public API may be rate-limited; try again shortly.');
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [currency]);

  const filteredCoins = useMemo(() => coins.filter((coin) =>
    `${coin.name} ${coin.symbol}`.toLowerCase().includes(search.trim().toLowerCase())
  ), [coins, search]);
  const symbol = currency === 'inr' ? '₹' : '$';

  return <><Header /><main className="page">
    <div className="page-heading"><p className="eyebrow">LIVE MARKET SNAPSHOT</p><h1>Cryptocurrency markets</h1><p>Search the top 50 coins by market capitalization. Prices are provided by CoinGecko.</p></div>
    <section className="market-controls">
      <input className="text-input" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by coin name or symbol…" aria-label="Search coins" />
      <div className="currency-switch" aria-label="Currency">
        <button className={currency === 'usd' ? 'selected' : ''} onClick={() => setCurrency('usd')}>USD ($)</button>
        <button className={currency === 'inr' ? 'selected' : ''} onClick={() => setCurrency('inr')}>INR (₹)</button>
      </div>
    </section>
    {error && <p className="status-message">{error}</p>}
    {loading ? <Loader /> : filteredCoins.length === 0 ? <p className="muted empty-state">{error ? 'Market data is unavailable.' : 'No coins match your search.'}</p> : <div className="coin-grid">
      {filteredCoins.map((coin) => <Link className="coin-card" to={`/coins/${coin.id}`} key={coin.id}>
        <div className="coin-card-heading"><img src={coin.image} alt="" loading="lazy" /><div><strong>{coin.name}</strong><span>{String(coin.symbol || '').toUpperCase()}</span></div></div>
        <div className="coin-card-price">{symbol}{Number(coin.current_price || 0).toLocaleString(undefined, { maximumFractionDigits: currency === 'inr' ? 2 : 4 })}</div>
        <div className={`coin-change ${(coin.price_change_percentage_24h ?? 0) >= 0 ? 'positive' : 'negative'}`}>{Number(coin.price_change_percentage_24h || 0).toFixed(2)}% <span>24h</span></div>
      </Link>)}
    </div>}
  </main></>;
}
