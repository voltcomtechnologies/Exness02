"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface AnalysisResult {
  Account: string;
  "Checked Time": string;
  "Account Size": string;
  Balance: string;
  Equity: string;
  "Margin Free": string;
  "Margin Level": string;
  Leverage: string;
  Currency: string;
  "Win Rate": string;
  "Total P/L": string;
  "Profit Factor": string;
  "Avg Duration": string;
  "Best Trade": string;
  "Worst Trade": string;
  "Avg Loss": string;
  "Trade Frequency": string;
  "Floating P/L": string;
  "Risk Per Trade": string;
  Expectancy: string;
  "Scalp Trades": number;
  "Total Trades": number;
  "Scalp Percent": string;
  "Maximum DD": string;
  "Loss from Peak": string;
  "Drawdown Time": string;
  "Drawdown Alert": boolean;
  Result: string;
  "Request(s)": string;
  "History"?: Trade[];
  "Equity History"?: EquityPoint[];
  "Extended Equity History"?: EquityPoint[];
  "Breach Date"?: string | null;
  "Scalping Breach Date"?: string | null;
}

interface EquityPoint {
  time: string;
  equity: number;
}

interface Trade {
  ticket: number;
  open_time: string;
  type: string;
  volume: number;
  symbol: string;
  open_price: number;
  close_time: string;
  close_price: number;
  profit: number;
}

const sidebarItems = [
  { id: 'dashboard', icon: '⊞', label: 'Dashboard' },
  { id: 'overview', icon: '📊', label: 'Account Overview' },
  { id: 'history', icon: '📋', label: 'Trade History' },
  { id: 'support', icon: '🎫', label: 'Support Tickets' },
];

const appItems = [
  { id: 'news', icon: '📰', label: 'News Feed' },
  { id: 'calendar', icon: '📅', label: 'Economic Calendar' },
];

const currencySymbols: { [key: string]: string } = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  JPY: "¥",
  AUD: "A$",
  CAD: "C$",
  CHF: "Fr",
  NGN: "₦",
  ZAR: "R"
};

