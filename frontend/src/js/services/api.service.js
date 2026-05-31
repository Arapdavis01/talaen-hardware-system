const ApiService = {
    BASE: '/api',

    async getProducts() {
        const res = await fetch(this.BASE + '/products');
        return res.ok ? res.json() : [];
    },

    async createProduct(data) {
        const res = await fetch(this.BASE + '/products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return res.json();
    },

    async updateProduct(id, data) {
        await fetch(this.BASE + '/products/' + id, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
    },

    async deleteProduct(id) {
        await fetch(this.BASE + '/products/' + id, { method: 'DELETE' });
    },

    async updateStock(id, quantity) {
        await fetch(this.BASE + '/products/' + id + '/stock', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ quantity })
        });
    },

    async login(username, password) {
        const res = await fetch(this.BASE + '/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        return res.json();
    },

    async createSale(saleData) {
        const res = await fetch(this.BASE + '/sales', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(saleData)
        });
        return res.json();
    }
};
