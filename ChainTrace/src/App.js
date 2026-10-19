import './App.css';
import { Navigate, Route, Routes } from 'react-router-dom';
import Exchanges from './components/Exchanges';
import Coins from './components/Coins';
import CoinDetails from './components/CoinDetails';
import DeAnonymizer from './components/DeAnonymizer';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Exchanges />} />
      <Route path="/coins" element={<Coins />} />
      <Route path="/coins/:id" element={<CoinDetails />} />
      <Route path="/investigate" element={<DeAnonymizer />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
