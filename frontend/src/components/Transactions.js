import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { inventoryAPI } from '../services/api';
// Using our global Luminix stylesheet
import '../styles/Customers.css';

function Transactions() {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('all');
    const navigate = useNavigate();

    useEffect(() => {
        const token = localStorage.getItem('access_token');
        if (!token) {
            navigate('/login');
        } else {
            fetchTransactions();
        }
    }, [navigate]);

    const fetchTransactions = async () => {
        setLoading(true);
        try {
            const response = await inventoryAPI.getTransactions();
            setTransactions(response.data);
            setError('');
        } catch (err) {
            setError('Failed to fetch transactions');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const getTransactionTypeLabel = (type) => {
        const labels = {
            in: 'Stock In',
            out: 'Stock Out',
            adjustment: 'Adjustment',
            purchase: 'Purchase',
            sale: 'Sale',
        };
        return labels[type] || type;
    };

    // Upgraded to return badge styling matching the Luminix theme
    const getTransactionBadgeStyle = (type) => {
        const styles = {
            in: { bg: '#ecfdf5', text: '#10b981', border: '#a7f3d0' },
            out: { bg: '#fef2f2', text: '#ef4444', border: '#fecaca' },
            adjustment: { bg: '#fffbeb', text: '#f59e0b', border: '#fde68a' },
            purchase: { bg: '#eff6ff', text: '#3b82f6', border: '#bfdbfe' },
            sale: { bg: '#f5f3ff', text: '#8b5cf6', border: '#ddd6fe' },
        };
        const style = styles[type] || { bg: '#f3f4f6', text: '#6b7280', border: '#d1d5db' };
        
        return {
            backgroundColor: style.bg,
            color: style.text,
            border: `1px solid ${style.border}`
        };
    };

    const filteredTransactions = transactions.filter((transaction) => {
        const matchesSearch =
            transaction.product?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            transaction.reference_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            transaction.notes?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesFilter = filterType === 'all' || transaction.transaction_type === filterType;

        return matchesSearch && matchesFilter;
    });

    return (
        <div className="lux-page-container">
            <div className="lux-page-header">
                <div className="header-title">
                    <span className="title-icon">🔄</span>
                    <h1>Inventory Transactions</h1>
                </div>
            </div>

            {error && (
                <div className="highlight-box" style={{ borderColor: 'var(--error-color)', backgroundColor: '#fef2f2', color: 'var(--error-color)', marginBottom: '1.5rem' }}>
                    {error}
                </div>
            )}

            <div className="lux-panel" style={{ padding: '1rem 1.5rem', marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '250px' }}>
                    <input
                        type="text"
                        placeholder="Search transactions by product, reference, or notes..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="lux-input"
                        style={{ margin: 0 }}
                    />
                </div>
                <div style={{ minWidth: '200px' }}>
                    <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        className="lux-input"
                        style={{ margin: 0 }}
                    >
                        <option value="all">All Transaction Types</option>
                        <option value="in">Stock In</option>
                        <option value="out">Stock Out</option>
                        <option value="adjustment">Adjustment</option>
                        <option value="purchase">Purchase</option>
                        <option value="sale">Sale</option>
                    </select>
                </div>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-tertiary)' }}>Loading transactions...</div>
            ) : (
                <div className="lux-panel lux-table-wrapper">
                    <table className="lux-table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Product</th>
                                <th style={{ textAlign: 'center' }}>Type</th>
                                <th style={{ textAlign: 'right' }}>Quantity</th>
                                <th>Reference Number</th>
                                <th>Notes</th>
                                <th>Created By</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredTransactions.map((transaction) => (
                                <tr key={transaction.id}>
                                    <td>
                                        <div className="cell-secondary-text">
                                            {new Date(transaction.created_at).toLocaleString([], {
                                                year: 'numeric', month: 'short', day: 'numeric',
                                                hour: '2-digit', minute:'2-digit'
                                            })}
                                        </div>
                                    </td>
                                    <td>
                                        <div className="cell-primary-text">{transaction.product?.name || '-'}</div>
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
                                        <span 
                                            className="lux-badge" 
                                            style={getTransactionBadgeStyle(transaction.transaction_type)}
                                        >
                                            {getTransactionTypeLabel(transaction.transaction_type)}
                                        </span>
                                    </td>
                                    <td
                                        style={{
                                            textAlign: 'right',
                                            color: transaction.quantity > 0 ? '#10b981' : transaction.quantity < 0 ? '#ef4444' : '#6b7280',
                                            fontWeight: '600',
                                        }}
                                    >
                                        {transaction.quantity > 0 ? '+' : ''}
                                        {transaction.quantity}
                                    </td>
                                    <td><div className="cell-secondary-text">{transaction.reference_number || '-'}</div></td>
                                    <td><div className="cell-secondary-text" style={{ maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={transaction.notes}>{transaction.notes || '-'}</div></td>
                                    <td><div className="cell-secondary-text">{transaction.created_by || '-'}</div></td>
                                </tr>
                            ))}
                            {filteredTransactions.length === 0 && !loading && (
                                <tr>
                                    <td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-tertiary)' }}>
                                        No transactions found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

export default Transactions;