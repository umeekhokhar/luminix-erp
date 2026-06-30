import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';
// Using our global Luminix stylesheet
import '../styles/Customers.css';

function Stock() {
    const [inventory, setInventory] = useState([]);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const token = localStorage.getItem('access_token');
        if (!token) navigate('/login');
        else fetchInventory();
    }, [navigate]);

    const fetchInventory = async () => {
        setLoading(true);
        try {
            // Now fetches from inventory, which includes product_name thanks to updated serializer
            const response = await api.get('/inventory/inventory/');
            setInventory(response.data);
        } catch (err) {
            console.error("Failed to fetch inventory", err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="lux-page-container">
            <div className="lux-page-header">
                <div className="header-title">
                    <span className="title-icon">📋</span>
                    <h1>Stock Management</h1>
                </div>
                <button 
                    className="lux-btn lux-btn-secondary" 
                    onClick={fetchInventory}
                    disabled={loading}
                >
                    {loading ? 'Refreshing...' : 'Refresh'}
                </button>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-tertiary)' }}>
                    Loading stock levels...
                </div>
            ) : (
                <div className="lux-panel lux-table-wrapper">
                    <table className="lux-table">
                        <thead>
                            <tr>
                                <th>Product Name</th>
                                <th>SKU</th>
                                <th style={{ textAlign: 'right' }}>Current Stock</th>
                                <th style={{ textAlign: 'right' }}>Reorder Level</th>
                                <th style={{ textAlign: 'center' }}>Status</th>
                                <th>Last Restocked</th>
                            </tr>
                        </thead>
                        <tbody>
                            {inventory.map((item) => {
                                const isLowStock = item.stock_quantity <= item.reorder_level;
                                
                                return (
                                    <tr key={item.id}>
                                        <td>
                                            <div className="cell-primary-text">{item.product_name}</div>
                                        </td>
                                        <td>
                                            <div className="cell-secondary-text">{item.sku}</div>
                                        </td>
                                        <td style={{ textAlign: 'right', fontWeight: 600, color: isLowStock ? 'var(--error-color)' : 'var(--text-primary)' }}>
                                            {item.stock_quantity}
                                        </td>
                                        <td style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>
                                            {item.reorder_level}
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            <span 
                                                className="lux-badge" 
                                                style={{
                                                    backgroundColor: isLowStock ? '#fef2f2' : '#ecfdf5',
                                                    color: isLowStock ? 'var(--error-color)' : '#10b981',
                                                    border: `1px solid ${isLowStock ? '#fecaca' : '#a7f3d0'}`
                                                }}
                                            >
                                                {isLowStock ? 'Low Stock' : 'Good'}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="cell-secondary-text">
                                                {item.last_restocked ? new Date(item.last_restocked).toLocaleDateString() : 'Never'}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                            {inventory.length === 0 && !loading && (
                                <tr>
                                    <td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-tertiary)' }}>
                                        No inventory records found.
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

export default Stock;