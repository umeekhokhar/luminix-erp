import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { inventoryAPI } from '../services/api';
// Using our global Luminix stylesheet
import '../styles/Customers.css';

function Vendors() {
    const [vendors, setVendors] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        country: '',
        payment_terms: 'Net 30',
        is_active: true,
    });

    useEffect(() => {
        const token = localStorage.getItem('access_token');
        if (!token) {
            navigate('/login');
        } else {
            fetchVendors();
        }
    }, [navigate]);

    const fetchVendors = async () => {
        setLoading(true);
        try {
            const response = await inventoryAPI.getVendors();
            setVendors(response.data);
            setError('');
        } catch (err) {
            setError('Failed to fetch vendors');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingId) {
                await inventoryAPI.updateVendor(editingId, formData);
            } else {
                await inventoryAPI.createVendor(formData);
            }
            fetchVendors();
            setShowForm(false);
            setEditingId(null);
            resetForm();
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to save vendor');
        }
    };

    const handleEdit = (vendor) => {
        setEditingId(vendor.id);
        setFormData(vendor);
        setShowForm(true);
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this vendor?')) {
            try {
                await inventoryAPI.deleteVendor(id);
                fetchVendors();
            } catch (err) {
                setError('Failed to delete vendor');
            }
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            email: '',
            phone: '',
            address: '',
            city: '',
            country: '',
            payment_terms: 'Net 30',
            is_active: true,
        });
    };

    const handleCancel = () => {
        setShowForm(false);
        setEditingId(null);
        resetForm();
    };

    const filteredVendors = vendors.filter((vendor) =>
        vendor.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vendor.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="lux-page-container">
            <div className="lux-page-header">
                <div className="header-title">
                    <span className="title-icon">🏢</span>
                    <h1>Vendors</h1>
                </div>
                {!showForm && (
                    <button
                        className="lux-btn lux-btn-primary"
                        onClick={() => {
                            setShowForm(true);
                            setEditingId(null);
                            resetForm();
                        }}
                    >
                        + Add Vendor
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
                        <h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem', color: 'var(--text-primary)' }}>
                            {editingId ? 'Edit Vendor' : 'New Vendor'}
                        </h2>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Name *</label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                    required
                                    className="lux-input"
                                    style={{ width: '100%', margin: 0 }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Email *</label>
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleInputChange}
                                    required
                                    className="lux-input"
                                    style={{ width: '100%', margin: 0 }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Phone *</label>
                                <input
                                    type="text"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleInputChange}
                                    required
                                    className="lux-input"
                                    style={{ width: '100%', margin: 0 }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Payment Terms</label>
                                <input
                                    type="text"
                                    name="payment_terms"
                                    value={formData.payment_terms}
                                    onChange={handleInputChange}
                                    className="lux-input"
                                    style={{ width: '100%', margin: 0 }}
                                />
                            </div>
                        </div>

                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Address *</label>
                            <textarea
                                name="address"
                                value={formData.address}
                                onChange={handleInputChange}
                                required
                                rows="2"
                                className="lux-input"
                                style={{ width: '100%', margin: 0, resize: 'vertical' }}
                            ></textarea>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem', alignItems: 'end' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, color: 'var(--text-secondary)' }}>City *</label>
                                <input
                                    type="text"
                                    name="city"
                                    value={formData.city}
                                    onChange={handleInputChange}
                                    required
                                    className="lux-input"
                                    style={{ width: '100%', margin: 0 }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Country *</label>
                                <input
                                    type="text"
                                    name="country"
                                    value={formData.country}
                                    onChange={handleInputChange}
                                    required
                                    className="lux-input"
                                    style={{ width: '100%', margin: 0 }}
                                />
                            </div>
                            <div style={{ paddingBottom: '0.5rem' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 500, color: 'var(--text-secondary)' }}>
                                    <input
                                        type="checkbox"
                                        name="is_active"
                                        checked={formData.is_active}
                                        onChange={handleInputChange}
                                        style={{ width: '1.2rem', height: '1.2rem', accentColor: 'var(--primary-color)' }}
                                    />
                                    Active Vendor
                                </label>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
                            <button type="button" className="lux-btn lux-btn-secondary" onClick={handleCancel}>
                                Cancel
                            </button>
                            <button type="submit" className="lux-btn lux-btn-primary">
                                {editingId ? 'Update Vendor' : 'Save Vendor'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {!showForm && (
                <div className="lux-panel" style={{ padding: '1rem 1.5rem', marginBottom: '1.5rem' }}>
                    <input
                        type="text"
                        placeholder="Search vendors by name or email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="lux-input"
                        style={{ margin: 0, width: '100%', maxWidth: '400px' }}
                    />
                </div>
            )}

            {loading ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-tertiary)' }}>Loading vendors...</div>
            ) : filteredVendors.length === 0 ? (
                <div className="lux-panel" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-tertiary)' }}>
                    No vendors found.
                </div>
            ) : (
                <div className="lux-panel lux-table-wrapper">
                    <table className="lux-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Contact Info</th>
                                <th>Location</th>
                                <th>Payment Terms</th>
                                <th style={{ textAlign: 'center' }}>Status</th>
                                <th style={{ textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredVendors.map((vendor) => (
                                <tr key={vendor.id}>
                                    <td>
                                        <div className="cell-primary-text">{vendor.name}</div>
                                    </td>
                                    <td>
                                        <div className="cell-secondary-text">{vendor.email}</div>
                                        <div className="cell-secondary-text" style={{ fontSize: '0.8rem' }}>{vendor.phone}</div>
                                    </td>
                                    <td>
                                        <div className="cell-secondary-text">{vendor.city}, {vendor.country}</div>
                                    </td>
                                    <td>
                                        <div className="cell-secondary-text">{vendor.payment_terms}</div>
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
                                        <span 
                                            className="lux-badge"
                                            style={{
                                                backgroundColor: vendor.is_active ? '#ecfdf5' : '#f3f4f6',
                                                color: vendor.is_active ? '#10b981' : '#6b7280',
                                                border: `1px solid ${vendor.is_active ? '#a7f3d0' : '#d1d5db'}`
                                            }}
                                        >
                                            {vendor.is_active ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                            <button
                                                className="lux-btn lux-btn-secondary"
                                                style={{ padding: '0.4rem 0.8rem', fontSize: '0.875rem' }}
                                                onClick={() => handleEdit(vendor)}
                                            >
                                                Edit
                                            </button>
                                            <button
                                                className="lux-btn"
                                                style={{ 
                                                    padding: '0.4rem 0.8rem', 
                                                    fontSize: '0.875rem', 
                                                    backgroundColor: '#fee2e2', 
                                                    color: '#ef4444', 
                                                    border: 'none' 
                                                }}
                                                onClick={() => handleDelete(vendor.id)}
                                            >
                                                Delete
                                            </button>
                                        </div>
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

export default Vendors;