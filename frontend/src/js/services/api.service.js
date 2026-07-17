// ============================================
// API SERVICE - With JWT Authentication
// ============================================

const ApiService = {
    BASE: '/api',

    // ✅ Get token from storage
    getToken() {
        return localStorage.getItem('token');
    },

    // ✅ Get user from storage
    getUser() {
        const userJson = localStorage.getItem('user');
        try {
            return userJson ? JSON.parse(userJson) : null;
        } catch (e) {
            return null;
        }
    },

    // ✅ Check if logged in
    isLoggedIn() {
        return this.getToken() !== null;
    },

    // ✅ Check if admin
    isAdmin() {
        const user = this.getUser();
        return user && user.role === 'admin';
    },

    // ✅ Universal request method with automatic token
    async request(endpoint, options = {}) {
        const token = this.getToken();
        const url = endpoint.startsWith('http') ? endpoint : this.BASE + endpoint;
        
        // Build headers
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };
        
        // ✅ Add token if available
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        
        try {
            const response = await fetch(url, {
                ...options,
                headers: headers
            });
            
            // ✅ Handle token expiry (401 Unauthorized)
            if (response.status === 401) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                // Redirect to login if not already there
                if (!window.location.pathname.includes('login') && 
                    !window.location.pathname.includes('login.html')) {
                    window.location.href = '/login.html';
                }
                throw new Error('Session expired. Please login again.');
            }
            
            return response;
        } catch (error) {
            console.error('API request error:', error);
            throw error;
        }
    },

    // ✅ FIXED: GET request - safely parses JSON and handles errors
    async get(endpoint, options = {}) {
        try {
            const response = await this.request(endpoint, {
                ...options,
                method: 'GET'
            });
            
            if (!response.ok) {
                console.error('GET failed for', endpoint, 'status:', response.status);
                return null;
            }
            
            // ✅ Safely parse JSON
            const text = await response.text();
            try {
                return JSON.parse(text);
            } catch (e) {
                console.error('JSON parse error for', endpoint, ':', text.substring(0, 100));
                return null;
            }
        } catch (error) {
            console.error('GET error for', endpoint, ':', error.message);
            return null;
        }
    },

    // ✅ FIXED: POST request - safely parses JSON and handles errors
    async post(endpoint, data, options = {}) {
        try {
            const response = await this.request(endpoint, {
                ...options,
                method: 'POST',
                body: JSON.stringify(data)
            });
            
            const text = await response.text();
            try {
                return JSON.parse(text);
            } catch (e) {
                return { success: false, message: text };
            }
        } catch (error) {
            console.error('POST error for', endpoint, ':', error.message);
            return { success: false, message: error.message };
        }
    },

    // ✅ FIXED: PUT request - safely parses JSON and handles errors
    async put(endpoint, data, options = {}) {
        try {
            const response = await this.request(endpoint, {
                ...options,
                method: 'PUT',
                body: JSON.stringify(data)
            });
            
            const text = await response.text();
            try {
                return JSON.parse(text);
            } catch (e) {
                return { success: false, message: text };
            }
        } catch (error) {
            console.error('PUT error for', endpoint, ':', error.message);
            return { success: false, message: error.message };
        }
    },

    // ✅ FIXED: DELETE request - safely parses JSON and handles errors
    async delete(endpoint, options = {}) {
        try {
            const response = await this.request(endpoint, {
                ...options,
                method: 'DELETE'
            });
            
            if (response.ok) {
                const text = await response.text();
                try {
                    return JSON.parse(text);
                } catch (e) {
                    return { success: true };
                }
            }
            return { success: false };
        } catch (error) {
            console.error('DELETE error for', endpoint, ':', error.message);
            return { success: false, message: error.message };
        }
    },

    // ✅ FIXED: PATCH request - safely parses JSON and handles errors
    async patch(endpoint, data, options = {}) {
        try {
            const response = await this.request(endpoint, {
                ...options,
                method: 'PATCH',
                body: JSON.stringify(data)
            });
            
            const text = await response.text();
            try {
                return JSON.parse(text);
            } catch (e) {
                return { success: false };
            }
        } catch (error) {
            console.error('PATCH error for', endpoint, ':', error.message);
            return { success: false, message: error.message };
        }
    },

    // ============================================
    // PRODUCT METHODS
    // ============================================

    async getProducts() {
        return (await this.get('/products')) || [];
    },

    async getProductsPaginated(page = 1, limit = 25, search = '', category = '', stockFilter = '') {
        let url = `/products/paginated?page=${page}&limit=${limit}`;
        if (search) url += `&search=${encodeURIComponent(search)}`;
        if (category) url += `&category=${encodeURIComponent(category)}`;
        if (stockFilter) url += `&stock=${encodeURIComponent(stockFilter)}`;
        return (await this.get(url)) || { products: [], pagination: {} };
    },

    async getCategories() {
        return (await this.get('/products/categories')) || [];
    },

    async createProduct(data) {
        return this.post('/products', data);
    },

    async updateProduct(id, data) {
        return this.put(`/products/${id}`, data);
    },

    async deleteProduct(id) {
        return this.delete(`/products/${id}`);
    },

    async updateStock(id, quantity) {
        return this.put(`/products/${id}/stock`, { quantity });
    },

    async searchProducts(query) {
        return (await this.get(`/products/search?q=${encodeURIComponent(query)}`)) || [];
    },

    async getProductsWithPrices() {
        return (await this.get('/products/with-prices')) || [];
    },

    // ============================================
    // AUTH METHODS
    // ============================================

    async login(username, password) {
        try {
            const response = await this.request('/auth/login', {
                method: 'POST',
                body: JSON.stringify({ username, password })
            });
            
            const data = await response.json();
            
            if (data.success) {
                // ✅ Store token and user on successful login
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
            }
            
            return data;
        } catch (error) {
            console.error('Login error:', error);
            return { success: false, message: 'Network error. Please try again.' };
        }
    },

    async logout() {
        const token = this.getToken();
        if (token) {
            try {
                await this.post('/auth/logout');
            } catch (e) {
                // Ignore errors on logout
            }
        }
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login.html';
    },

    async verifyToken() {
        try {
            const result = await this.get('/auth/verify');
            return result && result.success === true;
        } catch (error) {
            return false;
        }
    },

    // ============================================
    // SALE METHODS
    // ============================================

    async getSales() {
        return (await this.get('/sales')) || [];
    },

    async createSale(saleData) {
        return this.post('/sales', saleData);
    },

    async getCashierSummary() {
        return (await this.get('/sales/cashiers-summary')) || [];
    },

    async getCashierSales(cashierId) {
        return (await this.get(`/sales/cashier/${cashierId}`)) || { all: [], today: [], totalAll: 0, totalToday: 0 };
    },

    async searchSale(receiptNo) {
        return (await this.get(`/sales/search/${receiptNo}`)) || null;
    },

    // ============================================
    // USER METHODS
    // ============================================

    async getUsers() {
        return (await this.get('/users')) || [];
    },

    async getUser(id) {
        return (await this.get(`/users/${id}`)) || null;
    },

    async createUser(userData) {
        return this.post('/users', userData);
    },

    async updateUser(id, userData) {
        return this.put(`/users/${id}`, userData);
    },

    async resetUserPassword(id, newPassword) {
        return this.post(`/users/${id}/reset-password`, { newPassword });
    },

    async updateProfile(profileData) {
        return this.put('/users/profile', profileData);
    },

    async changePassword(currentPassword, newPassword) {
        return this.put('/users/profile/password', { currentPassword, newPassword });
    },

    // ============================================
    // SUPPLIER METHODS
    // ============================================

    async getSuppliers() {
        return (await this.get('/suppliers')) || [];
    },

    async createSupplier(data) {
        return this.post('/suppliers', data);
    },

    // ============================================
    // PURCHASE ORDER METHODS
    // ============================================

    async getPurchaseOrders() {
        return (await this.get('/purchase-orders')) || [];
    },

    async createPurchaseOrder(data) {
        return this.post('/purchase-orders', data);
    },

    async receivePurchaseOrder(id) {
        return this.put(`/purchase-orders/${id}/receive`);
    },

    async updatePurchaseOrder(id, data) {
        return this.put(`/purchase-orders/${id}/update`, data);
    },

    // ============================================
    // CREDIT METHODS
    // ============================================

    async getCreditCustomers() {
        return (await this.get('/credit-customers')) || [];
    },

    async getCreditCustomer(id) {
        return (await this.get(`/credit-customers/${id}`)) || {};
    },

    async createCreditCustomer(data) {
        return this.post('/credit-customers', data);
    },

    async updateCreditCustomer(id, data) {
        return this.put(`/credit-customers/${id}`, data);
    },

    async searchCreditCustomer(query) {
        return (await this.get(`/credit-customers/search/${encodeURIComponent(query)}`)) || [];
    },

    async getCreditSales() {
        return (await this.get('/credit-sales')) || [];
    },

    async createCreditSale(data) {
        return this.post('/credit-sales', data);
    },

    async getCreditSummary() {
        return (await this.get('/credit-summary')) || { totalDebt: 0, activeCustomers: 0, todayCreditSales: 0, todayPayments: 0 };
    },

    async createDebtPayment(data) {
        return this.post('/debt-payments', data);
    },

    async deleteDebtPayment(id) {
        return this.delete(`/debt-payments/${id}`);
    },

    // ============================================
    // RETURN METHODS
    // ============================================

    async getReturns() {
        return (await this.get('/returns')) || [];
    },

    async createReturn(data) {
        return this.post('/returns', data);
    },

    async getReturnSummary() {
        return (await this.get('/returns/summary')) || { totalReturns: 0, totalExchanges: 0, totalRefunded: 0, todayReturns: 0 };
    },

    // ============================================
    // SETTINGS METHODS
    // ============================================

    async getSettings() {
        return (await this.get('/settings')) || { adminPassword: 'admin123' };
    },

    async updateSettings(data) {
        return this.put('/settings', data);
    },

    // ============================================
    // ACTIVITY METHODS
    // ============================================

    async getActivityLog() {
        return (await this.get('/activity')) || [];
    },

    async clearActivityLog() {
        return this.delete('/activity');
    },

    // ============================================
    // M-PESA METHODS
    // ============================================

    async getMpesaConfig() {
        return (await this.get('/mpesa/config')) || { tillNumber: '', shortCode: '', environment: 'sandbox', configured: false };
    },

    async updateMpesaConfig(data) {
        return this.put('/mpesa/config', data);
    },

    async getMpesaTransactions() {
        return (await this.get('/mpesa/transactions')) || [];
    },

    async createMpesaPayment(data) {
        return this.post('/mpesa/till-payment', data);
    },

    // ============================================
    // DAILY REPORT METHODS
    // ============================================

    async getDailyReports() {
        return (await this.get('/daily-reports')) || [];
    },

    async getTodayReport() {
        return (await this.get('/daily-reports/today')) || {};
    },

    async generateDailyReport() {
        return this.post('/daily-reports/generate');
    }
};

// Make globally available
window.ApiService = ApiService;
