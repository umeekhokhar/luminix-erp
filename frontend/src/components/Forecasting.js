import React, { useState, useEffect, useCallback } from 'react';
import {
    Brain,
    TrendingUp,
    Package,
    AlertTriangle,
    RefreshCw,
    BarChart2,
    ChevronDown,
    ChevronUp,
    Zap,
    ShoppingCart,
} from 'lucide-react';
import {
    LineChart,
    Line,
    AreaChart,
    Area,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ReferenceLine,
    Legend,
} from 'recharts';
import api from '../services/api';
import '../styles/Dashboard.css';

/* ─────────────────────────────────────────────────────────────────────────
   Inline styles (no new .css file needed – piggybacks on Dashboard.css)
   ───────────────────────────────────────────────────────────────────────── */
const S = {
    badge: (color) => ({
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '2px 10px',
        borderRadius: 20,
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: 0.5,
        background: color === 'high' ? 'rgba(239,68,68,0.15)' :
                    color === 'medium' ? 'rgba(245,158,11,0.15)' :
                    'rgba(0,242,254,0.12)',
        color:      color === 'high' ? '#ef4444' :
                    color === 'medium' ? '#f59e0b' :
                    '#00f2fe',
        border: `1px solid ${color === 'high' ? 'rgba(239,68,68,0.3)' :
                              color === 'medium' ? 'rgba(245,158,11,0.3)' :
                              'rgba(0,242,254,0.3)'}`,
    }),
    card: {
        background: 'rgba(20,20,35,0.6)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 16,
        padding: '1.5rem',
        backdropFilter: 'blur(10px)',
    },
    chip: {
        background: 'rgba(0,242,254,0.08)',
        border: '1px solid rgba(0,242,254,0.2)',
        borderRadius: 8,
        padding: '4px 12px',
        fontSize: 12,
        color: '#00f2fe',
        fontWeight: 600,
    },
};

/* ─────────────────────────────────────────────────────────────────────────
   Tooltip
   ───────────────────────────────────────────────────────────────────────── */
const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div style={{
            background: 'rgba(10,10,20,0.95)',
            border: '1px solid rgba(0,242,254,0.3)',
            borderRadius: 10,
            padding: '10px 14px',
            fontSize: 13,
        }}>
            <p style={{ color: '#8b8b9a', marginBottom: 6 }}>{label}</p>
            {payload.map((p) => (
                <p key={p.name} style={{ color: p.color, margin: '2px 0' }}>
                    {p.name}: <strong>{typeof p.value === 'number' ? p.value.toFixed(1) : p.value}</strong>
                </p>
            ))}
        </div>
    );
};

/* ─────────────────────────────────────────────────────────────────────────
   Stat card
   ───────────────────────────────────────────────────────────────────────── */
