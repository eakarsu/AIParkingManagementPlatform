import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { dashboardAPI } from '../services/api';

const features = [
  { path: '/occupancy', icon: '📈', title: 'Occupancy Prediction', desc: 'AI-powered occupancy forecasting with real-time monitoring and predictive analytics.', color: '#3b82f6' },
  { path: '/pricing', icon: '💰', title: 'Dynamic Pricing', desc: 'Intelligent pricing engine that adjusts rates based on demand, time, and events.', color: '#10b981' },
  { path: '/plates', icon: '🚗', title: 'License Plate Recognition', desc: 'Advanced AI plate detection with vehicle profiling and visit tracking.', color: '#f59e0b' },
  { path: '/violations', icon: '🚨', title: 'Violation Management', desc: 'Comprehensive violation tracking, automated detection, and fine management.', color: '#ef4444' },
  { path: '/revenue', icon: '💵', title: 'Revenue Optimization', desc: 'AI-driven revenue analytics with optimization strategies and growth insights.', color: '#8b5cf6' },
  { path: '/payments', icon: '📱', title: 'Mobile Payments', desc: 'Seamless mobile payment processing with multi-method support and analytics.', color: '#06b6d4' },
  { path: '/sensors', icon: '🔌', title: 'IoT Sensors', desc: 'Smart sensor network monitoring with battery tracking and diagnostics.', color: '#f97316' },
  { path: '/ev-charging', icon: '⚡', title: 'EV Charging', desc: 'EV station management with charging optimization and energy analytics.', color: '#22c55e' },
  { path: '/reservations', icon: '📅', title: 'Reservations', desc: 'Advance booking system with demand forecasting and no-show prevention.', color: '#a855f7' },
  { path: '/permits', icon: '🎫', title: 'Permits', desc: 'Permit lifecycle management with automated renewals and zone access control.', color: '#ec4899' },
  { path: '/analytics', icon: '📊', title: 'Analytics Reports', desc: 'Executive-level analytics with KPI dashboards and trend analysis.', color: '#14b8a6' },
  { path: '/security', icon: '📹', title: 'Security Cameras', desc: 'Surveillance system management with coverage analysis and motion detection.', color: '#64748b' },
  { path: '/maintenance', icon: '🔧', title: 'Maintenance', desc: 'Predictive maintenance scheduling with cost tracking and vendor management.', color: '#d97706' },
  { path: '/feedback', icon: '💬', title: 'Customer Feedback', desc: 'Sentiment analysis and customer satisfaction tracking with response management.', color: '#0ea5e9' },
  { path: '/zones', icon: '🅿️', title: 'Parking Zones', desc: 'Zone allocation optimization with capacity management and pricing per zone.', color: '#7c3aed' },
];

function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    dashboardAPI.getStats().then((res) => setStats(res.data)).catch(console.error);
  }, []);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p>AI-Powered Parking Management Overview - 15 Features</p>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="stat-card">
          <div className="stat-icon">🏢</div>
          <div className="stat-value">{stats?.facilities || 0}</div>
          <div className="stat-label">Active Facilities</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-value">{stats?.avgOccupancy || 0}%</div>
          <div className="stat-label">Average Occupancy</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">💵</div>
          <div className="stat-value">${Number(stats?.totalRevenue || 0).toLocaleString()}</div>
          <div className="stat-label">Total Revenue</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🚨</div>
          <div className="stat-value">{stats?.pendingViolations || 0}</div>
          <div className="stat-label">Pending Violations</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📱</div>
          <div className="stat-value">{stats?.completedPayments || 0}</div>
          <div className="stat-label">Completed Payments</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🚗</div>
          <div className="stat-value">{stats?.plateRecords || 0}</div>
          <div className="stat-label">Plate Records</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">⚡</div>
          <div className="stat-value">{stats?.avgOptimizationScore || 0}</div>
          <div className="stat-label">Optimization Score</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">💳</div>
          <div className="stat-value">${Number(stats?.paymentTotal || 0).toLocaleString()}</div>
          <div className="stat-label">Payment Volume</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🔌</div>
          <div className="stat-value">{stats?.sensorsOnline || 0}/{stats?.sensorsTotal || 0}</div>
          <div className="stat-label">Sensors Online</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">⚡</div>
          <div className="stat-value">{stats?.evAvailable || 0}/{stats?.evTotal || 0}</div>
          <div className="stat-label">EV Chargers Available</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📅</div>
          <div className="stat-value">{stats?.activeReservations || 0}</div>
          <div className="stat-label">Active Reservations</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🎫</div>
          <div className="stat-value">{stats?.activePermits || 0}</div>
          <div className="stat-label">Active Permits</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📹</div>
          <div className="stat-value">{stats?.activeCameras || 0}/{stats?.totalCameras || 0}</div>
          <div className="stat-label">Cameras Active</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🔧</div>
          <div className="stat-value">{stats?.openMaintenance || 0}</div>
          <div className="stat-label">Open Maintenance</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">⭐</div>
          <div className="stat-value">{stats?.avgFeedbackRating || 0}/5</div>
          <div className="stat-label">Avg Customer Rating</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🅿️</div>
          <div className="stat-value">{stats?.totalZones || 0}</div>
          <div className="stat-label">Parking Zones</div>
        </div>
      </div>

      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 20, color: '#f1f5f9' }}>
        Platform Features ({features.length})
      </h2>
      <div className="feature-grid">
        {features.map((f) => (
          <div
            key={f.path}
            className="feature-card"
            style={{ '--card-color': f.color }}
            onClick={() => navigate(f.path)}
          >
            <div className="card-icon">{f.icon}</div>
            <h3>{f.title}</h3>
            <p>{f.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Dashboard;
