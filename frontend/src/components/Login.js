import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import '../styles/Customers.css';

function Login() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const token = localStorage.getItem('access_token');
        if (token) {
            navigate('/dashboard');
        }
    }, [navigate]);

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const response = await authAPI.login(username, password);
            if (response.data && response.data.access) {
                localStorage.setItem('access_token', response.data.access);
                localStorage.setItem('refresh_token', response.data.refresh);
                localStorage.setItem('username', username);
                localStorage.setItem('user_role', response.data.role || 'customer');

                const role = response.data.role || 'customer';
                if (role === 'superadmin') {
                    navigate('/superadmin');
                } else if (role === 'admin') {
                    navigate('/dashboard');
                } else if (role === 'customer') {
                    navigate('/customer-dashboard');
                } else {
                    navigate('/dashboard');
                }
            } else {
                setError('Login failed. Please check your credentials.');
            }
        } catch (err) {
            console.error('Login error:', err);
            console.error('Error response:', err.response?.data);

            if (err.response?.data) {
                const errorData = err.response.data;
                if (typeof errorData === 'string') {
                    setError(errorData);
                } else if (errorData.non_field_errors) {
                    setError(errorData.non_field_errors[0] || 'Invalid credentials');
                } else if (errorData.detail) {
                    setError(errorData.detail);
                } else if (errorData.username) {
                    setError(errorData.username[0] || 'Invalid username');
                } else if (errorData.password) {
                    setError(errorData.password[0] || 'Invalid password');
                } else {
                    setError('Login failed. Please check your credentials.');
                }
            } else if (err.message) {
                setError(err.message);
            } else {
                setError('An error occurred. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="lux-page-container login-layout">
            
            {/* Using lux-panel and lux-form-panel for the glassmorphism card */}
            <div className="lux-panel lux-form-panel login-card">
                
                <div className="login-header">
                    <h1 style={{ color: '#fff', margin: '0 0 0.5rem 0' }}>Luminix ERP</h1>
                    <p className="cell-secondary-text">Secure Access Portal</p>
                </div>
                
                {/* Using your existing error banner style */}
                {error && <div className="lux-error-banner">{error}</div>}
                
                <form onSubmit={handleLogin} className="lux-form">
                    
                    {/* Username Input */}
                    <div className="lux-form-row">
                        <div className="lux-form-group">
                            <label htmlFor="username">Username</label>
                            <input
                                id="username"
                                type="text"
                                className="lux-input"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                                disabled={loading}
                                autoComplete="username"
                            />
                        </div>
                    </div>

                    {/* Password Input */}
                    <div className="lux-form-row">
                        <div className="lux-form-group">
                            <label htmlFor="password">Password</label>
                            <input
                                id="password"
                                type="password"
                                className="lux-input"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                disabled={loading}
                                autoComplete="current-password"
                            />
                        </div>
                    </div>

                    {/* Using your vibrant blue gradient button */}
                    <button 
                        type="submit" 
                        disabled={loading} 
                        className="lux-btn primary login-btn"
                    >
                        {loading ? 'Authenticating...' : 'Sign In'}
                    </button>
                </form>

                <p className="login-footer-text cell-secondary-text">
                    Don't have an account?{' '}
                    <a href="#signup" onClick={(e) => e.preventDefault()} className="login-link">
                        Contact Administrator
                    </a>
                </p>
            </div>
        </div>
    );
}

export default Login;