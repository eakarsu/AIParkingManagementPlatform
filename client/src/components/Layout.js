import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const navItems = [
  { path: '/', label: 'Dashboard', icon: '📊' },
  { path: '/facilities', label: 'Facilities', icon: '🏢' },
  { path: '/occupancy', label: 'Occupancy Prediction', icon: '📈' },
  { path: '/pricing', label: 'Dynamic Pricing', icon: '💰' },
  { path: '/plates', label: 'License Plates', icon: '🚗' },
  { path: '/violations', label: 'Violations', icon: '🚨' },
  { path: '/revenue', label: 'Revenue', icon: '💵' },
  { path: '/payments', label: 'Mobile Payments', icon: '📱' },
  { path: '/sensors', label: 'IoT Sensors', icon: '🔌' },
  { path: '/ev-charging', label: 'EV Charging', icon: '⚡' },
  { path: '/reservations', label: 'Reservations', icon: '📅' },
  { path: '/permits', label: 'Permits', icon: '🎫' },
  { path: '/analytics', label: 'Analytics', icon: '📊' },
  { path: '/security', label: 'Security Cameras', icon: '📹' },
  { path: '/maintenance', label: 'Maintenance', icon: '🔧' },
  { path: '/feedback', label: 'Feedback', icon: '💬' },
  { path: '/zones', label: 'Parking Zones', icon: '🅿️' },
  { path: '/user-management', label: 'User Management', icon: '👥' },
  { path: '/activity-log', label: 'Activity Log', icon: '📋' },
  { path: '/notifications', label: 'Notifications', icon: '🔔' },
  { path: '/profile', label: 'My Profile', icon: '👤' },
  { path: '/data-export', label: 'Data Export', icon: '📥' },
];

function Layout({ user, onLogout, children }) {
  const location = useLocation();

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <span className="icon">🅿️</span>
          <h2>AI Parking Mgmt</h2>
        </div>
        <ul className="sidebar-nav">
          {navItems.map((item) => (
            <li key={item.path}>
              <Link
                to={item.path}
                className={location.pathname === item.path ? 'active' : ''}
              >
                <span className="nav-icon">{item.icon}</span>
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
        <div className="sidebar-user">
          <div className="user-name">{user?.name}</div>
          <div className="user-email">{user?.email}</div>
          <button className="logout-btn" onClick={onLogout}>
            Sign Out
          </button>
        </div>
      </aside>
      <main className="main-content">{children}</main>
    </div>
  );
}

export default Layout;
