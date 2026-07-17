// ============================================
// ADMIN SALES - With JWT Authentication & Dual-Unit Support
// ============================================

const AdminSalesComponent = {
    _currentFilter: 'all',

    render() {
        var sales = SaleService._cache || [];
        var stats = SaleService.getStatistics();
        var todaySales = SaleService.getTodaySales();
        
        // Fix numeric values
        var totalRevenue = Number(stats.total?.revenue || 0);
        var totalCount = Number(stats.total?.count || 0);
        var todayRevenue = Number(stats.today?.revenue || 0);
        var todayCount = Number(stats.today?.count || 0);
        var avgTransaction = totalCount > 0 ? totalRevenue / totalCount : 0;
        
        var h = '';
        
        // Stats Cards
        h += '<div class="stats-grid">';
        h += '<div class="stat-card"><div class="stat-icon"><i class="fas fa-chart-line"></i></div><div class="stat-label">Total Revenue</div><div class="stat-value">KES ' + totalRevenue.toLocaleString() + '</div><div class="stat-sub">All time</div></div>';
        h += '<div class="stat-card"><div class="stat-icon"><i class="fas fa-receipt"></i></div><div class="stat-label">Total Transactions</div><div class="stat-value">' + totalCount + '</div><div class="stat-sub">' + todayCount + ' today</div></div>';
        h += '<div class="stat-card"><div class="stat-icon"><i class="fas fa-percent"></i></div><div class="stat-label">Today Revenue</div><div class="stat-value">KES ' + todayRevenue.toLocaleString() + '</div><div class="stat-sub">' + todayCount + ' transactions</div></div>';
        h += '<div class="stat-card"><div class="stat-icon"><i class="fas fa-calculator"></i></div><div class="stat-label">Avg. Transaction</div><div class="stat-value">KES ' + avgTransaction.toLocaleString() + '</div><div class="stat-sub">Per sale</div></div>';
        h += '</div>';
        
        // Today Payment Breakdown
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
        
        // Sales Table
        h += '<div class="card"><div class="card-header"><h3 class="card-title"><i class="fas fa-history"></i> Sales History</h3><div style="display:flex;gap:0.5rem;flex-wrap:wrap;">';
        h += '<input type="text" id="saleSearch" class="form-control" placeholder="Search receipt, customer, cashier..." style="width:220px;" oninput="AdminSalesComponent._filterSales()">';
        h += '<select id="saleFilter" class="form-control" style="width:140px;" onchange="AdminSalesComponent._filterSales()"><option value="all">All Time</option><option value="today">Today</option><option value="week">This Week</option><option value="month">This Month</option></select>';
        h += '<button class="btn btn-secondary" onclick="AdminSalesComponent.exportSales()"><i class="fas fa-download"></i> Export CSV</button>';
        h += '</div></div><div class="card-body"><div class="table-container" style="overflow-x:auto;">';
        h += '<table class="table" id="salesTable"><thead><tr><th>Receipt No</th><th>Date</th><th>Customer</th><th>Items</th><th>Total</th><th>Payment</th><th>Cashier</th><th>Actions</th></tr></thead><tbody>';
        
        if (sales.length === 0) {
            h += '<tr><td colspan="8" style="text-align:center;padding:3rem;"><i class="fas fa-receipt" style="font-size:3rem;color:var(--gray-400);display:block;margin-bottom:1rem;"></i><p>No sales recorded yet</p></td></tr>';
        } else {
            sales.forEach(function(s) {
                var d = new Date(s.date);
                var itemCount = s.items ? s.items.length : 0;
                
                // Build items preview with dual-unit info
                var itemsPreview = '';
                if (s.items && s.items.length > 0) {
                    var previewItems = s.items.slice(0, 2); // Show first 2 items
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
            });
        }
        h += '</tbody></table></div></div></div>';
        
        return h;
    },

    // ========== VIEW RECEIPT (with dual-unit display) ==========

    viewReceipt(receiptNo) {
        var sales = SaleService._cache || [];
        var sale = sales.find(function(s) { return s.receiptNo === receiptNo; });
        if (!sale) {
            // Try fetching from API
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

    // ========== PRINT RECEIPT ==========

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
        w.document.write('<!DOCTYPE html><html><head><title>Receipt - ' + sale.receiptNo + '</title><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet"><style>body{font-family:Inter;padding:20px;}@media print{body{padding:0;}}</style></head><body>' + SaleService.generateReceiptHTML(sale) + '<script>setTimeout(function(){window.print();},500);</script></body></html>');
        w.document.close();
    },

    // ========== CREDIT DETAILS ==========

    viewCreditDetails(saleId) {
        var sales = SaleService._cache || [];
        var sale = sales.find(function(s) { return s.id === saleId; });
        if (!sale) return;
        
        ApiService.get('/credit-sales').then(function(creditSales) {
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
            
            // Items with dual-unit display
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
        });
    },

    // ========== EXPORT CSV ==========

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

    // ========== FILTER SALES ==========

    _filterSales() {
        var search = (document.getElementById('saleSearch')?.value || '').toLowerCase();
        var filter = document.getElementById('saleFilter')?.value || 'all';
        var rows = document.querySelectorAll('#salesTable tbody tr');
        var visibleCount = 0;
        
        rows.forEach(function(row) {
            var text = (row.dataset.search || '');
            var dateStr = row.dataset.date;
            var date = dateStr ? new Date(dateStr) : null;
            var now = new Date();
            var show = true;
            
            // Search filter
            if (search) {
                show = text.includes(search);
            }
            
            // Date filter
            if (show && date) {
                if (filter === 'today') {
                    show = date.toDateString() === now.toDateString();
                } else if (filter === 'week') { 
                    var weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); 
                    show = date >= weekAgo; 
                } else if (filter === 'month') {
                    show = date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
                }
            }
            
            row.style.display = show ? '' : 'none';
            if (show) visibleCount++;
        });
        
        // Show "no results" message if needed
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
