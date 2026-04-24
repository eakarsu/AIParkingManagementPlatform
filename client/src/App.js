import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Facilities from './pages/Facilities';
import Occupancy from './pages/Occupancy';
import Pricing from './pages/Pricing';
import Plates from './pages/Plates';
import Violations from './pages/Violations';
import Revenue from './pages/Revenue';
import Payments from './pages/Payments';
import Sensors from './pages/Sensors';
import EVCharging from './pages/EVCharging';
import Reservations from './pages/Reservations';
import Permits from './pages/Permits';
import Analytics from './pages/Analytics';
import Security from './pages/Security';
import Maintenance from './pages/Maintenance';
import Feedback from './pages/Feedback';
import Zones from './pages/Zones';
import UserManagement from './pages/UserManagement';
import ActivityLog from './pages/ActivityLog';
import Notifications from './pages/Notifications';
import Profile from './pages/Profile';
import DataExport from './pages/DataExport';
import Layout from './components/Layout';
import './styles/App.css';

function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser && token) {
      setUser(JSON.parse(savedUser));
    }
  }, [token]);

  const handleLogin = (userData, authToken) => {
    setUser(userData);
    setToken(authToken);
    localStorage.setItem('token', authToken);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  if (!token || !user) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <Router>
      <Layout user={user} onLogout={handleLogout}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/facilities" element={<Facilities />} />
          <Route path="/occupancy" element={<Occupancy />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/plates" element={<Plates />} />
          <Route path="/violations" element={<Violations />} />
          <Route path="/revenue" element={<Revenue />} />
          <Route path="/payments" element={<Payments />} />
          <Route path="/sensors" element={<Sensors />} />
          <Route path="/ev-charging" element={<EVCharging />} />
          <Route path="/reservations" element={<Reservations />} />
          <Route path="/permits" element={<Permits />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/security" element={<Security />} />
          <Route path="/maintenance" element={<Maintenance />} />
          <Route path="/feedback" element={<Feedback />} />
          <Route path="/zones" element={<Zones />} />
          <Route path="/user-management" element={<UserManagement />} />
          <Route path="/activity-log" element={<ActivityLog />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/data-export" element={<DataExport />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
