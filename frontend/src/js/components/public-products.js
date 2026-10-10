/**
 * Talaen Hardware System - Public Products Component
 * Product browsing view for non-admin users
 * Updated: async render, dual-unit stock display, debounced filter, escaping
 */

const PublicProductsComponent = {
    // ✅ Debounce timer
    _filterTimer: null,
    _FILTER_DEBOUNCE_MS: 200,

    // ✅ HTML escape helper
    _esc(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    },

    // ============================================
    // RENDER (async — router handles Promise returns)
    // ============================================
    async render() {
        // ✅ Await both fetches. Since App.init() has already loaded the cache,
        //    these return from cache instantly for logged-in users.
        var products = [];
        var categories = [];

        try {
            var results = await Promise.all([
                ProductService.getAll(),
                ProductService.getCategories()
            ]);
            products = results[0] || [];
            categories = results[1] || [];
        } catch (e) {
            console.error('PublicProductsComponent render error:', e);
        }

        var esc = this._esc;
        var html = '';
        html += '<div class="card">';
        html += '<div class="card-header">';
        html += '<h3 class="card-title">';
        html += '<i class="fas fa-boxes"></i> Products Catalog';
        html += '</h3>';
        html += '<div style="display: flex; gap: 0.5rem;">';
        // ✅ Inline handlers instead of global document listeners
        html += '<input type="text" id="productSearch" class="form-control" placeholder="Search products..." style="width: 250px;" oninput="PublicProductsComponent._filterProducts()">';
        html += '<select id="categoryFilter" class="form-control" style="width: 180px;" onchange="PublicProductsComponent._filterProducts()">';
        html += '<option value="">All Categories</option>';
        for (var c = 0; c < categories.length; c++) {
            html += '<option value="' + esc(categories[c]) + '">' + esc(categories[c]) + '</option>';
        }
        html += '</select>';
        html += '</div></div>';
        html += '<div class="card-body">';
        html += '<div class="table-container">';
        html += '<table class="table" id="productsTable">';
        html += '<thead><tr><th>Product Name</th><th>Brand</th><th>Variant</th><th>Category</th><th>Price</th><th>Stock</th><th>Status</th></tr></thead>';
        html += '<tbody>';

        if (products.length > 0) {
            for (var i = 0; i < products.length; i++) {
                var p = products[i];

                // ✅ Use the dual-unit aware helper
                var stockDisplay = (typeof ProductService !== 'undefined' && ProductService.getStockDisplay)
                    ? ProductService.getStockDisplay(p)
                    : ((p.stock || 0) + ' ' + (p.unit || 'pcs'));

                var threshold = (p.minStock != null) ? p.minStock : 10;
                var statusBadge;
                if ((p.stock || 0) === 0) {
                    statusBadge = '<span class="badge badge-danger">Out of Stock</span>';
                } else if ((p.stock || 0) <= threshold) {
                    statusBadge = '<span class="badge badge-warning">Low Stock</span>';
                } else {
                    statusBadge = '<span class="badge badge-success">In Stock</span>';
                }

                // ✅ Build a single search string for the row
                var searchData = [
                    (p.name || ''),
                    (p.brand || ''),
                    (p.variant || ''),
                    (p.category || '')
                ].join(' ').toLowerCase();

                html += '<tr data-category="' + esc(p.category || '') + '" data-search="' + esc(searchData) + '">';
                html += '<td><strong>' + esc(p.name || '') + '</strong></td>';
                html += '<td>' + esc(p.brand || '-') + '</td>';
                html += '<td>' + esc(p.variant || '-') + '</td>';
                html += '<td>' + esc(p.category || '-') + '</td>';
                html += '<td>KES ' + Number(p.price || 0).toLocaleString() + '</td>';
                html += '<td>' + esc(stockDisplay) + '</td>';
                html += '<td>' + statusBadge + '</td>';
                html += '</tr>';
            }
        } else {
            html += '<tr><td colspan="7" style="text-align: center; padding: 2rem;">';
            html += '<i class="fas fa-box-open" style="font-size: 3rem; color: var(--gray-400);"></i>';
            html += '<p style="margin-top: 1rem; color: var(--gray-500);">No products available</p>';
            html += '</td></tr>';
        }

        html += '</tbody></table></div></div></div>';
        return html;
    },

    // ============================================
    // FILTER (debounced, called by inline handlers)
    // ============================================
    _filterProducts() {
        if (this._filterTimer) clearTimeout(this._filterTimer);
        var self = this;
        this._filterTimer = setTimeout(function() {
            self._filterTimer = null;
            self._applyFilter();
        }, this._FILTER_DEBOUNCE_MS);
    },

    _applyFilter() {
        var searchEl = document.getElementById('productSearch');
        var categoryEl = document.getElementById('categoryFilter');
        var search = (searchEl ? searchEl.value : '').toLowerCase().trim();
        var category = categoryEl ? categoryEl.value : '';

        var rows = document.querySelectorAll('#productsTable tbody tr');
        var visibleCount = 0;

        for (var i = 0; i < rows.length; i++) {
            var row = rows[i];
            var rowSearch = row.dataset.search || '';
            var rowCategory = row.dataset.category || '';

            // Skip rows without data attributes (the "no products" placeholder row)
            if (!row.dataset.search) {
                visibleCount++;
                continue;
            }

            var matchesSearch = !search || rowSearch.indexOf(search) > -1;
            var matchesCategory = !category || rowCategory === category;
            var show = matchesSearch && matchesCategory;
            row.style.display = show ? '' : 'none';
            if (show) visibleCount++;
        }

        // Show/hide "no results" message
        var existing = document.getElementById('publicNoResults');
        if (existing) existing.remove();

        if (visibleCount === 0 && rows.length > 0) {
            var tbody = document.querySelector('#productsTable tbody');
            if (tbody) {
                var msg = document.createElement('tr');
                msg.id = 'publicNoResults';
                msg.innerHTML = '<td colspan="7" style="text-align:center;padding:2rem;color:#999;">'
                    + '<i class="fas fa-search" style="font-size:2rem;display:block;margin-bottom:0.5rem;"></i>'
                    + 'No products match your search</td>';
                tbody.appendChild(msg);
            }
        }
    }
};

// Make globally available
window.PublicProductsComponent = PublicProductsComponent;
