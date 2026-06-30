import axios from 'axios';

// Dynamically handle production URL vs local environment without the extra '/api' string
const API_BASE_URL = process.env.REACT_APP_API_URL 
    ? process.env.REACT_APP_API_URL 
    : 'http://127.0.0.1:8000';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});
// Add token to requests
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Handle response errors and token refresh
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
    failedQueue.forEach((prom) => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token);
        }
    });
    failedQueue = [];
};

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // FIXED: Removed the space between the question mark and the dot
        if (error.response?.status === 401 && !originalRequest._retry) {
            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                })
                    .then((token) => {
                        originalRequest.headers.Authorization = `Bearer ${token}`;
                        return api(originalRequest);
                    })
                    .catch((err) => {
                        return Promise.reject(err);
                    });
            }

            originalRequest._retry = true;
            isRefreshing = true;

            const refreshToken = localStorage.getItem('refresh_token');

            if (refreshToken) {
                try {
                    const response = await axios.post(
                        `${API_BASE_URL}/token/refresh/`,
                        { refresh: refreshToken }
                    );
                    const { access } = response.data;

                    localStorage.setItem('access_token', access);
                    api.defaults.headers.common['Authorization'] = `Bearer ${access}`;
                    processQueue(null, access);
                    originalRequest.headers.Authorization = `Bearer ${access}`;
                    isRefreshing = false;

                    return api(originalRequest);
                } catch (refreshError) {
                    processQueue(refreshError, null);
                    isRefreshing = false;
                    localStorage.removeItem('access_token');
                    localStorage.removeItem('refresh_token');
                    localStorage.removeItem('username');

                    if (window.location.pathname !== '/login') {
                        window.location.href = '/login';
                    }
                    return Promise.reject(refreshError);
                }
            } else {
                isRefreshing = false;
                localStorage.removeItem('access_token');
                localStorage.removeItem('refresh_token');
                localStorage.removeItem('username');

                if (window.location.pathname !== '/login') {
                    window.location.href = '/login';
                }
                return Promise.reject(error);
            }
        }

        return Promise.reject(error);
    }
);

// Auth endpoints
export const authAPI = {
    login: (username, password) => {
        return api.post('/accounts/auth/login/', { username, password })
            .then(response => response)
            .catch(error => { throw error; });
    },
    register: (username, email, password) =>
        api.post('/accounts/register/', { username, email, password }),
    refreshToken: (refresh) => api.post('/token/refresh/', { refresh }),
    getProfile: () => api.get('/accounts/auth/profile/'),
    changePassword: (data) => api.post('/accounts/auth/change_password/', data),
    updateProfile: (data) => api.put('/accounts/auth/profile/', data),
};

// SuperAdmin endpoints
export const superAdminAPI = {
    listUsers: () => api.get('/accounts/users/'),
    createUser: (data) => api.post('/accounts/users/', data),
    updateUser: (id, data) => api.put(`/accounts/users/${id}/`, data),
    deleteUser: (id) => api.delete(`/accounts/users/${id}/`),
};

// Admin endpoints (helper routes used when creating linked user accounts)
export const adminAPI = {
    // Optional helper list (kept for completeness)
    listCustomers: () => api.get('/accounts/admin/customers/'),

    // Create a login + linked customer (Admin-only; hits UserManagementViewSet.create_customer)
    createCustomerWithLogin: (data) => api.post('/accounts/users/create_customer/', data),

    // Create a login + linked salesman (Admin-only; hits UserManagementViewSet.create_salesman)
    createSalesman: (data) => api.post('/accounts/users/create_salesman/', data),
    // If needed we could also expose update/delete via /accounts/users/
};

// Customer endpoints
// Customer endpoints
export const customerAPI = {
    getMyBalance: () => api.get('/accounting/customer/balance/'),
    // This allows the customer to submit an order from their dashboard
    createOrder: (data) => api.post('/orders/orders/', data),
    // This will allow them to see their history later
    getMyOrders: () => api.get('/orders/orders/'), 
};

// CRM endpoints
export const crmAPI = {
    getCustomers: () => api.get('/crm/customers/'),
    getCustomer: (id) => api.get(`/crm/customers/${id}/`),
    createCustomer: (data) => api.post('/crm/customers/', data),
    updateCustomer: (id, data) => api.put(`/crm/customers/${id}/`, data),
    deleteCustomer: (id) => api.delete(`/crm/customers/${id}/`),
    searchCustomers: (query) =>
        api.get('/crm/customers/search/', { params: { q: query } }),

    getSalesmen: () => api.get('/crm/salesmen/'),
    getSalesman: (id) => api.get(`/crm/salesmen/${id}/`),
    createSalesman: (data) => api.post('/crm/salesmen/', data),
    updateSalesman: (id, data) => api.put(`/crm/salesmen/${id}/`, data),
    deleteSalesman: (id) => api.delete(`/crm/salesmen/${id}/`),
};

