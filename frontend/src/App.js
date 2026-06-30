import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import SuperAdmin from './components/SuperAdmin';
import CustomerDashboard from './components/CustomerDashboard';
import Customers from './components/Customers';
import Salesmen from './components/Salesmen';
import Products from './components/Products';
import Categories from './components/Categories';
import Stock from './components/Stock';
import Transactions from './components/Transactions';
import Orders from './components/Orders';
import Vendors from './components/Vendors';
import Purchases from './components/Purchases';
import Invoices from './components/Invoices';
import Ledgers from './components/Ledgers';
import Profile from './components/Profile';
import Navbar from './components/Navbar';
import Reports from './components/Reports';
import Forecasting from './components/Forecasting';

// 1. Import your newly re-created chat widget here
import ChatbotWidget from './components/ChatbotWidget'; 
import './App.css';

function ProtectedRoute({ children }) {
    const isLoggedIn = localStorage.getItem('access_token') !== null;
    return isLoggedIn ? children : <Navigate to="/login" replace />;
}

function App() {
    const isLoggedIn = localStorage.getItem('access_token') !== null;

    // Quick runtime evaluation of user role (fallback to admin for testing)
    const userRole = localStorage.getItem('user_role') || 'admin';

    return (
        <Router>
            <div className="App">
                {isLoggedIn && <Navbar />}
                
                {/* 2. Global Chatbot Hook - Self-loading data context */}
                {isLoggedIn && (
                    <ChatbotWidget userRole={userRole} />
                )}

                <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/reports" element={
                        <ProtectedRoute>
                            <Reports />
                        </ProtectedRoute>
                    } />
                    <Route path="/forecasting" element={
                        <ProtectedRoute>
                            <Forecasting />
                        </ProtectedRoute>
                    } />
                    <Route path="/" element={<Navigate to="/login" replace />} />
                    <Route
                        path="/dashboard"
                        element={
                            <ProtectedRoute>
                                <Dashboard />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/customers"
                        element={
                            <ProtectedRoute>
                                <Customers />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/salesmen"
                        element={
                            <ProtectedRoute>
                                <Salesmen />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/products"
                        element={
                            <ProtectedRoute>
                                <Products />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/categories"
                        element={
                            <ProtectedRoute>
                                <Categories />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/stock"
                        element={
                            <ProtectedRoute>
                                <Stock />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/transactions"
                        element={
                            <ProtectedRoute>
                                <Transactions />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/orders"
                        element={
                            <ProtectedRoute>
                                <Orders />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/vendors"
                        element={
                            <ProtectedRoute>
                                <Vendors />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/purchases"
                        element={
                            <ProtectedRoute>
                                <Purchases />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/invoices"
                        element={
                            <ProtectedRoute>
                                <Invoices />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/ledgers"
                        element={
                            <ProtectedRoute>
                                <Ledgers />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/profile"
                        element={
                            <ProtectedRoute>
                                <Profile />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/superadmin"
                        element={
                            <ProtectedRoute>
                                <SuperAdmin />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/admin"
                        element={
                            <ProtectedRoute>
                                <Dashboard />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/customer-dashboard"
                        element={
                            <ProtectedRoute>
                                <CustomerDashboard />
                            </ProtectedRoute>
                        }
                    />
                </Routes>
            </div>
        </Router>
    );
}

export default App;