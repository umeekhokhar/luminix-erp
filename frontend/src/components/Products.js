import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
// Using our global Luminix stylesheet
import '../styles/Customers.css';

function Products() {
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [vendors, setVendors] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        category: '',
        price: '',
        sku: '',
        vendor: '',
        cost_price: '',
        initial_stock: '',
    });

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
            const [prodRes, catRes, vendRes] = await Promise.all([
                api.get('/inventory/products/'),
                api.get('/inventory/categories/'),
                api.get('/inventory/vendors/')
            ]);
            setProducts(prodRes.data);
            setCategories(catRes.data);
            setVendors(vendRes.data);
            setError('');
        } catch (err) {
            setError('Failed to fetch data');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingId) {
                const { initial_stock, ...updateData } = formData;
                await api.put(`/inventory/products/${editingId}/`, updateData);
            } else {
                await api.post('/inventory/products/', formData);
            }
            fetchData();
            handleCancel();
        } catch (err) {
            setError(err.response?.data?.detail || JSON.stringify(err.response?.data) || 'Failed to save product');
        }
    };

    const handleEdit = (product) => {
        setEditingId(product.id);
        setFormData({
            name: product.name,
            description: product.description,
            category: product.category,
            price: product.price,
            sku: product.sku,
            vendor: product.vendor,
            cost_price: product.cost_price,
            initial_stock: '',
        });
        setShowForm(true);
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure? This will delete inventory records as well.')) {
            try {
                await api.delete(`/inventory/products/${id}/`);
                fetchData();
            } catch (err) {
                setError('Failed to delete product');
            }
        }
    };

    const handleCancel = () => {
        setShowForm(false);
        setEditingId(null);
        setFormData({
            name: '', description: '', category: '', price: '',
            sku: '', vendor: '', cost_price: '', initial_stock: ''
        });
        setError('');
    };

    const filteredProducts = products.filter((product) => {
        const matchesSearch = product.name?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = !selectedCategory || product.category === parseInt(selectedCategory);
        return matchesSearch && matchesCategory;
    });

    return (
        <div className="lux-page-container">
            <div className="lux-page-header">
                <div className="header-title">
                    <span className="title-icon">📦</span>
                    <h1>Products & Inventory</h1>
                </div>
                {!showForm && (
                    <button className="lux-btn lux-btn-primary" onClick={() => { setShowForm(true); setEditingId(null); }}>
                        + Add Product
                    </button>
                )}
            </div>

            {error && (
                <div className="highlight-box" style={{ borderColor: 'var(--error-color)', backgroundColor: '#fef2f2', color: 'var(--error-color)', marginBottom: '1.5rem' }}>
                    {error}
                </div>
            )}

            {showForm && (
                <div className="lux-panel" style={{ padding: '2rem', marginBottom: '2rem' }}>
                    <form onSubmit={handleSubmit}>
                        <h2 style={{ marginTop: 0, marginBottom: '1.5rem', fontSize: '1.25rem' }}>
                            {editingId ? 'Edit Product' : 'New Product'}
                        </h2>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
                            <div>
                                <label className="lux-label">Product Name *</label>
                                <input type="text" name="name" value={formData.name} onChange={handleInputChange} className="lux-input" required />
                            </div>
                            <div>
                                <label className="lux-label">Category *</label>
                                <select name="category" value={formData.category} onChange={handleInputChange} className="lux-input" required>
                                    <option value="">Select Category</option>
                                    {categories.map((cat) => (
                                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div style={{ marginBottom: '1.5rem' }}>
                            <label className="lux-label">Description</label>
                            <textarea name="description" value={formData.description} onChange={handleInputChange} className="lux-input" rows="2" style={{ resize: 'vertical' }}></textarea>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
                            <div>
                                <label className="lux-label">SKU <span style={{fontWeight: 'normal', color: 'var(--text-tertiary)'}}>(Auto-generated if empty)</span></label>
                                <input type="text" name="sku" value={formData.sku} onChange={handleInputChange} className="lux-input" placeholder="Leave blank to auto-generate" />
                            </div>
                            <div>
                                <label className="lux-label">Vendor</label>
                                <select name="vendor" value={formData.vendor} onChange={handleInputChange} className="lux-input">
                                    <option value="">Select Vendor</option>
                                    {vendors.map((v) => (
                                        <option key={v.id} value={v.id}>{v.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                            <div>
                                <label className="lux-label">Selling Price *</label>
                                <div style={{ position: 'relative' }}>
                                    <span style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--text-secondary)' }}>$</span>
                                    <input type="number" name="price" step="0.01" value={formData.price} onChange={handleInputChange} className="lux-input" style={{ paddingLeft: '28px' }} required />
                                </div>
                            </div>
                            <div>
                                <label className="lux-label">Cost Price</label>
                                <div style={{ position: 'relative' }}>
                                    <span style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--text-secondary)' }}>$</span>
                                    <input type="number" name="cost_price" step="0.01" value={formData.cost_price} onChange={handleInputChange} className="lux-input" style={{ paddingLeft: '28px' }} />
                                </div>
                            </div>
                            
                            {!editingId && (
                                <div className="highlight-box" style={{ padding: '0.75rem 1rem', margin: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                    <label className="lux-label" style={{ color: 'var(--primary-color)' }}>Initial Stock</label>
                                    <input 
                                        type="number" 
                                        name="initial_stock" 
                                        value={formData.initial_stock} 
                                        onChange={handleInputChange} 
                                        className="lux-input"
                                        style={{ margin: 0 }}
                                        placeholder="0"
                                    />
                                </div>
                            )}
                        </div>

                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button type="submit" className="lux-btn lux-btn-primary">{editingId ? 'Update Product' : 'Save Product'}</button>
                            <button type="button" className="lux-btn lux-btn-secondary" onClick={handleCancel}>Cancel</button>
                        </div>
                    </form>
                </div>
            )}

            <div className="lux-panel" style={{ padding: '1rem 1.5rem', marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '250px' }}>
                    <input
                        type="text"
                        placeholder="Search products by name..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="lux-input"
                        style={{ margin: 0 }}
                    />
                </div>
                <div style={{ minWidth: '200px' }}>
                    <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="lux-input"
                        style={{ margin: 0 }}
                    >
                        <option value="">All Categories</option>
                        {categories.map((cat) => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-tertiary)' }}>Loading inventory...</div>
            ) : (
                <div className="lux-panel lux-table-wrapper">
                    <table className="lux-table">
                        <thead>
                            <tr>
                                <th>SKU</th>
                                <th>Name</th>
                                <th>Category</th>
                                <th style={{ textAlign: 'center' }}>Current Stock</th>
                                <th style={{ textAlign: 'right' }}>Price</th>
                                <th>Vendor</th>
                                <th style={{ textAlign: 'center' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredProducts.map((product) => {
                                const stock = product.inventory?.stock_quantity || 0;
                                const isLowStock = stock < 10;
                                return (
                                    <tr key={product.id}>
                                        <td><div className="cell-secondary-text">{product.sku}</div></td>
                                        <td><div className="cell-primary-text">{product.name}</div></td>
                                        <td><div className="cell-secondary-text">{product.category_name}</div></td>
                                        <td style={{ textAlign: 'center' }}>
                                            <span className="lux-badge" style={{
                                                backgroundColor: isLowStock ? '#fef2f2' : '#ecfdf5',
                                                color: isLowStock ? 'var(--error-color)' : '#10b981',
                                                border: `1px solid ${isLowStock ? '#fecaca' : '#a7f3d0'}`
                                            }}>
                                                {stock} Units
                                            </span>
                                        </td>
                                        <td style={{ textAlign: 'right', fontWeight: 500 }}>${parseFloat(product.price).toFixed(2)}</td>
                                        <td><div className="cell-secondary-text">{product.vendor_name || '-'}</div></td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                                                <button className="lux-btn lux-btn-secondary" style={{ padding: '0.25rem 0.75rem', fontSize: '0.875rem' }} onClick={() => handleEdit(product)}>Edit</button>
                                                <button className="lux-btn lux-btn-danger" style={{ padding: '0.25rem 0.75rem', fontSize: '0.875rem' }} onClick={() => handleDelete(product.id)}>Delete</button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                            {filteredProducts.length === 0 && (
                                <tr>
                                    <td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-tertiary)' }}>
                                        No products found matching your search.
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

export default Products;