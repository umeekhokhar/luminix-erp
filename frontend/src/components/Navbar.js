import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
    Hexagon, Users, Briefcase, ShoppingCart, FileText, 
    Box, LogOut, User, ChevronDown, Shield, BarChart3, Brain // Added Brain
} from 'lucide-react';
import '../styles/Navbar.css';

function Navbar() {
    const navigate = useNavigate();
    const username = localStorage.getItem('username');
    const role = localStorage.getItem('user_role') || 'customer';

    const handleLogout = () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('username');
        localStorage.removeItem('user_role');
        navigate('/login');
    };

    const getDashboardPath = () => {
        if (role === 'superadmin') return '/superadmin';
        if (role === 'customer') return '/customer-dashboard';
        return '/dashboard'; 
    };

    return (
        <nav className="lux-navbar">
            <div className="lux-nav-container">
                {/* Brand / Logo */}
                <Link to={getDashboardPath()} className="lux-brand">
                    <Hexagon className="brand-icon" size={28} />
                    <span>Luminix <span className="brand-light">ERP</span></span>
                </Link>

                {/* Main Navigation */}
                <ul className="lux-nav-menu">
                    {role === 'superadmin' && (
                        <li>
                            <Link to="/superadmin" className="lux-nav-link">
                                <Shield size={16} />
                                <span>Access Control</span>
                            </Link>
                        </li>
                    )}
                    
                    {(role === 'admin' || role === 'superadmin') && (
                        <>
                            <li className="lux-dropdown">
                                <span className="lux-nav-link">
                                    <Users size={16} />
                                    <span>CRM</span>
                                    <ChevronDown size={14} className="drop-arrow" />
                                </span>
                                <ul className="lux-dropdown-menu">
                                    <li><Link to="/customers" className="lux-drop-item">Customers</Link></li>
                                    <li><Link to="/salesmen" className="lux-drop-item">Salesmen</Link></li>
                                </ul>
                            </li>
                            <li className="lux-dropdown">
                                <span className="lux-nav-link">
                                    <Briefcase size={16} />
                                    <span>Sales</span>
                                    <ChevronDown size={14} className="drop-arrow" />
                                </span>
                                <ul className="lux-dropdown-menu">
                                    <li><Link to="/orders" className="lux-drop-item">Orders</Link></li>
                                    <li><Link to="/invoices" className="lux-drop-item">Invoices</Link></li>
                                </ul>
                            </li>
                            <li>
                                <Link to="/ledgers" className="lux-nav-link">
                                    <FileText size={16} />
                                    <span>Ledgers</span>
                                </Link>
                            </li>
                            {/* NEW: Reports Link */}
                            <li>
                                <Link to="/reports" className="lux-nav-link">
                                    <BarChart3 size={16} />
                                    <span>Reports</span>
                                </Link>
                            </li>
                            {/* NEW: AI Forecasting Link */}
                            <li>
                                <Link to="/forecasting" className="lux-nav-link">
                                    <Brain size={16} />
                                    <span>AI Forecast</span>
                                </Link>
                            </li>
                        </>
                    )}
                    
                    {role === 'salesman' && (
                        <>
                            <li className="lux-dropdown">
                                <span className="lux-nav-link">
                                    <Briefcase size={16} />
                                    <span>Sales</span>
                                    <ChevronDown size={14} className="drop-arrow" />
                                </span>
                                <ul className="lux-dropdown-menu">
                                    <li><Link to="/orders" className="lux-drop-item">Orders</Link></li>
                                    <li><Link to="/invoices" className="lux-drop-item">Invoices</Link></li>
                                </ul>
                            </li>
                            <li>
                                <Link to="/ledgers" className="lux-nav-link">
                                    <FileText size={16} />
                                    <span>Ledgers</span>
                                </Link>
                            </li>
                        </>
                    )}
                    
                    {role === 'customer' && (
                        <li>
                            <Link to="/customer-dashboard" className="lux-nav-link">
                                <FileText size={16} />
                                <span>My Balance</span>
                            </Link>
                        </li>
                    )}
                    
                    {(role === 'superadmin' || role === 'admin') && (
                        <li className="lux-dropdown">
                            <span className="lux-nav-link">
                                <Box size={16} />
                                <span>Inventory</span>
                                <ChevronDown size={14} className="drop-arrow" />
                            </span>
                            <ul className="lux-dropdown-menu">
                                <li><Link to="/products" className="lux-drop-item">Products</Link></li>
                                <li><Link to="/categories" className="lux-drop-item">Categories</Link></li>
                                <li><Link to="/stock" className="lux-drop-item">Stock</Link></li>
                                <li><Link to="/transactions" className="lux-drop-item">Transactions</Link></li>
                                <li><Link to="/vendors" className="lux-drop-item">Vendors</Link></li>
                                <li><Link to="/purchases" className="lux-drop-item">Purchases</Link></li>
                            </ul>
                        </li>
                    )}
                </ul>

                {/* Right Side - User Actions */}
                <div className="lux-nav-actions">
                    <Link to="/profile" className="user-profile-btn">
                        <User size={18} />
                        <span className="username-text">{username}</span>
                    </Link>
                    <button onClick={handleLogout} className="lux-logout-btn" title="Logout">
                        <LogOut size={18} />
                    </button>
                </div>
            </div>
        </nav>
    );
}

export default Navbar;