import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import '../styles/Customers.css'; // Importing your global Luminix styles

const Purchases = () => {
    const [purchases, setPurchases] = useState([]);
    const [vendors, setVendors] = useState([]);
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Panel states (matching your Products.js inline panel style)
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [showReceiveForm, setShowReceiveForm] = useState(false);
    const [selectedPurchase, setSelectedPurchase] = useState(null);

    // Form & OCR states
    const fileInputRef = useRef(null);
    const [isScanning, setIsScanning] = useState(false);
    const [newPurchase, setNewPurchase] = useState({
        vendor: '',
        expected_delivery_date: '',
        items: [{ product: '', quantity: 1, unit_price: '' }]
    });
    const [receiveItems, setReceiveItems] = useState([]);
    const navigate = useNavigate();

    useEffect(() => {
        const token = localStorage.getItem('access_token');
        if (!token) {
            navigate('/login');
        } else {
            fetchData();
        }
    }, [navigate]);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Using your configured Axios instance so Auth tokens are automatically attached
            const [purchasesRes, vendorsRes, productsRes, categoriesRes] = await Promise.all([
                api.get('/inventory/purchases/'),
                api.get('/inventory/vendors/'),
                api.get('/inventory/products/'),
                api.get('/inventory/categories/')
            ]);

            // Safely handling both paginated (.data.results) and flat (.data) DRF responses
            setPurchases(purchasesRes.data.results || purchasesRes.data || []);
            setVendors(vendorsRes.data.results || vendorsRes.data || []);
            setProducts(productsRes.data.results || productsRes.data || []);
            setCategories(categoriesRes.data.results || categoriesRes.data || []);
            setError('');
        } catch (err) {
            setError('Failed to fetch data');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const normalizeOCRResponse = (data) => ({
        vendor: data.vendor || "",
        expected_delivery_date: data.invoice_date || new Date().toISOString().split("T")[0],
        items: (data.items && data.items.length) ?
            data.items.map(i => ({
                product: i.product || "",
                quantity: i.quantity || 1,
                unit_price: i.unit_price || ""
            })) :
            [{
                product: "",
                quantity: 1,
                unit_price: ""
            }]
    });

    // --- OCR LOGIC ---
    const handleOCRUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setError("");
        setIsScanning(true);

        const formData = new FormData();
        formData.append("invoice", file);

        try {
            const response = await api.post(
                "/inventory/purchases/ocr/",
                formData, {
                    headers: {
                        "Content-Type": "multipart/form-data"
                    }
                }
            );

            console.log("OCR RESULT:", response.data);

            const parsed = normalizeOCRResponse(response.data);
            setNewPurchase(parsed);
            setShowReceiveForm(false);
            setShowCreateForm(true);

            if (response.data && response.data.unmatched && response.data.unmatched.length) {
                setError(`${response.data.unmatched.length} product(s) could not be matched.`);
            }
        } catch (err) {
            console.error(err);
            const data = err.response && err.response.data;
            setError((data && data.error) || "OCR processing failed.");
        } finally {
            setIsScanning(false);
            e.target.value = null;
        }
    };

    // --- CREATE PURCHASE LOGIC ---
    const handleAddLineItem = () => {
        setNewPurchase({
            ...newPurchase,
            items: [...newPurchase.items, { product: '', quantity: 1, unit_price: '' }]
        });
    };

    const handleItemChange = (index, field, value) => {
        const updatedItems = newPurchase.items.map((item, i) =>
            i === index ? { ...item } : item
        );
        updatedItems[index][field] = value;

        // Auto-fill price if product is selected
        if (field === 'product') {
            const selectedProd = products.find(p => p.id.toString() === value.toString());
            if (selectedProd) {
                updatedItems[index].unit_price = selectedProd.cost_price || 0;
            }
        }
        setNewPurchase({ ...newPurchase, items: updatedItems });
    };

    const handleCreateSubmit = async (e) => {
        e.preventDefault();
        try {
            await api.post('/inventory/purchases/', newPurchase);
            setShowCreateForm(false);
            setNewPurchase({ vendor: '', expected_delivery_date: '', items: [{ product: '', quantity: 1, unit_price: '' }] });
            fetchData();
        } catch (err) {
            const data = err.response && err.response.data;
            setError((data && data.detail) || (data ? JSON.stringify(data) : 'Failed to create purchase order'));
        }
    };

    const handleCancelCreate = () => {
        setShowCreateForm(false);
        setNewPurchase({ vendor: '', expected_delivery_date: '', items: [{ product: '', quantity: 1, unit_price: '' }] });
        setError('');
    };

    // --- RECEIVE ITEMS LOGIC ---
    const openReceivePanel = (purchase) => {
        setSelectedPurchase(purchase);
        const itemsToReceive = (purchase.items || []).map(item => ({
            id: item.id,
            product_name: item.product_name,
            ordered: item.quantity,
            previously_received: item.received_quantity,
            received_quantity: item.quantity - item.received_quantity
        }));
        setReceiveItems(itemsToReceive);
        setShowReceiveForm(true);
        setShowCreateForm(false);
    };

    const handleReceiveSubmit = async (e) => {
        e.preventDefault();
        try {
            let formattedItems = [];

            if (Array.isArray(receiveItems)) {
                formattedItems = receiveItems.map(item => ({
                    id: item.id,
                    received_quantity: parseInt(item.received_quantity, 10) || 0
                }));
            } else {
                formattedItems = Object.keys(receiveItems).map(key => ({
                    id: parseInt(key, 10),
                    received_quantity: parseInt(receiveItems[key], 10) || 0
                }));
            }

            console.log("Sending STRICT payload to Django:", { items: formattedItems });

            await api.post(`/inventory/purchases/${selectedPurchase.id}/receive_items/`, {
                items: formattedItems
            });

            setShowReceiveForm(false);
            fetchData();
        } catch (err) {
            const backendError = err.response && err.response.data;
            console.error("Full Backend Error:", backendError);
            setError((backendError && backendError.error) || 'Failed to receive items.');
        }
    };

    // --- UI HELPERS ---
    const getStatusStyle = (status) => {
        switch (status) {
            case 'pending':
                return { bg: '#fef3c7', text: '#92400e', border: '#fde68a' };
            case 'partially_received':
                return { bg: '#e0f2fe', text: '#075985', border: '#bae6fd' };
            case 'received':
                return { bg: '#ecfdf5', text: '#10b981', border: '#a7f3d0' };
            case 'cancelled':
                return { bg: '#fef2f2', text: 'var(--error-color)', border: '#fecaca' };
            default:
                return { bg: '#f3f4f6', text: '#374151', border: '#e5e7eb' };
        }
    };

    return (
        <div className="lux-page-container">
            {/* Header */}
            <div className="lux-page-header">
                <div className="header-title">
                    <span className="title-icon">🛒</span>
                    <h1>Purchase Orders</h1>
                </div>

                {!showCreateForm && !showReceiveForm && (
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        {/* Hidden File Input for OCR */}
                        <input 
                            type="file"
                            ref={fileInputRef}
                            onChange={handleOCRUpload}
                            accept="image/*,application/pdf"
                            style={{ display: 'none' }} 
                        />

                        <button 
                            className="lux-btn lux-btn-secondary"
                            onClick={() => fileInputRef.current.click()}
                            disabled={isScanning}
                        >
                            {isScanning ? "Scanning..." : "📄 Scan Invoice"}
                        </button>

                        <button 
                            className="lux-btn lux-btn-primary"
                            onClick={() => {
                                setShowCreateForm(true);
                                setShowReceiveForm(false);
                            }}
                        >
                            +New Order
                        </button>
                    </div>
                )}
            </div>

            {error && (
                <div 
                    className="highlight-box"
                    style={{ borderColor: 'var(--error-color)', backgroundColor: '#fef2f2', color: 'var(--error-color)', marginBottom: '1.5rem' }}
                >
                    {error}
                </div>
            )}

            {/* --- CREATE PO PANEL --- */}
            {showCreateForm && (
                <div className="lux-panel" style={{ padding: '2rem', marginBottom: '2rem' }}>
                    <form onSubmit={handleCreateSubmit}>
                        <h2 style={{ marginTop: 0, marginBottom: '1.5rem', fontSize: '1.25rem' }}>Create Purchase Order</h2>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
                            <div>
                                <label className="lux-label">Vendor *</label>
                                <select 
                                    name="vendor"
                                    value={newPurchase.vendor}
                                    onChange={(e) => setNewPurchase({ ...newPurchase, vendor: e.target.value })}
                                    className="lux-input"
                                    required
                                >
                                    <option value="">Select Vendor</option>
                                    {vendors.map((v) => (
                                        <option key={v.id} value={v.id}>{v.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="lux-label">Expected Delivery Date *</label>
                                <input 
                                    type="date"
                                    value={newPurchase.expected_delivery_date}
                                    onChange={(e) => setNewPurchase({ ...newPurchase, expected_delivery_date: e.target.value })}
                                    className="lux-input"
                                    required 
                                />
                            </div>
                        </div>

                        <div className="highlight-box" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
                            <h3 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1rem', color: 'var(--text-primary)' }}>Order Items</h3>

                            {newPurchase.items.map((item, index) => (
                                <div key={index} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', marginBottom: '1rem' }}>
                                    <div style={{ flex: 1 }}>
                                        <label className="lux-label">Product *</label>
                                        <select 
                                            value={item.product}
                                            onChange={(e) => handleItemChange(index, 'product', e.target.value)}
                                            className="lux-input"
                                            style={{ margin: 0 }}
                                            required
                                        >
                                            <option value="">Select Product...</option>
                                            {products.map(p => (
                                                <option key={p.id} value={p.id}>
                                                    {p.category_name ? `${p.category_name} - ` : ''} {p.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div style={{ width: '100px' }}>
                                        <label className="lux-label">Qty *</label>
                                        <input 
                                            type="number"
                                            min="1"
                                            value={item.quantity}
                                            onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                                            className="lux-input"
                                            style={{ margin: 0 }}
                                            required 
                                        />
                                    </div>
                                    <div style={{ width: '150px' }}>
                                        <label className="lux-label">Unit Price *</label>
                                        <input 
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={item.unit_price}
                                            onChange={(e) => handleItemChange(index, 'unit_price', e.target.value)}
                                            className="lux-input"
                                            style={{ margin: 0 }}
                                            required 
                                        />
                                    </div>
                                    {newPurchase.items.length > 1 && (
                                        <button 
                                            type="button"
                                            className="lux-btn lux-btn-danger"
                                            style={{ padding: '0.6rem 1rem' }}
                                            onClick={() => setNewPurchase({ ...newPurchase, items: newPurchase.items.filter((_, i) => i !== index) })}
                                        >
                                            X
                                        </button>
                                    )}
                                </div>
                            ))}

                            <button 
                                type="button"
                                className="lux-btn lux-btn-secondary"
                                style={{ marginTop: '0.5rem', padding: '0.4rem 0.8rem', fontSize: '0.875rem' }}
                                onClick={handleAddLineItem}
                            >
                                +Add Another Item
                            </button>
                        </div>

                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button type="submit" className="lux-btn lux-btn-primary">Create Order</button>
                            <button type="button" className="lux-btn lux-btn-secondary" onClick={handleCancelCreate}>Cancel</button>
                        </div>
                    </form>
                </div>
            )}

            {/* --- RECEIVE PO PANEL --- */}
            {showReceiveForm && (
                <div className="lux-panel" style={{ padding: '2rem', marginBottom: '2rem' }}>
                    <form onSubmit={handleReceiveSubmit}>
                        <h2 style={{ marginTop: 0, marginBottom: '0.5rem', fontSize: '1.25rem' }}>Receive Inventory</h2>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                            PO Number: {(selectedPurchase && selectedPurchase.purchase_number) || (selectedPurchase && selectedPurchase.id)}
                        </p>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
                            {receiveItems.map((item, index) => (
                                <div 
                                    key={item.id}
                                    className="highlight-box"
                                    style={{ padding: '1rem', margin: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                                >
                                    <div>
                                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{item.product_name}</div>
                                        <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                                            Ordered: {item.ordered} | Previously Received: {item.previously_received}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                        <label className="lux-label" style={{ margin: 0 }}>Receiving Now:</label>
                                        <input 
                                            type="number"
                                            min="0"
                                            max={item.ordered - item.previously_received}
                                            className="lux-input"
                                            style={{ margin: 0, width: '100px', textAlign: 'center' }}
                                            value={item.received_quantity}
                                            onChange={(e) => {
                                                const newItems = [...receiveItems];
                                                newItems[index].received_quantity = e.target.value;
                                                setReceiveItems(newItems);
                                            }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button 
                                type="submit" 
                                className="lux-btn lux-btn-primary"
                                style={{ backgroundColor: '#10b981', borderColor: '#10b981' }}
                            >
                                Confirm Receipt
                            </button>
                            <button 
                                type="button" 
                                className="lux-btn lux-btn-secondary"
                                onClick={() => setShowReceiveForm(false)}
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Main Table */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-tertiary)' }}>Loading orders...</div>
            ) : (
                <div className="lux-panel lux-table-wrapper">
                    <table className="lux-table">
                        <thead>
                            <tr>
                                <th>PO Number</th>
                                <th>Vendor</th>
                                <th>Date</th>
                                <th style={{ textAlign: 'right' }}>Total Amount</th>
                                <th style={{ textAlign: 'center' }}>Status</th>
                                <th style={{ textAlign: 'center' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {purchases.map((po) => {
                                const statusStyle = getStatusStyle(po.status);
                                return (
                                    <tr key={po.id}>
                                        <td><div className="cell-primary-text">{po.purchase_number || `PO-${po.id}`}</div></td>
                                        <td><div className="cell-secondary-text">{po.vendor_name}</div></td>
                                        <td><div className="cell-secondary-text">{new Date(po.purchase_date || po.created_at).toLocaleDateString()}</div></td>
                                        <td style={{ textAlign: 'right', fontWeight: 500 }}>${parseFloat(po.total_amount || 0).toFixed(2)}</td>
                                        <td style={{ textAlign: 'center' }}>
                                            <span 
                                                className="lux-badge"
                                                style={{
                                                    backgroundColor: statusStyle.bg,
                                                    color: statusStyle.text,
                                                    border: `1px solid ${statusStyle.border}`,
                                                    textTransform: 'capitalize'
                                                }}
                                            >
                                                {po.status ? po.status.replace('_', ' ') : ''}
                                            </span>
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            {(po.status === 'pending' || po.status === 'partially_received') ? (
                                                <button 
                                                    className="lux-btn lux-btn-primary"
                                                    style={{ padding: '0.25rem 0.75rem', fontSize: '0.875rem', backgroundColor: 'transparent', color: 'var(--primary-color)' }}
                                                    onClick={() => openReceivePanel(po)}
                                                >
                                                    📦Receive
                                                </button>
                                            ) : (
                                                <span style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>-</span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                            {purchases.length === 0 && (
                                <tr>
                                    <td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-tertiary)' }}>
                                        No purchase orders found. Create one to get started.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default Purchases;