// ============================================
// ADMIN SALES - With JWT Authentication
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
        
        var icons = { cash: '💰', mpesa: '📱', card: '💳', credit: '📋' };
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
        h += '<input type="text" id="saleSearch" class="form-control" placeholder="Search..." style="width:200px;" oninput="AdminSalesComponent._filterSales()">';
        h += '<select id="saleFilter" class="form-control" style="width:140px;" onchange="AdminSalesComponent._filterSales()"><option value="all">All</option><option value="today">Today</option><option value="week">Week</option><option value="month">Month</option></select>';
        h += '<button class="btn btn-secondary" onclick="AdminSalesComponent.exportSales()"><i class="fas fa-download"></i> Export CSV</button>';
        h += '</div></div><div class="card-body"><div class="table-container"><table class="table" id="salesTable"><thead><tr><th>Receipt No</th><th>Date</th><th>Customer</th><th>Items</th><th>Total</th><th>Payment</th><th>Cashier</th><th>Actions</th></tr></thead><tbody>';
        
        if (sales.length === 0) {
            h += '<tr><td colspan="8" style="text-align:center;padding:3rem;"><i class="fas fa-receipt" style="font-size:3rem;color:var(--gray-400);"></i><p>No sales recorded yet</p></td></tr>';
        } else {
            sales.forEach(function(s) {
                var d = new Date(s.date);
                var itemCount = s.items ? s.items.length : 0;
                h += '<tr data-search="' + (s.receiptNo||'').toLowerCase() + ' ' + (s.customerName||'').toLowerCase() + ' ' + (s.cashierName||'').toLowerCase() + '" data-date="' + (s.date||'') + '">';
                h += '<td><strong>' + (s.receiptNo || '-') + '</strong></td>';
                h += '<td><small>' + d.toLocaleDateString('en-KE') + '<br>' + d.toLocaleTimeString('en-KE',{hour:'2-digit',minute:'2-digit'}) + '</small></td>';
                h += '<td>' + (s.customerName || 'Walk-in') + '</td>';
                h += '<td>' + itemCount + ' items</td>';
                h += '<td><strong style="color:var(--secondary);">KES ' + Number(s.total || 0).toLocaleString() + '</strong></td>';
                h += '<td><span class="badge badge-info">' + (s.paymentMethod || 'cash').toUpperCase() + '</span></td>';
                h += '<td>' + (s.cashierName || 'N/A') + '</td>';
                h += '<td><div style="display:flex;gap:0.25rem;">';
                h += '<button class="btn btn-sm btn-primary" onclick="AdminSalesComponent.viewReceipt(\'' + (s.receiptNo || '') + '\')" title="View Receipt"><i class="fas fa-eye"></i></button>';
                h += '<button class="btn btn-sm btn-secondary" onclick="AdminSalesComponent.printReceipt(\'' + (s.receiptNo || '') + '\')" title="Print Receipt"><i class="fas fa-print"></i></button>';
                h += '</div></td></tr>';
            });
        }
        h += '</tbody></table></div></div></div>';
        
        return h;
    },

    viewReceipt(receiptNo) {
        var sales = SaleService._cache || [];
        var sale = sales.find(function(s) { return s.receiptNo === receiptNo; });
        if (sale) {
            var m = document.createElement('div'); m.className = 'modal-overlay';
            m.innerHTML = '<div class="modal modal-lg"><div class="modal-header" style="background:linear-gradient(135deg,#1a472a,#c49a2b);color:white;"><h3 style="color:white;"><i class="fas fa-receipt"></i> Receipt: ' + sale.receiptNo + '</h3><button class="btn btn-sm" style="color:white;" onclick="this.closest(\'.modal-overlay\').remove()">X</button></div><div class="modal-body">' + SaleService.generateReceiptHTML(sale) + '</div><div class="modal-footer"><button class="btn btn-primary" onclick="window.print()"><i class="fas fa-print"></i> Print</button><button class="btn btn-outline" onclick="this.closest(\'.modal-overlay\').remove()">Close</button></div></div>';
            document.body.appendChild(m);
            m.onclick = function(e) { if (e.target === m) m.remove(); };
        }
    },

    printReceipt(receiptNo) {
        var sales = SaleService._cache || [];
        var sale = sales.find(function(s) { return s.receiptNo === receiptNo; });
        if (!sale) return;
        var w = window.open('', '_blank', 'width=450,height=600');
        w.document.write('<!DOCTYPE html><html><head><title>Receipt</title><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet"><style>body{font-family:Inter;padding:20px;}@media print{body{padding:0;}}</style></head><body>' + SaleService.generateReceiptHTML(sale) + '<script>setTimeout(function(){window.print();},500);</script></body></html>');
        w.document.close();
    },

    exportSales() {
        var csv = 'Receipt No,Date,Customer,Items,Total,Payment,Cashier\n';
        (SaleService._cache || []).forEach(function(s) {
            csv += [s.receiptNo, s.date, s.customerName, (s.items||[]).length, Number(s.total||0), s.paymentMethod, s.cashierName].join(',') + '\n';
        });
        var blob = new Blob([csv], { type: 'text/csv' });
        var a = document.createElement('a'); 
        a.href = URL.createObjectURL(blob); 
        a.download = 'sales_' + Date.now() + '.csv'; 
        a.click();
    },

    _filterSales() {
        var search = (document.getElementById('saleSearch')?.value || '').toLowerCase();
        var filter = document.getElementById('saleFilter')?.value || 'all';
        var rows = document.querySelectorAll('#salesTable tbody tr');
        rows.forEach(function(row) {
            var text = row.dataset.search || '';
            var date = new Date(row.dataset.date);
            var now = new Date();
            var show = true;
            if (search) show = text.includes(search);
            if (show && filter === 'today') show = date.toDateString() === now.toDateString();
            else if (show && filter === 'week') { 
                var weekAgo = new Date(now.getTime() - 7*24*60*60*1000); 
                show = date >= weekAgo; 
            }
            else if (show && filter === 'month') show = date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
            row.style.display = show ? '' : 'none';
        });
    }
};

// Make globally available
window.AdminSalesComponent = AdminSalesComponent;
