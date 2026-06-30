import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ordersAPI } from '../services/api';
// Using our global Luminix stylesheet
import '../styles/Customers.css';

function Invoices() {
    const [invoices, setInvoices] = useState([]);
    const [tally, setTally] = useState({ cash: 0, credit: 0, total: 0 });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        const token = localStorage.getItem('access_token');
        if (!token) {
            navigate('/login');
        } else {
            fetchInvoices();
            fetchDailyTally();
        }
    }, [navigate]);

    const fetchInvoices = async () => {
        setLoading(true);
        try {
            const response = await ordersAPI.getInvoices();
            setInvoices(response.data);
            setError('');
        } catch (err) {
            setError('Failed to fetch invoices');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchDailyTally = async () => {
        try {
            const response = await ordersAPI.getDailyTally();
            setTally(response.data);
        } catch (err) {
            console.error('Failed to fetch daily tally', err);
        }
    };

    const filteredInvoices = invoices.filter((invoice) =>
        !filterStatus || invoice.payment_status === filterStatus
    );

    const getPaymentStatusColor = (status) => {
        const colors = {
            unpaid: '#ef4444',
            partially_paid: '#f59e0b',
            paid: '#10b981',
        };
        return colors[status] || '#6b7280';
    };

    return (
        <div className="lux-page-container">
            <div className="lux-page-header">
                <div className="header-title">
                    <span className="title-icon">🧾</span>
                    <h1>Daily Ledger & Invoices</h1>
                </div>
            </div>

            {/* DAILY TALLY CARDS */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                <div className="lux-panel" style={{ borderLeft: '4px solid #10b981', padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-secondary)', fontSize: '1rem', fontWeight: 500 }}>Cash Today</h3>
                    <h2 style={{ margin: 0, fontSize: '2rem', color: 'var(--text-primary)', fontWeight: 700 }}>${parseFloat(tally.cash).toFixed(2)}</h2>
                </div>
                
                <div className="lux-panel" style={{ borderLeft: '4px solid #0ea5e9', padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-secondary)', fontSize: '1rem', fontWeight: 500 }}>Credit Today</h3>
                    <h2 style={{ margin: 0, fontSize: '2rem', color: 'var(--text-primary)', fontWeight: 700 }}>${parseFloat(tally.credit).toFixed(2)}</h2>
                </div>
                
                <div className="lux-panel" style={{ borderLeft: '4px solid #6366f1', padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-secondary)', fontSize: '1rem', fontWeight: 500 }}>Total Revenue</h3>
                    <h2 style={{ margin: 0, fontSize: '2rem', color: 'var(--text-primary)', fontWeight: 700 }}>${parseFloat(tally.total).toFixed(2)}</h2>
                </div>
            </div>

            {error && (
                <div className="highlight-box" style={{ borderColor: 'var(--error-color)', backgroundColor: '#fef2f2', color: 'var(--error-color)', marginBottom: '1.5rem' }}>
                    {error}
                </div>
            )}

            <div className="lux-panel" style={{ padding: '1rem 1.5rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>Filter by Status:</span>
                <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="lux-input"
                    style={{ width: '200px', margin: 0 }}
                >
                    <option value="">All Status</option>
                    <option value="unpaid">Unpaid</option>
                    <option value="partially_paid">Partially Paid</option>
                    <option value="paid">Paid</option>
                </select>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-tertiary)' }}>Loading ledger data...</div>
            ) : filteredInvoices.length === 0 ? (
                <div className="lux-panel" style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-tertiary)' }}>
                    No invoices found matching your criteria.
                </div>
            ) : (
                <div className="lux-panel lux-table-wrapper">
                    <table className="lux-table">
                        <thead>
                            <tr>
                                <th>Invoice #</th>
                                <th>Customer</th>
                                <th>Order #</th>
                                <th style={{ textAlign: 'right' }}>Total</th>
                                <th style={{ textAlign: 'right' }}>Tax</th>
                                <th style={{ textAlign: 'right' }}>Paid</th>
                                <th style={{ textAlign: 'right' }}>Balance</th>
                                <th>Status</th>
                                <th>Due Date</th>
                                <th>Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredInvoices.map((invoice) => (
                                <tr key={invoice.id}>
                                    <td>
                                        <div className="cell-primary-text">{invoice.invoice_number}</div>
                                    </td>
                                    <td>
                                        <div className="cell-primary-text">{invoice.customer_name || invoice.customer}</div>
                                    </td>
                                    <td>
                                        <div className="cell-secondary-text">{invoice.order_number}</div>
                                    </td>
                                    <td style={{ textAlign: 'right', fontWeight: 600 }}>
                                        ${parseFloat(invoice.total_amount).toFixed(2)}
                                    </td>
                                    <td style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>
                                        ${parseFloat(invoice.tax_amount || 0).toFixed(2)}
                                    </td>
                                    <td style={{ textAlign: 'right', color: '#10b981' }}>
                                        ${parseFloat(invoice.paid_amount || 0).toFixed(2)}
                                    </td>
                                    <td style={{ textAlign: 'right', fontWeight: 600, color: (invoice.total_amount - (invoice.paid_amount || 0)) > 0 ? 'var(--error-color)' : 'var(--text-primary)' }}>
                                        ${parseFloat(invoice.total_amount - (invoice.paid_amount || 0)).toFixed(2)}
                                    </td>
                                    <td>
                                        <span
                                            className="lux-badge"
                                            style={{ backgroundColor: getPaymentStatusColor(invoice.payment_status), color: 'white', textTransform: 'capitalize' }}
                                        >
                                            {invoice.payment_status.replace('_', ' ')}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="cell-secondary-text">{invoice.due_date || '-'}</div>
                                    </td>
                                    <td>
                                        <div className="cell-secondary-text">{new Date(invoice.invoice_date).toLocaleDateString()}</div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

export default Invoices;