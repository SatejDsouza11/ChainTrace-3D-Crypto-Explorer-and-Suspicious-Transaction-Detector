import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler } from 'chart.js';
import { Line } from 'react-chartjs-2';
import { Baseurl } from './baseUrl';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler);

export default function CoinChart({ currency }) {
  const { id } = useParams();
  const [days, setDays] = useState('1');
  const [prices, setPrices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    axios.get(`${Baseurl}/coins/${encodeURIComponent(id)}/market_chart`, {
      params: { vs_currency: currency, days }, signal: controller.signal,
    }).then(({ data }) => setPrices(Array.isArray(data.prices) ? data.prices : []))
      .catch((err) => { if (err.code !== 'ERR_CANCELED') setError('Price history is unavailable right now.'); })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [currency, id, days]);

  const chartData = useMemo(() => ({
    labels: prices.map(([timestamp]) => {
      const date = new Date(timestamp);
      return days === '1' ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : date.toLocaleDateString();
    }),
    datasets: [{ label: `Price (${currency.toUpperCase()})`, data: prices.map(([, price]) => price), borderColor: '#f59e0b', backgroundColor: 'rgba(245,158,11,.10)', fill: true, pointRadius: 0, borderWidth: 2, tension: .2 }],
  }), [prices, currency, days]);

  return <div className="chart-content">
    <div className="chart-periods">{[{ label: '24 hours', value: '1' }, { label: '30 days', value: '30' }, { label: '1 year', value: '365' }].map((item) => <button key={item.value} className={days === item.value ? 'active' : ''} onClick={() => setDays(item.value)}>{item.label}</button>)}</div>
    {loading ? <p className="muted chart-message">Loading price history…</p> : error ? <p className="muted chart-message">{error}</p> : prices.length === 0 ? <p className="muted chart-message">No chart data returned.</p> : <div className="chart-canvas"><Line data={chartData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { mode: 'index', intersect: false } }, scales: { x: { ticks: { color: '#9ca3af', maxTicksLimit: 6 }, grid: { display: false } }, y: { ticks: { color: '#9ca3af' }, grid: { color: 'rgba(148,163,184,.12)' } } } }} /></div>}
  </div>;
}
