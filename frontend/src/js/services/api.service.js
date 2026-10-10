// ============================================
// API SERVICE - With JWT Authentication
// Updated: request timeout, in-flight dedup, robust error handling, SPA-safe 401
// Fixed: prevent infinite reload loop when unauthenticated
// ============================================

const ApiService = {
    BASE: '/api',

    // ✅ Default request timeout (ms). Aborts hung requests so UI never freezes.
    TIMEOUT_MS: 30000,

    // ✅ In-flight GET deduplication map
    //    { 'endpoint' : Promise<parsedData> }
    _inFlight: new Map(),

    // ✅ Optional short-lived cache for GET responses
    //    { 'endpoint' : { data, expiresAt } }
    _cache: new Map(),

    // ============================================
    // STORAGE HELPERS
    // ============================================
    getToken() {
        return localStorage.getItem('token');
    },

    getUser() {
        const userJson = localStorage.getItem('user');
        try {
            return userJson ? JSON.parse(userJson) : null;
        } catch (e) {
            return null;
        }
    },

    isLoggedIn() {
        return this.getToken() !== null;
    },

    isAdmin() {
        const user = this.getUser();
        return user && user.role === 'admin';
    },

    // ============================================
    // CORE REQUEST
    // ============================================
    /**
     * Universal request method.
     * Returns the raw Response object so callers can read it however they want.
     *
     * @param {string} endpoint - '/products' or full URL
     * @param {object} options  - fetch options + { timeout } override
     */
    async request(endpoint, options = {}) {
        const token = this.getToken();
        const url = endpoint.startsWith('http') ? endpoint : this.BASE + endpoint;

        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        // ✅ Timeout via AbortController
        const timeoutMs = options.timeout || this.TIMEOUT_MS;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        // Merge the abort signal with any caller-provided one
        const mergedSignal = options.signal || controller.signal;

        try {
            const response = await fetch(url, {
                ...options,
                headers,
                signal: mergedSignal
            });

            // ✅ Handle token expiry (401 Unauthorized)
            if (response.status === 401) {
                this._handleUnauthorized();
                throw new Error('Session expired. Please login again.');
            }

            return response;
        } catch (error) {
            if (error.name === 'AbortError') {
                const timeoutErr = new Error('Request timed out after ' + timeoutMs + 'ms');
                timeoutErr.code = 'TIMEOUT';
                console.error('API timeout:', endpoint);
                throw timeoutErr;
            }
            console.error('API request error:', error);
            throw error;
        } finally {
            clearTimeout(timeoutId);
        }
    },

    // ✅ SPA-safe unauthorized handler
    //    Only clears session + redirects if we actually had a session.
    //    Prevents infinite reload loops for unauthenticated visitors
    //    (e.g. public dashboard loading /api/products with no token).
    _handleUnauthorized() {
        var hadToken = !!localStorage.getItem('token') || !!localStorage.getItem('user');
        localStorage.removeItem('token');
        localStorage.removeItem('user');

        // Only redirect/reload if we actually lost a real session.
        if (hadToken) {
            if (!window.location.pathname.endsWith('/') && !window.location.pathname.endsWith('index.html')) {
                window.location.href = '/';
            } else {
                window.location.reload();
            }
        }
    },

    // ============================================
    // SAFE JSON PARSE HELPER
    // ============================================
    async _parseBody(response) {
        const text = await response.text();
        if (!text) return null;
        try {
            return JSON.parse(text);
        } catch (e) {
            return null;
        }
    },

    // ============================================
    // GET (with in-flight dedup + optional cache)
    // ============================================
    /**
     * @param {string} endpoint
     * @param {object} [options]
     *   - cache: number  → cache this GET for N ms (default: no cache)
     *   - timeout: number
     *   - fresh: boolean → skip cache/in-flight and force a new request
     */
    async get(endpoint, options = {}) {
        const cacheTtl = typeof options.cache === 'number' ? options.cache : 0;
        const fresh = options.fresh === true;
        const cacheKey = endpoint;

        // ✅ Serve from cache if fresh enough
        if (!fresh && cacheTtl > 0) {
            const hit = this._cache.get(cacheKey);
            if (hit && Date.now() < hit.expiresAt) {
                return hit.data;
            }
        }

        // ✅ Deduplicate in-flight requests
        if (!fresh && this._inFlight.has(cacheKey)) {
            return this._inFlight.get(cacheKey);
        }

        const promise = (async () => {
            try {
                const response = await this.request(endpoint, {
                    ...options,
                    method: 'GET'
                });

                if (!response.ok) {
                    console.error('GET failed for', endpoint, 'status:', response.status);
                    return null;
                }

                const data = await this._parseBody(response);
                if (data === null) {
                    console.error('GET returned non-JSON body for', endpoint);
                }
                // ✅ Store in cache (if opted in)
                if (cacheTtl > 0 && data !== null) {
                    this._cache.set(cacheKey, { data, expiresAt: Date.now() + cacheTtl });
                }
                return data;
            } catch (error) {
                console.error('GET error for', endpoint, ':', error.message);
                return null;
            } finally {
                this._inFlight.delete(cacheKey);
            }
        })();

        this._inFlight.set(cacheKey, promise);
        return promise;
    },

    // ============================================
    // POST / PUT / PATCH (with robust error parsing)
    // ============================================
    async post(endpoint, data, options = {}) {
        // Invalidate any cached GET on the same resource (best-effort)
        this._invalidateCacheFor(endpoint);
        try {
            const response = await this.request(endpoint, {
                ...options,
                method: 'POST',
                body: JSON.stringify(data)
            });

            const parsed = await this._parseBody(response);

            if (parsed === null) {
                // Non-JSON body (HTML error page, empty response, etc.)
                if (!response.ok) {
                    return { success: false, message: `HTTP ${response.status} ${response.statusText}` };
                }
                return { success: true };
            }

            // If server responded with an error status but valid JSON, still return the JSON
            // so the caller can read `.message`. This matches the old behavior.
            return parsed;
        } catch (error) {
            console.error('POST error for', endpoint, ':', error.message);
            return { success: false, message: error.message };
        }
    },

    async put(endpoint, data, options = {}) {
        this._invalidateCacheFor(endpoint);
        try {
            const response = await this.request(endpoint, {
                ...options,
                method: 'PUT',
                body: JSON.stringify(data)
            });

            const parsed = await this._parseBody(response);

            if (parsed === null) {
                if (!response.ok) {
                    return { success: false, message: `HTTP ${response.status} ${response.statusText}` };
                }
                return { success: true };
            }
            return parsed;
        } catch (error) {
            console.error('PUT error for', endpoint, ':', error.message);
            return { success: false, message: error.message };
        }
    },

    async patch(endpoint, data, options = {}) {
        this._invalidateCacheFor(endpoint);
        try {
            const response = await this.request(endpoint, {
                ...options,
                method: 'PATCH',
                body: JSON.stringify(data)
            });

            const parsed = await this._parseBody(response);

            if (parsed === null) {
                if (!response.ok) {
                    return { success: false, message: `HTTP ${response.status} ${response.statusText}` };
                }
                return { success: true };
            }
            return parsed;
        } catch (error) {
            console.error('PATCH error for', endpoint, ':', error.message);
            return { success: false, message: error.message };
        }
    },

    async delete(endpoint, options = {}) {
        this._invalidateCacheFor(endpoint);
        try {
            const response = await this.request(endpoint, {
                ...options,
                method: 'DELETE'
            });

            if (!response.ok) {
                const parsed = await this._parseBody(response);
                return parsed && typeof parsed === 'object'
                    ? parsed
                    : { success: false, message: `HTTP ${response.status} ${response.statusText}` };
            }

            const parsed = await this._parseBody(response);
            return parsed !== null ? parsed : { success: true };
        } catch (error) {
            console.error('DELETE error for', endpoint, ':', error.message);
            return { success: false, message: error.message };
        }
    },

    // ============================================
    // CACHE INVALIDATION HELPERS
    // ============================================
    /**
     * Best-effort: remove cached GETs whose key starts with the base of this endpoint.
     * e.g. POST /products/5 → invalidate cache entries starting with '/products'
     */
    _invalidateCacheFor(endpoint) {
        if (!this._cache.size) return;
        // Derive a broad key prefix
        // '/products/5' → '/products' ; '/sales' → '/sales'
        const parts = endpoint.split('?')[0].split('/').filter(Boolean);
        if (!parts.length) return;
        const prefix = '/' + parts[0] + (parts[1] && !/^\d+$/.test(parts[1]) ? '/' + parts[1] : '');
        for (const key of Array.from(this._cache.keys())) {
            if (key.startsWith(prefix)) {
                this._cache.delete(key);
            }
        }
    },

    /** Manually clear all caches (call after a big mutation if needed) */
    clearCache() {
        this._cache.clear();
    },

    // ============================================
    // PRODUCT METHODS
    // ============================================
    async getProducts(options = {}) {
        return (await this.get('/products', options)) || [];
    },

    async getProductsPaginated(page = 1, limit = 25, search = '', category = '', stockFilter = '') {
        let url = `/products/paginated?page=${page}&limit=${limit}`;
        if (search) url += `&search=${encodeURIComponent(search)}`;
        if (category) url += `&category=${encodeURIComponent(category)}`;
        if (stockFilter) url += `&stock=${encodeURIComponent(stockFilter)}`;
        return (await this.get(url)) || { products: [], pagination: {} };
    },

    // ✅ Backend caches this for 2 minutes → safe to cache client-side too
    async getCategories() {
        return (await this.get('/products/categories', { cache: 60000 })) || [];
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

    async getProductsWithPrices(options = {}) {
        return (await this.get('/products/with-prices', options)) || [];
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
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
            }
            return data;
        } catch (error) {
            console.error('Login error:', error);
            return { success: false, message: error.code === 'TIMEOUT' ? 'Server is not responding. Please try again.' : 'Network error. Please try again.' };
        }
    },

    async logout() {
        const token = this.getToken();
        if (token) {
            try {
                await this.post('/auth/logout');
            } catch (e) { /* ignore */ }
        }
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        this.clearCache();
        // ✅ SPA-safe: reload at root
        window.location.href = '/';
    },

    async verifyToken() {
        try {
            const result = await this.get('/auth/verify', { fresh: true });
            return result && result.success === true;
        } catch (error) {
            return false;
        }
    },

    // ============================================
    // SALE METHODS
    // ============================================
    async getSales(options = {}) {
        return (await this.get('/sales', options)) || [];
    },

    async createSale(saleData) {
        return this.post('/sales', saleData);
    },

    async getCashierSummary() {
        return (await this.get('/sales/cashiers-summary')) || [];
    },

    async getCashierSales(cashierId, options = {}) {
        return (await this.get(`/sales/cashier/${cashierId}`, options)) || { all: [], today: [], totalAll: 0, totalToday: 0, countAll: 0, countToday: 0 };
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

    // ✅ FIXED: backend route is PUT /api/users/profile (it handles both name + password).
    // The old `/users/profile/password` route does not exist.
    async changePassword(currentPassword, newPassword) {
        return this.put('/users/profile', { currentPassword, newPassword });
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
    async getPurchaseOrders(options = {}) {
        return (await this.get('/purchase-orders', options)) || [];
    },

    async createPurchaseOrder(data) {
        return this.post('/purchase-orders', data);
    },

    async receivePurchaseOrder(id) {
        return this.put(`/purchase-orders/${id}/receive`);
    },

    // ⚠️ NOTE: this endpoint does not exist on the backend. Left in place
    //    for compatibility — callers should use updatePurchaseOrder by
    //    extending the backend or removing this method.
    async updatePurchaseOrder(id, data) {
        return this.put(`/purchase-orders/${id}/update`, data);
    },

    // ============================================
    // CREDIT METHODS
    // ============================================
    async getCreditCustomers(options = {}) {
        return (await this.get('/credit-customers', options)) || [];
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

    async getCreditSales(options = {}) {
        return (await this.get('/credit-sales', options)) || [];
    },

    async createCreditSale(data) {
        return this.post('/credit-sales', data);
    },

    // ✅ Backend caches this — safe to short-cache client-side too
    async getCreditSummary() {
        return (await this.get('/credit-summary', { cache: 15000 })) || { totalDebt: 0, activeCustomers: 0, todayCreditSales: 0, todayPayments: 0 };
    },

    async createDebtPayment(data) {
        return this.post('/debt-payments', data);
    },

    async deleteDebtPayment(id) {
        return this.delete(`/debt-payments/${id}`);
    },

    // ✅ NEW helper for the recent payments endpoint we added to the backend
    async getRecentDebtPayments(limit = 10) {
        return (await this.get(`/debt-payments?limit=${limit}`)) || [];
    },

    async getCustomerDebtPayments(customerId, options = {}) {
        return (await this.get(`/debt-payments/${customerId}`, options)) || [];
    },

    // ============================================
    // RETURN METHODS
    // ============================================
    async getReturns(options = {}) {
        return (await this.get('/returns', options)) || [];
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
        // ✅ Backend caches this for 60s — safe to cache 60s client-side
        return (await this.get('/settings', { cache: 60000 })) || { adminPassword: 'admin123' };
    },

    async updateSettings(data) {
        return this.put('/settings', data);
    },

    // ============================================
    // ACTIVITY METHODS
    // ============================================
    async getActivityLog(options = {}) {
        return (await this.get('/activity', options)) || [];
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

    async getMpesaTransactions(options = {}) {
        return (await this.get('/mpesa/transactions', options)) || [];
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
        // ✅ Backend caches this — safe to cache client-side
        return (await this.get('/daily-reports/today', { cache: 30000 })) || {};
    },

    async generateDailyReport() {
        // This may take a while on the backend — bump the timeout a bit
        return this.post('/daily-reports/generate', undefined, { timeout: 45000 });
    },

    // ============================================
    // CREDIT REFUND METHODS
    // ============================================
    async getCreditRefunds(options = {}) {
        return (await this.get('/credit-refunds', options)) || [];
    },

    async getCustomerCreditRefunds(customerId) {
        return (await this.get(`/credit-refunds/${customerId}`)) || [];
    },

    async createCreditRefund(data) {
        return this.post('/credit-refunds', data);
    }
};

// Make globally available
window.ApiService = ApiService;