// Inventory endpoints
export const inventoryAPI = {
    getCategories: () => api.get('/inventory/categories/'),
    createCategory: (data) => api.post('/inventory/categories/', data),
    updateCategory: (id, data) => api.put(`/inventory/categories/${id}/`, data),
    deleteCategory: (id) => api.delete(`/inventory/categories/${id}/`),

    getVendors: () => api.get('/inventory/vendors/'),
    getVendor: (id) => api.get(`/inventory/vendors/${id}/`),
    createVendor: (data) => api.post('/inventory/vendors/', data),
    updateVendor: (id, data) => api.put(`/inventory/vendors/${id}/`, data),
    deleteVendor: (id) => api.delete(`/inventory/vendors/${id}/`),

    getProducts: (filters = {}) => api.get('/inventory/products/', { params: filters }),
    getProduct: (id) => api.get(`/inventory/products/${id}/`),
    createProduct: (data) => api.post('/inventory/products/', data),
    updateProduct: (id, data) => api.put(`/inventory/products/${id}/`, data),
    deleteProduct: (id) => api.delete(`/inventory/products/${id}/`),

    getInventory: () => api.get('/inventory/inventory/'),
    getInventoryItem: (id) => api.get(`/inventory/inventory/${id}/`),
    adjustStock: (id, data) => api.post(`/inventory/inventory/${id}/adjust_stock/`, data),

    getTransactions: () => api.get('/inventory/transactions/'),

    getPurchases: (filters = {}) => api.get('/inventory/purchases/', { params: filters }),
    getPurchase: (id) => api.get(`/inventory/purchases/${id}/`),
    createPurchase: (data) => api.post('/inventory/purchases/', data),
    updatePurchase: (id, data) => api.put(`/inventory/purchases/${id}/`, data),
};

// Orders endpoints
export const ordersAPI = {
    getOrders: (filters = {}) => api.get('/orders/orders/', { params: filters }),
    getOrder: (id) => api.get(`/orders/orders/${id}/`),
    createOrder: (data) => api.post('/orders/orders/', data),
    updateOrder: (id, data) => api.put(`/orders/orders/${id}/`, data),
    cancelOrder: (id) => api.post(`/orders/orders/${id}/cancel/`),
    markDelivered: (id) => api.post(`/orders/orders/${id}/mark_delivered/`),
    generateInvoice: (id, data) => api.post(`/orders/orders/${id}/generate_invoice/`, data),

    getInvoices: () => api.get('/orders/invoices/'),
    getInvoice: (id) => api.get(`/orders/invoices/${id}/`),
    getDailyTally: () => api.get('/orders/invoices/daily_tally/'), 
    recordPayment: (id, payload) => api.post(`/orders/invoices/${id}/record_payment/`, payload),
    downloadPDF: (id) => api.get(`/orders/orders/${id}/download_pdf/`, { responseType: 'blob' }),
};

// Accounting endpoints
export const accountingAPI = {
    getCustomerLedgers: () => api.get('/accounting/customer-ledgers/'),
    getCustomerLedger: (id) => api.get(`/accounting/customer-ledgers/${id}/`),
    getCustomerLedgerBalance: (id) => api.get(`/accounting/customer-ledgers/${id}/balance_details/`),

    getCustomerTransactions: () => api.get('/accounting/customer-transactions/'),
    createPayment: (data) => api.post('/accounting/customer-transactions/create_payment/', data),
    getExpenseAccounts: () => 
        api.get('/accounting/expense-accounts/'),
        
    addExpenseTransaction: (data) => 
        api.post('/accounting/expense-transactions/add_transaction/', data),
        
    downloadExpenseStatement: (accountId) => 
        api.get(`/accounting/expense-accounts/${accountId}/download-statement/`, { 
            responseType: 'blob' 
        }),

    createExpenseAccount: (data) => api.post('/accounting/expense-accounts/', data),
    createCashAccount: (data) => api.post('/accounting/cash-accounts/', data),

    getVendorLedgers: () => api.get('/accounting/vendor-ledgers/'),
    getVendorLedger: (id) => api.get(`/accounting/vendor-ledgers/${id}/`),
    getVendorLedgerPayables: (id) => api.get(`/accounting/vendor-ledgers/${id}/payable_details/`),
    addCustomerTransaction: (data) => 
        api.post('/accounting/customer-transactions/add_transaction/', data),
        
    downloadCustomerStatement: (ledgerId) => 
        api.get(`/accounting/customer-ledgers/${ledgerId}/download-statement/`, { 
            responseType: 'blob' 
        }),
    addVendorTransaction: (data) => 
        api.post('/accounting/vendor-transactions/add_transaction/', data),
        
    downloadVendorStatement: (ledgerId) => 
        api.get(`/accounting/vendor-ledgers/${ledgerId}/download-statement/`, { 
            responseType: 'blob' // CRITICAL: Tells React to expect a binary file, not JSON!
        }),
    getCashAccounts: () => 
        api.get('/accounting/cash-accounts/'),
        
    addCashTransaction: (data) => 
        api.post('/accounting/cash-transactions/add_transaction/', data),
        
    downloadCashStatement: (accountId) => 
        api.get(`/accounting/cash-accounts/${accountId}/download-statement/`, { 
            responseType: 'blob' 
        }),    
    getVendorTransactions: () => api.get('/accounting/vendor-transactions/'),
    createVendorPayment: (data) => api.post('/accounting/vendor-transactions/create_payment/', data),
};

// Dashboard endpoints
export const dashboardAPI = {
    getSummary: () => api.get('/dashboard/summary/'),
    getRecentOrders: () => api.get('/dashboard/recent_orders/'),
    getRecentInvoices: () => api.get('/dashboard/recent_invoices/'),
};

export const reportsAPI = {
    getReports: () => api.get('/reports/profit-loss/'),
    getPreview: () => api.get('/reports/profit-loss/preview/'),
    finalizeReport: (notes) => api.post('/reports/profit-loss/finalize/', { notes }),
    downloadPDF: (id) => api.get(`/reports/profit-loss/${id}/download_pdf/`, { responseType: 'blob' }),
};

export const forecastingAPI = {
    getSummary:         () => api.get('/forecasting/summary/'),
    getProductForecast: (id) => api.get(`/forecasting/product/${id}/`),
    getProductHistory:  (id) => api.get(`/forecasting/history/${id}/`),
    runForecast:        () => api.post('/forecasting/run/'),
    seedData:           () => api.post('/forecasting/seed/'),
    getReorder:         () => api.get('/forecasting/reorder/'),
};

export default api;