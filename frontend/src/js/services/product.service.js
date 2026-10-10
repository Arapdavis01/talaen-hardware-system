// ============================================
// PRODUCT SERVICE - With JWT Authentication & Dual-Unit Support
// Updated for optimized backend (pagination + trigram-indexed search)
// ============================================

const ProductService = {
    _cache: [],
    _isLoading: false,
    _lastFetch: null,
    _cacheTimeout: 60000, // 1 minute cache timeout

    // Max products to load into cache in one request.
    // Backend caps at 5000. 3000 covers most hardware shops comfortably.
    _CACHE_LIMIT: 3000,

    // Debounced search state
    _searchTimer: null,
    _searchPromise: null,
    _SEARCH_DEBOUNCE_MS: 250,

    // ✅ Helper to check if cache is valid
    _isCacheValid() {
        if (this._cache.length === 0) return false;
        if (!this._lastFetch) return false;
        return (Date.now() - this._lastFetch) < this._cacheTimeout;
    },

    // ✅ Fetch from API with JWT token via ApiService
    async _fetchFromAPI() {
        this._isLoading = true;
        try {
            // ✅ Use ApiService which automatically adds JWT token
            // Backend now paginates /products — request a large window so cache is useful
            const data = await ApiService.get('/products?limit=' + this._CACHE_LIMIT);
            if (data && Array.isArray(data)) {
                this._cache = data;
                this._lastFetch = Date.now();
                console.log(`✅ Loaded ${data.length} products`);
                return this._cache;
            } else {
                console.warn('Invalid product data received:', data);
                return this._cache;
            }
        } catch (error) {
            console.error('API fetch error:', error);
            // If token expired, ApiService will handle redirect
            return this._cache;
        } finally {
            this._isLoading = false;
        }
    },

    // ✅ Force refresh cache
    async refresh() {
        this._cache = [];
        this._lastFetch = null;
        return await this._fetchFromAPI();
    },

    // ✅ Get all products (with caching)
    async getAll() {
        if (!this._isCacheValid()) {
            await this._fetchFromAPI();
        }
        return this._cache;
    },

    // ✅ Get product by ID
    getById(id) {
        const product = this._cache.find(p => p.id == id);
        if (!product && !this._isCacheValid()) {
            // Trigger a background refresh; caller still gets null for this call
            this._fetchFromAPI().catch(() => {});
        }
        return product || null;
    },

    // ✅ Get products with pagination
    async getPaginated(page = 1, limit = 25, search = '', category = '', stockFilter = '') {
        try {
            const result = await ApiService.getProductsPaginated(page, limit, search, category, stockFilter);
            // Update cache with results if successful
            if (result.products && Array.isArray(result.products)) {
                result.products.forEach(p => {
                    const index = this._cache.findIndex(c => c.id === p.id);
                    if (index !== -1) {
                        this._cache[index] = p;
                    } else {
                        this._cache.push(p);
                    }
                });
                this._lastFetch = Date.now();
            }
            return result;
        } catch (error) {
            console.error('Error fetching paginated products:', error);
            return { products: [], pagination: { page: 1, limit: 25, total: 0, totalPages: 0 } };
        }
    },

    // ✅ Create product (with JWT token)
    async create(productData) {
        try {
            const result = await ApiService.createProduct(productData);
            if (result.success) {
                await this.refresh();
                return result;
            } else {
                console.error('Failed to create product:', result.message);
                return { success: false, message: result.message || 'Failed to create product' };
            }
        } catch (error) {
            console.error('Error creating product:', error);
            return { success: false, message: 'Network error' };
        }
    },

    // ✅ Update product (with JWT token)
    async update(id, updates) {
        try {
            const result = await ApiService.updateProduct(id, updates);
            if (result.success) {
                await this.refresh();
                return result;
            } else {
                console.error('Failed to update product:', result.message);
                return { success: false, message: result.message || 'Failed to update product' };
            }
        } catch (error) {
            console.error('Error updating product:', error);
            return { success: false, message: 'Network error' };
        }
    },

    // ✅ Delete product (with JWT token)
    async delete(id) {
        try {
            const result = await ApiService.deleteProduct(id);
            if (result.success) {
                await this.refresh();
                return result;
            } else {
                console.error('Failed to delete product:', result.message);
                return { success: false, message: 'Failed to delete product' };
            }
        } catch (error) {
            console.error('Error deleting product:', error);
            return { success: false, message: 'Network error' };
        }
    },

    // ✅ Update stock (with JWT token)
    async updateStock(id, quantity) {
        try {
            const result = await ApiService.updateStock(id, quantity);
            if (result.success) {
                await this.refresh();
                return result;
            } else {
                console.error('Failed to update stock:', result.message);
                return { success: false, message: result.message || 'Failed to update stock' };
            }
        } catch (error) {
            console.error('Error updating stock:', error);
            return { success: false, message: 'Network error' };
        }
    },

    // ✅ Search products (unchanged signature; backend now trigram-indexed)
    async search(query) {
        try {
            const results = await ApiService.searchProducts(query);
            return results || [];
        } catch (error) {
            console.error('Error searching products:', error);
            return [];
        }
    },

    /**
     * ✅ Debounced search — safe to call on every keystroke.
     * Waits `_SEARCH_DEBOUNCE_MS` ms after the last call before firing the request.
     * Returns a Promise that resolves to results for the final query.
     *
     * Usage:
     *   const results = await ProductService.searchDebounced(input.value);
     */
    searchDebounced(query) {
        const self = this;
        if (this._searchTimer) {
            clearTimeout(this._searchTimer);
        }
        // Cancel any previous promise chain so late results don't resolve stale
        const myPromise = new Promise(function(resolve) {
            self._searchTimer = setTimeout(function() {
                self._searchTimer = null;
                self.search(query).then(resolve).catch(function() { resolve([]); });
            }, self._SEARCH_DEBOUNCE_MS);
        });
        this._searchPromise = myPromise;
        return myPromise;
    },

    // ✅ Get categories (cached on backend for 120s — safe to call often)
    async getCategories() {
        try {
            // If cache has products with categories, derive locally (instant, no network)
            if (this._cache.length > 0) {
                const cats = this._cache
                    .map(function(p) { return p.category; })
                    .filter(Boolean);
                const unique = [];
                cats.forEach(function(c) { if (unique.indexOf(c) === -1) unique.push(c); });
                return unique.sort();
            }
            // Otherwise fetch from API (backend caches this for 2 min)
            const categories = await ApiService.getCategories();
            return categories || [];
        } catch (error) {
            console.error('Error fetching categories:', error);
            return [];
        }
    },

    // ✅ Get products by category
    getByCategory(category) {
        if (!this._isCacheValid()) {
            this._fetchFromAPI().catch(() => {});
            return [];
        }
        return this._cache.filter(function(p) { return p.category === category; });
    },

    // ✅ Get low stock products
    getLowStock() {
        if (!this._isCacheValid()) {
            this._fetchFromAPI().catch(() => {});
            return [];
        }
        return this._cache.filter(function(p) { return p.stock <= (p.minStock || 10); });
    },

    // ✅ Get out of stock products
    getOutOfStock() {
        if (!this._isCacheValid()) {
            this._fetchFromAPI().catch(() => {});
            return [];
        }
        return this._cache.filter(function(p) { return p.stock === 0; });
    },

    // ✅ Get stock alert threshold
    getStockAlertThreshold(id) {
        if (!this._isCacheValid()) {
            this._fetchFromAPI().catch(() => {});
            return 10;
        }
        const p = this._cache.find(function(pr) { return pr.id == id; });
        return p ? p.minStock : 10;
    },

    // ✅ Get inventory value
    getInventoryValue() {
        if (!this._isCacheValid()) {
            this._fetchFromAPI().catch(() => {});
            return { totalValue: 0, totalItems: 0 };
        }
        let totalValue = 0, totalItems = 0;
        this._cache.forEach(function(p) {
            totalValue += (p.price || 0) * (p.stock || 0);
            totalItems += p.stock || 0;
        });
        return { totalValue: totalValue, totalItems: totalItems };
    },

    // ✅ Get products with prices (for POS) — backend now uses one LATERAL join
    async getWithPrices() {
        try {
            const products = await ApiService.getProductsWithPrices();
            return products || [];
        } catch (error) {
            console.error('Error fetching products with prices:', error);
            return [];
        }
    },

    // ✅ Get product count
    getCount() {
        return this._cache.length;
    },

    // ✅ Find by SKU
    findBySku(sku) {
        if (!this._isCacheValid()) {
            this._fetchFromAPI().catch(() => {});
            return null;
        }
        return this._cache.find(function(p) { return p.sku === sku; }) || null;
    },

    // ✅ Bulk update products
    async bulkUpdate(products) {
        const results = [];
        for (const product of products) {
            try {
                const result = await this.update(product.id, product);
                results.push(result);
            } catch (error) {
                console.error('Bulk update error:', error);
                results.push({ success: false, id: product.id, error: error.message });
            }
        }
        return results;
    },

    // ✅ Clear cache
    clearCache() {
        this._cache = [];
        this._lastFetch = null;
    },

    // ============================================
    // 🔥 DUAL-UNIT SUPPORT METHODS
    // ============================================

    hasAlternativeUnit(product) {
        if (!product) return false;
        const salesUnit = product.salesUnit || null;
        const conversionFactor = parseInt(product.conversionFactor) || 0;
        return !!(salesUnit && conversionFactor > 0);
    },

    getStockDisplay(product) {
        if (!product) return 'N/A';

        if (product.displayStock && product.displayStock.displayText) {
            return product.displayStock.displayText;
        }

        const stock = parseInt(product.stock) || 0;
        const unit = product.unit || 'pcs';
        const salesUnit = product.salesUnit || null;
        const conversionFactor = parseInt(product.conversionFactor) || 0;

        if (this.hasAlternativeUnit(product)) {
            const salesQty = Math.floor(stock / conversionFactor);
            const remainder = stock % conversionFactor;

            if (salesQty > 0 && remainder > 0) return `${stock} ${unit} (${salesQty} ${salesUnit} + ${remainder} ${unit})`;
            else if (salesQty > 0)             return `${stock} ${unit} (${salesQty} ${salesUnit})`;
            else                                return `${stock} ${unit} (0 ${salesUnit})`;
        }

        return `${stock} ${unit}`;
    },

    getPriceDisplay(product) {
        if (!product) return 'N/A';

        if (product.displayStock && product.displayStock.priceDisplay) {
            return product.displayStock.priceDisplay;
        }

        const price = parseFloat(product.price) || 0;
        const unit = product.unit || 'pcs';

        let display = `KES ${price.toLocaleString()}/${unit}`;

        if (this.hasAlternativeUnit(product)) {
            const salesUnit = product.salesUnit;
            const conversionFactor = parseInt(product.conversionFactor) || 0;
            const bulkPrice = price * conversionFactor;
            display += ` | KES ${bulkPrice.toLocaleString()}/${salesUnit}`;
        }

        return display;
    },

    getAvailableInUnit(product, unitType = 'base') {
        if (!product) return 0;
        const stock = parseInt(product.stock) || 0;
        if (unitType === 'sales' && this.hasAlternativeUnit(product)) {
            const conversionFactor = parseInt(product.conversionFactor) || 0;
            return Math.floor(stock / conversionFactor);
        }
        return stock;
    },

    convertQuantity(quantity, product, fromUnit, toUnit) {
        if (!product || !this.hasAlternativeUnit(product)) return quantity;
        const conversionFactor = parseInt(product.conversionFactor) || 0;
        if (conversionFactor === 0) return quantity;
        if (fromUnit === 'sales' && toUnit === 'base') return quantity * conversionFactor;
        else if (fromUnit === 'base' && toUnit === 'sales') return Math.floor(quantity / conversionFactor);
        return quantity;
    },

    getBulkPrice(product) {
        if (!product || !this.hasAlternativeUnit(product)) return 0;
        const price = parseFloat(product.price) || 0;
        const conversionFactor = parseInt(product.conversionFactor) || 0;
        return price * conversionFactor;
    },

    getPriceForUnit(product, unitType = 'base') {
        if (!product) return 0;
        if (unitType === 'sales' && this.hasAlternativeUnit(product)) {
            return this.getBulkPrice(product);
        }
        return parseFloat(product.price) || 0;
    },

    validateStock(product, quantity, unitType = 'base') {
        if (!product) {
            return { valid: false, available: 0, message: 'Product not found', displayStock: 'N/A' };
        }

        const available = this.getAvailableInUnit(product, unitType);
        const displayStock = this.getStockDisplay(product);
        const unitName = unitType === 'sales' && this.hasAlternativeUnit(product)
            ? product.salesUnit
            : (product.unit || 'pcs');

        if (quantity > available) {
            return {
                valid: false,
                available: available,
                message: `Insufficient stock! Available: ${available} ${unitName}. Total: ${displayStock}`,
                displayStock: displayStock
            };
        }

        return { valid: true, available: available, message: '', displayStock: displayStock };
    },

    isLowStock(product) {
        if (!product) return false;

        if (product.displayStock && product.displayStock.isLowStock !== undefined) {
            return product.displayStock.isLowStock;
        }

        const stock = parseInt(product.stock) || 0;
        const minStock = parseInt(product.minStock) || 10;
        return stock <= minStock;
    },

    getLowStockWarning(product) {
        if (!product || !this.isLowStock(product)) return '';
        const displayStock = this.getStockDisplay(product);
        return `⚠️ Low Stock: ${displayStock}`;
    },

    calculateTotal(product, quantity, unitType = 'base') {
        if (!product || quantity <= 0) return 0;
        const price = this.getPriceForUnit(product, unitType);
        return price * quantity;
    },

    formatQuantityWithUnit(quantity, product, unitType = 'base') {
        if (!product) return `${quantity}`;
        let unit;
        if (unitType === 'sales' && this.hasAlternativeUnit(product)) {
            unit = product.salesUnit;
        } else {
            unit = product.unit || 'pcs';
        }
        return `${quantity} ${unit}`;
    }
};

// Make globally available
window.ProductService = ProductService;
