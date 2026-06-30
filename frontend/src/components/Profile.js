import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import '../styles/Customers.css';

function Profile() {
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        username: '',
        email: '',
        first_name: '',
        last_name: '',
    });

    useEffect(() => {
        const token = localStorage.getItem('access_token');
        if (!token) {
            navigate('/login');
        } else {
            fetchProfile();
        }
    }, [navigate]);

    const fetchProfile = async () => {
        setLoading(true);
        try {
            const response = await authAPI.getProfile();
            const userData = response.data;
            setFormData({
                username: userData.username || userData.user?.username || '',
                email: userData.email || userData.user?.email || '',
                first_name: userData.first_name || userData.user?.first_name || '',
                last_name: userData.last_name || userData.user?.last_name || '',
            });
            setError('');
        } catch (err) {
            setError('Failed to fetch profile data.');
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const [passwordData, setPasswordData] = useState({
        old_password: '',
        new_password: '',
        confirm_password: '',
    });

    const [passwordSaving, setPasswordSaving] = useState(false);

    const handlePasswordChange = (e) => {
        const { name, value } = e.target;
        setPasswordData((prev) => ({ ...prev, [name]: value }));
    };

    const handlePasswordSubmit = async (e) => {
        e.preventDefault();

        if (passwordData.new_password !== passwordData.confirm_password) {
            setError('New passwords do not match');
            return;
        }

        setPasswordSaving(true);
        try {
            await authAPI.changePassword({
                old_password: passwordData.old_password,
                new_password: passwordData.new_password,
            });
            setSuccess('Password updated successfully!');
            setPasswordData({
                old_password: '',
                new_password: '',
                confirm_password: '',
            });
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to update password');
        } finally {
            setPasswordSaving(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError('');
        setSuccess('');

        try {
            await authAPI.updateProfile(formData);
            setSuccess('Profile updated successfully!');
            setTimeout(() => setSuccess(''), 3000);
            fetchProfile();
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to update profile');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="lux-loading-state">Loading Profile...</div>;
    }

    return (
        <div className="lux-page-container">
            <div className="lux-page-header">
                <div className="header-title">
                    <span className="title-icon">⚙️</span>
                    <h1>Account Settings</h1>
                </div>
            </div>

            {error && (
                <div
                    className="lux-error-banner"
                    style={{ marginBottom: '1.5rem' }}
                >
                    {error}
                </div>
            )}

            {success && (
                <div
                    className="lux-success-banner"
                    style={{
                        color: '#10b981',
                        padding: '1rem',
                        marginBottom: '1.5rem',
                    }}
                >
                    {success}
                </div>
            )}

            <div className="lux-panel">
                <div
                    className="profile-hero"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1.5rem',
                        marginBottom: '2rem',
                        paddingBottom: '2rem',
                        borderBottom: '1px solid rgba(255,255,255,0.1)',
                    }}
                >
                    <div
                        className="avatar-circle"
                        style={{
                            width: '80px',
                            height: '80px',
                            borderRadius: '50%',
                            background:
                                'linear-gradient(135deg, var(--primary-color), #3b82f6)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '2rem',
                            color: 'white',
                        }}
                    >
                        {formData.first_name?.[0] ||
                            formData.username?.[0] ||
                            '?'}
                    </div>

                    <div>
                        <h2 style={{ margin: 0 }}>
                            {formData.first_name} {formData.last_name}
                        </h2>
                        <p style={{ margin: 0, opacity: 0.6 }}>
                            @{formData.username}
                        </p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="lux-form">
                    <div
                        className="lux-form-row"
                        style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: '1.5rem',
                            marginBottom: '1.5rem',
                        }}
                    >
                        <div className="lux-form-group">
                            <label
                                style={{
                                    display: 'block',
                                    marginBottom: '8px',
                                    fontSize: '0.9rem',
                                    opacity: 0.8,
                                }}
                            >
                                Username
                            </label>
                            <input
                                type="text"
                                name="username"
                                value={formData.username}
                                className="lux-input disabled"
                                disabled
                                style={{
                                    cursor: 'not-allowed',
                                    backgroundColor:
                                        'rgba(255,255,255,0.05)',
                                }}
                            />
                            <small
                                style={{
                                    color: '#6b7280',
                                    display: 'block',
                                    marginTop: '4px',
                                }}
                            >
                                Unique ID cannot be changed
                            </small>
                        </div>

                        <div className="lux-form-group">
                            <label
                                style={{
                                    display: 'block',
                                    marginBottom: '8px',
                                    fontSize: '0.9rem',
                                    opacity: 0.8,
                                }}
                            >
                                Email Address *
                            </label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleInputChange}
                                className="lux-input"
                                required
                            />
                        </div>
                    </div>

                    <div
                        className="lux-form-row"
                        style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: '1.5rem',
                            marginBottom: '2rem',
                        }}
                    >
                        <div className="lux-form-group">
                            <label
                                style={{
                                    display: 'block',
                                    marginBottom: '8px',
                                    fontSize: '0.9rem',
                                    opacity: 0.8,
                                }}
                            >
                                First Name
                            </label>
                            <input
                                type="text"
                                name="first_name"
                                value={formData.first_name}
                                onChange={handleInputChange}
                                className="lux-input"
                            />
                        </div>

                        <div className="lux-form-group">
                            <label
                                style={{
                                    display: 'block',
                                    marginBottom: '8px',
                                    fontSize: '0.9rem',
                                    opacity: 0.8,
                                }}
                            >
                                Last Name
                            </label>
                            <input
                                type="text"
                                name="last_name"
                                value={formData.last_name}
                                onChange={handleInputChange}
                                className="lux-input"
                            />
                        </div>
                    </div>

                    <div
                        className="form-actions"
                        style={{
                            borderTop:
                                '1px solid rgba(255,255,255,0.1)',
                            paddingTop: '1.5rem',
                            display: 'flex',
                            justifyContent: 'flex-end',
                        }}
                    >
                        <button
                            type="submit"
                            className="lux-btn primary"
                            disabled={saving}
                            style={{ minWidth: '150px' }}
                        >
                            {saving
                                ? 'Saving Changes...'
                                : 'Save Profile'}
                        </button>
                    </div>
                </form>
            </div>

            <div className="lux-panel" style={{ marginTop: '2rem' }}>
                <h2
                    style={{
                        marginBottom: '1.5rem',
                        borderBottom:
                            '1px solid rgba(255,255,255,0.1)',
                        paddingBottom: '1rem',
                    }}
                >
                    Security & Password
                </h2>

                <form
                    onSubmit={handlePasswordSubmit}
                    className="lux-form"
                >
                    <div
                        className="lux-form-group"
                        style={{ marginBottom: '1.5rem' }}
                    >
                        <label
                            style={{
                                display: 'block',
                                marginBottom: '8px',
                                fontSize: '0.9rem',
                                opacity: 0.8,
                            }}
                        >
                            Current Password
                        </label>
                        <input
                            type="password"
                            name="old_password"
                            value={passwordData.old_password}
                            onChange={handlePasswordChange}
                            className="lux-input"
                            required
                        />
                    </div>

                    <div
                        className="lux-form-row"
                        style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: '1.5rem',
                            marginBottom: '2rem',
                        }}
                    >
                        <div className="lux-form-group">
                            <label
                                style={{
                                    display: 'block',
                                    marginBottom: '8px',
                                    fontSize: '0.9rem',
                                    opacity: 0.8,
                                }}
                            >
                                New Password
                            </label>
                            <input
                                type="password"
                                name="new_password"
                                value={passwordData.new_password}
                                onChange={handlePasswordChange}
                                className="lux-input"
                                required
                            />
                        </div>

                        <div className="lux-form-group">
                            <label
                                style={{
                                    display: 'block',
                                    marginBottom: '8px',
                                    fontSize: '0.9rem',
                                    opacity: 0.8,
                                }}
                            >
                                Confirm New Password
                            </label>
                            <input
                                type="password"
                                name="confirm_password"
                                value={passwordData.confirm_password}
                                onChange={handlePasswordChange}
                                className="lux-input"
                                required
                            />
                        </div>
                    </div>

                    <div
                        className="form-actions"
                        style={{ textAlign: 'right' }}
                    >
                        <button
                            type="submit"
                            className="lux-btn primary"
                            disabled={passwordSaving}
                        >
                            {passwordSaving
                                ? 'Updating...'
                                : 'Update Password'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default Profile;