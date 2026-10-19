import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import { BiSolidDownArrow, BiSolidUpArrow } from 'react-icons/bi';
import { IoPulseOutline } from 'react-icons/io5';
import Header from './Header';
import Loader from './Loader';
import CoinChart from './CoinChart';
import { Baseurl } from './baseUrl';
import './coinDetail.css';

export default function CoinDetails() {
  const { id } = useParams();
  const [coin, setCoin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currency, setCurrency] = useState('usd');
  const symbol = currency === 'inr' ? '₹' : '$';

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    axios.get(`${Baseurl}/coins/${encodeURIComponent(id)}`, { signal: controller.signal })
      .then(({ data }) => setCoin(data))
      .catch((err) => {
        if (err.code !== 'ERR_CANCELED') setError('Coin details could not be loaded. Please return to markets and try again later.');
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [id]);

  const market = coin?.market_data;
  const change = Number(market?.price_change_percentage_24h || 0);
  const description = (coin?.description?.en || '').replace(/<[^>]*>/g, '').split(/(?<=[.!?])\s/)[0];

  return <><Header /><main className="page coin-detail-page">
    {loading ? <Loader /> : error || !coin ? <p className="status-message">{error || 'Coin details are unavailable.'}</p> : <>
      <div className="page-heading"><p className="eyebrow">ASSET OVERVIEW</p><h1>{coin.name} <span className="ticker">{coin.symbol?.toUpperCase()}</span></h1><p>Last updated: {coin.last_updated ? new Date(coin.last_updated).toLocaleString() : 'Unavailable'}</p></div>
      <section className="coin-detail-layout">
        <div className="coin-summary panel">
          <div className="coin-title-row"><img src={coin.image?.large} alt={`${coin.name} logo`} /><div><h2>{coin.name}</h2><p className="muted">Market rank #{coin.market_cap_rank ?? '—'}</p></div></div>
          <div className="currency-switch detail-currency"><button className={currency === 'usd' ? 'selected' : ''} onClick={() => setCurrency('usd')}>USD</button><button className={currency === 'inr' ? 'selected' : ''} onClick={() => setCurrency('inr')}>INR</button></div>
          <p className="detail-price">{symbol}{Number(market?.current_price?.[currency] || 0).toLocaleString(undefined, { maximumFractionDigits: 4 })}</p>
          <p className={`detail-change ${change >= 0 ? 'positive' : 'negative'}`}>{change >= 0 ? <BiSolidUpArrow aria-hidden="true" /> : <BiSolidDownArrow aria-hidden="true" />} {change.toFixed(2)}% <span>in 24 hours</span></p>
          <div className="detail-stats"><div><span>Market cap</span><strong>{market?.market_cap?.[currency] != null ? `${symbol}${Number(market.market_cap[currency]).toLocaleString()}` : '—'}</strong></div><div><span>24h high</span><strong>{market?.high_24h?.[currency] != null ? `${symbol}${Number(market.high_24h[currency]).toLocaleString()}` : '—'}</strong></div><div><span>24h low</span><strong>{market?.low_24h?.[currency] != null ? `${symbol}${Number(market.low_24h[currency]).toLocaleString()}` : '—'}</strong></div></div>
          {description && <p className="coin-description">{description}</p>}
        </div>
        <div className="chart-panel panel"><h2><IoPulseOutline color="#fbbf24" aria-hidden="true" /> Price history</h2><CoinChart currency={currency} /></div>
      </section>
    </>}
  </main></>;
}
