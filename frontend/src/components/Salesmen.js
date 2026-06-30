import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { crmAPI, adminAPI } from '../services/api';
// Keeping this import since it now holds all our beautiful Luminix styling!
import '../styles/Customers.css'; 

function Salesmen() {
    const [salesmen, setSalesmen] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const navigate = useNavigate();

    const role = localStorage.getItem('user_role');
    const isAdmin = role === 'admin' || role === 'superadmin';

    const [formData, setFormData] = useState({
        user: '',
        employee_id: '',
        commission_rate: '',
        territory: '',
        create_user: false,
        username: '',
        password: '',
        email: '',
        first_name: '',
        last_name: '',
    });

    useEffect(() => {
        const token = localStorage.getItem('access_token');
        if (!token) {
            navigate('/login');
        } else {
            fetchSalesmen();
        }
    }, [navigate]);

    const fetchSalesmen = async () => {
        setLoading(true);
        try {
            const response = await crmAPI.getSalesmen();
            setSalesmen(response.data);
            setError('');
        } catch (err) {
            setError('Failed to fetch salesmen');
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
                const payload = {
                    user: formData.user,
                    employee_id: formData.employee_id,
                    commission_rate: formData.commission_rate,
                    territory: formData.territory,
                };
                await crmAPI.updateSalesman(editingId, payload);
            } else if (isAdmin && formData.create_user) {
                const loginPayload = {
                    username: formData.username,
                    email: formData.email,
                    password: formData.password,
                    first_name: formData.first_name,
                    last_name: formData.last_name,
                    employee_id: formData.employee_id,
                    commission_rate: formData.commission_rate,
                    territory: formData.territory,
                };
                await adminAPI.createSalesman(loginPayload);
            } else {
                const payload = {
                    user: formData.user,
                    employee_id: formData.employee_id,
                    commission_rate: formData.commission_rate,
                    territory: formData.territory,
                };
                await crmAPI.createSalesman(payload);
            }
            fetchSalesmen();
            setShowForm(false);
            setEditingId(null);
            resetForm();
        } catch (err) {
            setError(err.response?.data?.error || err.response?.data?.detail || 'Failed to save salesman');
            console.error(err);
        }
    };

    const handleEdit = (salesman) => {
        setEditingId(salesman.id);
        setFormData({
            user: salesman.user,
            employee_id: salesman.employee_id,
            commission_rate: salesman.commission_rate,
            territory: salesman.territory || '',
        });
        setShowForm(true);
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this salesman?')) {
            try {
                await crmAPI.deleteSalesman(id);
                fetchSalesmen();
            } catch (err) {
                setError('Failed to delete salesman');
            }
        }
    };

    const resetForm = () => {
        setFormData({
            user: '', employee_id: '', commission_rate: '', territory: '',
            create_user: false, username: '', password: '', email: '',
            first_name: '', last_name: '',
        });
    };

    const handleCancel = () => {
        setShowForm(false);
        setEditingId(null);
        resetForm();
    };

    const filteredSalesmen = salesmen.filter((salesman) =>
        salesman.employee_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (salesman.user?.username || salesman.user?.toString() || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        salesman.territory?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="lux-page-container">
            <div className="lux-page-header">
                <div className="header-title">
                    <span className="title-icon">👔</span>
                    <h1>Salesmen</h1>
                </div>
                {!showForm && (
                    <button
                        className="lux-btn primary"
                        onClick={() => {
                            setShowForm(true);
                            setEditingId(null);
                            resetForm();
                        }}
                    >
                        + Add Salesman
                    </button>
                )}
            </div>

            {error && <div className="lux-error-banner">{error}</div>}

            {showForm && (
                <div className="lux-panel lux-form-panel">
                    <form onSubmit={handleSubmit} className="lux-form">
                        <h2>{editingId ? 'Edit Salesman' : 'New Salesman'}</h2>

                        <div className="lux-form-row">
                            <div className="lux-form-group">
                                <label>User ID *</label>
                                <input
                                    type="number"
                                    className="lux-input"
                                    name="user"
                                    value={formData.user}
                                    onChange={handleInputChange}
                                    required={!formData.create_user}
                                    placeholder="Linked User ID"
                                />
                            </div>
                            
                            {!editingId && (
                                <div className="lux-form-group checkbox-group" style={{justifyContent: 'flex-end', paddingBottom: '10px'}}>
                                    <label className="checkbox-label">
                                        <input
                                            type="checkbox"
                                            name="create_user"
                                            checked={formData.create_user}
                                            onChange={handleInputChange}
                                            disabled={!isAdmin}
                                        />
                                        <span className="checkbox-custom"></span>
                                        Create login for this salesman
                                    </label>
                                </div>
                            )}
                        </div>

                        {formData.create_user && !editingId && (
                            <div className="highlight-box">
                                <div className="lux-form-row">
                                    <div className="lux-form-group">
                                        <label>Username *</label>
                                        <input type="text" className="lux-input" name="username" value={formData.username} onChange={handleInputChange} required />
                                    </div>
                                    <div className="lux-form-group">
                                        <label>Password *</label>
                                        <input type="password" className="lux-input" name="password" value={formData.password} onChange={handleInputChange} required />
                                    </div>
                                </div>
                                <div className="lux-form-row">
                                    <div className="lux-form-group">
                                        <label>Email *</label>
                                        <input type="email" className="lux-input" name="email" value={formData.email} onChange={handleInputChange} required />
                                    </div>
                                    <div className="lux-form-group">
                                        <label>First Name</label>
                                        <input type="text" className="lux-input" name="first_name" value={formData.first_name} onChange={handleInputChange} />
                                    </div>
                                    <div className="lux-form-group">
                                        <label>Last Name</label>
                                        <input type="text" className="lux-input" name="last_name" value={formData.last_name} onChange={handleInputChange} />
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="lux-form-row" style={{marginTop: '1.25rem'}}>
                            <div className="lux-form-group">
                                <label>Employee ID *</label>
                                <input type="text" className="lux-input" name="employee_id" value={formData.employee_id} onChange={handleInputChange} required />
                            </div>
                        </div>

                        <div className="lux-form-row">
                            <div className="lux-form-group">
                                <label>Commission Rate (%) *</label>
                                <input
                                    type="number"
                                    className="lux-input"
                                    name="commission_rate"
                                    value={formData.commission_rate}
                                    onChange={handleInputChange}
                                    required
                                    step="0.01"
                                    min="0"
                                    max="100"
                                />
                            </div>
                            <div className="lux-form-group">
                                <label>Territory</label>
                                <input type="text" className="lux-input" name="territory" value={formData.territory} onChange={handleInputChange} />
                            </div>
                        </div>

                        <div className="lux-form-actions">
                            <button type="button" className="lux-btn ghost" onClick={handleCancel}>
                                Cancel
                            </button>
                            <button type="submit" className="lux-btn primary">
                                {editingId ? 'Update Salesman' : 'Save Salesman'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {!showForm && (
                <div className="lux-search-wrapper">
                    <span className="search-icon">🔍</span>
                    <input
                        type="text"
                        placeholder="Search salesmen..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="lux-search-input"
                    />
                </div>
            )}

            {!showForm && loading ? (
                <div className="lux-loading-state">
                    <div className="spinner"></div>Loading salesmen...
                </div>
            ) : !showForm && filteredSalesmen.length === 0 ? (
                <div className="lux-empty-state">No salesmen found.</div>
            ) : !showForm && (
                <div className="lux-panel lux-table-wrapper">
                    <table className="lux-table">
                        <thead>
                            <tr>
                                <th>Employee</th>
                                <th>Commission</th>
                                <th>Territory</th>
                                <th className="text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredSalesmen.map((salesman) => (
                                <tr key={salesman.id}>
                                    <td>
                                        <div className="cell-primary-text">{salesman.employee_id}</div>
                                        <div className="cell-tertiary-text">User ID: {salesman.user}</div>
                                    </td>
                                    <td>
                                        <div className="lux-badge ghost-badge">{salesman.commission_rate}%</div>
                                    </td>
                                    <td>
                                        <div className="cell-secondary-text">{salesman.territory || 'Unassigned'}</div>
                                    </td>
                                    <td className="text-right">
                                        <div className="lux-action-group right-align">
                                            <button
                                                className="lux-btn-icon ghost"
                                                onClick={() => handleEdit(salesman)}
                                                title="Edit"
                                            >
                                                ✏️
                                            </button>
                                            <button
                                                className="lux-btn-icon danger"
                                                onClick={() => handleDelete(salesman.id)}
                                                title="Delete"
                                            >
                                                🗑️
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

export default Salesmen;