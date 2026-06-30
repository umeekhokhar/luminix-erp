import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { customerAPI } from '../services/api';
import '../styles/Customers.css';

function CustomerDashboard() {
    const [balance, setBalance] = useState(null);
    const [products, setProducts] = useState([]);
    const [orders, setOrders] = useState([]); // New state for order history
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    
    const [showOrderForm, setShowOrderForm] = useState(false);
    const [orderItems, setOrderItems] = useState([]);
    const [selectedProduct, setSelectedProduct] = useState('');
    const [quantity, setQuantity] = useState(1);
    const [submittingOrder, setSubmittingOrder] = useState(false);

    const navigate = useNavigate();

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [balRes, prodRes, ordersRes] = await Promise.all([
                customerAPI.getMyBalance(),
                api.get('/inventory/products/'),
                api.get('/orders/orders/') // Fetches customer's own orders
            ]);
            setBalance(balRes.data);
            setProducts(prodRes.data);
            setOrders(ordersRes.data);
            setError('');
        } catch (err) {
            setError('Failed to refresh dashboard data.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const token = localStorage.getItem('access_token');
        if (!token) {
            navigate('/login');
        } else {
            fetchData();
        }
    }, [navigate, fetchData]);

    // Helper for status badges (matching your Orders.js style)
    const getStatusBadge = (status) => {
        const colors = { pending: '#f59e0b', processing: '#3b82f6', shipped: '#8b5cf6', delivered: '#10b981', cancelled: '#ef4444', invoiced: '#1e3a8a' };
        return (
            <span className="lux-badge" style={{ backgroundColor: colors[status] || 'grey', color: 'white', fontSize: '0.7rem', padding: '2px 8px', borderRadius: '4px', textTransform: 'capitalize' }}>
                {status}
            </span>
        );
    };

    const handleAddItem = () => {
        const productObj = products.find(p => p.id === parseInt(selectedProduct));
        if (!productObj || quantity <= 0) return;
        if (quantity > (productObj.inventory?.stock_quantity || 0)) {
            alert("Insufficient Stock");
            return;
        }

        const newItem = {
            product: productObj.id,
            product_name: productObj.name,
            quantity: parseInt(quantity),
            price: parseFloat(productObj.price),
            total: (parseInt(quantity) * parseFloat(productObj.price)).toFixed(2)
        };
        setOrderItems([...orderItems, newItem]);
        setSelectedProduct('');
        setQuantity(1);
    };

    const handleOrderSubmit = async () => {
        if (orderItems.length === 0) return;
        setSubmittingOrder(true);
        try {
            const payload = {
                payment_type: 'credit',
                items: orderItems.map(item => ({
                    product: item.product,
                    quantity: item.quantity,
                    price: item.price
                }))
            };
            await api.post('/orders/orders/', payload);
            setSuccess('Order placed successfully!');
            setOrderItems([]);
            setShowOrderForm(false);
            fetchData(); 
        } catch (err) {
            setError('Order failed.');
        } finally {
            setSubmittingOrder(false);
        }
    };

    return (
        <div className="lux-page-container">
            <div className="lux-page-header">
                <div className="header-title">
                    <span className="title-icon">👤</span>
                    <h1>{balance?.customer_name || 'Customer'} Dashboard</h1>
                </div>
                <button className="lux-btn primary" onClick={() => setShowOrderForm(!showOrderForm)}>
                    {showOrderForm ? 'Close Store' : '🛒 New Order'}
                </button>
            </div>

            {error && <div className="lux-error-banner">{error}</div>}
            {success && <div className="lux-success-banner" style={{background: 'rgba(16,185,129,0.1)', color: '#10b981', padding: '1rem', borderRadius: '8px', marginBottom: '1rem'}}>{success}</div>}

            {/* FINANCIAL LEDGER */}
            {balance && (
                <div className="lux-panel" style={{ marginBottom: '2rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                        <div className="stat-card highlight-box">
                            <label style={{opacity: 0.6, fontSize: '0.8rem'}}>Balance Due</label>
                            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: balance.balance < 0 ? '#ef4444' : '#10b981' }}>
                                ${Math.abs(balance.balance).toFixed(2)}
                            </div>
                        </div>
                        <div className="stat-card" style={{border: '1px solid rgba(255,255,255,0.1)', padding: '1rem', borderRadius: '8px'}}>
                            <label style={{opacity: 0.6, fontSize: '0.8rem'}}>Credit Limit</label>
                            <div style={{ fontSize: '1.2rem' }}>${parseFloat(balance.credit_limit || 0).toFixed(2)}</div>
                        </div>
                    </div>
                </div>
            )}

            {/* NEW ORDER FORM */}
            {showOrderForm && (
                <div className="lux-panel lux-form-panel" style={{ marginBottom: '2rem' }}>
                    <h3>Order Selection</h3>
                    <div className="lux-form-row" style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', marginTop: '1rem' }}>
                        <div className="lux-form-group" style={{ flex: 3 }}>
                            <select value={selectedProduct} onChange={(e) => setSelectedProduct(e.target.value)} className="lux-input">
                                <option value="">-- Choose Product --</option>
                                {products.map(p => (
                                    <option key={p.id} value={p.id}>{p.name} (${p.price})</option>
                                ))}
                            </select>
                        </div>
                        <div className="lux-form-group" style={{ flex: 1 }}>
                            <input type="number" min="1" value={quantity} onChange={e => setQuantity(e.target.value)} className="lux-input" />
                        </div>
                        <button className="lux-btn primary" onClick={handleAddItem}>Add</button>
                    </div>

                    {orderItems.length > 0 && (
                        <div className="highlight-box" style={{ marginTop: '1.5rem' }}>
                            {orderItems.map((item, i) => (
                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #333' }}>
                                    <span>{item.product_name} x{item.quantity}</span>
                                    <span>${item.total}</span>
                                </div>
                            ))}
                            <button className="lux-btn primary" style={{ width: '100%', marginTop: '1rem' }} onClick={handleOrderSubmit} disabled={submittingOrder}>
                                {submittingOrder ? 'Sending...' : 'Confirm Order'}
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* RECENT ORDERS TABLE */}
            <div className="lux-panel lux-table-wrapper">
                <h2 style={{ marginBottom: '1.5rem' }}>Your Recent Orders</h2>
                <table className="lux-table">
                    <thead>
                        <tr>
                            <th>Order #</th>
                            <th>Date</th>
                            <th>Status</th>
                            <th className="text-right">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {orders.length === 0 ? (
                            <tr><td colSpan="4" style={{textAlign: 'center', padding: '2rem', opacity: 0.5}}>No orders yet.</td></tr>
                        ) : (
                            orders.map(order => (
                                <tr key={order.id}>
                                    <td><span style={{fontWeight: 600}}>{order.order_number}</span></td>
                                    <td>{new Date(order.created_at).toLocaleDateString()}</td>
                                    <td>{getStatusBadge(order.status)}</td>
                                    <td className="text-right" style={{fontWeight: 600}}>${order.total_amount}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default CustomerDashboard;