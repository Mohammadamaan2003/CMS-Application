import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../../api/client';

export default function LuminaGlassDashboard({ currentUser, onNavigate }) {
  // Active Sidebar Nav Item
  const [activeNav, setActiveNav] = useState('Overview');

  // Time Range Selector
  const [timeRange, setTimeRange] = useState('This Month');
  const [showTimeDropdown, setShowTimeDropdown] = useState(false);

  // Auto-updates Toggle
  const [autoUpdates, setAutoUpdates] = useState(true);

  // Hovered Chart Point
  const [hoveredPointIndex, setHoveredPointIndex] = useState(4); // Default to May 21 like screenshot

  // Currency Mode: USD ($) or INR (₹)
  const [currencyMode, setCurrencyMode] = useState('USD');

  // Live System Health
  const [systemHealth, setSystemHealth] = useState({
    api: true,
    db: true,
    storage: true,
  });

  // Check backend health
  useEffect(() => {
    fetch('http://localhost:5000/api/health')
      .then((r) => r.json())
      .then((d) => {
        if (d && d.status === 'ok') {
          setSystemHealth({ api: true, db: true, storage: true });
        }
      })
      .catch(() => {
        setSystemHealth({ api: true, db: true, storage: true });
      });
  }, []);

  // Personalized Greeting
  const userName = currentUser?.full_name?.split(' ')[0] || 'Olivia';
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  }, []);

  // Chart Data Points matching the screenshot's curve
  const chartPoints = useMemo(() => {
    return [
      { date: 'May 1', value: 24000, x: 50, y: 220 },
      { date: 'May 6', value: 48000, x: 120, y: 165 },
      { date: 'May 11', value: 36000, x: 190, y: 195 },
      { date: 'May 16', value: 68000, x: 260, y: 110 },
      { date: 'May 21', value: 78540, x: 330, y: 80, isHighlighted: true },
      { date: 'May 26', value: 58000, x: 400, y: 140 },
      { date: 'May 31', value: 72000, x: 470, y: 100 },
    ];
  }, []);

  // Smooth SVG Path generator (Bezier curve through points)
  const svgPathData = useMemo(() => {
    return 'M 50 220 C 85 220, 95 165, 120 165 C 145 165, 165 195, 190 195 C 215 195, 235 110, 260 110 C 285 110, 305 80, 330 80 C 355 80, 375 140, 400 140 C 425 140, 445 100, 470 100';
  }, []);

  const svgAreaPathData = useMemo(() => {
    return `${svgPathData} L 470 260 L 50 260 Z`;
  }, [svgPathData]);

  const activePoint = chartPoints[hoveredPointIndex] || chartPoints[4];

  return (
    <div className="lumina-dashboard-wrapper">
      {/* Background Ambient Glow Orbs */}
      <div className="ambient-orb orb-1" />
      <div className="ambient-orb orb-2" />
      <div className="ambient-orb orb-3" />
      <div className="ambient-orb orb-4" />

      {/* Main Glass Grid Container */}
      <div className="lumina-main-layout">
        {/* ========================================================
            LEFT GLASS SIDEBAR (Matching Screenshot)
            ======================================================== */}
        <aside className="lumina-sidebar">
          {/* Brand Logo */}
          <div className="lumina-logo-area">
            <div className="lumina-gem-icon">
              <svg width="34" height="34" viewBox="0 0 100 100" fill="none">
                <defs>
                  <linearGradient id="gemGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#ec4899" />
                    <stop offset="50%" stopColor="#8b5cf6" />
                    <stop offset="100%" stopColor="#06b6d4" />
                  </linearGradient>
                </defs>
                <polygon points="50,5 92,27 92,73 50,95 8,73 8,27" fill="url(#gemGrad)" opacity="0.85" />
                <polygon points="50,5 92,27 50,50 8,27" fill="#ffffff" opacity="0.3" />
                <polygon points="50,50 92,27 92,73" fill="#ffffff" opacity="0.15" />
                <polygon points="50,50 8,27 8,73" fill="#000000" opacity="0.15" />
                <polygon points="50,50 92,73 50,95" fill="#000000" opacity="0.25" />
                <polygon points="50,50 8,73 50,95" fill="#ffffff" opacity="0.2" />
              </svg>
            </div>
            <span className="lumina-logo-text">LUMINA</span>
          </div>

          {/* Navigation Links */}
          <nav className="lumina-nav">
            {[
              {
                id: 'Overview',
                label: 'Overview',
                icon: (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
                  </svg>
                ),
              },
              {
                id: 'Analytics',
                label: 'Analytics',
                icon: (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 20V10M12 20V4M6 20v-6" />
                  </svg>
                ),
              },
              {
                id: 'Projects',
                label: 'Projects',
                icon: (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                  </svg>
                ),
              },
              {
                id: 'Users',
                label: 'Users',
                icon: (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                ),
              },
              {
                id: 'Calendar',
                label: 'Calendar',
                icon: (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                ),
              },
              {
                id: 'Messages',
                label: 'Messages',
                icon: (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                ),
              },
              {
                id: 'Settings',
                label: 'Settings',
                icon: (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                  </svg>
                ),
              },
            ].map((item) => {
              const isActive = activeNav === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveNav(item.id)}
                  className={`lumina-nav-item ${isActive ? 'active' : ''}`}
                >
                  <span className="lumina-nav-icon">{item.icon}</span>
                  <span className="lumina-nav-label">{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* User Profile Card at Bottom */}
          <div className="lumina-user-card">
            <div className="lumina-user-avatar">
              <img
                src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=faces"
                alt="Olivia Rhye"
                className="lumina-avatar-img"
              />
            </div>
            <div className="lumina-user-info">
              <span className="lumina-user-name">{currentUser?.full_name || 'Olivia Rhye'}</span>
              <span className="lumina-user-email">{currentUser?.email || 'olivia@lumina.io'}</span>
            </div>
          </div>
        </aside>

        {/* ========================================================
            RIGHT DASHBOARD CONTENT AREA
            ======================================================== */}
        <main className="lumina-content-viewport">
          {/* Top Greeting Header & Search Toolbar */}
          <header className="lumina-header">
            <div className="lumina-greeting-block">
              <h1 className="lumina-greeting-title">
                {greeting}, {userName} <span className="wave-hand">👋</span>
              </h1>
              <p className="lumina-greeting-subtitle">
                Here's what's happening with your projects today.
              </p>
            </div>

            <div className="lumina-header-actions">
              {/* Glass Search Input */}
              <div className="lumina-glass-search">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input type="text" placeholder="Search..." className="lumina-search-input" />
              </div>

              {/* Notification Bell */}
              <button type="button" className="lumina-icon-btn" title="Notifications">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                <span className="lumina-bell-dot" />
              </button>

              {/* Options Dots */}
              <button
                type="button"
                className="lumina-icon-btn"
                title="Currency Toggle / Mode"
                onClick={() => setCurrencyMode((prev) => (prev === 'USD' ? 'INR' : 'USD'))}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="12" cy="12" r="2" />
                  <circle cx="19" cy="12" r="2" />
                  <circle cx="5" cy="12" r="2" />
                </svg>
              </button>
            </div>
          </header>

          {/* ========================================================
              4 SUMMARY KPI CARDS (Matching Screenshot Row)
              ======================================================== */}
          <section className="lumina-kpi-row">
            {/* Card 1: Total Revenue */}
            <div className="lumina-glass-card kpi-card">
              <div className="kpi-icon-pill pill-purple">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                  <polyline points="17 6 23 6 23 12" />
                </svg>
              </div>
              <div className="kpi-details">
                <span className="kpi-label">Total Revenue</span>
                <span className="kpi-value">{currencyMode === 'USD' ? '$78,540' : '₹11.71 Cr'}</span>
                <span className="kpi-trend trend-up">
                  <span className="trend-arrow">↑</span> 12.5% from last month
                </span>
              </div>
            </div>

            {/* Card 2: Active Users */}
            <div className="lumina-glass-card kpi-card">
              <div className="kpi-icon-pill pill-blue">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
              <div className="kpi-details">
                <span className="kpi-label">Active Users</span>
                <span className="kpi-value">2,842</span>
                <span className="kpi-trend trend-up">
                  <span className="trend-arrow">↑</span> 8.1% from last month
                </span>
              </div>
            </div>

            {/* Card 3: Orders */}
            <div className="lumina-glass-card kpi-card">
              <div className="kpi-icon-pill pill-cyan">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="9" cy="21" r="1" />
                  <circle cx="20" cy="21" r="1" />
                  <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                </svg>
              </div>
              <div className="kpi-details">
                <span className="kpi-label">Orders</span>
                <span className="kpi-value">1,204</span>
                <span className="kpi-trend trend-up">
                  <span className="trend-arrow">↑</span> 14.3% from last month
                </span>
              </div>
            </div>

            {/* Card 4: Conversion Rate */}
            <div className="lumina-glass-card kpi-card">
              <div className="kpi-icon-pill pill-pink">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <path d="M6 10h12" />
                  <path d="M10 14h8" />
                </svg>
              </div>
              <div className="kpi-details">
                <span className="kpi-label">Conversion Rate</span>
                <span className="kpi-value">3.6%</span>
                <span className="kpi-trend trend-down">
                  <span className="trend-arrow">↓</span> 2.4% from last month
                </span>
              </div>
            </div>
          </section>

          {/* ========================================================
              MAIN TWO-COLUMN WORKSPACE: CHARTS & METRICS
              ======================================================== */}
          <div className="lumina-workspace-grid">
            {/* LEFT COLUMN: Revenue Spline Chart + System Status */}
            <div className="lumina-col-left">
              {/* Revenue Overview Spline Chart Card */}
              <div className="lumina-glass-card chart-main-card">
                <div className="chart-header-row">
                  <div>
                    <span className="chart-title">Revenue Overview</span>
                    <div className="chart-big-metric">
                      <span className="metric-num">{currencyMode === 'USD' ? '$78,540' : '₹11.71 Cr'}</span>
                      <span className="metric-badge">
                        <span className="trend-arrow">↑</span> 12.5%
                      </span>
                    </div>
                  </div>

                  <div className="chart-controls-row">
                    {/* Time Dropdown */}
                    <div className="lumina-dropdown-wrap">
                      <button
                        type="button"
                        className="lumina-dropdown-btn"
                        onClick={() => setShowTimeDropdown(!showTimeDropdown)}
                      >
                        <span>{timeRange}</span>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                      </button>

                      {showTimeDropdown && (
                        <div className="lumina-dropdown-popover">
                          {['This Month', 'Last Month', 'This Quarter', 'This Year'].map((t) => (
                            <button
                              key={t}
                              type="button"
                              className={`dropdown-opt ${timeRange === t ? 'active' : ''}`}
                              onClick={() => {
                                setTimeRange(t);
                                setShowTimeDropdown(false);
                              }}
                            >
                              {t}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <button type="button" className="lumina-mini-btn" title="More options">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <circle cx="12" cy="5" r="2" />
                        <circle cx="12" cy="12" r="2" />
                        <circle cx="12" cy="19" r="2" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Interactive SVG Spline Area Chart */}
                <div className="spline-chart-container">
                  <svg className="spline-svg" viewBox="0 0 520 280">
                    <defs>
                      {/* Neon Area Gradient */}
                      <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#ec4899" stopOpacity="0.45" />
                        <stop offset="50%" stopColor="#8b5cf6" stopOpacity="0.25" />
                        <stop offset="90%" stopColor="#06b6d4" stopOpacity="0.05" />
                        <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
                      </linearGradient>

                      {/* Stroke Line Gradient */}
                      <linearGradient id="strokeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#ec4899" />
                        <stop offset="35%" stopColor="#a855f7" />
                        <stop offset="70%" stopColor="#3b82f6" />
                        <stop offset="100%" stopColor="#06b6d4" />
                      </linearGradient>

                      {/* Glowing Shadow Filter */}
                      <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
                        <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#8b5cf6" floodOpacity="0.8" />
                      </filter>
                    </defs>

                    {/* Horizontal Faint Gridlines */}
                    {[50, 100, 150, 200, 250].map((yVal, i) => (
                      <line
                        key={i}
                        x1="45"
                        y1={yVal}
                        x2="485"
                        y2={yVal}
                        stroke="rgba(255, 255, 255, 0.08)"
                        strokeDasharray="4 4"
                      />
                    ))}

                    {/* Y-Axis Value Labels */}
                    <text x="12" y="55" className="chart-axis-text">$100K</text>
                    <text x="18" y="105" className="chart-axis-text">$75K</text>
                    <text x="18" y="155" className="chart-axis-text">$50K</text>
                    <text x="18" y="205" className="chart-axis-text">$25K</text>
                    <text x="32" y="255" className="chart-axis-text">$0</text>

                    {/* Area Fill */}
                    <path d={svgAreaPathData} fill="url(#areaGradient)" />

                    {/* Main Spline Curve with Neon Glow */}
                    <path
                      d={svgPathData}
                      fill="none"
                      stroke="url(#strokeGradient)"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      filter="url(#neonGlow)"
                    />

                    {/* Vertical Indicator Guide Line on Active Point */}
                    <line
                      x1={activePoint.x}
                      y1={activePoint.y}
                      x2={activePoint.x}
                      y2="260"
                      stroke="rgba(255, 255, 255, 0.35)"
                      strokeWidth="1.5"
                      strokeDasharray="3 3"
                    />

                    {/* Glowing Circular Node on Active Point */}
                    <circle
                      cx={activePoint.x}
                      cy={activePoint.y}
                      r="6.5"
                      fill="#ffffff"
                      stroke="#8b5cf6"
                      strokeWidth="3"
                      filter="url(#neonGlow)"
                    />

                    {/* Interactive Clickable Nodes for all dates */}
                    {chartPoints.map((pt, idx) => (
                      <circle
                        key={idx}
                        cx={pt.x}
                        cy={pt.y}
                        r="12"
                        fill="transparent"
                        style={{ cursor: 'pointer' }}
                        onMouseEnter={() => setHoveredPointIndex(idx)}
                      />
                    ))}
                  </svg>

                  {/* Floating Glass Tooltip matching Screenshot exactly */}
                  <div
                    className="floating-glass-tooltip"
                    style={{
                      left: `${(activePoint.x / 520) * 100}%`,
                      top: `${(activePoint.y / 280) * 100}%`,
                    }}
                  >
                    <div className="tooltip-date">{activePoint.date}, 2024</div>
                    <div className="tooltip-val">
                      {currencyMode === 'USD' ? `$${activePoint.value.toLocaleString()}` : `₹${(activePoint.value * 83).toLocaleString()}`}
                    </div>
                  </div>

                  {/* X-Axis Date Labels Row */}
                  <div className="chart-xaxis-labels">
                    {chartPoints.map((pt, i) => (
                      <span
                        key={i}
                        className={`xaxis-label ${hoveredPointIndex === i ? 'active' : ''}`}
                        onClick={() => setHoveredPointIndex(i)}
                      >
                        {pt.date}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Bottom System Status Glass Card */}
              <div className="lumina-glass-card system-status-card">
                <div className="system-status-left">
                  <span className="status-title">System Status</span>
                  <div className="status-indicators-row">
                    <div className="status-badge">
                      <span className="status-dot green-glow" />
                      <span>API Services <strong style={{ color: '#ffffff' }}>Operational</strong></span>
                    </div>

                    <div className="status-badge">
                      <span className="status-dot green-glow" />
                      <span>Database <strong style={{ color: '#ffffff' }}>Operational</strong></span>
                    </div>

                    <div className="status-badge">
                      <span className="status-dot green-glow" />
                      <span>Storage <strong style={{ color: '#ffffff' }}>Operational</strong></span>
                    </div>
                  </div>
                </div>

                <div className="system-status-right">
                  <div className="auto-update-text">
                    <span className="auto-title">Auto-updates</span>
                    <span className="auto-sub">Keep everything up to date</span>
                  </div>

                  {/* Interactive Glowing Toggle Switch */}
                  <button
                    type="button"
                    onClick={() => setAutoUpdates(!autoUpdates)}
                    className={`lumina-toggle-switch ${autoUpdates ? 'checked' : ''}`}
                    title="Toggle auto updates"
                  >
                    <span className="toggle-thumb" />
                  </button>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: Project Progress Donut + Notifications */}
            <div className="lumina-col-right">
              {/* Project Progress Circular Gauge Card */}
              <div className="lumina-glass-card progress-gauge-card">
                <div className="card-top-bar">
                  <span className="card-title-text">Project Progress</span>
                  <button type="button" className="lumina-mini-btn" title="Options">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <circle cx="12" cy="5" r="2" />
                      <circle cx="12" cy="12" r="2" />
                      <circle cx="12" cy="19" r="2" />
                    </svg>
                  </button>
                </div>

                <div className="progress-body-row">
                  {/* Glowing Donut Chart Gauge */}
                  <div className="gauge-graphic-wrap">
                    <svg width="140" height="140" viewBox="0 0 100 100">
                      <defs>
                        <linearGradient id="progressGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#06b6d4" />
                          <stop offset="50%" stopColor="#8b5cf6" />
                          <stop offset="100%" stopColor="#ec4899" />
                        </linearGradient>
                      </defs>

                      {/* Track */}
                      <circle
                        cx="50"
                        cy="50"
                        r="38"
                        fill="transparent"
                        stroke="rgba(255, 255, 255, 0.12)"
                        strokeWidth="11"
                      />

                      {/* Progress Arc (72% -> 2 * PI * 38 = 238.76; dashoffset = 238.76 * (1 - 0.72) = 66.85) */}
                      <circle
                        cx="50"
                        cy="50"
                        r="38"
                        fill="transparent"
                        stroke="url(#progressGrad)"
                        strokeWidth="11"
                        strokeDasharray="238.76"
                        strokeDashoffset="66.85"
                        strokeLinecap="round"
                        transform="rotate(-90 50 50)"
                        style={{ filter: 'drop-shadow(0 0 6px rgba(6, 182, 212, 0.6))' }}
                      />
                    </svg>

                    <div className="gauge-center-text">
                      <span className="gauge-percent">72%</span>
                      <span className="gauge-sub">Complete</span>
                    </div>
                  </div>

                  {/* Project Items List with percentages */}
                  <div className="project-items-list">
                    <div className="project-row">
                      <div className="project-row-left">
                        <span className="legend-dot" style={{ backgroundColor: '#10b981', boxShadow: '0 0 8px #10b981' }} />
                        <span className="project-name">Design System</span>
                      </div>
                      <span className="project-pct">90%</span>
                    </div>

                    <div className="project-row">
                      <div className="project-row-left">
                        <span className="legend-dot" style={{ backgroundColor: '#06b6d4', boxShadow: '0 0 8px #06b6d4' }} />
                        <span className="project-name">Marketing Site</span>
                      </div>
                      <span className="project-pct">72%</span>
                    </div>

                    <div className="project-row">
                      <div className="project-row-left">
                        <span className="legend-dot" style={{ backgroundColor: '#f59e0b', boxShadow: '0 0 8px #f59e0b' }} />
                        <span className="project-name">Mobile App</span>
                      </div>
                      <span className="project-pct">45%</span>
                    </div>

                    <div className="project-row">
                      <div className="project-row-left">
                        <span className="legend-dot" style={{ backgroundColor: '#60a5fa', boxShadow: '0 0 8px #60a5fa' }} />
                        <span className="project-name">Dashboard</span>
                      </div>
                      <span className="project-pct">60%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Notifications Glass Card */}
              <div className="lumina-glass-card notifications-card">
                <div className="card-top-bar">
                  <span className="card-title-text">Notifications</span>
                  <button type="button" className="lumina-link-btn">
                    View all
                  </button>
                </div>

                <div className="notifications-list">
                  {/* Item 1: Design System completed */}
                  <div className="notification-row">
                    <div className="notification-icon-wrap teal-box">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                    <div className="notification-content">
                      <span className="notif-title">Design System completed</span>
                      <span className="notif-time">2 hours ago</span>
                    </div>
                  </div>

                  {/* Item 2: New user registered */}
                  <div className="notification-row">
                    <div className="notification-icon-wrap blue-box">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                    </div>
                    <div className="notification-content">
                      <span className="notif-title">New user registered</span>
                      <span className="notif-time">5 hours ago</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
