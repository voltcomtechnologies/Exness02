"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const sidebarItems = [
    { id: 'dashboard', icon: '⊞', label: 'Dashboard' },
    { id: 'accounts', icon: '👥', label: 'All Accounts' },
    { id: 'messages', icon: '💬', label: 'Messages' },
    { id: 'support', icon: '🎫', label: 'Support Tickets' },
];

export default function AdminDashboard() {
    const [activeTab, setActiveTab] = useState("dashboard");
    const [loading, setLoading] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // Auth states
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [authChecked, setAuthChecked] = useState(false);
    const [loginUsername, setLoginUsername] = useState("");
    const [loginPassword, setLoginPassword] = useState("");
    const [loginError, setLoginError] = useState("");
    const [loginLoading, setLoginLoading] = useState(false);

    // Dashboard states
    const [stats, setStats] = useState({ total_accounts: 0, active_accounts: 0, failed_accounts: 0, total_messages: 0, unread_messages: 0, total_ticket_messages: 0, unread_ticket_messages: 0, open_tickets: 0 });
    const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
    const [ticketUnreadCounts, setTicketUnreadCounts] = useState<Record<string, number>>({});

    // App data list states
    const [accounts, setAccounts] = useState<any[]>([]);
    const [tickets, setTickets] = useState<any[]>([]);

    // UI states
    const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
    const [accountChatMessages, setAccountChatMessages] = useState<any[]>([]);
    const [replyContent, setReplyContent] = useState("");

    const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
    const [ticketReplyContent, setTicketReplyContent] = useState("");

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

    // Get stored token
    const getToken = () => typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;

    const authHeaders = (): Record<string, string> => {
        const token = getToken();
        return token ? { 'Authorization': `Bearer ${token}` } : {};
    };

    const handleUnauthorized = () => {
        localStorage.removeItem('admin_token');
        setIsAuthenticated(false);
    };

    // Check if already logged in on mount
    useEffect(() => {
        const token = getToken();
        if (token) {
            // Validate token by making a test request
            fetch(`${apiUrl}/api/admin/dashboard`, { headers: { 'Authorization': `Bearer ${token}` } })
                .then(res => {
                    if (res.ok) setIsAuthenticated(true);
                    else handleUnauthorized();
                })
                .catch(() => handleUnauthorized())
                .finally(() => setAuthChecked(true));
        } else {
            setAuthChecked(true);
        }
    }, []);

    // Login handler
    const handleLogin = async () => {
        setLoginError("");
        setLoginLoading(true);
        try {
            const res = await fetch(`${apiUrl}/api/admin/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: loginUsername, password: loginPassword })
            });
            if (res.ok) {
                const data = await res.json();
                localStorage.setItem('admin_token', data.token);
                setIsAuthenticated(true);
                setLoginUsername("");
                setLoginPassword("");
            } else {
                const err = await res.json();
                setLoginError(err.detail || "Login failed");
            }
        } catch (err) {
            setLoginError("Connection error. Is the server running?");
        }
        setLoginLoading(false);
    };

    // Logout handler
    const handleLogout = async () => {
        try {
            await fetch(`${apiUrl}/api/admin/logout`, {
                method: 'POST',
                headers: authHeaders()
            });
        } catch (err) { }
        handleUnauthorized();
    };

    // Authenticated fetch helper
    const authFetch = async (url: string, options: RequestInit = {}) => {
        const headers = { ...authHeaders(), ...(options.headers || {}) };
        const res = await fetch(url, { ...options, headers });
        if (res.status === 401) { handleUnauthorized(); throw new Error('Unauthorized'); }
        return res;
    };

    useEffect(() => {
        if (!isAuthenticated) return;
        fetchDashboardStats();
        fetchUnreadCounts();
        fetchTicketUnreadCounts();
        if (activeTab === 'accounts' || activeTab === 'dashboard') fetchAccounts();
        if (activeTab === 'support') fetchTickets();
        if (activeTab === 'messages' && !accounts.length) fetchAccounts();
    }, [activeTab, isAuthenticated]);

    const fetchTicketUnreadCounts = async () => {
        try {
            const res = await authFetch(`${apiUrl}/api/admin/tickets/unread-counts`);
            const data = await res.json();
            setTicketUnreadCounts(data);
        } catch (err) {
            console.error(err);
        }
    };

    const fetchUnreadCounts = async () => {
        try {
            const res = await authFetch(`${apiUrl}/api/admin/messages/unread-counts`);
            const data = await res.json();
            setUnreadCounts(data);
        } catch (err) {
            console.error(err);
        }
    };

    const fetchDashboardStats = async () => {
        try {
            const res = await authFetch(`${apiUrl}/api/admin/dashboard`);
            const data = await res.json();
            setStats(data);
        } catch (err) {
            console.error(err);
        }
    };

    const fetchAccounts = async () => {
        setLoading(true);
        try {
            const res = await authFetch(`${apiUrl}/api/admin/accounts`);
            const data = await res.json();
            setAccounts(data);
        } catch (err) {
            console.error(err);
        }
        setLoading(false);
    };

    const fetchTickets = async () => {
        setLoading(true);
        try {
            const res = await authFetch(`${apiUrl}/api/admin/tickets`);
            const data = await res.json();
            setTickets(data);
        } catch (err) {
            console.error(err);
        }
        setLoading(false);
    };

    const loadAccountMessages = async (accountId: string) => {
        setSelectedAccountId(accountId);
        try {
            const res = await authFetch(`${apiUrl}/api/admin/messages/${accountId}`);
            const data = await res.json();
            setAccountChatMessages(data);
            fetchUnreadCounts();
            fetchDashboardStats();
        } catch (err) {
            console.error(err);
        }
    };

    const sendAdminMessage = async () => {
        if (!replyContent.trim() || !selectedAccountId) return;
        try {
            const res = await authFetch(`${apiUrl}/api/admin/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ receiver: selectedAccountId, content: replyContent })
            });
            if (res.ok) {
                setReplyContent("");
                loadAccountMessages(selectedAccountId);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const updateTicketStatus = async (ticketId: number, status: string) => {
        try {
            const res = await authFetch(`${apiUrl}/api/admin/tickets/${ticketId}/status?status=${status}`, {
                method: 'PUT'
            });
            if (res.ok) {
                fetchTickets();
                if (selectedTicket && selectedTicket.id === ticketId) {
                    setSelectedTicket({ ...selectedTicket, status });
                }
            }
        } catch (err) {
            console.error(err);
        }
    };

    const sendTicketReply = async () => {
        if (!ticketReplyContent.trim() || !selectedTicket) return;
        try {
            const res = await authFetch(`${apiUrl}/api/admin/tickets/${selectedTicket.id}/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: ticketReplyContent })
            });
            if (res.ok) {
                setTicketReplyContent("");
                fetchTickets();
                const newMsg = await res.json();
                if (selectedTicket) {
                    setSelectedTicket({
                        ...selectedTicket,
                        messages: [...(selectedTicket.messages || []), newMsg]
                    })
                }
            }
        } catch (err) {
            console.error(err);
        }
    };

    const fetchAnalysisForAccount = async (accountId: number) => {
        setLoading(true);
        try {
            const credsRes = await authFetch(`${apiUrl}/api/admin/accounts/${accountId}/credentials`);
            if (!credsRes.ok) throw new Error("Could not fetch credentials");
            const creds = await credsRes.json();

            const storedAccounts = localStorage.getItem("nairafunded_accounts");
            let parsed = [];
            if (storedAccounts) {
                try { parsed = JSON.parse(storedAccounts); } catch (e) { }
            }

            const filtered = parsed.filter((a: any) => String(a.account_id) !== String(creds.account_id));
            const updated = [creds, ...filtered];
            localStorage.setItem("nairafunded_accounts", JSON.stringify(updated));

            window.location.href = "/";
        } catch (err) {
            console.error("Failed to view account dashboard:", err);
            alert("Failed to load account dashboard. Please check server logs.");
        } finally {
            setLoading(false);
        }
    };

    const failedAccounts = accounts.filter((a: any) => a.status === 'Failed');

    // Show loading while checking auth
    if (!authChecked) {
        return (
            <div className="app-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
                <p style={{ color: 'var(--text-mute)' }}>Loading...</p>
            </div>
        );
    }

    // Show login screen if not authenticated
    if (!isAuthenticated) {
        return (
            <div className="app-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-panel"
                    style={{ padding: '3rem', width: '100%', maxWidth: '420px' }}
                >
                    <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                        <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '0.5rem' }}>Naira<span style={{ fontWeight: 300, fontSize: '1rem' }}>Admin</span></h1>
                        <p style={{ color: 'var(--text-mute)', fontSize: '0.85rem' }}>Sign in to access the admin panel</p>
                    </div>

                    {loginError && (
                        <div style={{ background: 'rgba(255, 69, 58, 0.15)', border: '1px solid var(--accent-red)', borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '1.5rem', color: 'var(--accent-red)', fontSize: '0.85rem', textAlign: 'center' }}>
                            {loginError}
                        </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div>
                            <label style={{ fontSize: '0.75rem', color: 'var(--text-mute)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.5rem', display: 'block' }}>Username</label>
                            <input
                                type="text"
                                value={loginUsername}
                                onChange={(e) => setLoginUsername(e.target.value)}
                                className="input-field"
                                style={{ width: '100%', boxSizing: 'border-box' }}
                                placeholder="Enter username"
                                onKeyDown={(e) => { if (e.key === 'Enter') handleLogin(); }}
                                autoFocus
                            />
                        </div>
                        <div>
                            <label style={{ fontSize: '0.75rem', color: 'var(--text-mute)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.5rem', display: 'block' }}>Password</label>
                            <input
                                type="password"
                                value={loginPassword}
                                onChange={(e) => setLoginPassword(e.target.value)}
                                className="input-field"
                                style={{ width: '100%', boxSizing: 'border-box' }}
                                placeholder="Enter password"
                                onKeyDown={(e) => { if (e.key === 'Enter') handleLogin(); }}
                            />
                        </div>
                        <button
                            onClick={handleLogin}
                            disabled={loginLoading || !loginUsername || !loginPassword}
                            className="btn-primary"
                            style={{ width: '100%', padding: '0.85rem', marginTop: '0.5rem', fontSize: '0.95rem', fontWeight: 700 }}
                        >
                            {loginLoading ? 'Signing in...' : 'Sign In'}
                        </button>
                    </div>
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
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Naira<span style={{ fontWeight: 300, fontSize: '0.9rem' }}>Admin</span></h1>
                </div>

                <nav style={{ flex: 1 }}>
                    <p style={{ fontSize: '0.65rem', color: 'var(--text-mute)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem' }}>CRM Controls</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {sidebarItems.map((item) => (
                            <button
                                key={item.id}
                                onClick={() => { setActiveTab(item.id); setSelectedAccountId(null); setSelectedTicket(null); setSidebarOpen(false); }}
                                className={`btn-icon ${activeTab === item.id ? 'active-nav-item' : ''}`}
                                style={{ width: '100%', justifyContent: 'flex-start', padding: '0 1rem', background: 'transparent', border: 'none', transform: 'none' }}
                            >
                                <span style={{ marginRight: '1rem', fontSize: '1.2rem' }}>{item.icon}</span>
                                <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{item.label}</span>
                            </button>
                        ))}
                    </div>
                </nav>

                <div style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <button onClick={() => window.location.href = '/'} className="btn-icon" style={{ width: '100%', justifyContent: 'flex-start', padding: '0 1rem', background: 'transparent', border: 'none' }}>
                        <span style={{ marginRight: '1rem' }}>⬅</span> Back to Trading Site
                    </button>
                    <button onClick={handleLogout} className="btn-icon" style={{ width: '100%', justifyContent: 'flex-start', padding: '0 1rem', background: 'transparent', border: 'none', color: 'var(--accent-red)' }}>
                        <span style={{ marginRight: '1rem' }}>🚪</span> Logout
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
                    <div>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Admin Control Center</h2>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-mute)' }}>Manage MT5 accounts, tickets, and messages.</p>
                    </div>
                </motion.header>

                {activeTab === 'dashboard' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        {/* Welcome Banner */}
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="welcome-banner"
                            style={{
                                background: 'linear-gradient(135deg, rgba(0, 206, 209, 0.08) 0%, rgba(139, 92, 246, 0.08) 50%, rgba(255, 69, 58, 0.05) 100%)',
                                border: '1px solid rgba(0, 206, 209, 0.15)',
                                borderRadius: '16px',
                                padding: '1.5rem 2rem',
                                marginBottom: '2rem',
                            }}
                        >
                            <div>
                                <h2 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '0.25rem' }}>
                                    Welcome back, <span style={{ background: 'linear-gradient(90deg, #00CED1, #8B5CF6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Admin</span>
                                </h2>
                                <p style={{ color: 'var(--text-mute)', fontSize: '0.8rem' }}>Here&apos;s your brokerage operations overview</p>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <p style={{ fontSize: '0.7rem', color: 'var(--text-mute)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Server Status</p>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#00FF88', boxShadow: '0 0 8px #00FF88', display: 'inline-block', animation: 'pulse 2s infinite' }} />
                                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#00FF88' }}>Online</span>
                                </div>
                            </div>
                        </motion.div>

                        {/* Primary Stat Cards */}
                        <div className="stats-grid-3">
                            {[
                                { label: 'Total Accounts', value: stats.total_accounts, icon: '👥', gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', iconBg: 'rgba(102, 126, 234, 0.15)', delay: 0.15, subtitle: 'registered' },
                                { label: 'Active Accounts', value: stats.active_accounts, icon: '✅', gradient: 'linear-gradient(135deg, #00CED1 0%, #00FF88 100%)', iconBg: 'rgba(0, 206, 209, 0.15)', delay: 0.2, subtitle: 'passing' },
                                { label: 'Failed Accounts', value: stats.failed_accounts, icon: '⚠️', gradient: 'linear-gradient(135deg, #FF453A 0%, #FF6B6B 100%)', iconBg: 'rgba(255, 69, 58, 0.15)', delay: 0.25, subtitle: 'breached' },
                            ].map((card, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: card.delay, type: 'spring', stiffness: 200 }}
                                    whileHover={{ y: -4, transition: { duration: 0.2 } }}
                                    style={{ position: 'relative', borderRadius: '16px', padding: '1px', background: card.gradient, overflow: 'hidden', cursor: 'default' }}
                                >
                                    <div style={{ borderRadius: '15px', padding: '1.75rem', background: 'rgba(10, 12, 20, 0.92)', backdropFilter: 'blur(20px)', height: '100%', position: 'relative', overflow: 'hidden' }}>
                                        <div style={{ position: 'absolute', top: 0, right: 0, width: '120px', height: '120px', background: card.gradient, opacity: 0.04, borderRadius: '50%', filter: 'blur(30px)' }} />
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: card.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem' }}>{card.icon}</div>
                                            <p style={{ fontSize: '0.65rem', color: 'var(--text-mute)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, background: 'rgba(255,255,255,0.04)', padding: '0.25rem 0.6rem', borderRadius: '99px' }}>{card.subtitle}</p>
                                        </div>
                                        <h3 style={{ fontSize: '2.8rem', fontWeight: 800, lineHeight: 1, marginBottom: '0.25rem' }}>{card.value}</h3>
                                        <p style={{ color: 'var(--text-mute)', fontSize: '0.8rem', fontWeight: 500 }}>{card.label}</p>
                                    </div>
                                </motion.div>
                            ))}
                        </div>

                        {/* Account Health Bar */}
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-glass)', borderRadius: '12px', padding: '1.25rem 1.5rem', marginBottom: '1.5rem' }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-mute)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>Account Health</p>
                                <p style={{ fontSize: '0.85rem', fontWeight: 700, color: stats.total_accounts > 0 ? '#00FF88' : 'var(--text-mute)' }}>
                                    {stats.total_accounts > 0 ? `${Math.round((stats.active_accounts / stats.total_accounts) * 100)}%` : '—'} Pass Rate
                                </p>
                            </div>
                            <div style={{ width: '100%', height: '8px', borderRadius: '99px', background: 'rgba(255,255,255,0.05)', overflow: 'hidden', position: 'relative' }}>
                                <motion.div
                                    initial={{ width: '0%' }}
                                    animate={{ width: stats.total_accounts > 0 ? `${(stats.active_accounts / stats.total_accounts) * 100}%` : '0%' }}
                                    transition={{ delay: 0.5, duration: 1, ease: 'easeOut' }}
                                    style={{ height: '100%', borderRadius: '99px', background: 'linear-gradient(90deg, #00CED1, #00FF88)', boxShadow: '0 0 12px rgba(0, 206, 209, 0.4)' }}
                                />
                                {stats.failed_accounts > 0 && (
                                    <motion.div
                                        initial={{ width: '0%' }}
                                        animate={{ width: stats.total_accounts > 0 ? `${(stats.failed_accounts / stats.total_accounts) * 100}%` : '0%' }}
                                        transition={{ delay: 0.7, duration: 1, ease: 'easeOut' }}
                                        style={{ position: 'absolute', right: 0, top: 0, height: '100%', borderRadius: '99px', background: 'linear-gradient(90deg, #FF6B6B, #FF453A)', boxShadow: '0 0 12px rgba(255, 69, 58, 0.3)' }}
                                    />
                                )}
                            </div>
                        </motion.div>

                        {/* Messages & Tickets Row */}
                        <div className="stats-grid-4">
                            {[
                                { label: 'Messages', value: stats.total_messages, icon: '💬', color: '#8B5CF6', bg: 'rgba(139, 92, 246, 0.12)', delay: 0.3 },
                                { label: 'Unread', value: stats.unread_messages, icon: '🔔', color: stats.unread_messages > 0 ? '#FF453A' : '#666', bg: stats.unread_messages > 0 ? 'rgba(255, 69, 58, 0.12)' : 'rgba(255,255,255,0.03)', delay: 0.35, pulse: stats.unread_messages > 0 },
                                { label: 'Open Tickets', value: stats.open_tickets, icon: '🎫', color: '#00CED1', bg: 'rgba(0, 206, 209, 0.12)', delay: 0.4 },
                                { label: 'Ticket Alerts', value: stats.unread_ticket_messages, icon: '⚡', color: stats.unread_ticket_messages > 0 ? '#FF453A' : '#666', bg: stats.unread_ticket_messages > 0 ? 'rgba(255, 69, 58, 0.12)' : 'rgba(255,255,255,0.03)', delay: 0.45, pulse: stats.unread_ticket_messages > 0 },
                            ].map((item, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: item.delay }}
                                    whileHover={{ scale: 1.03, transition: { duration: 0.15 } }}
                                    style={{
                                        background: 'rgba(255,255,255,0.02)',
                                        border: `1px solid ${item.pulse ? 'rgba(255, 69, 58, 0.3)' : 'var(--border-glass)'}`,
                                        borderRadius: '14px', padding: '1.25rem', cursor: 'default', position: 'relative', overflow: 'hidden',
                                    }}
                                >
                                    {item.pulse && (
                                        <div style={{ position: 'absolute', top: '12px', right: '12px', width: '8px', height: '8px', borderRadius: '50%', background: '#FF453A', boxShadow: '0 0 8px #FF453A', animation: 'pulse 2s infinite' }} />
                                    )}
                                    <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: item.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', marginBottom: '0.85rem' }}>{item.icon}</div>
                                    <h4 style={{ fontSize: '1.8rem', fontWeight: 800, color: item.color, lineHeight: 1, marginBottom: '0.2rem' }}>{item.value}</h4>
                                    <p style={{ fontSize: '0.72rem', color: 'var(--text-mute)', fontWeight: 500 }}>{item.label}</p>
                                </motion.div>
                            ))}
                        </div>

                        {/* Failed Accounts Table */}
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 }}
                            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-glass)', borderRadius: '16px', padding: '1.75rem', overflow: 'hidden' }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(255, 69, 58, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>⚠️</div>
                                    <div>
                                        <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Failed Accounts</h3>
                                        <p style={{ fontSize: '0.7rem', color: 'var(--text-mute)' }}>{failedAccounts.length} account{failedAccounts.length !== 1 ? 's' : ''} breached rules</p>
                                    </div>
                                </div>
                                {failedAccounts.length > 0 && (
                                    <span style={{ background: 'rgba(255, 69, 58, 0.12)', color: '#FF453A', padding: '0.3rem 0.75rem', borderRadius: '99px', fontSize: '0.7rem', fontWeight: 700 }}>{failedAccounts.length} FLAGGED</span>
                                )}
                            </div>
                            {failedAccounts.length > 0 ? (
                                <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.04)' }}>
                                    <div className="table-responsive">
                                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                                            <thead>
                                                <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                                                    {['Account ID', 'Platform', 'Server', 'Date', ''].map((h, i) => (
                                                        <th key={i} style={{ padding: '0.85rem 1rem', color: 'var(--text-mute)', textAlign: i === 4 ? 'right' : 'left', fontWeight: 600, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {failedAccounts.slice(0, 10).map((acc: any) => (
                                                    <tr key={acc.account_id} style={{ borderTop: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.15s' }}
                                                        onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                                                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                                                    >
                                                        <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: '#fff' }}>{acc.account_id}</td>
                                                        <td style={{ padding: '0.85rem 1rem' }}>
                                                            <span style={{ background: 'rgba(139, 92, 246, 0.12)', color: '#8B5CF6', padding: '0.2rem 0.5rem', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 600 }}>{acc.platform}</span>
                                                        </td>
                                                        <td style={{ padding: '0.85rem 1rem', color: 'var(--text-mute)' }}>{acc.server}</td>
                                                        <td style={{ padding: '0.85rem 1rem', color: 'var(--text-mute)', fontSize: '0.78rem' }}>{new Date(acc.created_at).toLocaleDateString()}</td>
                                                        <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                                                            <button onClick={() => fetchAnalysisForAccount(acc.account_id)} className="btn-primary"
                                                                style={{ padding: '0.4rem 1rem', fontSize: '0.72rem', borderRadius: '8px', background: 'linear-gradient(135deg, #00CED1, #8B5CF6)', border: 'none', fontWeight: 600 }}
                                                                disabled={loading}>
                                                                {loading ? "Loading..." : "View →"}
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ) : (
                                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-mute)' }}>
                                    <p style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🎉</p>
                                    <p style={{ fontSize: '0.85rem' }}>All accounts are in good standing</p>
                                </div>
                            )}
                        </motion.div>
                    </motion.div>
                )}

                {activeTab === 'accounts' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-panel mobile-padding" style={{ padding: '2rem' }}>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '2rem' }}>All Tracked Accounts</h2>
                        <div className="table-responsive desktop-table">
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid var(--border-glass)', textAlign: 'left' }}>
                                        <th style={{ padding: '1rem', color: 'var(--text-mute)' }}>Account ID</th>
                                        <th style={{ padding: '1rem', color: 'var(--text-mute)' }}>Platform</th>
                                        <th style={{ padding: '1rem', color: 'var(--text-mute)' }}>Server</th>
                                        <th style={{ padding: '1rem', color: 'var(--text-mute)' }}>Status</th>
                                        <th style={{ padding: '1rem', color: 'var(--text-mute)' }}>Date Added</th>
                                        <th style={{ padding: '1rem', color: 'var(--text-mute)' }}>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {accounts.map((acc: any) => (
                                        <tr key={acc.account_id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                            <td style={{ padding: '1rem', fontWeight: 600 }}>{acc.account_id}</td>
                                            <td style={{ padding: '1rem' }}>{acc.platform}</td>
                                            <td style={{ padding: '1rem', color: 'var(--text-mute)' }}>{acc.server}</td>
                                            <td style={{ padding: '1rem' }}>
                                                <span className={`badge ${acc.status === 'Active' ? 'badge-success' : 'badge-error'}`}>{acc.status}</span>
                                            </td>
                                            <td style={{ padding: '1rem', color: 'var(--text-mute)' }}>{new Date(acc.created_at).toLocaleString()}</td>
                                            <td style={{ padding: '1rem' }}>
                                                <button
                                                    onClick={() => fetchAnalysisForAccount(acc.account_id)}
                                                    className="btn-primary"
                                                    style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                                                    disabled={loading}
                                                >
                                                    {loading ? "Loading..." : "View Dashboard"}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Card View */}
                        <div className="mobile-card-list">
                            {accounts.map((acc: any) => (
                                <div key={acc.account_id} className="mobile-trade-card">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                        <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{acc.account_id}</span>
                                        <span className={`badge ${acc.status === 'Active' ? 'badge-success' : 'badge-error'}`}>{acc.status}</span>
                                    </div>
                                    <div className="mobile-card-row"><span className="mobile-card-label">Platform</span><span className="mobile-card-value">{acc.platform}</span></div>
                                    <div className="mobile-card-row"><span className="mobile-card-label">Server</span><span className="mobile-card-value" style={{ color: 'var(--text-mute)' }}>{acc.server}</span></div>
                                    <div className="mobile-card-row"><span className="mobile-card-label">Date</span><span className="mobile-card-value" style={{ fontSize: '0.75rem', color: 'var(--text-mute)' }}>{new Date(acc.created_at).toLocaleDateString()}</span></div>
                                    <button onClick={() => fetchAnalysisForAccount(acc.account_id)} className="btn-primary" style={{ padding: '0.5rem', fontSize: '0.8rem', marginTop: '0.75rem' }} disabled={loading}>
                                        {loading ? 'Loading...' : 'View Dashboard'}
                                    </button>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}

                {activeTab === 'messages' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="messages-layout">
                        <div className="glass-panel chat-sidebar mobile-padding">
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>Accounts</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {accounts.map(acc => (
                                    <button
                                        key={acc.account_id}
                                        onClick={() => loadAccountMessages(acc.account_id)}
                                        className="glass-panel"
                                        style={{ padding: '1rem', textAlign: 'left', background: selectedAccountId === String(acc.account_id) ? 'rgba(255,255,255,0.1)' : 'transparent', border: 'none', cursor: 'pointer' }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <p style={{ fontWeight: 'bold', color: '#fff' }}>#{acc.account_id}</p>
                                            {unreadCounts[String(acc.account_id)] > 0 && (
                                                <span style={{
                                                    background: 'var(--accent-red)',
                                                    color: '#fff',
                                                    borderRadius: '99px',
                                                    padding: '0.15rem 0.5rem',
                                                    fontSize: '0.7rem',
                                                    fontWeight: 700,
                                                    minWidth: '20px',
                                                    textAlign: 'center',
                                                    boxShadow: '0 0 8px rgba(255, 69, 58, 0.5)'
                                                }}>
                                                    {unreadCounts[String(acc.account_id)]}
                                                </span>
                                            )}
                                        </div>
                                        <p style={{ fontSize: '0.75rem', color: 'var(--text-mute)' }}>{acc.platform || 'MT5'}</p>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="glass-panel chat-main mobile-padding">
                            {selectedAccountId ? (
                                <>
                                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-glass)' }}>
                                        Chat with {selectedAccountId}
                                    </h3>
                                    <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem', paddingRight: '1rem', marginBottom: '1rem' }}>
                                        {accountChatMessages.map(msg => (
                                            <div key={msg.id} style={{ alignSelf: msg.sender === 'admin' ? 'flex-end' : 'flex-start', maxWidth: '70%' }}>
                                                <div style={{
                                                    padding: '0.75rem 1rem',
                                                    borderRadius: '12px',
                                                    background: msg.sender === 'admin' ? 'var(--accent-teal)' : 'rgba(255,255,255,0.05)',
                                                    color: msg.sender === 'admin' ? '#000' : '#fff'
                                                }}>
                                                    {msg.content}
                                                </div>
                                                <p style={{ fontSize: '0.65rem', color: 'var(--text-mute)', marginTop: '0.25rem', textAlign: msg.sender === 'admin' ? 'right' : 'left' }}>
                                                    {new Date(msg.timestamp).toLocaleString()}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                        <textarea
                                            value={replyContent}
                                            onChange={(e) => setReplyContent(e.target.value)}
                                            placeholder="Type a message..."
                                            className="input-field"
                                            style={{ width: '100%', resize: 'none', height: '120px', fontFamily: 'inherit', boxSizing: 'border-box' }}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendAdminMessage(); }
                                            }}
                                        />
                                        <button onClick={sendAdminMessage} className="btn-primary" style={{ width: '100%', padding: '0.75rem' }}>Send</button>
                                    </div>
                                </>
                            ) : (
                                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-mute)' }}>
                                    Select an account to start messaging
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}

                {activeTab === 'support' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        {!selectedTicket ? (
                            <div className="glass-panel mobile-padding" style={{ padding: '2rem' }}>
                                <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '2rem' }}>Support Tickets</h2>
                                <div className="table-responsive desktop-table">
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                                        <thead>
                                            <tr style={{ borderBottom: '1px solid var(--border-glass)', textAlign: 'left' }}>
                                                <th style={{ padding: '1rem', color: 'var(--text-mute)' }}>Ticket ID</th>
                                                <th style={{ padding: '1rem', color: 'var(--text-mute)' }}>Account</th>
                                                <th style={{ padding: '1rem', color: 'var(--text-mute)' }}>Subject</th>
                                                <th style={{ padding: '1rem', color: 'var(--text-mute)' }}>Status</th>
                                                <th style={{ padding: '1rem', color: 'var(--text-mute)' }}>Date</th>
                                                <th style={{ padding: '1rem', color: 'var(--text-mute)' }}>Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {tickets.map((t: any) => (
                                                <tr key={t.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                    <td style={{ padding: '1rem', fontWeight: 600 }}>#{t.id}</td>
                                                    <td style={{ padding: '1rem' }}>{t.account_id}</td>
                                                    <td style={{ padding: '1rem', color: 'var(--accent-teal)' }}>{t.subject}</td>
                                                    <td style={{ padding: '1rem' }}>
                                                        <span className={`badge ${t.status === 'Resolved' ? 'badge-success' : (t.status === 'Open' ? 'badge-error' : 'badge-warning')}`}>{t.status}</span>
                                                    </td>
                                                    <td style={{ padding: '1rem', color: 'var(--text-mute)' }}>{new Date(t.created_at).toLocaleString()}</td>
                                                    <td style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                        <button onClick={async () => {
                                                            setSelectedTicket(t);
                                                            try {
                                                                await authFetch(`${apiUrl}/api/admin/tickets/${t.id}/mark-read`, { method: 'PUT' });
                                                                fetchTicketUnreadCounts();
                                                                fetchDashboardStats();
                                                            } catch (err) { console.error(err); }
                                                        }} className="btn-icon" style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem' }}>View</button>
                                                        {ticketUnreadCounts[String(t.id)] > 0 && (
                                                            <span style={{ background: 'var(--accent-red)', color: '#fff', borderRadius: '99px', padding: '0.15rem 0.5rem', fontSize: '0.7rem', fontWeight: 700, minWidth: '20px', textAlign: 'center', boxShadow: '0 0 8px rgba(255, 69, 58, 0.5)' }}>
                                                                {ticketUnreadCounts[String(t.id)]} new
                                                            </span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Mobile Card View */}
                                <div className="mobile-card-list">
                                    {tickets.map((t: any) => (
                                        <div key={t.id} className="mobile-trade-card" onClick={async () => {
                                            setSelectedTicket(t);
                                            try {
                                                await authFetch(`${apiUrl}/api/admin/tickets/${t.id}/mark-read`, { method: 'PUT' });
                                                fetchTicketUnreadCounts();
                                                fetchDashboardStats();
                                            } catch (err) { console.error(err); }
                                        }} style={{ cursor: 'pointer' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                                <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>#{t.id}</span>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    {ticketUnreadCounts[String(t.id)] > 0 && (
                                                        <span style={{ background: 'var(--accent-red)', color: '#fff', borderRadius: '99px', padding: '0.15rem 0.5rem', fontSize: '0.65rem', fontWeight: 700 }}>{ticketUnreadCounts[String(t.id)]} new</span>
                                                    )}
                                                    <span className={`badge ${t.status === 'Resolved' ? 'badge-success' : (t.status === 'Open' ? 'badge-error' : 'badge-warning')}`}>{t.status}</span>
                                                </div>
                                            </div>
                                            <div className="mobile-card-row"><span className="mobile-card-label">Account</span><span className="mobile-card-value">{t.account_id}</span></div>
                                            <div className="mobile-card-row"><span className="mobile-card-label">Subject</span><span className="mobile-card-value" style={{ color: 'var(--accent-teal)' }}>{t.subject}</span></div>
                                            <div className="mobile-card-row"><span className="mobile-card-label">Date</span><span className="mobile-card-value" style={{ fontSize: '0.75rem', color: 'var(--text-mute)' }}>{new Date(t.created_at).toLocaleDateString()}</span></div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="glass-panel mobile-padding" style={{ padding: '2rem' }}>
                                <div className="ticket-detail-header">
                                    <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Ticket #{selectedTicket.id}: {selectedTicket.subject}</h2>
                                    <button onClick={() => setSelectedTicket(null)} className="btn-icon" style={{ whiteSpace: 'nowrap', padding: '0.25rem 0.75rem', fontSize: '0.75rem' }}>Back to List</button>
                                </div>

                                <div className="ticket-status-buttons">
                                    <button onClick={() => updateTicketStatus(selectedTicket.id, 'Open')} className={`btn-icon ${selectedTicket.status === 'Open' ? 'active-nav-item' : ''}`}>Open</button>
                                    <button onClick={() => updateTicketStatus(selectedTicket.id, 'In Progress')} className={`btn-icon ${selectedTicket.status === 'In Progress' ? 'active-nav-item' : ''}`}>In Progress</button>
                                    <button onClick={() => updateTicketStatus(selectedTicket.id, 'Resolved')} className={`btn-icon ${selectedTicket.status === 'Resolved' ? 'active-nav-item' : ''}`}>Resolved</button>
                                </div>

                                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '12px', marginBottom: '2rem', minHeight: '300px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    {selectedTicket.messages && selectedTicket.messages.map((msg: any) => (
                                        <div key={msg.id} style={{ alignSelf: msg.sender === 'admin' ? 'flex-end' : 'flex-start', maxWidth: '70%' }}>
                                            <p style={{ fontSize: '0.75rem', fontWeight: 'bold', marginBottom: '0.25rem', color: msg.sender === 'admin' ? 'var(--accent-teal)' : 'var(--text-primary)' }}>
                                                {msg.sender === 'admin' ? 'Admin' : `Account ${msg.sender}`}
                                            </p>
                                            <div style={{
                                                padding: '0.75rem 1rem',
                                                borderRadius: '12px',
                                                background: msg.sender === 'admin' ? 'var(--accent-teal)' : 'rgba(255,255,255,0.05)',
                                                color: msg.sender === 'admin' ? '#000' : '#fff'
                                            }}>
                                                {msg.content}
                                            </div>
                                            <p style={{ fontSize: '0.65rem', color: 'var(--text-mute)', marginTop: '0.25rem', textAlign: msg.sender === 'admin' ? 'right' : 'left' }}>
                                                {new Date(msg.timestamp).toLocaleString()}
                                            </p>
                                        </div>
                                    ))}
                                    {(!selectedTicket.messages || selectedTicket.messages.length === 0) && (
                                        <p style={{ color: 'var(--text-mute)', textAlign: 'center', marginTop: '2rem' }}>No messages in this ticket yet.</p>
                                    )}
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    <textarea
                                        value={ticketReplyContent}
                                        onChange={(e) => setTicketReplyContent(e.target.value)}
                                        placeholder="Type a reply..."
                                        className="input-field"
                                        style={{ width: '100%', resize: 'none', height: '120px', fontFamily: 'inherit', boxSizing: 'border-box' }}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendTicketReply(); }
                                        }}
                                    />
                                    <button onClick={sendTicketReply} className="btn-primary" style={{ width: '100%', padding: '0.75rem' }}>Reply</button>
                                </div>
                            </div>
                        )}
                    </motion.div>
                )}

            </main>

            {/* Mobile Bottom Navigation */}
            <div className="mobile-bottom-nav">
                {sidebarItems.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => { setActiveTab(item.id); setSelectedAccountId(null); setSelectedTicket(null); }}
                        className={`mobile-nav-item ${activeTab === item.id ? 'active' : ''}`}
                    >
                        <span className="icon">{item.icon}</span>
                        <span>{item.label.split(' ')[0]}</span>
                    </button>
                ))}
            </div>
        </div >
    );
}
