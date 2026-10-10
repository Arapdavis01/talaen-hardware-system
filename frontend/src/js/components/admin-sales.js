// ============================================
// ADMIN SALES - With JWT Authentication, Dual-Unit Support & Load More
// Updated: debounced filter, cached credit-sales lookup, smarter hasMore
// ============================================

const AdminSalesComponent = {
    _currentFilter: 'all',

    // ✅ Load-more state
    _isLoadingMore: false,
    _hasMore: true,
    _pageSize: 500,

    // ✅ Debounce timer for the search box
    _filterTimer: null,
    _FILTER_DEBOUNCE_MS: 200,

    // ✅ Shared credit-sales cache (for the credit details modal)
    _creditSalesCache: null,
    _creditSalesFetchedAt: 0,
    _CREDIT_SALES_TTL_MS: 30000,

    // ============================================
    // RENDER
    // ============================================
    render() {
        var sales = SaleService._cache || [];
        var stats = SaleService.getStatistics();
        var todaySales = SaleService.getTodaySales();

        var totalRevenue = Number(stats.total?.revenue || 0);
        var totalCount   = Number(stats.total?.count   || 0);
        var todayRevenue = Number(stats.today?.revenue || 0);
        var todayCount   = Number(stats.today?.count   || 0);
        var avgTransaction = totalCount > 0 ? totalRevenue / totalCount : 0;

        // ✅ Smarter "has more": if we have fewer than a full page worth of
        //    items AND we haven't explicitly paginated yet, there's nothing more.
        //    Otherwise trust the last known state.
        if (sales.length < this._pageSize) {
            this._hasMore = false;
        }

        var h = '';

        // ---- Stat cards ----
        h += '<div class="stats-grid">';
        h += '<div class="stat-card"><div class="stat-icon"><i class="fas fa-chart-line"></i></div><div class="stat-label">Total Revenue</div><div class="stat-value" id="statTotalRevenue">KES ' + totalRevenue.toLocaleString() + '</div><div class="stat-sub">All time</div></div>';
        h += '<div class="stat-card"><div class="stat-icon"><i class="fas fa-receipt"></i></div><div class="stat-label">Total Transactions</div><div class="stat-value" id="statTotalCount">' + totalCount + '</div><div class="stat-sub" id="statTotalCountSub">' + todayCount + ' today</div></div>';
        h += '<div class="stat-card"><div class="stat-icon"><i class="fas fa-percent"></i></div><div class="stat-label">Today Revenue</div><div class="stat-value" id="statTodayRevenue">KES ' + todayRevenue.toLocaleString() + '</div><div class="stat-sub" id="statTodayCountSub">' + todayCount + ' transactions</div></div>';
        h += '<div class="stat-card"><div class="stat-icon"><i class="fas fa-calculator"></i></div><div class="stat-label">Avg. Transaction</div><div class="stat-value" id="statAvgTransaction">KES ' + Math.round(avgTransaction).toLocaleString() + '</div><div class="stat-sub">Per sale</div></div>';
        h += '</div>';

        // ---- Today payment breakdown ----
        h += '<div class="card" style="margin-bottom:1.5rem;"><div class="card-header"><h3 class="card-title"><i class="fas fa-calendar-day"></i> Today Payment Summary</h3></div><div class="card-body">';
        h += '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:1rem;">';

        var paymentMethods = {};
        todaySales.forEach(function(s) {
            var pm = s.paymentMethod || 'cash';
            if (!paymentMethods[pm]) paymentMethods[pm] = { count: 0, total: 0 };
            paymentMethods[pm].count++;
            paymentMethods[pm].total += Number(s.total || 0);
        });

        var icons = { cash: '💰', mpesa: '📱', card: '💳', credit: '📋', till: '🏧' };
        for (var pm in paymentMethods) {
            h += '<div style="background:white;border:1px solid #ddd;border-radius:1rem;padding:1rem;text-align:center;">';
            h += '<div style="font-size:2rem;">' + (icons[pm] || '💵') + '</div>';
            h += '<div style="font-weight:600;margin:0.5rem 0;">' + pm.toUpperCase() + '</div>';
            h += '<div style="font-size:1.2rem;font-weight:700;color:var(--secondary);">KES ' + paymentMethods[pm].total.toLocaleString() + '</div>';
            h += '<div style="font-size:0.8rem;color:#999;">' + paymentMethods[pm].count + ' sales</div></div>';
        }
        if (Object.keys(paymentMethods).length === 0) {
            h += '<p style="color:#999;text-align:center;padding:1rem;">No sales today yet</p>';
        }
        h += '</div></div></div>';

        // ---- Sales table ----
        h += '<div class="card"><div class="card-header"><h3 class="card-title"><i class="fas fa-history"></i> Sales History</h3><div style="display:flex;gap:0.5rem;flex-wrap:wrap;">';
        // ✅ Debounced search input
        h += '<input type="text" id="saleSearch" class="form-control" placeholder="Search receipt, customer, cashier..." style="width:220px;" oninput="AdminSalesComponent._onSearchInput()">';
        h += '<select id="saleFilter" class="form-control" style="width:140px;" onchange="AdminSalesComponent._filterSales()"><option value="all">All Time</option><option value="today">Today</option><option value="week">This Week</option><option value="month">This Month</option></select>';
        h += '<button class="btn btn-secondary" onclick="AdminSalesComponent.exportSales()"><i class="fas fa-download"></i> Export CSV</button>';
        h += '</div></div><div class="card-body"><div class="table-container" style="overflow-x:auto;">';
        h += '<table class="table" id="salesTable"><thead><tr><th>Receipt No</th><th>Date</th><th>Customer</th><th>Items</th><th>Total</th><th>Payment</th><th>Cashier</th><th>Actions</th></tr></thead><tbody>';

        if (sales.length === 0) {
            h += '<tr><td colspan="8" style="text-align:center;padding:3rem;"><i class="fas fa-receipt" style="font-size:3rem;color:var(--gray-400);display:block;margin-bottom:1rem;"></i><p>No sales recorded yet</p></td></tr>';
        } else {
            for (var i = 0; i < sales.length; i++) {
                h += this._buildSaleRowHtml(sales[i]);
            }
        }
        h += '</tbody></table></div>';

        // ---- Load More button ----
        var btnLabel = sales.length === 0
            ? '<i class="fas fa-arrow-down"></i> Load Sales'
            : '<i class="fas fa-arrow-down"></i> Load More';
        var btnInfo = sales.length > 0 ? 'Showing ' + sales.length + ' sales' : '';

        h += '<div id="loadMoreContainer" style="text-align:center;padding:1.25rem 0 0.5rem;">';
        if (!this._hasMore && sales.length > 0) {
            h += '<button id="loadMoreSalesBtn" class="btn btn-secondary" disabled><i class="fas fa-check"></i> All Sales Loaded</button>';
            if (btnInfo) btnInfo = 'Showing all ' + sales.length + ' sales';
        } else {
            h += '<button id="loadMoreSalesBtn" class="btn btn-secondary" onclick="AdminSalesComponent.loadMore()">' + btnLabel + '</button>';
        }
        h += '<div id="loadMoreInfo" style="color:#999;font-size:0.85rem;margin-top:0.5rem;">' + btnInfo + '</div>';
        h += '</div>';

        h += '</div></div>';

        return h;
    },

    // ✅ Build a single <tr> for a sale — extracted so Load More can append more
    _buildSaleRowHtml(s) {
        var d = new Date(s.date);
        var itemCount = s.items ? s.items.length : 0;

        var itemsPreview = '';
        if (s.items && s.items.length > 0) {
            var previewItems = s.items.slice(0, 2);
            itemsPreview = previewItems.map(function(item) {
                var qtyDisplay = item.quantity;
                var unitDisplay = '';
                if (item.soldInUnit && item.conversionFactor > 0) {
                    unitDisplay = ' ' + item.soldInUnit;
                }
                return item.productName + ' ×' + qtyDisplay + unitDisplay;
            }).join('<br>');
            if (s.items.length > 2) {
                itemsPreview += '<br><small style="color:#999;">+ ' + (s.items.length - 2) + ' more...</small>';
            }
        }

        var h = '';
        h += '<tr data-search="' + (s.receiptNo||'').toLowerCase() + ' ' + (s.customerName||'').toLowerCase() + ' ' + (s.cashierName||'').toLowerCase() + '" data-date="' + (s.date||'') + '">';
        h += '<td><strong style="font-family:monospace;">' + (s.receiptNo || '-') + '</strong></td>';
        h += '<td><small>' + d.toLocaleDateString('en-KE') + '<br>' + d.toLocaleTimeString('en-KE',{hour:'2-digit',minute:'2-digit'}) + '</small></td>';
        h += '<td>' + (s.customerName || 'Walk-in') + (s.isCredit ? ' <span class="badge badge-warning">CREDIT</span>' : '') + '</td>';
        h += '<td><small>' + (itemsPreview || itemCount + ' items') + '</small></td>';
        h += '<td><strong style="color:var(--secondary);">KES ' + Number(s.total || 0).toLocaleString() + '</strong></td>';
        h += '<td><span class="badge badge-info">' + (s.paymentMethod || 'cash').toUpperCase() + '</span>' + (s.mpesaRef ? '<br><small style="color:#10b981;">Ref: ' + s.mpesaRef + '</small>' : '') + '</td>';
        h += '<td>' + (s.cashierName || 'N/A') + '</td>';
        h += '<td><div style="display:flex;gap:0.25rem;">';
        h += '<button class="btn btn-sm btn-primary" onclick="AdminSalesComponent.viewReceipt(\'' + (s.receiptNo || '') + '\')" title="View Receipt"><i class="fas fa-eye"></i></button>';
        h += '<button class="btn btn-sm btn-secondary" onclick="AdminSalesComponent.printReceipt(\'' + (s.receiptNo || '') + '\')" title="Print Receipt"><i class="fas fa-print"></i></button>';
        if (s.isCredit && !s.isVoid) {
            h += '<button class="btn btn-sm btn-warning" onclick="AdminSalesComponent.viewCreditDetails(' + s.id + ')" title="Credit Details"><i class="fas fa-file-invoice"></i></button>';
        }
        h += '</div></td></tr>';
        return h;
    },

    // ============================================
    // LOAD MORE
    // ============================================
    async loadMore() {
        if (this._isLoadingMore || !this._hasMore) return;
        this._isLoadingMore = true;
        this._setLoadMoreBtnState('loading');

        try {
            // ✅ Offset = whatever's already in cache. Backend treats offset as-is.
            const offset = (SaleService._cache || []).length;

            const result = await SaleService.getAllPaginated({
                page: Math.floor(offset / this._pageSize) + 1,
                limit: this._pageSize
            });

            // If the backend returned fewer than pageSize, that's the end
            const gotFullPage = result.sales && result.sales.length === this._pageSize;

            if (!result.sales || result.sales.length === 0) {
                this._hasMore = false;
                this._setLoadMoreBtnState('end');
                return;
            }

            // Dedupe by id (safety net)
            const existingIds = new Set((SaleService._cache || []).map(function(s) { return s.id; }));
            const newSales = [];
            result.sales.forEach(function(s) {
                if (!existingIds.has(s.id)) {
                    SaleService._cache.push(s);
                    newSales.push(s);
                }
            });

            if (newSales.length === 0) {
                this._hasMore = false;
                this._setLoadMoreBtnState('end');
                return;
            }

            // Append new rows to the table
            const tbody = document.querySelector('#salesTable tbody');
            if (tbody) {
                const html = newSales.map(this._buildSaleRowHtml.bind(this)).join('');
                tbody.insertAdjacentHTML('beforeend', html);
            }

            // Update stat cards
            this._refreshStats();

            // Re-apply any active filter to the new rows
            const hasSearch = (document.getElementById('saleSearch')?.value || '').length > 0;
            const filterVal = document.getElementById('saleFilter')?.value || 'all';
            if (hasSearch || filterVal !== 'all') {
                this._filterSales();
            }

            // ✅ Trust the backend's hasMore, but also short-circuit on a short page
            this._hasMore = gotFullPage && result.pagination && result.pagination.hasMore;
            this._setLoadMoreBtnState(this._hasMore ? 'ready' : 'end');

        } catch (error) {
            console.error('loadMore error:', error);
            this._setLoadMoreBtnState('error');
        } finally {
            this._isLoadingMore = false;
        }
    },

    _setLoadMoreBtnState(state) {
        const btn  = document.getElementById('loadMoreSalesBtn');
        const info = document.getElementById('loadMoreInfo');
        if (!btn) return;

        const total = (SaleService._cache || []).length;

        if (state === 'loading') {
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
            if (info) info.textContent = '';
        } else if (state === 'end') {
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-check"></i> All Sales Loaded';
            if (info) info.textContent = 'Showing all ' + total + ' sales';
        } else if (state === 'error') {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-redo"></i> Retry';
            if (info) info.textContent = 'Failed to load. Click to retry.';
        } else {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-arrow-down"></i> Load More';
            if (info) info.textContent = 'Showing ' + total + ' sales';
        }
    },

    _refreshStats() {
        const stats = SaleService.getStatistics();
        const totalRevenue = Number(stats.total?.revenue || 0);
        const totalCount   = Number(stats.total?.count   || 0);
        const todayRevenue = Number(stats.today?.revenue || 0);
        const todayCount   = Number(stats.today?.count   || 0);
        const avgTransaction = totalCount > 0 ? totalRevenue / totalCount : 0;

        const el = function(id) { return document.getElementById(id); };
        if (el('statTotalRevenue'))   el('statTotalRevenue').textContent   = 'KES ' + totalRevenue.toLocaleString();
        if (el('statTotalCount'))     el('statTotalCount').textContent     = totalCount;
        if (el('statTotalCountSub'))  el('statTotalCountSub').textContent  = todayCount + ' today';
        if (el('statTodayRevenue'))   el('statTodayRevenue').textContent   = 'KES ' + todayRevenue.toLocaleString();
        if (el('statTodayCountSub'))  el('statTodayCountSub').textContent  = todayCount + ' transactions';
        if (el('statAvgTransaction')) el('statAvgTransaction').textContent = 'KES ' + Math.round(avgTransaction).toLocaleString();
    },

    // ============================================
    // VIEW RECEIPT
    // ============================================
    viewReceipt(receiptNo) {
        var sales = SaleService._cache || [];
        var sale = sales.find(function(s) { return s.receiptNo === receiptNo; });
        if (!sale) {
            SaleService.getByReceipt(receiptNo).then(function(fetchedSale) {
                if (fetchedSale && !fetchedSale.error) {
                    AdminSalesComponent._showReceiptModal(fetchedSale);
                } else {
                    showStyledAlert('Not Found', 'Receipt not found!', 'times-circle', '#ef4444');
                }
            });
            return;
        }
        this._showReceiptModal(sale);
    },

    _showReceiptModal(sale) {
        var m = document.createElement('div'); m.className = 'modal-overlay';
        m.innerHTML = '<div class="modal modal-lg"><div class="modal-header" style="background:linear-gradient(135deg,#1a472a,#c49a2b);color:white;"><h3 style="color:white;"><i class="fas fa-receipt"></i> Receipt: ' + sale.receiptNo + '</h3><button class="btn btn-sm" style="color:white;" onclick="this.closest(\'.modal-overlay\').remove()">X</button></div><div class="modal-body">' + SaleService.generateReceiptHTML(sale) + '</div><div class="modal-footer"><button class="btn btn-primary" onclick="window.print()"><i class="fas fa-print"></i> Print</button><button class="btn btn-outline" onclick="this.closest(\'.modal-overlay\').remove()">Close</button></div></div>';
        document.body.appendChild(m);
        m.onclick = function(e) { if (e.target === m) m.remove(); };
    },

    // ============================================
    // PRINT RECEIPT
    // ============================================
    printReceipt(receiptNo) {
        var sales = SaleService._cache || [];
        var sale = sales.find(function(s) { return s.receiptNo === receiptNo; });
        if (!sale) {
            SaleService.getByReceipt(receiptNo).then(function(fetchedSale) {
                if (fetchedSale && !fetchedSale.error) {
                    AdminSalesComponent._printReceiptWindow(fetchedSale);
                }
            });
            return;
        }
        this._printReceiptWindow(sale);
    },

    _printReceiptWindow(sale) {
        var w = window.open('', '_blank', 'width=450,height=600');
        w.document.write('<!DOCTYPE html><html><head><title>Receipt - ' + sale.receiptNo + '</title><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet"><style>body{font-family:Inter;padding:20px;}@media print{body{padding:0;}}</style></head><body>' + SaleService.generateReceiptHTML(sale) + '<script>setTimeout(function(){window.print();},500);<\/script></body></html>');
        w.document.close();
    },

    // ============================================
    // ✅ Shared credit-sales cache
    // ============================================
    async _getCreditSalesCache(forceFresh) {
        var now = Date.now();
        if (!forceFresh && this._creditSalesCache && (now - this._creditSalesFetchedAt) < this._CREDIT_SALES_TTL_MS) {
            return this._creditSalesCache;
        }
        try {
            var data = await ApiService.get('/credit-sales?limit=1000');
            this._creditSalesCache = Array.isArray(data) ? data : [];
            this._creditSalesFetchedAt = now;
        } catch(e) {
            if (!this._creditSalesCache) this._creditSalesCache = [];
        }
        return this._creditSalesCache;
    },

    // ============================================
    // CREDIT DETAILS — now uses cached lookup
    // ============================================
    async viewCreditDetails(saleId) {
        var sales = SaleService._cache || [];
        var sale = sales.find(function(s) { return s.id === saleId; });
        if (!sale) return;

        var creditSales = await this._getCreditSalesCache();
        var creditSale = creditSales.find(function(cs) { return cs.saleId === saleId; });

        var m = document.createElement('div'); m.className = 'modal-overlay';
        var h = '<div class="modal modal-lg"><div class="modal-header" style="background:linear-gradient(135deg,#f59e0b,#d97706);color:white;"><h3 style="color:white;"><i class="fas fa-file-invoice"></i> Credit Sale Details</h3><button class="btn btn-sm" style="color:white;" onclick="this.closest(\'.modal-overlay\').remove()">X</button></div><div class="modal-body">';

        h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1rem;">';
        h += '<div style="background:#f5f5f5;padding:1rem;border-radius:0.5rem;">';
        h += '<strong>Receipt:</strong> ' + sale.receiptNo + '<br>';
        h += '<strong>Customer:</strong> ' + (sale.customerName || 'Walk-in') + '<br>';
        h += '<strong>Date:</strong> ' + new Date(sale.date).toLocaleDateString('en-KE') + '<br>';
        h += '<strong>Cashier:</strong> ' + (sale.cashierName || 'N/A');
        h += '</div>';

        if (creditSale) {
            h += '<div style="background:#fff8e1;padding:1rem;border-radius:0.5rem;">';
            h += '<strong>Debt Before:</strong> KES ' + Number(creditSale.debtBefore || 0).toLocaleString() + '<br>';
            h += '<strong>Credit Amount:</strong> KES ' + Number(creditSale.amount || 0).toLocaleString() + '<br>';
            h += '<strong>Debt After:</strong> <span style="color:#ef4444;font-weight:700;">KES ' + Number(creditSale.debtAfter || 0).toLocaleString() + '</span>';
            h += '</div>';
        }
        h += '</div>';

        h += '<h4>Items</h4>';
        h += '<table class="table"><thead><tr><th>Product</th><th>Qty</th><th>Unit</th><th>Price</th><th>Total</th></tr></thead><tbody>';
        if (sale.items) {
            sale.items.forEach(function(item) {
                var unitDisplay = '';
                if (item.soldInUnit && item.conversionFactor > 0) {
                    unitDisplay = item.soldInUnit;
                }
                h += '<tr>';
                h += '<td>' + item.productName + '</td>';
                h += '<td>' + item.quantity + '</td>';
                h += '<td>' + (unitDisplay || '-') + '</td>';
                h += '<td>KES ' + Number(item.price || 0).toLocaleString() + '</td>';
                h += '<td>KES ' + Number(item.total || (item.price * item.quantity) || 0).toLocaleString() + '</td>';
                h += '</tr>';
            });
        }
        h += '</tbody></table>';
        h += '<div style="text-align:right;font-size:1.2rem;font-weight:700;margin-top:1rem;">Total: KES ' + Number(sale.total || 0).toLocaleString() + '</div>';

        h += '</div><div class="modal-footer"><button class="btn btn-outline" onclick="this.closest(\'.modal-overlay\').remove()">Close</button></div></div>';
        m.innerHTML = h;
        document.body.appendChild(m);
        m.onclick = function(e) { if (e.target === m) m.remove(); };
    },

    // ============================================
    // EXPORT CSV
    // ============================================
    exportSales() {
        var sales = SaleService._cache || [];
        var csv = 'Receipt No,Date,Customer,Items Count,Items Detail,Subtotal,Tax,Discount,Transport,Total,Payment Method,M-Pesa Ref,Credit,Cashier\n';

        sales.forEach(function(s) {
            var itemsCount = (s.items || []).length;
            var itemsDetail = (s.items || []).map(function(item) {
                var unitInfo = '';
                if (item.soldInUnit && item.conversionFactor > 0) {
                    unitInfo = ' ' + item.soldInUnit;
                }
                return item.productName + ' x' + item.quantity + unitInfo + ' @' + Number(item.price || 0).toLocaleString();
            }).join('; ');

            var row = [
                s.receiptNo || '',
                s.date || '',
                (s.customerName || 'Walk-in').replace(/,/g, ' '),
                itemsCount,
                itemsDetail.replace(/,/g, ' '),
                Number(s.subtotal || 0),
                Number(s.tax || 0),
                Number(s.discount || 0),
                Number(s.transportCost || 0),
                Number(s.total || 0),
                s.paymentMethod || 'cash',
                s.mpesaRef || '',
                s.isCredit ? 'Yes' : 'No',
                s.cashierName || ''
            ];
            csv += row.join(',') + '\n';
        });

        var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'sales_export_' + new Date().toISOString().split('T')[0] + '.csv';
        a.click();
    },

    // ============================================
    // FILTER SALES — now debounced
    // ============================================
    _onSearchInput: function() {
        if (this._filterTimer) clearTimeout(this._filterTimer);
        var self = this;
        this._filterTimer = setTimeout(function() {
            self._filterTimer = null;
            self._filterSales();
        }, this._FILTER_DEBOUNCE_MS);
    },

    _filterSales() {
        var search = (document.getElementById('saleSearch')?.value || '').toLowerCase();
        var filter = document.getElementById('saleFilter')?.value || 'all';
        var rows = document.querySelectorAll('#salesTable tbody tr');
        var visibleCount = 0;

        // ✅ Compute "now" once
        var now = new Date();
        var todayStr = now.toDateString();
        var weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        var nowMonth = now.getMonth();
        var nowYear = now.getFullYear();

        for (var i = 0; i < rows.length; i++) {
            var row = rows[i];
            var text = row.dataset.search || '';
            var dateStr = row.dataset.date;
            var show = true;

            if (search) {
                show = text.indexOf(search) > -1;
            }

            if (show && dateStr && filter !== 'all') {
                var date = new Date(dateStr);
                if (filter === 'today') {
                    show = date.toDateString() === todayStr;
                } else if (filter === 'week') {
                    show = date >= weekAgo;
                } else if (filter === 'month') {
                    show = date.getMonth() === nowMonth && date.getFullYear() === nowYear;
                }
            }

            row.style.display = show ? '' : 'none';
            if (show) visibleCount++;
        }

        var existingMsg = document.getElementById('noSaleResults');
        if (existingMsg) existingMsg.remove();

        if (visibleCount === 0 && rows.length > 0) {
            var tbody = document.querySelector('#salesTable tbody');
            if (tbody) {
                var msg = document.createElement('tr');
                msg.id = 'noSaleResults';
                msg.innerHTML = '<td colspan="8" style="text-align:center;padding:2rem;color:#999;"><i class="fas fa-search" style="font-size:2rem;display:block;margin-bottom:0.5rem;"></i>No sales match your search</td>';
                tbody.appendChild(msg);
            }
        }
    }
};

// Make globally available
window.AdminSalesComponent = AdminSalesComponent;
