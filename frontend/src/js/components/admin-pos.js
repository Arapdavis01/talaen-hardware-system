// ============================================
// ADMIN POS - With JWT Authentication
// Updated: category caching, accurate summary stats via pagination.total,
//          debounced search at 250ms, reset-filter action
// ============================================

const AdminPOSComponent = {
    _currentPage: 1,
    _limit: 25,
    _search: '',
    _stockFilter: '',

    // ✅ Cache categories in component state (avoids network on every page change)
    _categoriesCache: null,

    // ✅ True total of products when no filters are applied (from pagination.total)
    _trueTotalProducts: 0,

    // ============================================
    // RENDER
    // ============================================
    render: function() {
        var products = ProductService._cache || [];

        // ✅ Use _trueTotalProducts when we know it, else fall back to cache length
        var displayTotal = this._trueTotalProducts || products.length;

        var totalValue = 0;
        products.forEach(function(p) { totalValue += (p.price || 0) * (p.stock || 0); });
        var lowStock = products.filter(function(p){return p.stock <= (p.minStock || 10) && p.stock > 0;});
        var outOfStock = products.filter(function(p){return p.stock === 0;});

        var h = '';

        // Summary cards
        h += '<div class="stats-grid">';
        h += '<div class="stat-card"><div class="stat-icon"><i class="fas fa-boxes"></i></div><div class="stat-label">Total Products</div><div class="stat-value" id="totalProductsCount">' + displayTotal + '</div><div class="stat-sub" id="totalTypes">...</div></div>';
        h += '<div class="stat-card"><div class="stat-icon"><i class="fas fa-coins"></i></div><div class="stat-label">Inventory Value</div><div class="stat-value">KES ' + totalValue.toLocaleString() + '</div><div class="stat-sub">Current stock value</div></div>';
        h += '<div class="stat-card" style="cursor:pointer;border-top:3px solid #f59e0b;" onclick="AdminPOSComponent.showLowStockItems()"><div class="stat-icon"><i class="fas fa-exclamation-triangle"></i></div><div class="stat-label">Low Stock Items</div><div class="stat-value">' + lowStock.length + '</div><div class="stat-sub">Click to view - Need restocking</div></div>';
        h += '<div class="stat-card" style="cursor:pointer;border-top:3px solid #ef4444;" onclick="AdminPOSComponent.showOutOfStockItems()"><div class="stat-icon"><i class="fas fa-ban"></i></div><div class="stat-label">Out of Stock</div><div class="stat-value">' + outOfStock.length + '</div><div class="stat-sub">Click to view - Unavailable</div></div>';
        h += '</div>';

        // Inventory Overview with pagination
        h += '<div class="card"><div class="card-header"><h3 class="card-title"><i class="fas fa-clipboard-list"></i> Products Inventory Overview</h3>';
        h += '<div style="display:flex;gap:0.5rem;">';
        h += '<input type="text" id="inventorySearch" class="form-control" placeholder="Search inventory..." style="width:250px;" value="' + this._escAttr(this._search) + '" oninput="AdminPOSComponent._debounceSearch()">';
        h += '<select id="inventoryStockFilter" class="form-control" onchange="AdminPOSComponent._filterChange()" style="width:150px;">';
        h += '<option value="">All Stock</option><option value="out">Out of Stock</option><option value="low">Low Stock</option><option value="ok">In Stock</option></select>';
        h += '<select id="inventoryLimit" class="form-control" onchange="AdminPOSComponent._changeLimit()" style="width:90px;">';
        h += '<option value="25">25</option><option value="50">50</option><option value="100">100</option></select>';
        h += '</div></div>';
        h += '<div class="card-body">';
        h += '<div id="inventoryTableContainer">Loading...</div>';
        h += '<div id="inventoryPagination" style="text-align:center;margin-top:1rem;"></div>';
        h += '</div></div>';

        // ✅ Restore filter/limit values from state on re-render
        setTimeout(function() {
            var filterEl = document.getElementById('inventoryStockFilter');
            if (filterEl && AdminPOSComponent._stockFilter) filterEl.value = AdminPOSComponent._stockFilter;
            var limitEl = document.getElementById('inventoryLimit');
            if (limitEl && AdminPOSComponent._limit) limitEl.value = String(AdminPOSComponent._limit);

            AdminPOSComponent.loadInventory();
        }, 200);

        return h;
    },

    // ✅ Small helpers
    _escAttr(s) {
        return String(s == null ? '' : s).replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    },
    _escHtml(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    },

    // ============================================
    // LOW STOCK MODAL
    // ============================================
    showLowStockItems: function() {
        var products = ProductService._cache || [];
        var lowStock = products.filter(function(p) { return p.stock <= (p.minStock || 10) && p.stock > 0; });

        if (lowStock.length === 0) {
            showStyledAlert('All Good!', 'No low stock items. All products are well stocked!', 'check-circle', '#10b981');
            return;
        }

        var esc = this._escHtml;
        var h = '<div class="modal modal-lg"><div class="modal-header" style="background:linear-gradient(135deg,#f59e0b,#d97706);color:white;">';
        h += '<h3 style="color:white;"><i class="fas fa-exclamation-triangle"></i> Low Stock Items (' + lowStock.length + ')</h3>';
        h += '<button class="btn btn-sm" style="color:white;" onclick="this.closest(\'.modal-overlay\').remove()">X</button></div>';
        h += '<div class="modal-body" style="max-height:500px;overflow-y:auto;">';
        h += '<table class="table"><thead><tr><th>Product</th><th>Brand</th><th>Variant</th><th>Stock</th><th>Min Stock</th><th>Status</th></tr></thead><tbody>';
        lowStock.forEach(function(p) {
            h += '<tr>';
            h += '<td><strong>' + esc(p.name) + '</strong></td>';
            h += '<td>' + esc(p.brand || '-') + '</td>';
            h += '<td>' + esc(p.variant || '-') + '</td>';
            h += '<td style="color:#f59e0b;font-weight:700;">' + p.stock + ' ' + esc(p.unit || 'pcs') + '</td>';
            h += '<td>' + (p.minStock || 10) + '</td>';
            h += '<td><span class="badge badge-warning">Low</span></td>';
            h += '</tr>';
        });
        h += '</tbody></table></div></div>';

        var m = document.createElement('div'); m.className = 'modal-overlay'; m.innerHTML = h;
        document.body.appendChild(m); m.onclick = function(e) { if (e.target === m) m.remove(); };
    },

    // ============================================
    // OUT OF STOCK MODAL
    // ============================================
    showOutOfStockItems: function() {
        var products = ProductService._cache || [];
        var outOfStock = products.filter(function(p) { return p.stock === 0; });

        if (outOfStock.length === 0) {
            showStyledAlert('All Good!', 'No out of stock items. All products are available!', 'check-circle', '#10b981');
            return;
        }

        var esc = this._escHtml;
        var h = '<div class="modal modal-lg"><div class="modal-header" style="background:linear-gradient(135deg,#ef4444,#dc2626);color:white;">';
        h += '<h3 style="color:white;"><i class="fas fa-ban"></i> Out of Stock Items (' + outOfStock.length + ')</h3>';
        h += '<button class="btn btn-sm" style="color:white;" onclick="this.closest(\'.modal-overlay\').remove()">X</button></div>';
        h += '<div class="modal-body" style="max-height:500px;overflow-y:auto;">';
        h += '<table class="table"><thead><tr><th>Product</th><th>Brand</th><th>Variant</th><th>Stock</th><th>Status</th></tr></thead><tbody>';
        outOfStock.forEach(function(p) {
            h += '<tr>';
            h += '<td><strong>' + esc(p.name) + '</strong></td>';
            h += '<td>' + esc(p.brand || '-') + '</td>';
            h += '<td>' + esc(p.variant || '-') + '</td>';
            h += '<td style="color:#ef4444;font-weight:700;">0 ' + esc(p.unit || 'pcs') + '</td>';
            h += '<td><span class="badge badge-danger">Out</span></td>';
            h += '</tr>';
        });
        h += '</tbody></table></div></div>';

        var m = document.createElement('div'); m.className = 'modal-overlay'; m.innerHTML = h;
        document.body.appendChild(m); m.onclick = function(e) { if (e.target === m) m.remove(); };
    },

    // ============================================
    // DEBOUNCE / FILTER HANDLERS
    // ============================================
    _debounceTimer: null,

    _debounceSearch: function() {
        clearTimeout(this._debounceTimer);
        var self = this;
        // ✅ 250ms feels snappy without hammering the server
        this._debounceTimer = setTimeout(function() {
            self._search = document.getElementById('inventorySearch')?.value || '';
            self._currentPage = 1;
            self.loadInventory();
        }, 250);
    },

    _filterChange: function() {
        this._stockFilter = document.getElementById('inventoryStockFilter')?.value || '';
        this._currentPage = 1;
        this.loadInventory();
    },

    _changeLimit: function() {
        this._limit = parseInt(document.getElementById('inventoryLimit')?.value) || 25;
        this._currentPage = 1;
        this.loadInventory();
    },

    _resetFilters: function() {
        this._search = '';
        this._stockFilter = '';
        this._currentPage = 1;
        var searchEl = document.getElementById('inventorySearch');
        if (searchEl) searchEl.value = '';
        var filterEl = document.getElementById('inventoryStockFilter');
        if (filterEl) filterEl.value = '';
        this.loadInventory();
    },

    // ============================================
    // LOAD INVENTORY
    // ============================================
    loadInventory: async function() {
        var container = document.getElementById('inventoryTableContainer');
        if (!container) return;
        container.innerHTML = '<div style="text-align:center;padding:2rem;"><i class="fas fa-spinner fa-spin"></i> Loading...</div>';

        try {
            var params = '?page=' + this._currentPage + '&limit=' + this._limit;
            if (this._search) params += '&search=' + encodeURIComponent(this._search);
            if (this._stockFilter) params += '&stock=' + this._stockFilter;

            // ✅ Parallel: paginated products + (cached) categories
            var results = await Promise.all([
                ApiService.get('/products/paginated' + params),
                this._getCategories()
            ]);

            var data = results[0] || { products: [], pagination: {} };
            var cats = results[1] || [];

            // ✅ Update "N product types" label
            var totalTypesEl = document.getElementById('totalTypes');
            if (totalTypesEl) {
                totalTypesEl.textContent = cats.length + ' product types';
            }

            // ✅ If no filters are active, pagination.total is the true DB count
            if (!this._search && !this._stockFilter && data.pagination && typeof data.pagination.total === 'number') {
                this._trueTotalProducts = data.pagination.total;
                var totalCountEl = document.getElementById('totalProductsCount');
                if (totalCountEl) totalCountEl.textContent = this._trueTotalProducts;
            }

            this._renderTable(data.products);
            this._renderPagination(data.pagination);
        } catch(e) {
            console.error('Error loading inventory:', e);
            container.innerHTML = '<p style="color:#ef4444;text-align:center;">Error loading inventory. Please refresh.</p>';
        }
    },

    // ✅ One-time category fetch, cached in component state
    async _getCategories() {
        if (this._categoriesCache) return this._categoriesCache;
        try {
            // ApiService.getCategories() has its own 60s cache
            var cats = await ApiService.getCategories();
            this._categoriesCache = cats || [];
        } catch(e) {
            this._categoriesCache = [];
        }
        return this._categoriesCache;
    },

    // ============================================
    // RENDER TABLE
    // ============================================
    _renderTable: function(products) {
        var container = document.getElementById('inventoryTableContainer');
        if (!container) return;

        if (!products || products.length === 0) {
            var hasFilters = this._search || this._stockFilter;
            container.innerHTML = '<div style="text-align:center;padding:3rem;">'
                + '<p style="color:#999;margin-bottom:1rem;">No products found matching your search.</p>'
                + (hasFilters ? '<button class="btn btn-outline" onclick="AdminPOSComponent._resetFilters()"><i class="fas fa-times"></i> Clear Filters</button>' : '')
                + '</div>';
            return;
        }

        var esc = this._escHtml;
        var grouped = {};
        products.forEach(function(p) {
            var key = (p.name || '').toUpperCase();
            if (!grouped[key]) grouped[key] = { displayName: p.name, variants: [] };
            grouped[key].variants.push(p);
        });

        var h = '';
        var keys = Object.keys(grouped).sort();

        for (var i = 0; i < keys.length; i++) {
            var group = grouped[keys[i]];
            var variants = group.variants;
            var groupTotal = 0;
            variants.forEach(function(p){ groupTotal += p.stock || 0; });

            h += '<div style="margin-bottom:1rem;border:1px solid var(--glass-border);border-radius:var(--radius-xl);overflow:hidden;box-shadow:var(--shadow-sm);">';
            h += '<div style="background:linear-gradient(135deg,rgba(26,71,42,0.9),rgba(196,154,43,0.85));color:white;padding:0.75rem 1.5rem;display:flex;justify-content:space-between;align-items:center;">';
            h += '<div><strong style="font-size:1.1rem;"> ' + esc(group.displayName) + '</strong><br><small style="opacity:0.9;">' + variants.length + ' variants | Total Stock: ' + groupTotal + ' units</small></div>';
            h += '<span class="badge" style="background:rgba(255,255,255,0.3);">' + esc((variants[0] && variants[0].category) || 'General') + '</span>';
            h += '</div>';
            h += '<div style="padding:0.5rem;">';
            h += '<table class="table" style="margin:0;font-size:0.9rem;"><thead><tr style="background:rgba(26,71,42,0.03);"><th>Brand</th><th>Variant</th><th>Buy Price</th><th>Sell Price</th><th>Stock</th><th>Value</th><th>Status</th></tr></thead><tbody>';

            variants.forEach(function(p){
                var stockStatus = p.stock === 0
                    ? '<span class="badge badge-danger">Out</span>'
                    : p.stock <= (p.minStock || 10)
                        ? '<span class="badge badge-warning">Low</span>'
                        : '<span class="badge badge-success">OK</span>';
                var itemValue = (p.price || 0) * (p.stock || 0);
                h += '<tr>';
                h += '<td><strong>' + esc(p.brand || '-') + '</strong></td>';
                h += '<td>' + esc(p.variant || '-') + '</td>';
                h += '<td style="color:var(--gray-500);">KES ' + (p.cost || 0).toLocaleString() + '</td>';
                h += '<td style="color:var(--secondary);font-weight:600;">KES ' + (p.price || 0).toLocaleString() + '</td>';
                h += '<td><strong>' + p.stock + '</strong> ' + esc(p.unit || 'pcs') + '</td>';
                h += '<td>KES ' + itemValue.toLocaleString() + '</td>';
                h += '<td>' + stockStatus + '</td>';
                h += '</tr>';
            });

            h += '</tbody></table></div></div>';
        }

        container.innerHTML = h;
    },

    // ============================================
    // RENDER PAGINATION
    // ============================================
    _renderPagination: function(pagination) {
        var container = document.getElementById('inventoryPagination');
        if (!container) return;

        // ✅ Show count even when there's only one page — user still wants feedback
        if (!pagination || !pagination.total) {
            container.innerHTML = '';
            return;
        }

        var start = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1;
        var end = Math.min(pagination.page * pagination.limit, pagination.total);

        if (pagination.totalPages <= 1) {
            container.innerHTML = '<small style="color:#666;">Showing ' + start + '-' + end + ' of ' + pagination.total.toLocaleString() + '</small>';
            return;
        }

        var h = '<div style="display:flex;justify-content:center;align-items:center;gap:0.5rem;flex-wrap:wrap;">';
        h += '<small style="color:#666;">Showing ' + start + '-' + end + ' of ' + pagination.total.toLocaleString() + '</small>';
        h += '<div style="display:flex;gap:0.25rem;">';

        h += '<button class="btn btn-sm btn-outline" onclick="AdminPOSComponent._goToPage(' + (pagination.page - 1) + ')" ' + (pagination.hasPrev ? '' : 'disabled') + '>Prev</button>';

        var startPage = Math.max(1, pagination.page - 2);
        var endPage = Math.min(pagination.totalPages, pagination.page + 2);

        if (startPage > 1) {
            h += '<button class="btn btn-sm btn-outline" onclick="AdminPOSComponent._goToPage(1)">1</button>';
            if (startPage > 2) h += '<span style="padding:0 0.25rem;">...</span>';
        }

        for (var p = startPage; p <= endPage; p++) {
            h += '<button class="btn btn-sm ' + (p === pagination.page ? 'btn-primary' : 'btn-outline') + '" onclick="AdminPOSComponent._goToPage(' + p + ')">' + p + '</button>';
        }

        if (endPage < pagination.totalPages) {
            if (endPage < pagination.totalPages - 1) h += '<span style="padding:0 0.25rem;">...</span>';
            h += '<button class="btn btn-sm btn-outline" onclick="AdminPOSComponent._goToPage(' + pagination.totalPages + ')">' + pagination.totalPages + '</button>';
        }

        h += '<button class="btn btn-sm btn-outline" onclick="AdminPOSComponent._goToPage(' + (pagination.page + 1) + ')" ' + (pagination.hasNext ? '' : 'disabled') + '>Next</button>';

        h += '</div></div>';
        container.innerHTML = h;
    },

    _goToPage: function(page) {
        this._currentPage = page;
        this.loadInventory();
        window.scrollTo({ top: 300, behavior: 'smooth' });
    }
};

// Make globally available
window.AdminPOSComponent = AdminPOSComponent;
