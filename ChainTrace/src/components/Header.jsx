import React from 'react';
import { Link, NavLink } from 'react-router-dom';
import { FaEthereum } from 'react-icons/fa';
import './Header.css';

const Header = () => (
  <header className="navbar">
    <Link className="logo" to="/" aria-label="ChainTrace home">
      <span>ChainTrace</span><FaEthereum color="#f59e0b" size={24} aria-hidden="true" />
    </Link>
    <nav aria-label="Main navigation">
      <NavLink to="/" end>Overview</NavLink>
      <NavLink to="/coins">Markets</NavLink>
      <NavLink to="/investigate">Transaction analysis</NavLink>
    </nav>
  </header>
);

export default Header;
