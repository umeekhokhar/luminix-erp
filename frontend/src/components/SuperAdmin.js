import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { superAdminAPI } from '../services/api';
import '../styles/Customers.css';

function SuperAdmin() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        role: 'customer',
        first_name: '',
        last_name: '',
        is_active: true,
    });

    useEffect(() => {
        const token = localStorage.getItem('access_token');
        const role = localStorage.getItem('user_role');
        if (!token || role !== 'superadmin') {
            navigate('/login');
        } else {
            fetchUsers();
        }
    }, [navigate]);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const response = await superAdminAPI.listUsers();
            setUsers(response.data);
            setError('');
        } catch (err) {
            setError('Failed to fetch users');
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
        setError('');
        setSuccess('');
        
        try {
            if (editingId) {
                await superAdminAPI.updateUser(editingId, formData);
                setSuccess('User updated successfully!');
            } else {
                await superAdminAPI.createUser(formData);
                setSuccess('User created successfully!');
            }
            fetchUsers();
            setShowForm(false);
            setEditingId(null);
            resetForm();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to save user');
        }
    };

    const handleEdit = (user) => {
        setEditingId(user.id);
        setFormData({
            username: user.username,
            email: user.email,
            password: '',
            role: user.role,
            first_name: user.first_name || '',
            last_name: user.last_name || '',
            is_active: user.is_active,
        });
        setShowForm(true);
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this user?')) {
            try {
                await superAdminAPI.deleteUser(id);
                setSuccess('User deleted successfully!');
                fetchUsers();
            } catch (err) {
                setError('Failed to delete user');
            }
        }
    };

    const resetForm = () => {
        setFormData({
            username: '',
            email: '',
            password: '',
            role: 'customer',
            first_name: '',
            last_name: '',
            is_active: true,
        });
    };

    const handleCancel = () => {
        setShowForm(false);
        setEditingId(null);
        resetForm();
    };

    return (
        <div className="lux-page-container">
            <div className="lux-page-header">
                <div className="header-title">
                    <span className="title-icon">👑</span>
                    <h1>Super Admin Operations</h1>
                </div>
                <button
                    className="lux-btn primary"
                    onClick={() => {
                        setShowForm(true);
                        setEditingId(null);
                        resetForm();
                    }}
                >
                    + Create User
                </button>
            </div>

            {error && <div className="lux-error-banner">{error}</div>}
            {/* Added an inline style for success since it wasn't in the original base CSS */}
            {success && (
                <div className="highlight-box" style={{ borderColor: '#4ade80', backgroundColor: 'rgba(74, 222, 128, 0.1)', color: '#4ade80', marginBottom: '1.5rem', padding: '1rem' }}>
                    {success}
                </div>
            )}

            {showForm && (
                <div className="lux-panel lux-form-panel">
                    <form onSubmit={handleSubmit} className="lux-form">
                        <h2>{editingId ? 'Edit User' : 'Create New User'}</h2>

                        <div className="lux-form-row">
                            <div className="lux-form-group">
                                <label>Username *</label>
                                <input
                                    type="text"
                                    name="username"
                                    className="lux-input"
                                    value={formData.username}
                                    onChange={handleInputChange}
                                    required
                                    disabled={!!editingId}
                                />
                            </div>

                            <div className="lux-form-group">
                                <label>Email *</label>
                                <input
                                    type="email"
                                    name="email"
                                    className="lux-input"
                                    value={formData.email}
                                    onChange={handleInputChange}
                                    required
                                />
                            </div>
                        </div>

                        <div className="lux-form-row">
                            <div className="lux-form-group">
                                <label>Password {editingId ? '(leave empty to keep current)' : '*'}</label>
                                <input
                                    type="password"
                                    name="password"
                                    className="lux-input"
                                    value={formData.password}
                                    onChange={handleInputChange}
                                    required={!editingId}
                                />
                            </div>

                            <div className="lux-form-group">
                                <label>Role *</label>
                                <select
                                    name="role"
                                    className="lux-input"
                                    value={formData.role}
                                    onChange={handleInputChange}
                                    required
                                >
                                    <option value="superadmin">Super Admin</option>
                                    <option value="admin">Admin</option>
                                    <option value="salesman">Salesman</option>
                                    <option value="customer">Customer</option>
                                </select>
                            </div>
                        </div>

                        <div className="lux-form-row">
                            <div className="lux-form-group">
                                <label>First Name</label>
                                <input
                                    type="text"
                                    name="first_name"
                                    className="lux-input"
                                    value={formData.first_name}
                                    onChange={handleInputChange}
                                />
                            </div>

                            <div className="lux-form-group">
                                <label>Last Name</label>
                                <input
                                    type="text"
                                    name="last_name"
                                    className="lux-input"
                                    value={formData.last_name}
                                    onChange={handleInputChange}
                                />
                            </div>
                        </div>

                        {editingId && (
                            <div className="lux-form-row">
                                <div className="lux-form-group">
                                    <label className="checkbox-label">
                                        <input
                                            type="checkbox"
                                            name="is_active"
                                            checked={formData.is_active}
                                            onChange={handleInputChange}
                                        />
                                        Active User Account
                                    </label>
                                </div>
                            </div>
                        )}

                        <div className="lux-form-actions">
                            <button type="button" className="lux-btn ghost" onClick={handleCancel}>
                                Cancel
                            </button>
                            <button type="submit" className="lux-btn primary">
                                {editingId ? 'Update User' : 'Create User'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {loading ? (
                <div className="lux-loading-state">
                    <div className="spinner"></div>
                    <p>Loading user data...</p>
                </div>
            ) : users.length === 0 ? (
                <div className="lux-empty-state">No users found in the system.</div>
            ) : (
                <div className="lux-panel lux-table-wrapper">
                    <table className="lux-table">
                        <thead>
                            <tr>
                                <th>Username</th>
                                <th>Email</th>
                                <th>Name</th>
                                <th>Role</th>
                                <th>Status</th>
                                <th>Joined</th>
                                <th className="text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map((user) => (
                                <tr key={user.id}>
                                    <td className="cell-primary-text">{user.username}</td>
                                    <td className="cell-secondary-text">{user.email}</td>
                                    <td className="cell-secondary-text">{`${user.first_name || ''} ${user.last_name || ''}`.trim() || '-'}</td>
                                    <td>
                                        <span className="lux-badge ghost-badge">{user.role}</span>
                                    </td>
                                    <td>
                                        <span className={`lux-badge ${user.is_active ? 'ghost-badge' : ''}`} style={{ color: user.is_active ? '#4ade80' : '#f87171' }}>
                                            {user.is_active ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td className="cell-tertiary-text">{new Date(user.date_joined).toLocaleDateString()}</td>
                                    <td style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                        <button
                                            className="lux-btn ghost"
                                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                                            onClick={() => handleEdit(user)}
                                        >
                                            Edit
                                        </button>
                                        <button
                                            className="lux-btn ghost"
                                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', color: '#f87171', borderColor: 'rgba(239, 68, 68, 0.2)' }}
                                            onClick={() => handleDelete(user.id)}
                                        >
                                            Delete
                                        </button>
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

export default SuperAdmin;