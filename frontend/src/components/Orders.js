import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
// Using our global Luminix stylesheet
import '../styles/Customers.css';

function Orders() {
    const [orders, setOrders] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(false);
    
    const role = localStorage.getItem('user_role');
    const isCustomer = role === 'customer';

    const [selectedCustomer, setSelectedCustomer] = useState('');
    const [selectedProduct, setSelectedProduct] = useState('');
    const [quantity, setQuantity] = useState(1);
    const [paymentType, setPaymentType] = useState('credit'); 
    const [discount, setDiscount] = useState(0);
    const [orderItems, setOrderItems] = useState([]); 

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const prodRes = await api.get('/inventory/products/');
            setProducts(prodRes.data);

            const ordersRes = await api.get('/orders/orders/');
            setOrders(ordersRes.data);

            if (!isCustomer) {
                try {
                    const custRes = await api.get('/crm/customers/');
                    setCustomers(custRes.data);
                } catch (err) {
                    console.warn("Could not fetch customers list.");
                }
            }
        } catch (err) {
            console.error("Data load error", err);
        } finally {
            setLoading(false);
        }
    }, [isCustomer]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleAddItem = () => {
        if (!selectedProduct || quantity <= 0) {
            alert("Invalid selection");
            return;
        }
        const productObj = products.find(p => p.id === parseInt(selectedProduct));
        
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

    const handleRemoveItem = (index) => {
        const newItems = [...orderItems];
        newItems.splice(index, 1);
        setOrderItems(newItems);
    };

    const handleSubmitOrder = async () => {
        if (!isCustomer && !selectedCustomer) {
            alert("Please select a customer.");
            return;
        }
        if (orderItems.length === 0) {
            alert("Please add items to the cart.");
            return;
        }

        const payload = {
            payment_type: paymentType, 
            discount: parseFloat(discount) || 0,
            items: orderItems.map(item => ({
                product: item.product,
                quantity: item.quantity,
                price: item.price
            }))
        };

        if (!isCustomer) {
            payload.customer = selectedCustomer;
        }

        try {
            setLoading(true);
            await api.post('/orders/orders/', payload);
            alert("Order Created Successfully!");
            
            setOrderItems([]);
            setSelectedCustomer('');
            setPaymentType('credit'); 
            setDiscount(0); 
            
            fetchData(); 
        } catch (err) {
            const errorMsg = err.response?.data?.detail || JSON.stringify(err.response?.data) || "Order failed";
            alert("Error: " + errorMsg);
        } finally {
            setLoading(false);
        }
    };

    const handleStatusUpdate = async (orderId, newStatus) => {
        if (isCustomer) return; 
        try {
            await api.post(`/orders/orders/${orderId}/update_status/`, { status: newStatus });
            fetchData(); 
        } catch (err) {
            alert("Failed to update status");
        }
    };

    const handleDownloadPDF = async (orderId, orderNumber) => {
        try {
            const response = await api.get(`/orders/orders/${orderId}/download_pdf/`, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Order_${orderNumber}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
            window.URL.revokeObjectURL(url); 
        } catch (err) {
            alert("Failed to download PDF.");
        }
    };

    const getStatusBadge = (status) => {
        const colors = { pending: '#f59e0b', processing: '#3b82f6', shipped: '#8b5cf6', delivered: '#10b981', cancelled: '#ef4444', invoiced: '#1e3a8a' };
        return (
            <span className="lux-badge" style={{ backgroundColor: colors[status] || 'grey', color: 'white', textTransform: 'capitalize' }}>
                {status}
            </span>
        );
    };

    const getPaymentBadge = (type) => {
        return (
            <span className="lux-badge" style={{ backgroundColor: type === 'cash' ? '#10b981' : '#0ea5e9', color: 'white', textTransform: 'capitalize' }}>
                {type === 'cash' ? 'Cash/Upfront' : 'Net-30 Credit'}
            </span>
        );
    };

    const cartSubtotal = orderItems.reduce((sum, item) => sum + parseFloat(item.total), 0);
    const cartTotal = Math.max(0, cartSubtotal - (parseFloat(discount) || 0));

    // Helper style for small action buttons
    const smallBtnStyle = { padding: '0.4rem 0.8rem', fontSize: '0.8rem', minHeight: 'auto' };

    return (
        <div className="lux-page-container">
            <div className="lux-page-header">
                <div className="header-title">
                    <span className="title-icon">📦</span>
                    <h1>{isCustomer ? 'My Orders' : 'Order Management'}</h1>
                </div>
            </div>

            <div className="lux-panel lux-form-panel" style={{ marginBottom: '2rem' }}>
                <h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem', color: 'var(--text-primary)' }}>Create New Order</h2>
                
                <div className="lux-form-row">
                    {!isCustomer && (
                        <div className="lux-form-group">
                            <label>Select Customer</label>
                            <select value={selectedCustomer} onChange={(e) => setSelectedCustomer(e.target.value)} className="lux-input">
                                <option value="">-- Select Customer --</option>
                                {customers.map(c => <option key={c.id} value={c.id}>{c.name} ({c.company})</option>)}
                            </select>
                        </div>
                    )}

                    <div className="lux-form-group">
                        <label>Payment Terms</label>
                        <select value={paymentType} onChange={(e) => setPaymentType(e.target.value)} className="lux-input">
                            <option value="credit">Net-30 (Credit)</option>
                            <option value="cash">Cash / Upfront Payment</option>
                        </select>
                    </div>

                    {!isCustomer && (
                        <div className="lux-form-group">
                            <label>Discount ($)</label>
                            <input 
                                type="number" 
                                min="0" 
                                step="0.01"
                                value={discount} 
                                onChange={(e) => setDiscount(e.target.value)}
                                className="lux-input"
                                placeholder="0.00"
                            />
                        </div>
                    )}
                </div>

                <div className="lux-form-row" style={{ alignItems: 'flex-end', marginTop: '1rem' }}>
                    <div className="lux-form-group" style={{ flex: 3 }}>
                        <label>Product</label>
                        <select value={selectedProduct} onChange={(e) => setSelectedProduct(e.target.value)} className="lux-input">
                            <option value="">-- Select Product --</option>
                            {products.map(p => <option key={p.id} value={p.id}>{p.name} (${p.price}) - Stock: {p.inventory?.stock_quantity || 0}</option>)}
                        </select>
                    </div>
                    <div className="lux-form-group" style={{ flex: 1 }}>
                        <label>Qty</label>
                        <input type="number" min="1" value={quantity} onChange={e => setQuantity(e.target.value)} className="lux-input"/>
                    </div>
                    <div className="lux-form-group" style={{ flex: 'none' }}>
                        <button className="lux-btn primary" onClick={handleAddItem}>+ Add</button>
                    </div>
                </div>

                {orderItems.length > 0 && (
                    <div className="highlight-box" style={{ marginTop: '2rem' }}>
                        <h4 style={{ marginBottom: '1rem', color: 'var(--text-primary)' }}>Cart ({orderItems.length} items)</h4>
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                            {orderItems.map((item, idx) => (
                                <li key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', padding: '0.75rem 0' }}>
                                    <span style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>{item.product_name} <span style={{color: 'var(--text-tertiary)'}}>(x{item.quantity})</span></span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                        <span style={{ fontWeight: 600 }}>${item.total}</span>
                                        <button onClick={() => handleRemoveItem(idx)} className="lux-btn-icon danger" title="Remove item">
                                            ✕
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                        
                        <div style={{ marginTop: '1.5rem', textAlign: 'right', borderTop: '2px dashed var(--border-color)', paddingTop: '1.5rem' }}>
                            <p style={{ margin: '0 0 0.5rem 0', color: 'var(--text-secondary)' }}>Subtotal: <span style={{fontWeight: 600, color: 'var(--text-primary)'}}>${cartSubtotal.toFixed(2)}</span></p>
                            {!isCustomer && discount > 0 && (
                                <p style={{ margin: '0 0 0.5rem 0', color: 'var(--error-color)' }}>Discount: -${parseFloat(discount).toFixed(2)}</p>
                            )}
                            <h3 style={{ margin: '0.5rem 0 1.5rem 0', fontSize: '1.5rem', color: 'var(--text-primary)' }}>Total: ${cartTotal.toFixed(2)}</h3>
                            <button className="lux-btn primary" onClick={handleSubmitOrder} disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
                                {loading ? 'Submitting...' : 'Submit Order'}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <div className="lux-panel lux-table-wrapper">
                <table className="lux-table">
                    <thead>
                        <tr>
                            <th>Order #</th>
                            <th>Date</th>
                            {!isCustomer && <th>Customer</th>}
                            <th>Terms</th>
                            <th>Status</th>
                            <th>Total</th>
                            <th className="text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {orders.length === 0 ? (
                            <tr><td colSpan={isCustomer ? "6" : "8"} style={{textAlign: 'center', padding: '2rem', color: 'var(--text-tertiary)'}}>No orders found.</td></tr>
                        ) : (
                            orders.map(order => (
                                <tr key={order.id}>
                                    <td>
                                        <div className="cell-primary-text">{order.order_number}</div>
                                    </td>
                                    <td><div className="cell-secondary-text">{new Date(order.created_at).toLocaleDateString()}</div></td>
                                    {!isCustomer && <td><div className="cell-primary-text">{order.customer_name || 'N/A'}</div></td>}
                                    <td>{getPaymentBadge(order.payment_type)}</td>
                                    <td>{getStatusBadge(order.status)}</td>
                                    <td>
                                        <div className="cell-primary-text" style={{fontWeight: 600}}>${order.total_amount}</div>
                                        {order.discount > 0 && <div style={{fontSize: '0.75rem', color: 'var(--error-color)', marginTop: '0.2rem'}}>(Discounted)</div>}
                                    </td>
                                    <td className="text-right">
                                        <div className="lux-action-group right-align" style={{ gap: '0.5rem' }}>
                                            <button 
                                                className="lux-btn ghost" 
                                                style={{...smallBtnStyle, color: 'var(--text-secondary)', border: '1px solid var(--border-color)'}} 
                                                onClick={() => handleDownloadPDF(order.id, order.order_number)}
                                                title="Download PDF"
                                            >
                                                📄 PDF
                                            </button>
                                            
                                            {!isCustomer && (
                                                <>
                                                    {(order.status === 'pending' || order.status === 'invoiced') && (
                                                        <>
                                                            <button className="lux-btn ghost" style={smallBtnStyle} onClick={() => handleStatusUpdate(order.id, 'processing')}>Process</button>
                                                            <button className="lux-btn primary" style={{...smallBtnStyle, backgroundColor: '#10b981', borderColor: '#10b981'}} onClick={() => handleStatusUpdate(order.id, 'delivered')}>Fast-Track</button>
                                                        </>
                                                    )}
                                                    {order.status === 'processing' && (
                                                        <>
                                                            <button className="lux-btn ghost" style={smallBtnStyle} onClick={() => handleStatusUpdate(order.id, 'shipped')}>Ship</button>
                                                            <button className="lux-btn primary" style={{...smallBtnStyle, backgroundColor: '#10b981', borderColor: '#10b981'}} onClick={() => handleStatusUpdate(order.id, 'delivered')}>Deliver</button>
                                                        </>
                                                    )}
                                                    {order.status === 'shipped' && (
                                                        <button className="lux-btn primary" style={{...smallBtnStyle, backgroundColor: '#10b981', borderColor: '#10b981'}} onClick={() => handleStatusUpdate(order.id, 'delivered')}>Deliver</button>
                                                    )}
                                                    {order.status === 'delivered' && (
                                                        <span style={{color: '#10b981', fontWeight: 600, fontSize: '0.85rem', padding: '0 0.5rem'}}>Completed</span>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default Orders;