import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { dashboardAPI } from '../services/api';
// Modern icon library - minimal footprint
import { DollarSign, ShoppingBag, AlertTriangle, CreditCard, FileText, Users, TrendingUp, Sparkles } from 'lucide-react';
import '../styles/Dashboard.css';

const Dashboard = () => {
    // --- KEEPING EXISTING DATA LOGIC EXACTLY AS IS ---
    const [data, setData] = useState({
        total_sales_today: 0,
        total_orders_today: 0,
        low_stock_alerts: 0,
        payments_received_today: 0,
        overdue_invoices: 0,
        total_customers: 0,
        total_products: 0,
    });
    const [recentOrders, setRecentOrders] = useState([]);
    const [recentInvoices, setRecentInvoices] = useState([]);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const token = localStorage.getItem('access_token');
        if (!token) {
            navigate('/login');
        } else {
            fetchDashboardData();
        }
    }, [navigate]);

    const fetchDashboardData = async () => {
        setLoading(true);
        try {
            const summaryResponse = await dashboardAPI.getSummary();
            setData(summaryResponse.data);

            const ordersResponse = await dashboardAPI.getRecentOrders();
            setRecentOrders(ordersResponse.data);

            const invoicesResponse = await dashboardAPI.getRecentInvoices();
            setRecentInvoices(invoicesResponse.data);
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };
    // --------------------------------------------------

    if (loading) {
        return (
            <div className="lux-loader-container">
                <div className="lux-loader"></div>
                <p>Synchronizing Luminix Core...</p>
            </div>
        );
    }

    return (
        <div className="lux-dashboard">
            {/* Ambient background elements for futuristic feel */}
            <div className="lux-bg-globe"></div>
            
            <div className="lux-content">
                <header className="lux-header">
                    <div className="header-text">
                        <h1>Operations <span className="thin">Command</span></h1>
                        <p>System Status: <span className="status-good">Optimal</span></p>
                    </div>
                    {/* Placeholder for future Global Search/AI command bar */}
                    <div className="lux-global-actions">
                        <div className="ai-status-bubble">
                            <Sparkles size={16} className="icon-pulse" />
                            <span>Luminix AI Active</span>
                        </div>
                    </div>
                </header>

                {/* Primary Stats - Glassmorphism style */}
                <div className="lux-stats-grid">
                    <StatCard 
                        icon={DollarSign} 
                        label="Today's Revenue" 
                        value={`RS ${data.total_sales_today ? data.total_sales_today.toFixed(2) : '0.00'}`}
                        color="#10b981"
                    />
                    <StatCard 
                        icon={ShoppingBag} 
                        label="Orders Processed" 
                        value={data.total_orders_today || 0}
                        color="#3b82f6"
                    />
                    <StatCard 
                        icon={AlertTriangle} 
                        label="Stock Deviations" 
                        value={data.low_stock_alerts || 0}
                        color="#f59e0b"
                        alert={data.low_stock_alerts > 0}
                    />
                    <StatCard 
                        icon={Users} 
                        label="Active Clientele" 
                        value={data.total_customers || 0}
                        color="#6366f1"
                    />
                </div>

                {/* Secondary Stats & AI Predictive Setup */}
                <div className="lux-mid-section">
                    <div className="sub-stats-glass">
                        <div className="sub-stat">
                            <CreditCard size={20} color="#8b5cf6" />
                            <span className="label">Credits Received:</span>
                            <span className="value">RS {data.payments_received_today?.toFixed(2) || '0.00'}</span>
                        </div>
                        <div className="sub-stat separator"></div>
                        <div className="sub-stat">
                            <FileText size={20} color="#ef4444" />
                            <span className="label">Overdue Delinquencies:</span>
                            <span className="value alert-text">{data.overdue_invoices || 0}</span>
                        </div>
                    </div>
                    
                    {/* FUTURE AI ELEMENT PLACEHOLDER */}
                    <div className="ai-predictive-pane">
                        <TrendingUp size={24} color="#10b981" />
                        <div>
                            <h3>Next 24h Forecast</h3>
                            <p className="ai-placeholder-text">Enable Predictive Analytics in Settings...</p>
                        </div>
                        <Sparkles size={20} className="ai-sparkle-corner" />
                    </div>
                </div>

                {/* Data Tables - Minimalistic */}
                <div className="lux-data-section">
                    <div className="lux-card table-card">
                        <div className="card-header">
                            <h2>Recent Logistical Streams</h2>
                            <span className="view-all" onClick={() => navigate('/orders')}>View All Orders</span>
                        </div>
                        {recentOrders.length > 0 ? (
                            <div className="table-responsive">
                                <table className="lux-table">
                                    <thead>
                                        <tr>
                                            <th>ID</th>
                                            <th>Customer Identifier</th>
                                            <th>Quantum</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {recentOrders.map((order) => (
                                            <tr key={order.id}>
                                                <td className="mono">{order.order_number}</td>
                                                <td>{order.customer}</td>
                                                <td className="mono">RS {parseFloat(order.total_amount).toFixed(2)}</td>
                                                <td>
                                                    <span className={`lux-badge badge-${order.status}`}>
                                                        {order.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="no-data-pane">No active streams detected.</div>
                        )}
                    </div>

                    <div className="lux-card table-card">
                        <div className="card-header">
                            <h2>Financial Ledger Inflow</h2>
                            <span className="view-all" onClick={() => navigate('/invoices')}>View All Invoices</span>
                        </div>
                        {recentInvoices.length > 0 ? (
                            <div className="table-responsive">
                                <table className="lux-table">
                                    <thead>
                                        <tr>
                                            <th>Invoice</th>
                                            <th>Entity</th>
                                            <th>Amount</th>
                                            <th>Ledger Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {recentInvoices.map((invoice) => (
                                            <tr key={invoice.id}>
                                                <td className="mono">{invoice.invoice_number}</td>
                                                <td>{invoice.customer}</td>
                                                <td className="mono">RS {parseFloat(invoice.total_amount).toFixed(2)}</td>
                                                <td>
                                                    <span className={`lux-badge badge-${invoice.payment_status}`}>
                                                        {invoice.payment_status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="no-data-pane">Ledger is balanced. No recent inflow.</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// Small reusable sub-component for the new stats design
const StatCard = ({ icon: Icon, label, value, color, alert }) => (
    <div className={`lux-stat-card ${alert ? 'card-alert' : ''}`}>
        <div className="card-glow" style={{ backgroundColor: color }}></div>
        <div className="card-inner">
            <Icon size={24} color={color} strokeWidth={1.5} />
            <div className="stat-data">
                <p className="stat-value mono">{value}</p>
                <p className="stat-label">{label}</p>
            </div>
        </div>
    </div>
);

export default Dashboard;