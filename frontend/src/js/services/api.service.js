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

    // ✅ GET request
    async get(endpoint, options = {}) {
        const response = await this.request(endpoint, {
            ...options,
            method: 'GET'
        });
        return response.ok ? response.json() : null;
    },

    // ✅ POST request
    async post(endpoint, data, options = {}) {
        const response = await this.request(endpoint, {
            ...options,
            method: 'POST',
            body: JSON.stringify(data)
        });
        return response.json();
    },

    // ✅ PUT request
    async put(endpoint, data, options = {}) {
        const response = await this.request(endpoint, {
            ...options,
            method: 'PUT',
            body: JSON.stringify(data)
        });
        return response.json();
    },

    // ✅ DELETE request
    async delete(endpoint, options = {}) {
        const response = await this.request(endpoint, {
            ...options,
            method: 'DELETE'
        });
        return response.ok ? { success: true } : { success: false };
    },

    // ✅ PATCH request
    async patch(endpoint, data, options = {}) {
        const response = await this.request(endpoint, {
            ...options,
            method: 'PATCH',
            body: JSON.stringify(data)
        });
        return response.json();
    },

    // ============================================
    // PRODUCT METHODS
    // ============================================

    async getProducts() {
        return this.get('/products') || [];
    },

    async getProductsPaginated(page = 1, limit = 25, search = '', category = '', stockFilter = '') {
        let url = `/products/paginated?page=${page}&limit=${limit}`;
        if (search) url += `&search=${encodeURIComponent(search)}`;
        if (category) url += `&category=${encodeURIComponent(category)}`;
        if (stockFilter) url += `&stock=${encodeURIComponent(stockFilter)}`;
        return this.get(url) || { products: [], pagination: {} };
    },

    async getCategories() {
        return this.get('/products/categories') || [];
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
        return this.get(`/products/search?q=${encodeURIComponent(query)}`) || [];
    },

    async getProductsWithPrices() {
        return this.get('/products/with-prices') || [];
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
        const result = await this.get('/sales');
        return result || [];
    },

    async createSale(saleData) {
        return this.post('/sales', saleData);
    },

    async getCashierSummary() {
        const result = await this.get('/sales/cashiers-summary');
        return result || [];
    },

    async getCashierSales(cashierId) {
        const result = await this.get(`/sales/cashier/${cashierId}`);
        return result || { all: [], today: [], totalAll: 0, totalToday: 0 };
    },

    async searchSale(receiptNo) {
        const result = await this.get(`/sales/search/${receiptNo}`);
        return result || null;
    },

    // ============================================
    // USER METHODS
    // ============================================

    async getUsers() {
        const result = await this.get('/users');
        return result || [];
    },

    async getUser(id) {
        const result = await this.get(`/users/${id}`);
        return result || null;
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
        const result = await this.get('/suppliers');
        return result || [];
    },

    async createSupplier(data) {
        return this.post('/suppliers', data);
    },

    // ============================================
    // PURCHASE ORDER METHODS
    // ============================================

    async getPurchaseOrders() {
        const result = await this.get('/purchase-orders');
        return result || [];
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
        const result = await this.get('/credit-customers');
        return result || [];
    },

    async getCreditCustomer(id) {
        const result = await this.get(`/credit-customers/${id}`);
        return result || {};
    },

    async createCreditCustomer(data) {
        return this.post('/credit-customers', data);
    },

    async updateCreditCustomer(id, data) {
        return this.put(`/credit-customers/${id}`, data);
    },

    async searchCreditCustomer(query) {
        const result = await this.get(`/credit-customers/search/${encodeURIComponent(query)}`);
        return result || [];
    },

    async getCreditSales() {
        const result = await this.get('/credit-sales');
        return result || [];
    },

    async createCreditSale(data) {
        return this.post('/credit-sales', data);
    },

    async getCreditSummary() {
        const result = await this.get('/credit-summary');
        return result || { totalDebt: 0, activeCustomers: 0, todayCreditSales: 0, todayPayments: 0 };
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
        const result = await this.get('/returns');
        return result || [];
    },

    async createReturn(data) {
        return this.post('/returns', data);
    },

    async getReturnSummary() {
        const result = await this.get('/returns/summary');
        return result || { totalReturns: 0, totalExchanges: 0, totalRefunded: 0, todayReturns: 0 };
    },

    // ============================================
    // SETTINGS METHODS
    // ============================================

    async getSettings() {
        const result = await this.get('/settings');
        return result || { adminPassword: 'admin123' };
    },

    async updateSettings(data) {
        return this.put('/settings', data);
    },

    // ============================================
    // ACTIVITY METHODS
    // ============================================

    async getActivityLog() {
        const result = await this.get('/activity');
        return result || [];
    },

    async clearActivityLog() {
        return this.delete('/activity');
    },

    // ============================================
    // M-PESA METHODS
    // ============================================

    async getMpesaConfig() {
        const result = await this.get('/mpesa/config');
        return result || { tillNumber: '', shortCode: '', environment: 'sandbox', configured: false };
    },

    async updateMpesaConfig(data) {
        return this.put('/mpesa/config', data);
    },

    async getMpesaTransactions() {
        const result = await this.get('/mpesa/transactions');
        return result || [];
    },

    async createMpesaPayment(data) {
        return this.post('/mpesa/till-payment', data);
    },

    // ============================================
    // DAILY REPORT METHODS
    // ============================================

    async getDailyReports() {
        const result = await this.get('/daily-reports');
        return result || [];
    },

    async getTodayReport() {
        const result = await this.get('/daily-reports/today');
        return result || {};
    },

    async generateDailyReport() {
        return this.post('/daily-reports/generate');
    }
};

// Make globally available
window.ApiService = ApiService;
