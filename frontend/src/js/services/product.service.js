// ============================================
// PRODUCT SERVICE - With JWT Authentication & Dual-Unit Support
// ============================================

const ProductService = {
    _cache: [],
    _isLoading: false,
    _lastFetch: null,
    _cacheTimeout: 60000, // 1 minute cache timeout

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
            const data = await ApiService.get('/products');
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
            // If not in cache, fetch and try again
            this._fetchFromAPI().then(() => {
                return this._cache.find(p => p.id == id) || null;
            });
        }
        return product || null;
    },

    // ✅ Get products with pagination
    async getPaginated(page = 1, limit = 25, search = '', category = '', stockFilter = '') {
        try {
            const result = await ApiService.getProductsPaginated(page, limit, search, category, stockFilter);
            // Update cache with results if successful
            if (result.products && Array.isArray(result.products)) {
                // Merge with existing cache
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

    // ✅ Search products
    async search(query) {
        try {
            const results = await ApiService.searchProducts(query);
            return results || [];
        } catch (error) {
            console.error('Error searching products:', error);
            return [];
        }
    },

    // ✅ Get categories
    async getCategories() {
        try {
            // If cache has categories, use them
            if (this._cache.length > 0) {
                var cats = this._cache.map(function(p) { return p.category; }).filter(Boolean);
                var unique = [];
                cats.forEach(function(c) { if (unique.indexOf(c) === -1) unique.push(c); });
                return unique.sort();
            }
            // Otherwise fetch from API
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
            this._fetchFromAPI();
            return [];
        }
        return this._cache.filter(function(p) { return p.category === category; });
    },

    // ✅ Get low stock products
    getLowStock() {
        if (!this._isCacheValid()) {
            this._fetchFromAPI();
            return [];
        }
        return this._cache.filter(function(p) { return p.stock <= (p.minStock || 10); });
    },

    // ✅ Get out of stock products
    getOutOfStock() {
        if (!this._isCacheValid()) {
            this._fetchFromAPI();
            return [];
        }
        return this._cache.filter(function(p) { return p.stock === 0; });
    },

    // ✅ Get stock alert threshold
    getStockAlertThreshold(id) {
        if (!this._isCacheValid()) {
            this._fetchFromAPI();
            return 10;
        }
        var p = this._cache.find(function(p) { return p.id == id; });
        return p ? p.minStock : 10;
    },

    // ✅ Get inventory value
    getInventoryValue() {
        if (!this._isCacheValid()) {
            this._fetchFromAPI();
            return { totalValue: 0, totalItems: 0 };
        }
        var totalValue = 0, totalItems = 0;
        this._cache.forEach(function(p) {
            totalValue += (p.price || 0) * (p.stock || 0);
            totalItems += p.stock || 0;
        });
        return { totalValue: totalValue, totalItems: totalItems };
    },

    // ✅ Get products with prices (for POS)
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
            this._fetchFromAPI();
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

    /**
     * Check if a product has an alternative sales unit
     * @param {Object} product - Product object
     * @returns {boolean} True if product has salesUnit and conversionFactor > 0
     */
    hasAlternativeUnit(product) {
        if (!product) return false;
        const salesUnit = product.salesUnit || null;
        const conversionFactor = parseInt(product.conversionFactor) || 0;
        return !!(salesUnit && conversionFactor > 0);
    },

    /**
     * Get formatted stock display text
     * Examples:
     *   - "216 wheelbarrows (9 tonnes)"
     *   - "200 wheelbarrows (8 tonnes + 8 wheelbarrows)"
     *   - "100 bags"
     * @param {Object} product - Product object
     * @returns {string} Formatted stock display text
     */
    getStockDisplay(product) {
        if (!product) return 'N/A';
        
        // Use displayStock from API if available
        if (product.displayStock && product.displayStock.displayText) {
            return product.displayStock.displayText;
        }
        
        // Fallback calculation if API didn't provide displayStock
        const stock = parseInt(product.stock) || 0;
        const unit = product.unit || 'pcs';
        const salesUnit = product.salesUnit || null;
        const conversionFactor = parseInt(product.conversionFactor) || 0;
        
        if (this.hasAlternativeUnit(product)) {
            const salesQty = Math.floor(stock / conversionFactor);
            const remainder = stock % conversionFactor;
            
            if (salesQty > 0 && remainder > 0) {
                return `${stock} ${unit} (${salesQty} ${salesUnit} + ${remainder} ${unit})`;
            } else if (salesQty > 0) {
                return `${stock} ${unit} (${salesQty} ${salesUnit})`;
            } else {
                return `${stock} ${unit} (0 ${salesUnit})`;
            }
        }
        
        return `${stock} ${unit}`;
    },

    /**
     * Get formatted price display text
     * Examples:
     *   - "KES 200/wheelbarrow | KES 4,800/tonne"
     *   - "KES 750/bag"
     * @param {Object} product - Product object
     * @returns {string} Formatted price display text
     */
    getPriceDisplay(product) {
        if (!product) return 'N/A';
        
        // Use displayStock from API if available
        if (product.displayStock && product.displayStock.priceDisplay) {
            return product.displayStock.priceDisplay;
        }
        
        // Fallback calculation
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

    /**
     * Get available quantity in a specific unit
     * @param {Object} product - Product object
     * @param {string} unitType - 'base' or 'sales'
     * @returns {number} Available quantity in the requested unit
     */
    getAvailableInUnit(product, unitType = 'base') {
        if (!product) return 0;
        
        const stock = parseInt(product.stock) || 0;
        
        if (unitType === 'sales' && this.hasAlternativeUnit(product)) {
            const conversionFactor = parseInt(product.conversionFactor) || 0;
            return Math.floor(stock / conversionFactor);
        }
        
        return stock;
    },

    /**
     * Convert quantity between units
     * @param {number} quantity - Quantity to convert
     * @param {Object} product - Product object
     * @param {string} fromUnit - 'base' or 'sales'
     * @param {string} toUnit - 'base' or 'sales'
     * @returns {number} Converted quantity
     */
    convertQuantity(quantity, product, fromUnit, toUnit) {
        if (!product || !this.hasAlternativeUnit(product)) return quantity;
        
        const conversionFactor = parseInt(product.conversionFactor) || 0;
        if (conversionFactor === 0) return quantity;
        
        if (fromUnit === 'sales' && toUnit === 'base') {
            return quantity * conversionFactor;
        } else if (fromUnit === 'base' && toUnit === 'sales') {
            return Math.floor(quantity / conversionFactor);
        }
        
        return quantity;
    },

    /**
     * Get bulk price (price per sales unit)
     * @param {Object} product - Product object
     * @returns {number} Bulk price or 0 if no alternative unit
     */
    getBulkPrice(product) {
        if (!product || !this.hasAlternativeUnit(product)) return 0;
        
        const price = parseFloat(product.price) || 0;
        const conversionFactor = parseInt(product.conversionFactor) || 0;
        
        return price * conversionFactor;
    },

    /**
     * Get price for a specific unit type
     * @param {Object} product - Product object
     * @param {string} unitType - 'base' or 'sales'
     * @returns {number} Price for the requested unit
     */
    getPriceForUnit(product, unitType = 'base') {
        if (!product) return 0;
        
        if (unitType === 'sales' && this.hasAlternativeUnit(product)) {
            return this.getBulkPrice(product);
        }
        
        return parseFloat(product.price) || 0;
    },

    /**
     * Validate stock availability
     * @param {Object} product - Product object
     * @param {number} quantity - Requested quantity
     * @param {string} unitType - 'base' or 'sales'
     * @returns {Object} { valid: boolean, available: number, message: string, displayStock: string }
     */
    validateStock(product, quantity, unitType = 'base') {
        if (!product) {
            return { 
                valid: false, 
                available: 0, 
                message: 'Product not found',
                displayStock: 'N/A'
            };
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
        
        return { 
            valid: true, 
            available: available, 
            message: '',
            displayStock: displayStock
        };
    },

    /**
     * Check if product is low on stock (based on minStock in base units)
     * @param {Object} product - Product object
     * @returns {boolean}
     */
    isLowStock(product) {
        if (!product) return false;
        
        // Use displayStock from API if available
        if (product.displayStock && product.displayStock.isLowStock !== undefined) {
            return product.displayStock.isLowStock;
        }
        
        const stock = parseInt(product.stock) || 0;
        const minStock = parseInt(product.minStock) || 10;
        return stock <= minStock;
    },

    /**
     * Get low stock warning text with dual-unit display
     * @param {Object} product - Product object
     * @returns {string} Warning text or empty string
     */
    getLowStockWarning(product) {
        if (!product || !this.isLowStock(product)) return '';
        
        const displayStock = this.getStockDisplay(product);
        return `⚠️ Low Stock: ${displayStock}`;
    },

    /**
     * Calculate total price for a given quantity and unit
     * @param {Object} product - Product object
     * @param {number} quantity - Quantity
     * @param {string} unitType - 'base' or 'sales'
     * @returns {number} Total price
     */
    calculateTotal(product, quantity, unitType = 'base') {
        if (!product || quantity <= 0) return 0;
        
        const price = this.getPriceForUnit(product, unitType);
        return price * quantity;
    },

    /**
     * Format quantity with unit for display (e.g., on receipts)
     * @param {number} quantity - Quantity
     * @param {Object} product - Product object
     * @param {string} unitType - 'base' or 'sales'
     * @returns {string} Formatted string like "5 tonnes" or "10 wheelbarrows"
     */
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
