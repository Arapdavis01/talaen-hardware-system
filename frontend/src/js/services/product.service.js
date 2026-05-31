const ProductService = {
    _cache: [],

    async _fetchFromAPI() {
        try {
            const res = await fetch('http://localhost:8080/api/products');
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data)) {
                    this._cache = data;
                }
            }
        } catch(e) {
            console.error('API fetch error:', e);
        }
        return this._cache;
    },

    async getAll() {
        if (this._cache.length === 0) {
            await this._fetchFromAPI();
        }
        return this._cache;
    },

    getById(id) {
        return this._cache.find(p => p.id == id) || null;
    },

    async create(productData) {
        try {
            await fetch('http://localhost:8080/api/products', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(productData)
            });
            await this._fetchFromAPI();
        } catch(e) {}
    },

    async update(id, updates) {
        try {
            await fetch('http://localhost:8080/api/products/' + id, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            });
            await this._fetchFromAPI();
        } catch(e) {}
    },

    async delete(id) {
        try {
            await fetch('http://localhost:8080/api/products/' + id, { method: 'DELETE' });
            await this._fetchFromAPI();
        } catch(e) {}
    },

    async updateStock(id, quantity) {
        try {
            await fetch('http://localhost:8080/api/products/' + id + '/stock', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ quantity })
            });
            await this._fetchFromAPI();
        } catch(e) {}
    },

    getCategories() {
        var cats = this._cache.map(function(p) { return p.category; }).filter(Boolean);
        var unique = [];
        cats.forEach(function(c) { if (unique.indexOf(c) === -1) unique.push(c); });
        return unique.sort();
    },

    getByCategory(category) {
        return this._cache.filter(function(p) { return p.category === category; });
    },

    getLowStock() {
        var self = this;
        return this._cache.filter(function(p) { return p.stock <= (p.minStock || 10); });
    },

    getOutOfStock() {
        return this._cache.filter(function(p) { return p.stock === 0; });
    },

    getStockAlertThreshold(id) {
        var p = this._cache.find(function(p) { return p.id == id; });
        return p ? p.minStock : 10;
    },

    getInventoryValue() {
        var totalValue = 0, totalItems = 0;
        this._cache.forEach(function(p) {
            totalValue += (p.price || 0) * (p.stock || 0);
            totalItems += p.stock || 0;
        });
        return { totalValue: totalValue, totalItems: totalItems };
    }
};
