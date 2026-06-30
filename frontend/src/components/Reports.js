import React, { useState, useEffect } from 'react';
import { reportsAPI } from '../services/api';
import {
    TrendingUp,
    FileText,
    Sparkles,
    Download,
} from 'lucide-react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from 'recharts';
import '../styles/Dashboard.css';

const Reports = () => {
    const [reports, setReports] = useState([]);
    const [preview, setPreview] = useState(null);
    const [loading, setLoading] = useState(true);
    const [finalizing, setFinalizing] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [historyRes, previewRes] = await Promise.all([
                reportsAPI.getReports(),
                reportsAPI.getPreview(),
            ]);
            setReports(historyRes.data);
            setPreview(previewRes.data);
        } catch (err) {
            console.error('Failed to load reports', err);
        } finally {
            setLoading(false);
        }
    };

    const handleFinalize = async () => {
        if (
            !window.confirm(
                'This will wipe all current expenses and save a permanent record. Proceed?'
            )
        )
            return;

        setFinalizing(true);
        try {
            await reportsAPI.finalizeReport('Monthly Finalization');
            await loadData();
            alert('Report finalized successfully!');
        } catch (err) {
            alert('Error finalizing report');
        } finally {
            setFinalizing(false);
        }
    };

    const chartData = [...reports].reverse().map((r) => ({
        date: new Date(r.created_at).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
        }),
        capital: parseFloat(r.working_capital),
        profit: parseFloat(r.net_profit_loss),
    }));

    const handleDownload = async (id) => {
        try {
            const response = await reportsAPI.downloadPDF(id);
            const url = window.URL.createObjectURL(
                new Blob([response.data])
            );
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Report_${id}.pdf`);
            document.body.appendChild(link);
            link.click();
        } catch (err) {
            alert('Failed to download PDF');
        }
    };

    if (loading) {
        return (
            <div className="lux-loader-container">
                <div className="lux-loader"></div>
                <p>Analyzing Financial Streams...</p>
            </div>
        );
    }

    return (
        <div className="lux-dashboard">
            <div className="lux-bg-globe"></div>

            <div className="lux-content">
                {/* HEADER */}
                <header className="lux-header">
                    <div className="header-text">
                        <h1>
                            Financial <span className="thin">Analytics</span>
                        </h1>
                        <p>
                            System Status:{' '}
                            <span className="status-good">Stable</span>
                        </p>
                    </div>

                    <div className="lux-global-actions">
                        <div className="ai-status-bubble">
                            <Sparkles size={16} />
                            <span>AI Insights Enabled</span>
                        </div>
                    </div>
                </header>

                {/* CHART */}
                <div className="lux-card" style={{ height: '320px' }}>
                    <div className="card-header">
                        <h2>Working Capital Trend</h2>
                    </div>

                    <ResponsiveContainer width="100%" height="85%">
                        <AreaChart data={chartData}>
                            <defs>
                                <linearGradient
                                    id="colorValue"
                                    x1="0"
                                    y1="0"
                                    x2="0"
                                    y2="1"
                                >
                                    <stop
                                        offset="5%"
                                        stopColor="#10b981"
                                        stopOpacity={0.3}
                                    />
                                    <stop
                                        offset="95%"
                                        stopColor="#10b981"
                                        stopOpacity={0}
                                    />
                                </linearGradient>
                            </defs>

                            <CartesianGrid
                                strokeDasharray="3 3"
                                stroke="#333"
                                vertical={false}
                            />

                            <XAxis
                                dataKey="date"
                                stroke="#888"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                            />

                            <YAxis
                                stroke="#888"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(v) => `PKR ${v / 1000}k`}
                            />

                            <Tooltip
                                contentStyle={{
                                    backgroundColor: '#111',
                                    border: '1px solid #333',
                                }}
                            />

                            <Area
                                type="monotone"
                                dataKey="capital"
                                stroke="#10b981"
                                fillOpacity={1}
                                fill="url(#colorValue)"
                                strokeWidth={3}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                {/* LIVE SNAPSHOT */}
                <div className="lux-stats-grid">
                    <StatCard
                        icon={TrendingUp}
                        label="Working Capital"
                        value={`PKR ${preview?.working_capital?.toLocaleString()}`}
                        color="#10b981"
                    />

                    <StatCard
                        icon={FileText}
                        label="Pending Expenses"
                        value={`-PKR ${preview?.expenses_total?.toLocaleString()}`}
                        color="#ef4444"
                    />

                    <StatCard
                        icon={TrendingUp}
                        label="Net P/L"
                        value={`${
                            preview?.net_profit_loss >= 0 ? '+' : ''
                        }PKR ${preview?.net_profit_loss?.toLocaleString()}`}
                        color={
                            preview?.net_profit_loss >= 0
                                ? '#10b981'
                                : '#ef4444'
                        }
                    />
                </div>

                {/* FINALIZE BUTTON */}
                <div className="lux-card">
                    <div className="card-header">
                        <h2>Finalize Monthly Report</h2>
                        <button
                            onClick={handleFinalize}
                            className="lux-btn primary"
                            disabled={finalizing}
                        >
                            {finalizing
                                ? 'Processing...'
                                : 'Finalize & Wipe'}
                        </button>
                    </div>
                </div>

                {/* HISTORY TABLE */}
                <div className="lux-card table-card">
                    <div className="card-header">
                        <h2>Report History</h2>
                    </div>

                    <div className="table-responsive">
                        <table className="lux-table">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Working Capital</th>
                                    <th>Net P/L</th>
                                    <th>Expenses</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {reports.map((report) => (
                                    <tr key={report.id}>
                                        <td>
                                            {new Date(
                                                report.created_at
                                            ).toLocaleDateString()}
                                        </td>

                                        <td className="mono">
                                            PKR{' '}
                                            {parseFloat(
                                                report.working_capital
                                            ).toLocaleString()}
                                        </td>

                                        <td
                                            className={
                                                report.net_profit_loss >= 0
                                                    ? 'text-success'
                                                    : 'text-danger'
                                            }
                                        >
                                            {report.net_profit_loss >= 0
                                                ? '+'
                                                : ''}
                                            PKR{' '}
                                            {parseFloat(
                                                report.net_profit_loss
                                            ).toLocaleString()}
                                        </td>

                                        <td className="mono">
                                            PKR{' '}
                                            {parseFloat(
                                                report.expenses_total
                                            ).toLocaleString()}
                                        </td>

                                        <td>
                                            <button
                                                onClick={() =>
                                                    handleDownload(
                                                        report.id
                                                    )
                                                }
                                                className="lux-btn small"
                                            >
                                                <Download size={14} /> PDF
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Reuse same style card
const StatCard = ({ icon: Icon, label, value, color }) => (
    <div className="lux-stat-card">
        <div
            className="card-glow"
            style={{ backgroundColor: color }}
        ></div>
        <div className="card-inner">
            <Icon size={22} color={color} />
            <div className="stat-data">
                <p className="stat-value mono">{value}</p>
                <p className="stat-label">{label}</p>
            </div>
        </div>
    </div>
);

export default Reports;