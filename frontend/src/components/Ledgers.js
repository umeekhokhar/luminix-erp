import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { accountingAPI } from '../services/api';
import { 
    Users, Briefcase, Wallet, TrendingDown, 
    Plus, CreditCard, Download, FileText, X 
} from 'lucide-react';
import '../styles/Ledgers.css';

function Ledgers() {
    const [activeTab, setActiveTab] = useState('customer');

    const [customerLedgers, setCustomerLedgers] = useState([]);
    const [vendorLedgers, setVendorLedgers] = useState([]);
    const [cashAccounts, setCashAccounts] = useState([]);
    const [expenseAccounts, setExpenseAccounts] = useState([]);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    // Transaction Modal State
    const [showModal, setShowModal] = useState(false);
    const [selectedLedger, setSelectedLedger] = useState(null);
    const [formData, setFormData] = useState({
        amount: '',
        transaction_type: 'credit',
        category: 'deposit', // used only for cash
        cash_account: '',    // NEW: used only for expenses
        reference_number: '',
        notes: ''
    });

    // New Account Modal State
    const [showAccountModal, setShowAccountModal] = useState(false);
    const [newAccountName, setNewAccountName] = useState('');

    useEffect(() => {
        const token = localStorage.getItem('access_token');
        if (!token) {
            navigate('/login');
        } else {
            if (activeTab === 'customer') fetchCustomerLedgers();
            else if (activeTab === 'vendor') fetchVendorLedgers();
            else if (activeTab === 'cash') fetchCashAccounts();
            else if (activeTab === 'expense') {
                fetchExpenseAccounts();
                fetchCashAccounts(); // NEW: Need cash accounts for the dropdown!
            }
        }
    }, [navigate, activeTab]);

    // ================= FETCH FUNCTIONS =================
    const fetchCustomerLedgers = async () => {
        setLoading(true);
        try {
            const response = await accountingAPI.getCustomerLedgers();
            setCustomerLedgers(response.data);
            setError('');
        } catch (err) {
            setError('Failed to fetch customer ledgers');
        } finally {
            setLoading(false);
        }
    };

    const fetchVendorLedgers = async () => {
        setLoading(true);
        try {
            const response = await accountingAPI.getVendorLedgers();
            setVendorLedgers(response.data);
            setError('');
        } catch (err) {
            setError('Failed to fetch vendor ledgers');
        } finally {
            setLoading(false);
        }
    };

    const fetchCashAccounts = async () => {
        // Don't set loading state if we are just background-fetching for the expense dropdown
        if (activeTab === 'cash') setLoading(true);
        try {
            const response = await accountingAPI.getCashAccounts();
            setCashAccounts(response.data);
            setError('');
        } catch (err) {
            setError('Failed to fetch cash accounts');
        } finally {
            if (activeTab === 'cash') setLoading(false);
        }
    };

    const fetchExpenseAccounts = async () => {
        setLoading(true);
        try {
            const response = await accountingAPI.getExpenseAccounts();
            setExpenseAccounts(response.data);
            setError('');
        } catch (err) {
            setError('Failed to fetch expense accounts');
        } finally {
            setLoading(false);
        }
    };

    // ================= NEW ACCOUNT HANDLING =================
    const handleAccountSubmit = async (e) => {
        e.preventDefault();
        try {
            if (activeTab === 'expense') {
                await accountingAPI.createExpenseAccount({ name: newAccountName });
                fetchExpenseAccounts();
            } else if (activeTab === 'cash') {
                await accountingAPI.createCashAccount({ name: newAccountName });
                fetchCashAccounts();
            }
            setShowAccountModal(false);
            setNewAccountName('');
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to create account');
        }
    };

    // ================= TRANSACTION MODAL HANDLING =================
    const openTransactionModal = (ledger) => {
        setSelectedLedger(ledger);
        setFormData({
            amount: '',
            transaction_type: (activeTab === 'cash' || activeTab === 'expense') ? 'debit' : 'credit',
            category: 'deposit',
            cash_account: '', // Reset on open
            reference_number: '',
            notes: ''
        });
        setShowModal(true);
    };

    // ================= TRANSACTION MODAL HANDLING =================
    const handleTransactionSubmit = async (e) => {
        e.preventDefault();
        try {
            // 1. Clean payload so Django doesn't reject unexpected fields
            const payload = { ...formData };
            if (activeTab !== 'cash') {
                delete payload.category;
            }
            if (activeTab !== 'expense') {
                delete payload.cash_account;
            }

            if (activeTab === 'customer') {
                await accountingAPI.addCustomerTransaction({
                    ledger_id: selectedLedger.id,
                    ...payload
                });
                fetchCustomerLedgers();
            }
            else if (activeTab === 'vendor') {
                await accountingAPI.addVendorTransaction({
                    ledger_id: selectedLedger.id,
                    ...payload
                });
                fetchVendorLedgers();
            }
            else if (activeTab === 'cash') {
                await accountingAPI.addCashTransaction({
                    account_id: selectedLedger.id,
                    ...payload
                });
                fetchCashAccounts();
            }
            else if (activeTab === 'expense') {
                await accountingAPI.addExpenseTransaction({
                    account_id: selectedLedger.id,
                    ledger_id: selectedLedger.id, 
                    expense_account_id: selectedLedger.id,
                    ...payload
                });
                fetchExpenseAccounts();
            }
            
            setShowModal(false);
            setError(''); // Clear any previous errors
            
        } catch (err) {
            console.error("Backend Error Details:", err.response?.data);
            
            const backendError = err.response?.data;
            if (typeof backendError === 'object') {
                setError(JSON.stringify(backendError).replace(/[{}[\]"]/g, ' ')); 
            } else {
                setError(backendError?.error || 'Transaction failed to process.');
            }
        }
    };

    const handleDownloadPDF = async (ledger) => {
        try {
            let response;
            let filename;

            if (activeTab === 'customer') {
                response = await accountingAPI.downloadCustomerStatement(ledger.id);
                filename = `Customer_${ledger.customer_name || 'Statement'}.pdf`;
            }
            else if (activeTab === 'vendor') {
                response = await accountingAPI.downloadVendorStatement(ledger.id);
                filename = `Vendor_${ledger.vendor_name || 'Statement'}.pdf`;
            }
            else if (activeTab === 'cash') {
                response = await accountingAPI.downloadCashStatement(ledger.id);
                filename = `Cash_Statement_${ledger.name || 'Account'}.pdf`;
            }
            else if (activeTab === 'expense') {
                response = await accountingAPI.downloadExpenseStatement(ledger.id);
                filename = `Expense_Statement_${ledger.name || 'Account'}.pdf`;
            }

            const blob = new Blob([response.data], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);

            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            link.remove();

            window.URL.revokeObjectURL(url);
        } catch (err) {
            setError('Failed to download PDF');
        }
    };

    // ================= RENDER =================
    const currentData =
        activeTab === 'customer' ? customerLedgers : 
        activeTab === 'vendor' ? vendorLedgers : 
        activeTab === 'cash' ? cashAccounts : expenseAccounts;

    return (
        <div className="lux-page-container">
            <div className="lux-page-header">
                <div className="header-title">
                    <FileText size={28} className="title-icon" />
                    <h1>Financial Ledgers</h1>
                </div>
                
                {(activeTab === 'expense' || activeTab === 'cash') && (
                    <button 
                        className="lux-btn primary" 
                        onClick={() => setShowAccountModal(true)}
                    >
                        <Plus size={18} />
                        New {activeTab === 'expense' ? 'Expense' : 'Cash'} Account
                    </button>
                )}
            </div>

            {error && <div className="lux-error-banner">{error}</div>}

            {/* Tabs */}
            <div className="lux-tabs">
                <button
                    className={`lux-tab ${activeTab === 'customer' ? 'active' : ''}`}
                    onClick={() => setActiveTab('customer')}
                >
                    <Users size={16} /> Customers
                </button>
                <button
                    className={`lux-tab ${activeTab === 'vendor' ? 'active' : ''}`}
                    onClick={() => setActiveTab('vendor')}
                >
                    <Briefcase size={16} /> Vendors
                </button>
                <button
                    className={`lux-tab ${activeTab === 'cash' ? 'active' : ''}`}
                    onClick={() => setActiveTab('cash')}
                >
                    <Wallet size={16} /> Cash / Bank
                </button>
                <button
                    className={`lux-tab ${activeTab === 'expense' ? 'active' : ''}`}
                    onClick={() => setActiveTab('expense')}
                >
                    <TrendingDown size={16} /> Expenses
                </button>
            </div>

            {/* Main Content Area */}
            <div className="lux-panel">
                {loading ? (
                    <div className="lux-loading-state">
                        <div className="spinner"></div>
                        <p>Loading ledgers...</p>
                    </div>
                ) : currentData.length === 0 ? (
                    <div className="lux-empty-state">
                        <FileText size={48} className="empty-icon" />
                        <h3>No records found</h3>
                        <p>There are no active ledgers in this category yet.</p>
                    </div>
                ) : (
                    <div className="lux-table-wrapper">
                        <table className="lux-table">
                            <thead>
                                {activeTab === 'customer' ? (
                                    <tr>
                                        <th>Customer</th>
                                        <th>Location</th>
                                        <th className="text-right">Total Debit</th>
                                        <th className="text-right">Total Credit</th>
                                        <th className="text-right">Balance</th>
                                        <th className="text-right">Credit Limit</th>
                                        <th className="text-center">Actions</th>
                                    </tr>
                                ) : activeTab === 'vendor' ? (
                                    <tr>
                                        <th>Vendor</th>
                                        <th className="text-right">Total Debit</th>
                                        <th className="text-right">Total Credit</th>
                                        <th className="text-right">Balance</th>
                                        <th>Last Updated</th>
                                        <th className="text-center">Actions</th>
                                    </tr>
                                ) : (
                                    <tr>
                                        <th>Account</th>
                                        <th className="text-right">Total Debit</th>
                                        <th className="text-right">Total Credit</th>
                                        <th className="text-right">Balance</th>
                                        <th className="text-center">Actions</th>
                                    </tr>
                                )}
                            </thead>

                            <tbody>
                                {currentData.map((item) => (
                                    <tr key={item.id}>
                                        <td>
                                            <div className="cell-primary-text">
                                                {item.customer_name || item.vendor_name || item.name}
                                            </div>
                                        </td>

                                        {activeTab === 'customer' && (
                                            <td>
                                                <div className="cell-secondary-text">{item.customer_city}</div>
                                                <div className="cell-tertiary-text">{item.customer_address}</div>
                                            </td>
                                        )}

                                        <td className="text-right text-muted">
                                            ${parseFloat(item.total_debit || 0).toFixed(2)}
                                        </td>

                                        <td className="text-right text-muted">
                                            ${parseFloat(item.total_credit || 0).toFixed(2)}
                                        </td>

                                        <td className="text-right">
                                            <span className={`lux-badge ${item.balance >= 0 ? 'positive' : 'negative'}`}>
                                                ${parseFloat(item.balance || 0).toFixed(2)}
                                            </span>
                                        </td>

                                        {activeTab === 'customer' && (
                                            <td className="text-right text-muted">
                                                ${parseFloat(item.credit_limit || 0).toFixed(2)}
                                            </td>
                                        )}

                                        {activeTab === 'vendor' && (
                                            <td className="text-muted">
                                                {item.updated_at ? new Date(item.updated_at).toLocaleDateString() : 'N/A'}
                                            </td>
                                        )}

                                        <td>
                                            <div className="lux-action-group">
                                                <button
                                                    onClick={() => openTransactionModal(item)}
                                                    className="lux-btn-icon primary"
                                                    title="Add Entry"
                                                >
                                                    <CreditCard size={16} />
                                                    <span>Add Entry</span>
                                                </button>
                                                <button
                                                    onClick={() => handleDownloadPDF(item)}
                                                    className="lux-btn-icon ghost"
                                                    title="Download PDF"
                                                >
                                                    <Download size={16} />
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

            {/* ================= ADD ACCOUNT MODAL ================= */}
            {showAccountModal && (
                <div className="lux-modal-backdrop">
                    <div className="lux-modal">
                        <div className="lux-modal-header">
                            <h2>Create New {activeTab === 'expense' ? 'Expense' : 'Cash'} Account</h2>
                            <button className="close-btn" onClick={() => setShowAccountModal(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleAccountSubmit} className="lux-form">
                            <div className="lux-form-group">
                                <label>Account Name (e.g., Office Supplies, Rent)</label>
                                <input
                                    type="text"
                                    required
                                    value={newAccountName}
                                    onChange={(e) => setNewAccountName(e.target.value)}
                                    placeholder="Enter account name..."
                                    className="lux-input"
                                />
                            </div>
                            <div className="lux-modal-footer">
                                <button type="button" className="lux-btn ghost" onClick={() => setShowAccountModal(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="lux-btn primary">
                                    Create Account
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ================= TRANSACTION MODAL ================= */}
            {showModal && (
                <div className="lux-modal-backdrop">
                    <div className="lux-modal">
                        <div className="lux-modal-header">
                            <h2>
                                New Entry: <span className="highlight-text">{selectedLedger?.customer_name || selectedLedger?.vendor_name || selectedLedger?.name}</span>
                            </h2>
                            <button className="close-btn" onClick={() => setShowModal(false)}>
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleTransactionSubmit} className="lux-form">
                            
                            {/* NEW: EXPENSE DROPDOWN TO SELECT CASH ACCOUNT */}
                            {activeTab === 'expense' && (
                                <div className="lux-form-group">
                                    <label>Paid From (Cash/Bank Account)</label>
                                    <div className="lux-select-wrapper">
                                        <select
                                            required
                                            value={formData.cash_account}
                                            onChange={(e) => setFormData({ ...formData, cash_account: e.target.value })}
                                            className="lux-input"
                                        >
                                            <option value="" disabled>Select a payment account...</option>
                                            {cashAccounts.map(acc => (
                                                <option key={acc.id} value={acc.id}>
                                                    {acc.name} (${parseFloat(acc.balance || 0).toFixed(2)})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'cash' && (
                                <div className="lux-form-group">
                                    <label>Category</label>
                                    <div className="lux-select-wrapper">
                                        <select
                                            value={formData.category}
                                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                            className="lux-input"
                                        >
                                            <option value="deposit">Deposit</option>
                                            <option value="vendor_payment">Vendor Payment</option>
                                            <option value="personal_expense">Personal Expense</option>
                                        </select>
                                    </div>
                                </div>
                            )}

                            <div className="lux-form-row">
                                <div className="lux-form-group half">
                                    <label>Transaction Type</label>
                                    <div className="lux-select-wrapper">
                                        <select
                                            value={formData.transaction_type}
                                            onChange={(e) => setFormData({ ...formData, transaction_type: e.target.value })}
                                            className="lux-input"
                                        >
                                            <option value="debit">
                                                {activeTab === 'cash' ? 'Money In' : 'Debit'}
                                            </option>
                                            <option value="credit">
                                                {activeTab === 'cash' ? 'Money Out' : 'Credit'}
                                            </option>
                                        </select>
                                    </div>
                                </div>

                                <div className="lux-form-group half">
                                    <label>Amount</label>
                                    <div className="input-with-icon">
                                        <span className="currency-symbol">$</span>
                                        <input
                                            type="number"
                                            step="0.01"
                                            required
                                            value={formData.amount}
                                            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                            className="lux-input pl-override"
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="lux-form-group">
                                <label>Reference Number</label>
                                <input
                                    type="text"
                                    value={formData.reference_number}
                                    onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
                                    className="lux-input"
                                    placeholder="INV-001 or CHQ-992..."
                                />
                            </div>

                            <div className="lux-form-group">
                                <label>Notes</label>
                                <textarea
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    className="lux-input textarea"
                                    placeholder="Add any relevant details here..."
                                    rows="3"
                                />
                            </div>

                            <div className="lux-modal-footer">
                                <button type="button" className="lux-btn ghost" onClick={() => setShowModal(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="lux-btn primary">
                                    Submit Transaction
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Ledgers;