const StatCard = ({ icon: Icon, label, value, sub, color = '#00f2fe' }) => (
    <div style={{ ...S.card, display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{
            width: 52, height: 52, borderRadius: 14,
            background: `${color}18`,
            border: `1px solid ${color}33`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
        }}>
            <Icon size={22} color={color} />
        </div>
        <div>
            <p style={{ fontSize: 12, color: '#8b8b9a', marginBottom: 2 }}>{label}</p>
            <p style={{ fontSize: 22, fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>{value}</p>
            {sub && <p style={{ fontSize: 11, color: '#535362', marginTop: 2 }}>{sub}</p>}
        </div>
    </div>
);

/* ─────────────────────────────────────────────────────────────────────────
   Product row (collapsible)
   ───────────────────────────────────────────────────────────────────────── */
const ProductRow = ({ item }) => {
    const [open, setOpen] = useState(false);
    const [detail, setDetail] = useState(null);
    const [history, setHistory] = useState(null);

    const loadDetail = async () => {
        if (open) { setOpen(false); return; }
        try {
            const [dRes, hRes] = await Promise.all([
                api.get(`/forecasting/product/${item.product_id}/`),
                api.get(`/forecasting/history/${item.product_id}/`),
            ]);
            setDetail(dRes.data);
            setHistory(hRes.data);
        } catch (e) {
            console.error(e);
        }
        setOpen(true);
    };

    const chartData = detail?.forecasts?.map((f) => ({
        date: new Date(f.forecast_date).toLocaleDateString('en-PK', { month: 'short', day: 'numeric' }),
        predicted: parseFloat(f.predicted_quantity),
        lower: parseFloat(f.lower_bound),
        upper: parseFloat(f.upper_bound),
    })) || [];

    const histData = history?.weekly_sales?.map((w) => ({
        week: w.week,
        sold: w.quantity,
    })) || [];

    const stockPct = item.current_stock > 0
        ? Math.min(100, (item.current_stock / Math.max(item.forecast_28_days, 1)) * 100)
        : 0;

    return (
        <div style={{ ...S.card, marginBottom: '0.75rem' }}>
            {/* Header row */}
            <div
                style={{ display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer' }}
                onClick={loadDetail}
            >
                <div style={{ flex: 2 }}>
                    <p style={{ fontWeight: 600, fontSize: 15 }}>{item.product_name}</p>
                    <p style={{ fontSize: 11, color: '#535362' }}>{item.sku}</p>
                </div>
                <div style={{ flex: 1, textAlign: 'center' }}>
                    <p style={{ fontSize: 18, fontWeight: 700, fontFamily: 'monospace' }}>
                        {item.current_stock}
                    </p>
                    <p style={{ fontSize: 11, color: '#8b8b9a' }}>In Stock</p>
                </div>
                <div style={{ flex: 1, textAlign: 'center' }}>
                    <p style={{ fontSize: 18, fontWeight: 700, color: '#00f2fe', fontFamily: 'monospace' }}>
                        {item.forecast_28_days}
                    </p>
                    <p style={{ fontSize: 11, color: '#8b8b9a' }}>28-Day Forecast</p>
                </div>
                <div style={{ flex: 1, textAlign: 'center' }}>
                    <p style={{ fontSize: 15, fontFamily: 'monospace' }}>{item.last_7_days_sales}</p>
                    <p style={{ fontSize: 11, color: '#8b8b9a' }}>Last 7 Days</p>
                </div>
                <div style={{ flex: 1, textAlign: 'right' }}>
                    {item.needs_reorder
                        ? <span style={S.badge('high')}>⚠ Reorder</span>
                        : <span style={S.badge('ok')}>✓ OK</span>}
                </div>
                <div>
                    {open ? <ChevronUp size={18} color="#535362" /> : <ChevronDown size={18} color="#535362" />}
                </div>
            </div>

            {/* Stock progress bar */}
            <div style={{ marginTop: 10, height: 4, borderRadius: 4, background: 'rgba(255,255,255,0.06)' }}>
                <div style={{
                    height: '100%', borderRadius: 4,
                    width: `${stockPct}%`,
                    background: stockPct < 30 ? '#ef4444' : stockPct < 60 ? '#f59e0b' : '#00f2fe',
                    transition: 'width 0.5s ease',
                }} />
            </div>

            {/* Expanded charts */}
            {open && (
                <div style={{ marginTop: '1.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                    {/* Forecast chart */}
                    <div>
                        <p style={{ fontSize: 12, color: '#8b8b9a', marginBottom: '0.75rem' }}>
                            28-Day Demand Forecast (WMA + LR Ensemble)
                        </p>
                        <ResponsiveContainer width="100%" height={200}>
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id={`grad-${item.product_id}`} x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#00f2fe" stopOpacity={0.25} />
                                        <stop offset="95%" stopColor="#00f2fe" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                                <XAxis dataKey="date" tick={{ fill: '#535362', fontSize: 10 }} />
                                <YAxis tick={{ fill: '#535362', fontSize: 10 }} />
                                <Tooltip content={<CustomTooltip />} />
                                <Area
                                    type="monotone" dataKey="upper"
                                    stroke="rgba(0,242,254,0.15)" fill="none" strokeDasharray="4 2"
                                    name="Upper bound"
                                />
                                <Area
                                    type="monotone" dataKey="predicted"
                                    stroke="#00f2fe" fill={`url(#grad-${item.product_id})`}
                                    strokeWidth={2} name="Predicted"
                                />
                                <Area
                                    type="monotone" dataKey="lower"
                                    stroke="rgba(0,242,254,0.15)" fill="none" strokeDasharray="4 2"
                                    name="Lower bound"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                    {/* History chart */}
                    <div>
                        <p style={{ fontSize: 12, color: '#8b8b9a', marginBottom: '0.75rem' }}>
                            Weekly Sales History (Last 90 Days)
                        </p>
                        <ResponsiveContainer width="100%" height={200}>
                            <BarChart data={histData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                                <XAxis dataKey="week" tick={{ fill: '#535362', fontSize: 9 }} />
                                <YAxis tick={{ fill: '#535362', fontSize: 10 }} />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar dataKey="sold" fill="#6366f1" radius={[4, 4, 0, 0]} name="Units Sold" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}
        </div>
    );
};

/* ─────────────────────────────────────────────────────────────────────────
   Main Forecasting page
   ───────────────────────────────────────────────────────────────────────── */
const Forecasting = () => {
    const [summary, setSummary]     = useState([]);
    const [reorder, setReorder]     = useState([]);
    const [loading, setLoading]     = useState(true);
    const [running, setRunning]     = useState(false);
    const [seeding, setSeeding]     = useState(false);
    const [tab, setTab]             = useState('overview');
    const [error, setError]         = useState('');

    const loadData = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const [sumRes, reorderRes] = await Promise.all([
                api.get('/forecasting/summary/'),
                api.get('/forecasting/reorder/'),
            ]);
            setSummary(sumRes.data.results || []);
            setReorder(reorderRes.data.recommendations || []);
        } catch (e) {
            setError('Failed to load forecasting data. Try seeding first.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    const handleRunForecast = async () => {
        setRunning(true);
        try {
            await api.post('/forecasting/run/');
            await loadData();
        } catch (e) {
            setError('Forecast run failed.');
        } finally {
            setRunning(false);
        }
    };

    const handleSeed = async () => {
        setSeeding(true);
        try {
            await api.post('/forecasting/seed/');
            await loadData();
        } catch (e) {
            setError('Seeding failed.');
        } finally {
            setSeeding(false);
        }
    };

    // Stats
    const totalForecast = summary.reduce((s, p) => s + p.forecast_28_days, 0);
    const reorderCount  = summary.filter((p) => p.needs_reorder).length;
    const topProduct    = [...summary].sort((a, b) => b.forecast_28_days - a.forecast_28_days)[0];

    // Overview chart: top 5 products by 28-day forecast
    const overviewData = [...summary]
        .sort((a, b) => b.forecast_28_days - a.forecast_28_days)
        .slice(0, 6)
        .map((p) => ({
            name: p.product_name.replace(/\s\d+ml|\s\d+L/i, ''),
            forecast: p.forecast_28_days,
            stock: p.current_stock,
        }));

    if (loading) return (
        <div className="lux-loader-container">
            <div className="lux-loader" />
            <p style={{ color: '#8b8b9a' }}>Loading AI Demand Forecasts…</p>
        </div>
    );

    return (
        <div className="lux-dashboard">
            <div className="lux-bg-globe" />
            <div className="lux-content">

                {/* ── Header ── */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '1.5rem' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                            <Brain size={28} color="#00f2fe" />
                            <h1 style={{ fontSize: '2rem', fontWeight: 700, letterSpacing: -1, color: '#fff' }}>
                                AI Demand Forecasting
                            </h1>
                            <span style={S.chip}>WMA + Linear Regression</span>
                        </div>
                        <p style={{ color: '#8b8b9a', fontSize: 14 }}>
                            Beverages · 28-day demand predictions · Synthetic data seeded
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <button
                            onClick={handleSeed}
                            disabled={seeding}
                            style={{ padding: '10px 16px', borderRadius: 10, border: '1px solid rgba(99,102,241,0.4)', background: 'rgba(99,102,241,0.12)', color: '#a5b4fc', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}
                        >
                            <Zap size={15} />
                            {seeding ? 'Seeding…' : 'Re-seed Data'}
                        </button>
                        <button
                            onClick={handleRunForecast}
                            disabled={running}
                            style={{ padding: '10px 18px', borderRadius: 10, border: '1px solid rgba(0,242,254,0.4)', background: 'rgba(0,242,254,0.1)', color: '#00f2fe', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}
                        >
                            <RefreshCw size={15} className={running ? 'spin' : ''} />
                            {running ? 'Running…' : 'Run Forecast'}
                        </button>
                    </div>
                </div>

                {error && (
                    <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '12px 16px', marginBottom: '1rem', color: '#ef4444', fontSize: 13 }}>
                        {error}
                    </div>
                )}

                {/* ── Stat cards ── */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
                    <StatCard icon={TrendingUp}    label="Total 28-Day Forecast" value={Math.round(totalForecast).toLocaleString()} sub="units across all products" />
                    <StatCard icon={Package}       label="Products Tracked"      value={summary.length}          sub="beverages in portfolio" color="#6366f1" />
                    <StatCard icon={AlertTriangle} label="Reorder Alerts"        value={reorderCount}            sub="products need restocking" color="#ef4444" />
                    <StatCard icon={BarChart2}     label="Top Mover"             value={topProduct?.product_name?.split(' ')[0] || '—'} sub={topProduct ? `${topProduct.forecast_28_days} units forecast` : ''} color="#f59e0b" />
                </div>

                {/* ── Tabs ── */}
                <div style={{ display: 'flex', gap: 4, marginBottom: '1.5rem', background: 'rgba(20,20,35,0.6)', padding: 6, borderRadius: 12, width: 'fit-content', border: '1px solid rgba(255,255,255,0.06)' }}>
                    {[
                        { id: 'overview',  label: 'Overview' },
                        { id: 'products',  label: 'Product Forecasts' },
                        { id: 'reorder',   label: `Reorder Alerts (${reorder.length})` },
                    ].map((t) => (
                        <button key={t.id} onClick={() => setTab(t.id)} style={{
                            padding: '8px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500,
                            background: tab === t.id ? 'rgba(0,242,254,0.12)' : 'transparent',
                            color: tab === t.id ? '#00f2fe' : '#8b8b9a',
                        }}>
                            {t.label}
                        </button>
                    ))}
                </div>

                {/* ── Overview tab ── */}
                {tab === 'overview' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
                        {/* Bar chart */}
                        <div style={S.card}>
                            <p style={{ fontSize: 13, color: '#8b8b9a', marginBottom: '1rem' }}>
                                Top 6 Products — 28-Day Forecast vs Current Stock
                            </p>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={overviewData} margin={{ left: -10 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                                    <XAxis dataKey="name" tick={{ fill: '#535362', fontSize: 11 }} />
                                    <YAxis tick={{ fill: '#535362', fontSize: 11 }} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Legend wrapperStyle={{ fontSize: 12, color: '#8b8b9a' }} />
                                    <Bar dataKey="forecast" fill="#00f2fe" radius={[4, 4, 0, 0]} name="28d Forecast" fillOpacity={0.8} />
                                    <Bar dataKey="stock"    fill="#6366f1" radius={[4, 4, 0, 0]} name="Current Stock" fillOpacity={0.7} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Reorder quick list */}
                        <div style={S.card}>
                            <p style={{ fontSize: 13, color: '#8b8b9a', marginBottom: '1rem' }}>
                                🚨 Immediate Reorder Needed
                            </p>
                            {reorder.filter(r => r.urgency === 'HIGH').length === 0 && (
                                <p style={{ color: '#535362', fontSize: 13 }}>All products are adequately stocked.</p>
                            )}
                            {reorder.filter(r => r.urgency === 'HIGH').slice(0, 5).map((r) => (
                                <div key={r.product_id} style={{ padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <p style={{ fontSize: 13, fontWeight: 600 }}>{r.product_name}</p>
                                        <p style={{ fontSize: 11, color: '#535362' }}>Stock: {r.current_stock} · Need: {r.predicted_14d.toFixed(0)}/14d</p>
                                    </div>
                                    <span style={S.badge('high')}>+{r.suggested_order_qty} units</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ── Products tab ── */}
                {tab === 'products' && (
                    <div>
                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 20px', gap: '0 1rem', padding: '0 0 0.5rem', marginBottom: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                            {['Product', 'Current Stock', '28-Day Forecast', 'Last 7 Days', 'Status', ''].map((h) => (
                                <p key={h} style={{ fontSize: 11, color: '#535362', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</p>
                            ))}
                        </div>
                        {summary.map((item) => (
                            <ProductRow key={item.product_id} item={item} />
                        ))}
                    </div>
                )}

                {/* ── Reorder tab ── */}
                {tab === 'reorder' && (
                    <div>
                        {reorder.length === 0 && (
                            <div style={{ ...S.card, textAlign: 'center', padding: '3rem', color: '#8b8b9a' }}>
                                <Package size={40} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                                <p>No reorder recommendations at this time.</p>
                            </div>
                        )}
                        {reorder.map((r) => (
                            <div key={r.product_id} style={{ ...S.card, marginBottom: '0.75rem', display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr', alignItems: 'center', gap: '1rem' }}>
                                <div>
                                    <p style={{ fontWeight: 600 }}>{r.product_name}</p>
                                    <p style={{ fontSize: 11, color: '#535362' }}>{r.sku}</p>
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                    <p style={{ fontSize: 16, fontWeight: 700 }}>{r.current_stock}</p>
                                    <p style={{ fontSize: 11, color: '#8b8b9a' }}>In Stock</p>
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                    <p style={{ fontSize: 16, fontWeight: 700, color: '#f59e0b' }}>{r.reorder_level}</p>
                                    <p style={{ fontSize: 11, color: '#8b8b9a' }}>Reorder Level</p>
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                    <p style={{ fontSize: 16, fontWeight: 700, color: '#00f2fe' }}>{r.predicted_14d.toFixed(0)}</p>
                                    <p style={{ fontSize: 11, color: '#8b8b9a' }}>14-Day Demand</p>
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                    <p style={{ fontSize: 18, fontWeight: 700, color: '#6366f1' }}>{r.suggested_order_qty}</p>
                                    <p style={{ fontSize: 11, color: '#8b8b9a' }}>Suggested Order</p>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <span style={S.badge(r.urgency.toLowerCase())}>{r.urgency}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Forecasting;