export default function Home() {
  const [formData, setFormData] = useState({
    account_id: "",
    password: "",
    server: "",
    platform: "MT5",
  });

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [accounts, setAccounts] = useState<any[]>([]);

  // CRM States
  const [tickets, setTickets] = useState<any[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [ticketSubject, setTicketSubject] = useState("");
  const [ticketReplyContent, setTicketReplyContent] = useState("");

  const [dataLoaded, setDataLoaded] = useState(false); // To track if we've attempted initial load
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const storedAccounts = localStorage.getItem("nairafunded_accounts");
    if (storedAccounts) {
      try {
        const parsed = JSON.parse(storedAccounts);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setAccounts(parsed);
          // Auto-login to the most recent account
          analyzeAccount(parsed[0]);
        }
        setDataLoaded(true);
      } catch (e) {
        console.error("Failed to parse accounts", e);
        setDataLoaded(true);
      }
    } else {
      setDataLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'support' && result) fetchTickets();
  }, [activeTab, result]);

  const fetchTickets = async () => {
    if (!formData.account_id) return;
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await fetch(`${apiUrl}/api/user/tickets/${formData.account_id}`);
      const data = await res.json();
      setTickets(data);
    } catch (err) {
      console.error(err);
    }
  };

  const createTicket = async () => {
    if (!ticketSubject.trim() || !formData.account_id) return;
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await fetch(`${apiUrl}/api/user/tickets?account_id=${formData.account_id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: ticketSubject })
      });
      if (res.ok) {
        setTicketSubject("");
        fetchTickets();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const sendTicketReply = async () => {
    if (!ticketReplyContent.trim() || !selectedTicket || !formData.account_id) return;
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await fetch(`${apiUrl}/api/user/tickets/${selectedTicket.id}/messages?account_id=${formData.account_id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: ticketReplyContent })
      });
      if (res.ok) {
        setTicketReplyContent("");
        const newMsg = await res.json();
        setSelectedTicket({
          ...selectedTicket,
          messages: [...(selectedTicket.messages || []), newMsg]
        });
        fetchTickets();
      }
    } catch (err) {
      console.error(err);
    }
  };




  const analyzeAccount = async (creds: any) => {
    setLoading(true);
    setError(null);
    setFormData(creds); // Update form data to match

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await fetch(`${apiUrl}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...creds,
          account_id: parseInt(creds.account_id),
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Analysis failed");

      setResult(data);

      // Update accounts list
      setAccounts(prev => {
        const filtered = prev.filter(a => String(a.account_id) !== String(creds.account_id));
        const updated = [creds, ...filtered];
        localStorage.setItem("nairafunded_accounts", JSON.stringify(updated));
        return updated;
      });

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await analyzeAccount(formData);
  };

  const handleSwitchAccount = (account: any) => {
    analyzeAccount(account);
  };

  const handleRemoveAccount = (accountId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = accounts.filter(a => String(a.account_id) !== String(accountId));
    setAccounts(updated);
    localStorage.setItem("nairafunded_accounts", JSON.stringify(updated));

    // If we removed the current account, clear result or switch to another
    if (String(formData.account_id) === String(accountId)) {
      if (updated.length > 0) {
        analyzeAccount(updated[0]);
      } else {
        setResult(null);
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const getSym = (currency?: string) => {
    if (!currency) return "$";
    return currencySymbols[currency] || (currency + " ");
  };

  const parseVal = (val: string) => {
    return parseFloat(val.replace(/[^0-9.-]+/g, "")) || 0;
  };

  if (!result) {
    return (
      <div className="login-screen">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-panel login-card"
        >
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <h1 className="text-glow" style={{ fontSize: '2.5rem', fontWeight: 800 }}>Naira<span style={{ fontWeight: 300, fontSize: '1.5rem' }}>Funded</span></h1>
            <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Advanced Account Dashboard</p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-mute)', textTransform: 'uppercase', fontWeight: 700 }}>Platform</label>
              <select name="platform" value={formData.platform} onChange={handleChange} className="input-field">
                <option value="MT5">MetaTrader 5</option>
                <option value="MT4">MetaTrader 4</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-mute)', textTransform: 'uppercase', fontWeight: 700 }}>Account ID</label>
              <input type="number" name="account_id" placeholder="2110113586" required value={formData.account_id} onChange={handleChange} className="input-field" />
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-mute)', textTransform: 'uppercase', fontWeight: 700 }}>Password</label>
              <input type="password" name="password" placeholder="••••••••" required value={formData.password} onChange={handleChange} className="input-field" />
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-mute)', textTransform: 'uppercase', fontWeight: 700 }}>Server</label>
              <input type="text" name="server" placeholder="Exness-MT5Trial" required value={formData.server} onChange={handleChange} className="input-field" />
            </div>

            {error && <p style={{ color: "var(--accent-red)", fontSize: "0.85rem", textAlign: 'center' }}>{error}</p>}

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? "AUTHENTICATING..." : "ACTIVATE ACCOUNT"}
            </button>

            {accounts.length > 0 && (
              <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border-glass)', paddingTop: '1rem' }}>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-mute)', marginBottom: '0.5rem', textAlign: 'center' }}>Switch to saved account:</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {accounts.map(acc => (
                    <button
                      key={acc.account_id}
                      type="button"
                      onClick={() => analyzeAccount(acc)}
                      className="glass-panel"
                      style={{
                        padding: '0.75rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        cursor: 'pointer',
                        border: '1px solid var(--border-glass)',
                        background: 'rgba(255,255,255,0.03)'
                      }}
                    >
                      <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{acc.account_id}</span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-mute)' }}>{acc.server}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Sidebar Overlay */}
      <div className={`sidebar-overlay ${sidebarOpen ? 'visible' : ''}`} onClick={() => setSidebarOpen(false)} />
      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div style={{ marginBottom: '3rem' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Naira<span style={{ fontWeight: 300, fontSize: '0.9rem' }}>Funded</span></h1>
        </div>

        <nav style={{ flex: 1 }}>
          <p style={{ fontSize: '0.65rem', color: 'var(--text-mute)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem' }}>Navigation</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {sidebarItems.map((item) => (
              <button
                key={item.id}
                onClick={() => { setActiveTab(item.id); setSidebarOpen(false); }}
                className={`btn-icon ${activeTab === item.id ? 'active-nav-item' : ''}`}
                style={{ width: '100%', justifyContent: 'flex-start', padding: '0 1rem', background: 'transparent', border: 'none', transform: 'none' }}
              >
                <span style={{ marginRight: '1rem', fontSize: '1.2rem' }}>{item.icon}</span>
                <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{item.label}</span>
              </button>
            ))}
          </div>

          <p style={{ fontSize: '0.65rem', color: 'var(--text-mute)', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '2.5rem', marginBottom: '1rem' }}>Apps</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {appItems.map((item) => (
              <button
                key={item.id}
                onClick={() => { setActiveTab(item.id); setSidebarOpen(false); }}
                className={`btn-icon ${activeTab === item.id ? 'active-nav-item' : ''}`}
                style={{ width: '100%', justifyContent: 'flex-start', padding: '0 1rem', background: 'transparent', border: 'none', transform: 'none' }}
              >
                <span style={{ marginRight: '1rem', fontSize: '1.2rem' }}>{item.icon}</span>
                <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{item.label}</span>
              </button>
            ))}
          </div>
        </nav>

        {/* Account Switcher Dropdown */}
        <div style={{ padding: '1rem 0', borderTop: '1px solid var(--border-glass)', marginTop: 'auto' }}>
          <p style={{ fontSize: '0.65rem', color: 'var(--text-mute)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.75rem' }}>Switch Accounts</p>

          {accounts.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ position: 'relative' }}>
                <select
                  value={String(formData.account_id)}
                  onChange={(e) => {
                    const selected = accounts.find(a => String(a.account_id) === e.target.value);
                    if (selected) handleSwitchAccount(selected);
                  }}
                  className="input-field"
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '0.6rem 2rem 0.6rem 0.75rem',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    appearance: 'none',
                    WebkitAppearance: 'none',
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 0.75rem center',
                  }}
                >
                  {accounts.map(acc => (
                    <option key={acc.account_id} value={String(acc.account_id)} style={{ color: '#000', background: '#fff' }}>
                      {acc.account_id} — {acc.platform || acc.server}
                    </option>
                  ))}
                </select>
              </div>

              {/* Remove current account */}
              <button
                onClick={(e) => handleRemoveAccount(String(formData.account_id), e)}
                style={{
                  background: 'none',
                  border: '1px solid rgba(255, 69, 58, 0.2)',
                  borderRadius: '8px',
                  color: 'var(--accent-red)',
                  cursor: 'pointer',
                  fontSize: '0.72rem',
                  padding: '0.4rem',
                  fontWeight: 500,
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 69, 58, 0.08)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
              >
                Remove Current Account
              </button>
            </div>
          ) : (
            <p style={{ fontSize: '0.75rem', color: 'var(--text-mute)' }}>No accounts added</p>
          )}

          <button
            onClick={() => setResult(null)}
            className="btn-icon"
            style={{
              width: '100%',
              justifyContent: 'center',
              padding: '0.5rem',
              background: 'rgba(255,255,255,0.05)',
              border: '1px dashed var(--border-glass)',
              marginTop: '0.75rem'
            }}
          >
            <span style={{ marginRight: '0.5rem' }}>+</span> Add Account
          </button>
        </div>

        <div style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <button className="btn-icon" style={{ width: '100%', justifyContent: 'flex-start', padding: '0 1rem', background: 'transparent', border: 'none' }}>
            <span style={{ marginRight: '1rem' }}>❓</span> Help Center (F&Q)
          </button>
          <button onClick={() => setResult(null)} className="btn-icon" style={{ width: '100%', justifyContent: 'flex-start', padding: '0 1rem', background: 'transparent', border: 'none' }}>
            <span style={{ marginRight: '1rem' }}>⬅</span> Back to Website
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-wrapper">
        <motion.header
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="responsive-header"
        >
          <button className="hamburger-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>☰</button>
          <div className="glass-panel header-search">
            <span style={{ marginRight: '0.75rem', color: 'var(--text-mute)' }}>🔍</span>
            <input type="text" placeholder="Search account metrics..." style={{ background: 'transparent', border: 'none', color: 'white', outline: 'none', width: '100%', fontSize: '0.85rem' }} />
            <span className="btn-icon" style={{ width: '28px', height: '28px', fontSize: '0.8rem' }}>⌘</span>
          </div>

          <div className="header-right">
            <div className="btn-icon">🔔</div>
            <div className="glass-panel header-account-pill">
              <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>NairaFunded Account {result.Account}</span>
              <span style={{ color: 'var(--text-mute)' }}>⌵</span>
            </div>
            <div className="header-user-info">
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: '0.85rem', fontWeight: 700 }}>Trader Portal</p>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-mute)' }}>Connected to {formData.server}</p>
              </div>
              <div style={{ width: '40px', height: '40px', background: 'var(--border-glass)', borderRadius: '99px', flexShrink: 0 }}></div>
            </div>
          </div>
        </motion.header>

        {activeTab === 'dashboard' && (
          <>
            <section className="dashboard-grid">
              {/* Main Chart Card */}
              <motion.div
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                className="glass-panel"
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                  <div>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-mute)', marginBottom: '0.5rem' }}>Account Balance overview</p>
                    <h2 className="balance-text" style={{ fontSize: '2.5rem', fontWeight: 800 }}>{result.Balance} <span style={{ fontSize: '1rem', color: 'var(--text-mute)', fontWeight: 400 }}>{result.Currency}</span></h2>
                  </div>
                  <div className="time-filters" style={{ display: 'flex', gap: '0.5rem' }}>
                    {['1s', '15m', '1h', '4h', '1d', '1w'].map(t => (
                      <button key={t} className={`btn-icon ${t === '1d' ? 'active-nav-item' : ''}`} style={{ width: '36px', height: '36px', fontSize: '0.75rem' }}>{t}</button>
                    ))}
                  </div>
                </div>

                <div className="chart-container">
                  {result["Equity History"] && result["Equity History"].length > 1 ? (
                    <svg width="100%" height="100%" viewBox="0 0 800 200" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="chart-gradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--accent-teal)" stopOpacity="0.4" />
                          <stop offset="100%" stopColor="var(--accent-teal)" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      {(() => {
                        const history = result["Extended Equity History"] || result["Equity History"]!;
                        const equities = history.map(h => h.equity);

                        // Pre-calculate trailing peak and drawdown limits
                        let currentPeak = -Infinity;
                        const ddLimits: number[] = [];
                        for (const h of history) {
                          if (h.equity > currentPeak) currentPeak = h.equity;
                          ddLimits.push(currentPeak * 0.8);
                        }

                        // Include dd limits in range so both lines are visible
                        const allValues = [...equities, ...ddLimits];
                        const minVal = Math.min(...allValues);
                        const maxVal = Math.max(...allValues);
                        const rawRange = maxVal - minVal || 1;
                        const paddedMin = minVal - rawRange * 0.05;
                        const paddedRange = rawRange * 1.1;

                        const points = history.map((h, i) => {
                          const x = (i / (history.length - 1)) * 800;
                          const y = 180 - ((h.equity - paddedMin) / paddedRange) * 160;
                          return `${x},${y}`;
                        });

                        const ddPathPoints = history.map((_h, i) => {
                          const x = (i / (history.length - 1)) * 800;
                          const ddY = 180 - ((ddLimits[i] - paddedMin) / paddedRange) * 160;
                          return `${x},${ddY}`;
                        });

                        const mainPath = `M${points.join(' L')}`;
                        const areaPath = `${mainPath} L800,200 L0,200 Z`;
                        const ddPath = `M${ddPathPoints.join(' L')}`;

                        return (
                          <>
                            <path className="chart-area" d={areaPath} style={{ fill: 'url(#chart-gradient)', stroke: 'none' }} />
                            <path className="chart-line" d={mainPath} style={{ fill: 'none', stroke: 'var(--accent-teal)', strokeWidth: 2 }} />
                            <path className="dd-line" d={ddPath} style={{ fill: 'none', stroke: 'var(--accent-red)', strokeWidth: 1.5, strokeDasharray: '6 4', opacity: 0.8 }} />

                            {/* Marker for current price */}
                            <circle cx="800" cy={points[points.length - 1].split(',')[1]} r="4" fill="var(--accent-teal)" />

                            {/* Legend */}
                            <g transform="translate(10, 20)">
                              <line x1="0" y1="0" x2="20" y2="0" style={{ stroke: 'var(--accent-teal)', strokeWidth: 2 }} />
                              <text x="25" y="5" fill="var(--text-secondary)" fontSize="10">Account Balance</text>
                              <line x1="0" y1="15" x2="20" y2="15" style={{ stroke: 'var(--accent-red)', strokeWidth: 1.5, strokeDasharray: '2 2' }} />
                              <text x="25" y="20" fill="var(--text-secondary)" fontSize="10">20% Trailing Drawdown Limit</text>
                            </g>
                          </>
                        );
                      })()}
                    </svg>
                  ) : (
                    <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-mute)' }}>
                      Insufficient history data to render chart
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2rem', color: 'var(--text-mute)', fontSize: '0.75rem' }}>
                  <span>8:00 AM</span>
                  <span>10:00 AM</span>
                  <span>12:00 PM</span>
                  <span>02:00 PM</span>
                  <span>04:00 PM</span>
                  <span>06:00 PM</span>
                </div>
              </motion.div>

              {/* Loss Analysis Sidebar Cards */}
              <motion.div
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}
              >
                <div className="glass-panel">
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Account Loss Analysis</h3>
                    <div className="badge badge-success">{result.Result}</div>
                  </div>

                  <div style={{ marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Maximum Drawdown</span>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-red)' }}>{result["Maximum DD"]}</span>
                    </div>
                    <div style={{ height: '6px', width: '100%', background: 'var(--border-glass)', borderRadius: '99px' }}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, (parseFloat(result["Maximum DD"]) / 20) * 100)}%` }}
                        style={{ height: '100%', background: 'var(--accent-red)', borderRadius: '99px', boxShadow: '0 0 10px var(--accent-red)' }}
                      />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.4rem', fontSize: '0.65rem', color: 'var(--text-mute)' }}>
                      <span>Recorded: {result["Loss from Peak"]}</span>
                      <span>Limit: 20.00%</span>
                    </div>
                  </div>

                  <div style={{ marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Scalping Violation</span>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: result["Scalp Trades"] > 0 ? 'var(--accent-red)' : 'var(--accent-green)' }}>
                        {result["Scalp Trades"]} Trades
                      </span>
                    </div>
                    <div style={{ height: '6px', width: '100%', background: 'var(--border-glass)', borderRadius: '99px' }}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: result["Scalp Trades"] > 0 ? '100%' : '0%' }}
                        style={{ height: '100%', background: 'var(--accent-red)', borderRadius: '99px' }}
                      />
                    </div>
                    <p style={{ marginTop: '0.4rem', fontSize: '0.65rem', color: 'var(--text-mute)' }}>No trades &le; 5 minutes allowed.</p>
                  </div>
                </div>

                {/* New: Account Pass Analysis Card */}
                <div className="glass-panel" style={{
                  background: (result["Breach Date"] || result["Scalp Trades"] > 0)
                    ? 'linear-gradient(135deg, rgba(255, 69, 58, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)'
                    : parseVal(result["Total P/L"]) >= (parseVal(result["Account Size"]) * 0.1)
                      ? 'linear-gradient(135deg, rgba(46, 213, 115, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)'
                      : 'rgba(255, 255, 255, 0.03)',
                  border: (result["Breach Date"] || result["Scalp Trades"] > 0)
                    ? '1px solid rgba(255, 69, 58, 0.3)'
                    : parseVal(result["Total P/L"]) >= (parseVal(result["Account Size"]) * 0.1)
                      ? '1px solid rgba(46, 213, 115, 0.3)'
                      : '1px solid var(--border-glass)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Account Pass Analysis</h3>
                    <div className={`badge ${(result["Breach Date"] || result["Scalp Trades"] > 0) ? 'badge-error' : (parseVal(result["Total P/L"]) >= (parseVal(result["Account Size"]) * 0.1) ? 'badge-success' : 'badge-warning')}`}>
                      {(result["Breach Date"] || result["Scalp Trades"] > 0) ? 'BREACHED' : (parseVal(result["Total P/L"]) >= (parseVal(result["Account Size"]) * 0.1) ? 'TARGET HIT' : 'IN PROGRESS')}
                    </div>
                  </div>

                  <div style={{ marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Profit Target (10%)</span>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-teal)' }}>
                        {((parseVal(result["Total P/L"]) / (parseVal(result["Account Size"]) * 0.1)) * 100).toFixed(2)}%
                      </span>
                    </div>
                    <div style={{ height: '6px', width: '100%', background: 'var(--border-glass)', borderRadius: '99px' }}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, (parseVal(result["Total P/L"]) / (parseVal(result["Account Size"]) * 0.1)) * 100)}%` }}
                        style={{ height: '100%', background: 'var(--accent-teal)', borderRadius: '99px', boxShadow: '0 0 10px var(--accent-teal)' }}
                      />
                    </div>
                  </div>

                  {(result["Breach Date"] || result["Scalp Trades"] > 0) ? (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      style={{
                        padding: '1rem',
                        background: 'rgba(255, 69, 58, 0.1)',
                        borderRadius: '12px',
                        border: '1px solid rgba(255, 69, 58, 0.2)',
                        textAlign: 'center'
                      }}
                    >
                      <p style={{ fontSize: '1.2rem', marginBottom: '0.25rem' }}>⚠️</p>
                      <p style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--accent-red)' }}>Account Breached</p>
                      {result["Breach Date"] && (
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                          Maximum drawdown limit breached on <strong>{result["Breach Date"]}</strong>.
                        </p>
                      )}
                      {result["Scalp Trades"] > 0 && (
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                          Scalping rule (trade &le; 5 minutes) breached {result["Scalping Breach Date"] ? <span>on <strong>{result["Scalping Breach Date"]}</strong></span> : "during trading"}.
                        </p>
                      )}
                    </motion.div>
                  ) : parseVal(result["Total P/L"]) >= (parseVal(result["Account Size"]) * 0.1) ? (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      style={{
                        padding: '1rem',
                        background: 'rgba(46, 213, 115, 0.1)',
                        borderRadius: '12px',
                        border: '1px solid rgba(46, 213, 115, 0.2)',
                        textAlign: 'center'
                      }}
                    >
                      <p style={{ fontSize: '1.2rem', marginBottom: '0.25rem' }}>🎉</p>
                      <p style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--accent-green)' }}>Congratulations!</p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>You have successfully completed this stage.</p>
                    </motion.div>
                  ) : null}
                </div>
              </motion.div>
            </section>

            {/* Stats Row */}
            <section className="stats-row">
              {[
                { label: 'Average Win', value: result["Best Trade"], icon: '↗' },
                { label: 'Average Loss', value: result["Avg Loss"], icon: '↘' },
                { label: 'Win Ratio', value: result["Win Rate"], icon: '⌘' },
                { label: 'Profit Factor', value: result["Profit Factor"], icon: '🏆' },
              ].map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: i * 0.1 }}
                  className="glass-panel"
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                    <div className="btn-icon" style={{ background: 'var(--accent-teal-dim)', borderColor: 'var(--accent-teal-glow)', color: 'var(--accent-teal)' }}>{stat.icon}</div>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{stat.label}</span>
                  </div>
                  <p style={{ fontSize: '1.75rem', fontWeight: 800 }}>{stat.value}</p>
                </motion.div>
              ))}
            </section>

            {/* Goal Overview */}
            <motion.section
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="glass-panel"
              style={{ marginTop: '1.5rem' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
                <div className="btn-icon">📈</div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Goal Overview</h3>
              </div>

              <div className="goal-grid">
                {[
                  { label: 'Minimum Trading Days', target: '1 Days', current: '1 Days', pass: true },
                  {
                    label: 'Profit Target',
                    target: `${getSym(result.Currency)}${(parseVal(result["Account Size"]) * 0.1).toLocaleString(undefined, { minimumFractionDigits: 2 })} (10-50%)`,
                    current: result["Total P/L"],
                    pass: parseVal(result["Total P/L"]) >= (parseVal(result["Account Size"]) * 0.1),
                    hideBadge: true
                  },
                  { label: 'Initial Balance Loss', target: `${getSym(result.Currency)}0.00`, current: result["Maximum DD"], pass: parseVal(result["Maximum DD"]) < 20 },
                ].map((goal: any) => (
                  <div key={goal.label} className="glass-panel gradient-card" style={{ background: 'rgba(255,255,255,0.02)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', position: 'relative', zIndex: 1 }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{goal.label}</span>
                      {!goal.hideBadge && (
                        <div className={`badge ${goal.pass ? 'badge-success' : 'badge-error'}`}>{goal.pass ? 'Passes' : 'Failed'}</div>
                      )}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <div>
                        <p style={{ fontSize: '0.65rem', color: 'var(--text-mute)', textTransform: 'uppercase' }}>Minimum Result</p>
                        <p style={{ fontSize: '1rem', fontWeight: 700 }}>{goal.target}</p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: '0.65rem', color: 'var(--text-mute)', textTransform: 'uppercase' }}>Current Result</p>
                        <p style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--accent-teal)' }}>{goal.current}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.section>
          </>
        )}

        {activeTab === 'overview' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1 }}
            className="glass-panel mobile-padding"
            style={{ padding: '2rem' }}
          >
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '2rem' }}>Account Overview</h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1.5rem' }}>
              {/* Account Details */}
              <div className="glass-panel" style={{ background: 'rgba(255,255,255,0.02)' }}>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-mute)', textTransform: 'uppercase' }}>Account</p>
                <p style={{ fontSize: '1.2rem', fontWeight: 700 }}>{result.Account}</p>
              </div>
              <div className="glass-panel" style={{ background: 'rgba(255,255,255,0.02)' }}>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-mute)', textTransform: 'uppercase' }}>Balance</p>
                <p style={{ fontSize: '1.2rem', fontWeight: 700 }}>{result.Balance}</p>
              </div>
              <div className="glass-panel" style={{ background: 'rgba(255,255,255,0.02)' }}>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-mute)', textTransform: 'uppercase' }}>Equity</p>
                <p style={{ fontSize: '1.2rem', fontWeight: 700 }}>{result.Equity}</p>
              </div>
              <div className="glass-panel" style={{ background: 'rgba(255,255,255,0.02)' }}>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-mute)', textTransform: 'uppercase' }}>Leverage</p>
                <p style={{ fontSize: '1.2rem', fontWeight: 700 }}>{result.Leverage}</p>
              </div>

              {/* Profit Analysis */}
              <div className="glass-panel" style={{ background: 'rgba(255,255,255,0.02)' }}>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-mute)', textTransform: 'uppercase' }}>Total P/L</p>
                <p style={{ fontSize: '1.2rem', fontWeight: 700, color: parseVal(result["Total P/L"]) >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                  {result["Total P/L"]}
                </p>
              </div>
              <div className="glass-panel" style={{ background: 'rgba(255,255,255,0.02)' }}>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-mute)', textTransform: 'uppercase' }}>Win Rate</p>
                <p style={{ fontSize: '1.2rem', fontWeight: 700 }}>{result["Win Rate"]}</p>
              </div>
              <div className="glass-panel" style={{ background: 'rgba(255,255,255,0.02)' }}>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-mute)', textTransform: 'uppercase' }}>Profit Factor</p>
                <p style={{ fontSize: '1.2rem', fontWeight: 700 }}>{result["Profit Factor"]}</p>
              </div>
              <div className="glass-panel" style={{ background: 'rgba(255,255,255,0.02)' }}>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-mute)', textTransform: 'uppercase' }}>Expectancy</p>
                <p style={{ fontSize: '1.2rem', fontWeight: 700 }}>{result.Expectancy}</p>
              </div>

              {/* Risk Analysis */}
              <div className="glass-panel" style={{ background: 'rgba(255,255,255,0.02)' }}>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-mute)', textTransform: 'uppercase' }}>Max Drawdown</p>
                <p style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--accent-red)' }}>{result["Maximum DD"]}</p>
              </div>
              <div className="glass-panel" style={{ background: 'rgba(255,255,255,0.02)' }}>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-mute)', textTransform: 'uppercase' }}>Risk Per Trade</p>
                <p style={{ fontSize: '1.2rem', fontWeight: 700 }}>{result["Risk Per Trade"]}</p>
              </div>
              <div className="glass-panel" style={{ background: 'rgba(255,255,255,0.02)' }}>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-mute)', textTransform: 'uppercase' }}>Margin Free</p>
                <p style={{ fontSize: '1.2rem', fontWeight: 700 }}>{result["Margin Free"]}</p>
              </div>
              <div className="glass-panel" style={{ background: 'rgba(255,255,255,0.02)' }}>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-mute)', textTransform: 'uppercase' }}>Active Trades</p>
                <p style={{ fontSize: '1.2rem', fontWeight: 700 }}>{parseVal(result["Floating P/L"]) !== 0 ? 'Yes' : 'No'}</p>
              </div>

              {/* Trade Stats */}
              <div className="glass-panel" style={{ background: 'rgba(255,255,255,0.02)' }}>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-mute)', textTransform: 'uppercase' }}>Total Trades</p>
                <p style={{ fontSize: '1.2rem', fontWeight: 700 }}>{result["Total Trades"]}</p>
              </div>
              <div className="glass-panel" style={{ background: 'rgba(255,255,255,0.02)' }}>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-mute)', textTransform: 'uppercase' }}>Avg Duration</p>
                <p style={{ fontSize: '1.2rem', fontWeight: 700 }}>{result["Avg Duration"]}</p>
              </div>
              <div className="glass-panel" style={{ background: 'rgba(255,255,255,0.02)' }}>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-mute)', textTransform: 'uppercase' }}>Best Trade</p>
                <p style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--accent-green)' }}>{result["Best Trade"]}</p>
              </div>
              <div className="glass-panel" style={{ background: 'rgba(255,255,255,0.02)' }}>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-mute)', textTransform: 'uppercase' }}>Worst Trade</p>
                <p style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--accent-red)' }}>{result["Worst Trade"]}</p>
              </div>
            </div>
          </motion.div>
        )}



        {activeTab === 'history' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-panel mobile-padding"
            style={{ padding: '2rem', overflowX: 'auto' }}
          >
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '2rem' }}>Trade History</h2>

            {result.History && result.History.length > 0 ? (
              <>
                {/* Desktop Table */}
                <div className="table-responsive desktop-table">
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-glass)', textAlign: 'left' }}>
                        <th style={{ padding: '1rem', color: 'var(--text-mute)' }}>Ticket</th>
                        <th style={{ padding: '1rem', color: 'var(--text-mute)' }}>Symbol</th>
                        <th style={{ padding: '1rem', color: 'var(--text-mute)' }}>Type</th>
                        <th style={{ padding: '1rem', color: 'var(--text-mute)' }}>Volume</th>
                        <th style={{ padding: '1rem', color: 'var(--text-mute)' }}>Open Time</th>
                        <th style={{ padding: '1rem', color: 'var(--text-mute)' }}>Open Price</th>
                        <th style={{ padding: '1rem', color: 'var(--text-mute)' }}>Close Time</th>
                        <th style={{ padding: '1rem', color: 'var(--text-mute)' }}>Close Price</th>
                        <th style={{ padding: '1rem', color: 'var(--text-mute)', textAlign: 'right' }}>Profit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.History.slice().reverse().map((trade) => (
                        <tr key={trade.ticket} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <td style={{ padding: '1rem', fontWeight: 600 }}>{trade.ticket}</td>
                          <td style={{ padding: '1rem', color: 'var(--accent-teal)' }}>{trade.symbol}</td>
                          <td style={{ padding: '1rem', textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 700, color: trade.type === 'buy' ? 'var(--accent-green)' : 'var(--accent-red)' }}>{trade.type}</td>
                          <td style={{ padding: '1rem' }}>{trade.volume}</td>
                          <td style={{ padding: '1rem', color: 'var(--text-mute)', fontSize: '0.75rem' }}>{new Date(trade.open_time).toLocaleString()}</td>
                          <td style={{ padding: '1rem' }}>{trade.open_price}</td>
                          <td style={{ padding: '1rem', color: 'var(--text-mute)', fontSize: '0.75rem' }}>{new Date(trade.close_time).toLocaleString()}</td>
                          <td style={{ padding: '1rem' }}>{trade.close_price}</td>
                          <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 700, color: trade.profit >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                            {trade.profit >= 0 ? '+' : ''}{trade.profit.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card View */}
                <div className="mobile-card-list">
                  {result.History.slice().reverse().map((trade) => (
                    <div key={trade.ticket} className="mobile-trade-card">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <span style={{ color: 'var(--accent-teal)', fontWeight: 700, fontSize: '0.9rem' }}>{trade.symbol}</span>
                          <span style={{ textTransform: 'uppercase', fontSize: '0.7rem', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: '6px', background: trade.type === 'buy' ? 'rgba(0,255,136,0.1)' : 'rgba(255,51,102,0.1)', color: trade.type === 'buy' ? 'var(--accent-green)' : 'var(--accent-red)' }}>{trade.type}</span>
                        </div>
                        <span style={{ fontWeight: 800, fontSize: '1rem', color: trade.profit >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                          {trade.profit >= 0 ? '+' : ''}{trade.profit.toFixed(2)}
                        </span>
                      </div>
                      <div className="mobile-card-row"><span className="mobile-card-label">Ticket</span><span className="mobile-card-value">{trade.ticket}</span></div>
                      <div className="mobile-card-row"><span className="mobile-card-label">Volume</span><span className="mobile-card-value">{trade.volume}</span></div>
                      <div className="mobile-card-row"><span className="mobile-card-label">Open</span><span className="mobile-card-value">{trade.open_price}</span></div>
                      <div className="mobile-card-row"><span className="mobile-card-label">Close</span><span className="mobile-card-value">{trade.close_price}</span></div>
                      <div className="mobile-card-row"><span className="mobile-card-label">Time</span><span className="mobile-card-value" style={{ fontSize: '0.75rem', color: 'var(--text-mute)' }}>{new Date(trade.close_time).toLocaleDateString()}</span></div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p style={{ textAlign: 'center', color: 'var(--text-mute)', padding: '2rem' }}>No trade history found.</p>
            )}
          </motion.div>
        )}

        {activeTab === 'support' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {!selectedTicket ? (
              <div className="glass-panel mobile-padding" style={{ padding: '2rem' }}>
                <div className="ticket-header">
                  <div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Support Tickets</h2>
                    <p style={{ color: 'var(--text-mute)', fontSize: '0.85rem', marginTop: '0.5rem' }}>Open a ticket to get help from the admin team.</p>
                  </div>
                  <div className="ticket-create-form" style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                    <input
                      type="text"
                      placeholder="Ticket Subject..."
                      className="input-field"
                      value={ticketSubject}
                      onChange={(e) => setTicketSubject(e.target.value)}
                      style={{ width: '250px' }}
                    />
                    <button onClick={createTicket} className="btn-primary" style={{ padding: '0.6rem 1.25rem', whiteSpace: 'nowrap' }}>Open Ticket</button>
                  </div>
                </div>

                {/* Desktop Table */}
                <div className="table-responsive desktop-table" style={{ marginTop: '2rem' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-glass)', textAlign: 'left' }}>
                        <th style={{ padding: '1rem', color: 'var(--text-mute)' }}>Ticket ID</th>
                        <th style={{ padding: '1rem', color: 'var(--text-mute)' }}>Subject</th>
                        <th style={{ padding: '1rem', color: 'var(--text-mute)' }}>Status</th>
                        <th style={{ padding: '1rem', color: 'var(--text-mute)' }}>Date</th>
                        <th style={{ padding: '1rem', color: 'var(--text-mute)' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tickets && tickets.length > 0 ? tickets.map((t: any) => (
                        <tr key={t.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <td style={{ padding: '1rem', fontWeight: 600 }}>#{t.id}</td>
                          <td style={{ padding: '1rem', color: 'var(--accent-teal)' }}>{t.subject}</td>
                          <td style={{ padding: '1rem' }}>
                            <span className={`badge ${t.status === 'Resolved' ? 'badge-success' : (t.status === 'Open' ? 'badge-error' : 'badge-warning')}`}>{t.status}</span>
                          </td>
                          <td style={{ padding: '1rem', color: 'var(--text-mute)' }}>{new Date(t.created_at).toLocaleString()}</td>
                          <td style={{ padding: '1rem' }}>
                            <button onClick={() => setSelectedTicket(t)} className="btn-icon" style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem' }}>View</button>
                          </td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-mute)' }}>No support tickets found.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card View */}
                <div className="mobile-card-list">
                  {tickets && tickets.map((t: any) => (
                    <div key={t.id} className="mobile-trade-card" onClick={() => setSelectedTicket(t)} style={{ cursor: 'pointer' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>#{t.id}</span>
                        <span className={`badge ${t.status === 'Resolved' ? 'badge-success' : (t.status === 'Open' ? 'badge-error' : 'badge-warning')}`}>{t.status}</span>
                      </div>
                      <div className="mobile-card-row"><span className="mobile-card-label">Subject</span><span className="mobile-card-value" style={{ color: 'var(--accent-teal)' }}>{t.subject}</span></div>
                      <div className="mobile-card-row"><span className="mobile-card-label">Date</span><span className="mobile-card-value" style={{ fontSize: '0.75rem', color: 'var(--text-mute)' }}>{new Date(t.created_at).toLocaleDateString()}</span></div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="glass-panel mobile-padding" style={{ padding: '2rem' }}>
                <div className="ticket-detail-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Ticket #{selectedTicket.id}: {selectedTicket.subject}</h2>
                    <p style={{ color: 'var(--text-mute)', fontSize: '0.85rem', marginTop: '0.5rem' }}>
                      Status: <span className={`badge ${selectedTicket.status === 'Resolved' ? 'badge-success' : (selectedTicket.status === 'Open' ? 'badge-error' : 'badge-warning')}`}>{selectedTicket.status}</span>
                    </p>
                  </div>
                  <button onClick={() => setSelectedTicket(null)} className="btn-icon" style={{ whiteSpace: 'nowrap', padding: '0.25rem 0.75rem', fontSize: '0.75rem' }}>Back to List</button>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '12px', marginBottom: '2rem', minHeight: '300px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {selectedTicket.messages && selectedTicket.messages.map((msg: any) => (
                    <div key={msg.id} style={{ alignSelf: msg.sender !== 'admin' ? 'flex-end' : 'flex-start', maxWidth: '70%' }}>
                      <p style={{ fontSize: '0.75rem', fontWeight: 'bold', marginBottom: '0.25rem', color: msg.sender !== 'admin' ? 'var(--accent-teal)' : 'var(--text-primary)' }}>
                        {msg.sender === 'admin' ? 'Admin' : 'You'}
                      </p>
                      <div style={{
                        padding: '0.75rem 1rem',
                        borderRadius: '12px',
                        background: msg.sender !== 'admin' ? 'var(--accent-teal)' : 'rgba(255,255,255,0.05)',
                        color: msg.sender !== 'admin' ? '#000' : '#fff'
                      }}>
                        {msg.content}
                      </div>
                      <p style={{ fontSize: '0.65rem', color: 'var(--text-mute)', marginTop: '0.25rem', textAlign: msg.sender !== 'admin' ? 'right' : 'left' }}>
                        {new Date(msg.timestamp).toLocaleString()}
                      </p>
                    </div>
                  ))}
                  {(!selectedTicket.messages || selectedTicket.messages.length === 0) && (
                    <p style={{ color: 'var(--text-mute)', textAlign: 'center', marginTop: '2rem' }}>No messages in this ticket yet.</p>
                  )}
                </div>

                {selectedTicket.status !== 'Resolved' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <textarea
                      value={ticketReplyContent}
                      onChange={(e) => setTicketReplyContent(e.target.value)}
                      placeholder="Type a reply..."
                      className="input-field"
                      style={{ width: '100%', resize: 'none', height: '100px', fontFamily: 'inherit', boxSizing: 'border-box' }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendTicketReply(); }
                      }}
                    />
                    <button onClick={sendTicketReply} className="btn-primary" style={{ padding: '0.75rem', alignSelf: 'flex-start' }}>Reply</button>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}



        <footer style={{ marginTop: '3rem', textAlign: 'center', color: 'var(--text-mute)', fontSize: '0.8rem' }}>
          <p>© 2026 NairaFunded Analyzer. Real-time data sync active. Last Checked: {result["Checked Time"]}</p>
        </footer>
      </main>

      {/* Mobile Bottom Navigation */}
      <div className="mobile-bottom-nav">
        {sidebarItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`mobile-nav-item ${activeTab === item.id ? 'active' : ''}`}
          >
            <span className="icon">{item.icon}</span>
            <span>{item.label.split(' ')[0]}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
