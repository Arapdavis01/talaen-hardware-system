// ============================================
// CASHIER DASHBOARD - With JWT Authentication
// ============================================

const CashierDashboardComponent = {
    _creditLoaded: false,
    _currentView: 'overview',
    _allFilteredSales: [],
    _allFilteredReturns: [],
    _allDailyReports: [],
    _allDebtPayments: [],

    // ✅ Helper to get current user from JWT
    _getCurrentUser() {
        const userJson = localStorage.getItem('user');
        try {
            return userJson ? JSON.parse(userJson) : null;
        } catch (e) {
            return null;
        }
    },

    render() {
        var user = this._getCurrentUser();
        
        var h = '';
        h += '<div class="welcome-banner" style="text-align:center;padding:1.5rem;">';
        h += '<img src="../assets/talaen02.jpg" style="width:60px;height:60px;border-radius:12px;object-fit:cover;margin-bottom:0.5rem;">';
        h += '<h2>Welcome, ' + (user?.fullName || 'Cashier') + '!</h2>';
        h += '<button class="btn btn-lg" style="background:white;color:var(--primary);padding:0.75rem 2rem;font-size:1.1rem;" onclick="AppRouter.navigate(\'pos\')">';
        h += '<i class="fas fa-shopping-cart"></i> START NEW SALE (POS)</button></div>';
        
        // Announcement Banner
        h += '<div id="announcementBanner" style="display:none;text-align:center;padding:1rem;margin-bottom:1.5rem;background:linear-gradient(135deg,#fef3c7,#fde68a);border-radius:1rem;font-size:1.2rem;font-weight:700;color:#92400e;border:2px solid #f59e0b;"></div>';
        
        h += '<div id="cashierContent">';
        if (this._currentView === 'sales') {
            h += this._renderSalesTab();
        } else if (this._currentView === 'returns') {
            h += this._renderReturnsTab();
        } else if (this._currentView === 'credit') {
            h += this._renderCreditTab();
        } else if (this._currentView === 'reports') {
            h += this._renderReportsTab();
        } else {
            h += this._renderOverview();
        }
        h += '</div>';
        
        setTimeout(function() { CashierDashboardComponent.loadStats(); }, 200);
        setInterval(function() { CashierDashboardComponent.loadCreditOnly(); }, 15000);
        return h;
    },

    _switchTab(tab) {
        this._currentView = tab;
        var content = document.getElementById('cashierContent');
        if (!content) return;
        
        switch(tab) {
            case 'overview': content.innerHTML = this._renderOverview(); this.loadStats(); break;
            case 'sales': content.innerHTML = this._renderSalesTab(); this._loadMySales(); break;
            case 'returns': content.innerHTML = this._renderReturnsTab(); this._loadMyReturns(); break;
            case 'credit': content.innerHTML = this._renderCreditTab(); this._loadCreditSales(); break;
            case 'reports': content.innerHTML = this._renderReportsTab(); this._loadReports(); break;
        }
    },

    _showCalendar() {
        var now = new Date();
        var currentMonth = now.getMonth();
        var currentYear = now.getFullYear();
        var selectedDate = null;
        var self = this;
        
        var m = document.createElement('div'); m.className = 'modal-overlay';
        m.innerHTML = '<div class="modal" style="max-width:380px;"><div class="modal-header" style="background:linear-gradient(135deg,#1a472a,#c49a2b);color:white;"><h3 style="color:white;"><i class="fas fa-calendar-alt"></i> <span id="calMonthYear"></span></h3><button class="btn btn-sm" style="color:white;" onclick="this.closest(\'.modal-overlay\').remove()">X</button></div><div class="modal-body" style="text-align:center;">' +
            '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;">' +
            '<button class="btn btn-sm btn-outline" id="calPrev"><i class="fas fa-chevron-left"></i></button>' +
            '<strong style="font-size:1.2rem;" id="calTitle"></strong>' +
            '<button class="btn btn-sm btn-outline" id="calNext"><i class="fas fa-chevron-right"></i></button></div>' +
            '<div id="calendarGrid" style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;"></div>' +
            '<div style="margin-top:1rem;padding-top:0.5rem;border-top:1px solid #ddd;text-align:center;color:var(--primary);font-weight:700;font-size:1.1rem;" id="calSelectedDate"></div>' +
            '</div><div class="modal-footer" style="justify-content:center;"><button class="btn btn-primary" onclick="this.closest(\'.modal-overlay\').remove()">Close</button></div></div>';
        document.body.appendChild(m);
        m.onclick = function(e) { if (e.target === m) m.remove(); };
        
        function renderCalendar(month, year) {
            document.getElementById('calTitle').textContent = new Date(year, month).toLocaleDateString('en-KE', {month:'long', year:'numeric'});
            document.getElementById('calMonthYear').textContent = new Date(year, month).toLocaleDateString('en-KE', {month:'long', year:'numeric'});
            var grid = document.getElementById('calendarGrid');
            var days = ['Su','Mo','Tu','We','Th','Fr','Sa'];
            var html = '';
            days.forEach(function(d) { html += '<div style="font-weight:700;color:var(--gray-500);padding:4px;font-size:0.8rem;">' + d + '</div>'; });
            var firstDay = new Date(year, month, 1).getDay();
            var daysInMonth = new Date(year, month + 1, 0).getDate();
            var today = new Date();
            for (var i = 0; i < firstDay; i++) html += '<div></div>';
            for (var d = 1; d <= daysInMonth; d++) {
                var isToday = (d === today.getDate() && month === today.getMonth() && year === today.getFullYear());
                var isSelected = (selectedDate && d === selectedDate.getDate() && month === selectedDate.getMonth() && year === selectedDate.getFullYear());
                var bg = isSelected ? 'var(--primary)' : isToday ? '#fef3c7' : 'transparent';
                var color = isSelected ? 'white' : isToday ? 'var(--primary)' : '#333';
                var fw = (isToday || isSelected) ? '700' : '400';
                var border = isToday ? '2px solid var(--secondary)' : '1px solid transparent';
                html += '<div onclick="CashierDashboardComponent._selectCalDate(' + d + ',' + month + ',' + year + ')" style="cursor:pointer;padding:8px;border-radius:8px;background:' + bg + ';color:' + color + ';font-weight:' + fw + ';border:' + border + ';transition:all 0.2s;" onmouseover="this.style.background=\'' + (isSelected ? 'var(--primary)' : '#f0f0f0') + '\'" onmouseout="this.style.background=\'' + bg + '\'">' + d + '</div>';
            }
            grid.innerHTML = html;
        }
        
        this._selectCalDate = function(d, m, y) {
            selectedDate = new Date(y, m, d);
            document.getElementById('calSelectedDate').innerHTML = '📅 ' + selectedDate.toLocaleDateString('en-KE', {weekday:'long', day:'numeric', month:'long', year:'numeric'});
            renderCalendar(m, y);
        };
        
        document.getElementById('calPrev').onclick = function() { currentMonth--; if(currentMonth<0){currentMonth=11;currentYear--;} renderCalendar(currentMonth, currentYear); };
        document.getElementById('calNext').onclick = function() { currentMonth++; if(currentMonth>11){currentMonth=0;currentYear++;} renderCalendar(currentMonth, currentYear); };
        
        renderCalendar(currentMonth, currentYear);
    },

    _renderOverview() {
        var h = '';
        
        h += '<div class="card" style="margin-bottom:1.5rem;cursor:pointer;" onclick="CashierDashboardComponent._showCalendar()">';
        h += '<div class="card-body" style="text-align:center;padding:1.5rem;">';
        h += '<div style="display:flex;align-items:center;justify-content:center;gap:1rem;">';
        h += '<div style="font-size:3rem;">📅</div>';
        h += '<div style="text-align:left;">';
        h += '<div style="font-size:0.9rem;color:var(--gray-500);">' + new Date().toLocaleDateString('en-KE', {weekday:'long'}) + '</div>';
        h += '<div style="font-size:2rem;font-weight:700;color:var(--primary);">' + new Date().toLocaleDateString('en-KE', {day:'numeric', month:'long', year:'numeric'}) + '</div>';
        h += '<div style="font-size:0.85rem;color:var(--gray-400);"><i class="fas fa-calendar-alt"></i> Click to view calendar</div>';
        h += '</div></div></div></div>';
        
        h += '<div class="stats-grid" id="cashierStats">';
        h += '<div class="stat-card"><div class="stat-icon"><i class="fas fa-chart-line"></i></div><div class="stat-label">My Today Sales</div><div class="stat-value">KES 0</div><div class="stat-sub">0 transactions</div></div>';
        h += '<div class="stat-card"><div class="stat-icon"><i class="fas fa-chart-bar"></i></div><div class="stat-label">My Total Sales</div><div class="stat-value">KES 0</div><div class="stat-sub">0 transactions</div></div>';
        h += '<div class="stat-card"><div class="stat-icon"><i class="fas fa-box"></i></div><div class="stat-label">Available Products</div><div class="stat-value">0</div><div class="stat-sub">Ready to sell</div></div>';
        h += '<div class="stat-card" id="creditStatCard"><div class="stat-icon"><i class="fas fa-credit-card"></i></div><div class="stat-label">Outstanding Debt</div><div class="stat-value" style="color:#ef4444;">KES 0</div><div class="stat-sub">Loading...</div></div>';
        h += '</div>';
        
        h += '<div class="card" style="margin-bottom:1.5rem;"><div class="card-header"><h3 class="card-title"><i class="fas fa-users"></i> Credit Customers with Debt</h3></div><div class="card-body"><div id="creditCustomersList">Loading...</div></div></div>';
        
        h += '<div class="card"><div class="card-header"><h3 class="card-title"><i class="fas fa-link"></i> Quick Links</h3></div><div class="card-body" style="text-align:center;padding:2rem;">';
        h += '<button class="btn btn-success btn-lg" style="margin:0.5rem;padding:1.5rem 2rem;" onclick="AppRouter.navigate(\'pos\')"><i class="fas fa-shopping-cart"></i><br>New Sale</button>';
        h += '<button class="btn btn-primary btn-lg" style="margin:0.5rem;padding:1.5rem 2rem;" onclick="AppRouter.navigate(\'cashier-sales\')"><i class="fas fa-list"></i><br>My Sales</button>';
        h += '<button class="btn btn-warning btn-lg" style="margin:0.5rem;padding:1.5rem 2rem;" onclick="AppRouter.navigate(\'cashier-returns\')"><i class="fas fa-exchange-alt"></i><br>Returns</button>';
        h += '</div></div>';
        return h;
    },

    _renderSalesTab() {
        var h = '';
        h += '<div id="todayPaymentSummary" style="margin-bottom:1.5rem;"></div>';
        h += '<div class="card"><div class="card-header" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.5rem;">';
        h += '<h3 class="card-title"><i class="fas fa-receipt"></i> Sales History</h3>';
        h += '<div style="display:flex;gap:0.5rem;align-items:center;flex-wrap:wrap;">';
        h += '<input type="text" id="salesSearchInput" class="form-control" placeholder="Search..." style="width:180px;" oninput="CashierDashboardComponent._filterSalesTable()">';
        h += '<select id="salesCashierFilter" class="form-control" style="width:140px;" onchange="CashierDashboardComponent._loadMySales()"><option value="all">All Cashiers</option><option value="me">My Sales Only</option></select>';
        h += '<select id="salesPaymentFilter" class="form-control" style="width:130px;" onchange="CashierDashboardComponent._loadMySales()"><option value="all">All Payments</option><option value="cash">Cash</option><option value="mpesa">M-PESA</option><option value="credit">Credit</option></select>';
        h += '<button class="btn btn-sm btn-outline" onclick="CashierDashboardComponent._exportSalesCSV()"><i class="fas fa-download"></i> Export CSV</button>';
        h += '</div></div><div class="card-body"><div id="mySalesTable"><p style="text-align:center;padding:2rem;color:#999;">Loading sales...</p></div></div></div>';
        return h;
    },

    async _loadMySales() {
        var user = this._getCurrentUser(); 
        if (!user) return;
        var cashierFilter = document.getElementById('salesCashierFilter')?.value || 'all';
        var paymentFilter = document.getElementById('salesPaymentFilter')?.value || 'all';
        var tableDiv = document.getElementById('mySalesTable'); if (!tableDiv) return;
        tableDiv.innerHTML = '<p style="text-align:center;padding:2rem;"><i class="fas fa-spinner fa-spin"></i> Loading sales...</p>';
        try {
            await SaleService.getAll(); 
            var allSales = SaleService._cache || [];
            var filteredSales = cashierFilter === 'me' ? allSales.filter(function(s) { return s.cashierId == user.id; }) : allSales;
            if (paymentFilter !== 'all') filteredSales = filteredSales.filter(function(s) { return s.paymentMethod === paymentFilter; });
            filteredSales.sort(function(a, b) { return new Date(b.date || 0) - new Date(a.date || 0); });
            this._allFilteredSales = filteredSales;
            this._renderTodaySummary(allSales);
            this._renderSalesTable(filteredSales, tableDiv);
        } catch(e) { 
            console.error('Error loading sales:', e);
            tableDiv.innerHTML = '<p style="text-align:center;color:#ef4444;">Error loading sales.</p>'; 
        }
    },

    _renderTodaySummary(allSales) {
        var today = new Date().toISOString().split('T')[0];
        var todaySales = allSales.filter(function(s) { return s.date && s.date.startsWith(today); });
        var cashSales = todaySales.filter(function(s) { return s.paymentMethod === 'cash'; });
        var mpesaSales = todaySales.filter(function(s) { return s.paymentMethod === 'mpesa'; });
        var creditSales = todaySales.filter(function(s) { return s.paymentMethod === 'credit'; });
        var summaryDiv = document.getElementById('todayPaymentSummary'); if (!summaryDiv) return;
        var html = '<div class="card"><div class="card-header"><h3 class="card-title"><i class="fas fa-calendar-day"></i> Today Payment Summary</h3></div><div class="card-body"><div style="display:flex;gap:1rem;flex-wrap:wrap;">';
        if (mpesaSales.length > 0) html += '<div style="flex:1;min-width:140px;background:#f0fdf4;padding:1rem;border-radius:0.75rem;text-align:center;border:2px solid #10b981;"><div style="font-size:1.5rem;color:#10b981;">📱 MPESA</div><div style="font-size:1.3rem;font-weight:700;color:#10b981;">KES ' + mpesaSales.reduce(function(s,x){return s+Number(x.total||0);},0).toLocaleString() + '</div><div style="font-size:0.85rem;color:#666;">' + mpesaSales.length + ' sales</div></div>';
        if (cashSales.length > 0) html += '<div style="flex:1;min-width:140px;background:#eff6ff;padding:1rem;border-radius:0.75rem;text-align:center;border:2px solid #3b82f6;"><div style="font-size:1.5rem;color:#3b82f6;">💵 CASH</div><div style="font-size:1.3rem;font-weight:700;color:#3b82f6;">KES ' + cashSales.reduce(function(s,x){return s+Number(x.total||0);},0).toLocaleString() + '</div><div style="font-size:0.85rem;color:#666;">' + cashSales.length + ' sales</div></div>';
        if (creditSales.length > 0) html += '<div style="flex:1;min-width:140px;background:#fef3c7;padding:1rem;border-radius:0.75rem;text-align:center;border:2px solid #f59e0b;"><div style="font-size:1.5rem;color:#f59e0b;">💳 CREDIT</div><div style="font-size:1.3rem;font-weight:700;color:#f59e0b;">KES ' + creditSales.reduce(function(s,x){return s+Number(x.total||0);},0).toLocaleString() + '</div><div style="font-size:0.85rem;color:#666;">' + creditSales.length + ' sales</div></div>';
        if (todaySales.length === 0) html += '<p style="text-align:center;color:#999;width:100%;">No sales recorded today yet.</p>';
        html += '</div></div></div>'; 
        summaryDiv.innerHTML = html;
    },

    _renderSalesTable(sales, tableDiv) {
        if (!sales || sales.length === 0) { 
            tableDiv.innerHTML = '<p style="text-align:center;padding:2rem;color:#999;">No sales found.</p>'; 
            return; 
        }
        var html = '<div style="max-height:500px;overflow-y:auto;"><table class="table"><thead><tr><th>Receipt No</th><th>Date</th><th>Customer</th><th>Items</th><th style="text-align:right;">Total</th><th>Payment</th><th>Cashier</th><th>Actions</th></tr></thead><tbody>';
        sales.forEach(function(sale) {
            var itemCount = sale.items ? sale.items.length : 0;
            var pLabel = sale.paymentMethod === 'mpesa' ? 'M-PESA' : sale.paymentMethod === 'credit' ? 'CREDIT' : 'CASH';
            var pColor = sale.paymentMethod === 'credit' ? '#f59e0b' : sale.paymentMethod === 'mpesa' ? '#10b981' : '#3b82f6';
            var dateStr = sale.date ? new Date(sale.date).toLocaleDateString('en-KE') + '<br><small style="color:#999;">' + new Date(sale.date).toLocaleTimeString('en-KE',{hour:'2-digit',minute:'2-digit'}) + '</small>' : '-';
            html += '<tr class="sales-row" data-search="' + (sale.receiptNo||'').toLowerCase() + ' ' + (sale.customerName||'').toLowerCase() + ' ' + (sale.cashierName||'').toLowerCase() + '">';
            html += '<td><strong>' + (sale.receiptNo||'-') + '</strong></td><td>' + dateStr + '</td><td>' + (sale.customerName||'Walk-in') + '</td><td>' + itemCount + ' items</td>';
            html += '<td style="text-align:right;font-weight:700;">KES ' + Number(sale.total||0).toLocaleString() + '</td><td><span style="color:' + pColor + ';font-weight:600;">' + pLabel + '</span></td><td>' + (sale.cashierName||'N/A') + '</td>';
            html += '<td style="white-space:nowrap;"><button class="btn btn-sm btn-outline" onclick="CashierDashboardComponent._viewReceipt(\'' + (sale.receiptNo||'') + '\')" title="View"><i class="fas fa-eye"></i></button> <button class="btn btn-sm btn-primary" onclick="CashierDashboardComponent._reprintReceipt(\'' + (sale.receiptNo||'') + '\')" title="Print"><i class="fas fa-print"></i></button></td></tr>';
        });
        html += '</tbody></table></div>'; 
        tableDiv.innerHTML = html;
    },

    _filterSalesTable() {
        var s = (document.getElementById('salesSearchInput')?.value || '').toLowerCase();
        document.querySelectorAll('.sales-row').forEach(function(r) { 
            r.style.display = (r.getAttribute('data-search')||'').includes(s) ? '' : 'none'; 
        });
    },

    _exportSalesCSV() {
        var sales = this._allFilteredSales; 
        if (!sales || sales.length === 0) { 
            this._showMessage('No data!', 'warning'); 
            return; 
        }
        var csv = 'Receipt No,Date,Customer,Items,Total,Payment,Cashier\n';
        sales.forEach(function(s) { 
            csv += '"' + (s.receiptNo||'') + '","' + (s.date?new Date(s.date).toLocaleDateString('en-KE'):'') + '","' + ((s.customerName||'Walk-in').replace(/,/g,' ')) + '","' + (s.items?s.items.length:0) + '","' + Number(s.total||0).toFixed(2) + '","' + (s.paymentMethod||'cash') + '","' + (s.cashierName||'N/A') + '"\n'; 
        });
        var b = new Blob([csv],{type:'text/csv'}); 
        var a = document.createElement('a'); 
        a.href = window.URL.createObjectURL(b);
        a.download = 'sales_export_' + new Date().toISOString().split('T')[0] + '.csv'; 
        document.body.appendChild(a); 
        a.click(); 
        document.body.removeChild(a);
    },

    _viewReceipt(receiptNo) {
        var self = this;
        // ✅ REPLACED: fetch with ApiService
        ApiService.get('/sales/search/' + encodeURIComponent(receiptNo)).then(function(sale){
            if(sale.error){self._showMessage('Receipt not found!','danger');return;}
            var h = self._buildReceiptHTML(sale);
            var rm = document.createElement('div'); rm.className = 'modal-overlay';
            rm.innerHTML = '<div class="modal modal-lg"><div class="modal-header" style="background:linear-gradient(135deg,#1a472a,#c49a2b);color:white;"><h3 style="color:white;"><i class="fas fa-eye"></i> View Receipt - ' + sale.receiptNo + '</h3><button class="btn btn-sm" style="color:white;" onclick="this.closest(\'.modal-overlay\').remove()">X</button></div><div class="modal-body">' + h + '</div><div class="modal-footer" style="justify-content:center;gap:1rem;"><button class="btn btn-primary btn-lg" onclick="CashierDashboardComponent._printReprintReceipt()"><i class="fas fa-print"></i> Print</button><button class="btn btn-outline" onclick="this.closest(\'.modal-overlay\').remove()">Close</button></div></div>';
            rm._receiptHTML = h; 
            document.body.appendChild(rm); 
            rm.onclick = function(e){if(e.target===rm)rm.remove();};
        });
    },

    _reprintReceipt(receiptNo) {
        var self = this;
        // ✅ REPLACED: fetch with ApiService
        ApiService.get('/sales/search/' + encodeURIComponent(receiptNo)).then(function(sale){
            if(sale.error){self._showMessage('Receipt not found!','danger');return;}
            var h = self._buildReceiptHTML(sale);
            var rm = document.createElement('div'); rm.className = 'modal-overlay';
            rm.innerHTML = '<div class="modal modal-lg"><div class="modal-header" style="background:linear-gradient(135deg,#1a472a,#c49a2b);color:white;"><h3 style="color:white;"><i class="fas fa-print"></i> Print Receipt - ' + sale.receiptNo + '</h3><button class="btn btn-sm" style="color:white;" onclick="this.closest(\'.modal-overlay\').remove()">X</button></div><div class="modal-body">' + h + '</div><div class="modal-footer" style="justify-content:center;gap:1rem;"><button class="btn btn-primary btn-lg" onclick="CashierDashboardComponent._printReprintReceipt()"><i class="fas fa-print"></i> Print</button><button class="btn btn-outline" onclick="this.closest(\'.modal-overlay\').remove()">Close</button></div></div>';
            rm._receiptHTML = h; 
            document.body.appendChild(rm); 
            rm.onclick = function(e){if(e.target===rm)rm.remove();};
        });
    },

    _buildReceiptHTML(sale) {
        var h = '<div style="max-width:400px;margin:0 auto;font-family:Inter;font-size:14px;">';
        h += '<div style="text-align:center;border-bottom:2px dashed #ccc;padding-bottom:10px;margin-bottom:10px;">';
        h += '<img src="../assets/talaen02.jpg" style="width:50px;height:50px;border-radius:10px;object-fit:cover;margin-bottom:5px;"><br>';
        h += '<strong>TALAEN INVESTMENT HARDWARE</strong><br><small>P.O BOX 345, NANDI HILLS</small><br><small style="font-size:9px;">Tel: 0717149902, 0724985188</small><br>';
        h += '<div style="border-top:1px dashed #ccc;border-bottom:1px dashed #ccc;padding:4px 0;margin:8px 0;"><strong style="letter-spacing:1px;">SALES RECEIPT</strong></div>';
        h += '<strong>' + (sale.receiptNo||'') + '</strong></div>';
        h += '<div style="margin-bottom:10px;">';
        h += '<div style="display:flex;justify-content:space-between;padding:2px 0;"><span>Date:</span><span>' + (sale.date?new Date(sale.date).toLocaleDateString('en-KE'):'N/A') + '</span></div>';
        h += '<div style="display:flex;justify-content:space-between;padding:2px 0;"><span>Time:</span><span>' + (sale.date?new Date(sale.date).toLocaleTimeString('en-KE',{hour:'2-digit',minute:'2-digit',second:'2-digit'}):'N/A') + '</span></div>';
        h += '<div style="display:flex;justify-content:space-between;padding:2px 0;"><span>Customer:</span><span>' + (sale.customerName||'Walk-in') + '</span></div>';
        h += '<div style="display:flex;justify-content:space-between;padding:2px 0;"><span>Payment:</span><span>' + (sale.paymentMethod||'cash').toUpperCase() + '</span></div>';
        if(sale.mpesaRef) h += '<div style="display:flex;justify-content:space-between;padding:2px 0;"><span>M-Pesa Ref:</span><span style="color:#10b981;">' + sale.mpesaRef + '</span></div>';
        h += '<div style="display:flex;justify-content:space-between;padding:2px 0;"><span>Cashier:</span><span>' + (sale.cashierName||'N/A') + '</span></div></div>';
        if(sale.items&&sale.items.length>0){h+='<table style="width:100%;border-collapse:collapse;margin:15px 0;"><thead><tr style="border-bottom:2px solid #333;"><th style="text-align:left;padding:4px;">Item</th><th style="text-align:center;padding:4px;">Qty</th><th style="text-align:right;padding:4px;">Price</th><th style="text-align:right;padding:4px;">Total</th></tr></thead><tbody>';sale.items.forEach(function(item){h+='<tr><td style="text-align:left;padding:4px;">'+item.productName+'</td><td style="text-align:center;padding:4px;">'+item.quantity+'</td><td style="text-align:right;padding:4px;">'+(item.price||0).toLocaleString()+'</td><td style="text-align:right;padding:4px;">'+((item.price||0)*(item.quantity||0)).toLocaleString()+'</td></tr>';});h+='</tbody></table>';}
        var st=(sale.subtotal||0),stEx=st/1.16,vatAmt=st-stEx,tc=Number(sale.transportCost)||0,disc=Number(sale.discount)||0,gt=(st-disc)+tc;
        h+='<div style="border-top:2px solid #333;padding-top:10px;">';
        h+='<div style="display:flex;justify-content:space-between;padding:2px 0;"><span>Subtotal (excl. VAT):</span><span>KES '+stEx.toLocaleString(undefined,{minimumFractionDigits:2})+'</span></div>';
        h+='<div style="display:flex;justify-content:space-between;padding:2px 0;"><span>VAT (16%):</span><span>KES '+vatAmt.toLocaleString(undefined,{minimumFractionDigits:2})+'</span></div>';
        if(disc>0)h+='<div style="display:flex;justify-content:space-between;padding:2px 0;color:#ef4444;"><span>Discount:</span><span>-KES '+disc.toLocaleString()+'</span></div>';
        if(tc>0)h+='<div style="display:flex;justify-content:space-between;padding:2px 0;"><span>Transport:</span><span>KES '+tc.toLocaleString()+'</span></div>';
        h+='<div style="display:flex;justify-content:space-between;font-size:1.2em;font-weight:bold;margin:10px 0;padding:5px 0;"><span>TOTAL:</span><span>KES '+gt.toLocaleString()+'</span></div></div>';
        h+='<div style="text-align:center;margin-top:20px;border-top:1px dashed #ccc;padding-top:15px;">';
        h+='<p style="color:#666;margin:0;">Thank you for shopping at</p>';
        h+='<p style="font-weight:700;color:var(--primary);margin:5px 0;">TALAEN INVESTMENT</p><p style="color:#666;margin:0;">Welcome again!</p></div></div>';
        return h;
    },

    _printReprintReceipt() {
        var m = document.querySelector('.modal-overlay');
        var w = window.open('', '_blank', 'width=450,height=600');
        w.document.write('<!DOCTYPE html><html><head><title>Receipt</title><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet"><style>body{font-family:Inter,sans-serif;padding:20px;}@media print{body{padding:0;}}button{background:#1a472a;color:white;border:none;padding:10px 20px;border-radius:8px;cursor:pointer;font-size:16px;}</style></head><body><div style="text-align:center;margin-bottom:20px;"><button onclick="window.print()">Print</button></div>' + (m?._receiptHTML||'') + '<script>setTimeout(function(){window.print();},500);</script></body></html>');
        w.document.close();
    },

    _showMessage(msg, type) {
        var d = document.createElement('div');
        d.style.cssText = 'position:fixed;top:20px;right:20px;z-index:9999;padding:1rem 1.5rem;border-radius:1rem;color:white;font-weight:600;';
        d.style.background = type === 'danger' ? '#ef4444' : type === 'warning' ? '#f59e0b' : '#10b981';
        d.textContent = (type === 'danger' ? '❌ ' : '✅ ') + msg;
        document.body.appendChild(d); 
        setTimeout(function() { d.remove(); }, 3000);
    },

    _renderReturnsTab() {
        var h = '';
        h += '<div id="returnsSummaryCards" style="margin-bottom:1.5rem;"></div>';
        h += '<div class="card"><div class="card-header" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.5rem;">';
        h += '<h3 class="card-title"><i class="fas fa-exchange-alt"></i> Returns & Exchanges</h3>';
        h += '<div style="display:flex;gap:0.5rem;align-items:center;flex-wrap:wrap;">';
        h += '<input type="text" id="returnsSearchInput" class="form-control" placeholder="Search..." style="width:180px;" oninput="CashierDashboardComponent._filterReturnsTable()">';
        h += '<select id="returnsCashierFilter" class="form-control" style="width:140px;" onchange="CashierDashboardComponent._loadMyReturns()"><option value="all">All Cashiers</option><option value="me">My Returns Only</option></select>';
        h += '<select id="returnsTypeFilter" class="form-control" style="width:120px;" onchange="CashierDashboardComponent._loadMyReturns()"><option value="all">All</option><option value="return">Returns</option><option value="exchange">Exchanges</option></select>';
        h += '</div></div><div class="card-body"><div id="myReturnsTable"><p style="text-align:center;padding:2rem;color:#999;">Loading returns...</p></div></div></div>';
        return h;
    },

    async _loadMyReturns() {
        var user = this._getCurrentUser(); 
        if (!user) return;
        var cashierFilter = document.getElementById('returnsCashierFilter')?.value || 'all';
        var typeFilter = document.getElementById('returnsTypeFilter')?.value || 'all';
        var tableDiv = document.getElementById('myReturnsTable'); if (!tableDiv) return;
        tableDiv.innerHTML = '<p style="text-align:center;padding:2rem;"><i class="fas fa-spinner fa-spin"></i> Loading returns...</p>';
        try {
            // ✅ REPLACED: fetch with ApiService
            var allReturns = await ApiService.get('/returns');
            var filteredReturns = cashierFilter === 'me' ? allReturns.filter(function(r) { return r.cashierName === (user.fullName || user.username); }) : allReturns;
            if (typeFilter !== 'all') filteredReturns = filteredReturns.filter(function(r) { return r.returnType === typeFilter; });
            filteredReturns.sort(function(a, b) { return new Date(b.date || 0) - new Date(a.date || 0); });
            this._allFilteredReturns = filteredReturns;
            this._renderReturnsSummary(allReturns);
            this._renderReturnsTable(filteredReturns, tableDiv);
        } catch(e) { 
            console.error('Error loading returns:', e);
            tableDiv.innerHTML = '<p style="text-align:center;color:#ef4444;">Error loading returns.</p>'; 
        }
    },

    _renderReturnsSummary(allReturns) {
        var summaryDiv = document.getElementById('returnsSummaryCards'); if (!summaryDiv) return;
        var returnsOnly = allReturns.filter(function(r) { return r.returnType === 'return'; });
        var exchangesOnly = allReturns.filter(function(r) { return r.returnType === 'exchange'; });
        var totalRefund = allReturns.reduce(function(s, r) { return s + Number(r.returnAmount || 0); }, 0);
        var html = '<div style="display:flex;gap:1rem;flex-wrap:wrap;">';
        html += '<div style="flex:1;min-width:120px;background:white;padding:1.25rem;border-radius:0.75rem;text-align:center;box-shadow:var(--shadow-md);border-left:4px solid #ef4444;"><div style="font-size:1.8rem;font-weight:700;color:#ef4444;">' + returnsOnly.length + '</div><div style="font-size:0.9rem;color:#666;">Returns</div></div>';
        html += '<div style="flex:1;min-width:120px;background:white;padding:1.25rem;border-radius:0.75rem;text-align:center;box-shadow:var(--shadow-md);border-left:4px solid #f59e0b;"><div style="font-size:1.8rem;font-weight:700;color:#f59e0b;">' + exchangesOnly.length + '</div><div style="font-size:0.9rem;color:#666;">Exchanges</div></div>';
        html += '<div style="flex:1;min-width:120px;background:white;padding:1.25rem;border-radius:0.75rem;text-align:center;box-shadow:var(--shadow-md);border-left:4px solid #10b981;"><div style="font-size:1.8rem;font-weight:700;color:#10b981;">KES ' + totalRefund.toLocaleString() + '</div><div style="font-size:0.9rem;color:#666;">Refunded</div></div>';
        html += '<div style="flex:1;min-width:120px;background:white;padding:1.25rem;border-radius:0.75rem;text-align:center;box-shadow:var(--shadow-md);border-left:4px solid #3b82f6;"><div style="font-size:1.8rem;font-weight:700;color:#3b82f6;">' + allReturns.length + '</div><div style="font-size:0.9rem;color:#666;">Total</div></div></div>';
        summaryDiv.innerHTML = html;
    },

    _renderReturnsTable(returns, tableDiv) {
        if (!returns || returns.length === 0) { 
            tableDiv.innerHTML = '<p style="text-align:center;padding:2rem;color:#999;">No returns found.</p>'; 
            return; 
        }
        var html = '<div style="max-height:500px;overflow-y:auto;"><table class="table"><thead><tr><th>Date</th><th>Receipt</th><th>Customer</th><th>Type</th><th>Product</th><th>Qty</th><th>Exchange</th><th style="text-align:right;">Refund</th><th>Cashier</th></tr></thead><tbody>';
        returns.forEach(function(ret) {
            var isExchange = ret.returnType === 'exchange';
            var typeIcon = isExchange ? '🔄 Exchange' : '↩️ Return';
            var typeColor = isExchange ? '#f59e0b' : '#ef4444';
            var exchangeProduct = isExchange ? (ret.exchangeProductName || '-') : '-';
            var refundAmount = ret.returnAmount ? Number(ret.returnAmount) : 0;
            var refundDisplay = refundAmount > 0 ? 'KES ' + refundAmount.toLocaleString() : '-';
            var refundColor = refundAmount > 0 ? '#10b981' : '#999';
            html += '<tr class="returns-row" data-search="' + (ret.originalReceiptNo||'').toLowerCase() + ' ' + (ret.customerName||'').toLowerCase() + ' ' + (ret.productName||'').toLowerCase() + ' ' + (ret.cashierName||'').toLowerCase() + '">';
            html += '<td>' + (ret.date ? new Date(ret.date).toLocaleDateString('en-KE') : '-') + '</td><td><strong>' + (ret.originalReceiptNo || '-') + '</strong></td><td>' + (ret.customerName || 'Walk-in') + '</td><td style="color:' + typeColor + ';font-weight:600;">' + typeIcon + '</td><td>' + (ret.productName || '-') + '</td><td>' + (ret.quantity || 1) + '</td><td>' + exchangeProduct + '</td><td style="text-align:right;font-weight:700;color:' + refundColor + ';">' + refundDisplay + '</td><td>' + (ret.cashierName || 'N/A') + '</td></tr>';
        });
        html += '</tbody></table></div>'; 
        tableDiv.innerHTML = html;
    },

    _filterReturnsTable() {
        var s = (document.getElementById('returnsSearchInput')?.value || '').toLowerCase();
        document.querySelectorAll('.returns-row').forEach(function(r) { 
            r.style.display = (r.getAttribute('data-search')||'').includes(s) ? '' : 'none'; 
        });
    },

    _renderCreditTab() {
        var h = '';
        h += '<div class="card" style="margin-bottom:1.5rem;"><div class="card-header" style="display:flex;justify-content:space-between;align-items:center;"><h3 class="card-title"><i class="fas fa-users"></i> All Credit Customers</h3><button class="btn btn-success btn-sm" onclick="POSComponent.showRegisterCustomer()"><i class="fas fa-user-plus"></i> Register New</button></div><div class="card-body"><div id="creditTabCustomersList">Loading...</div></div></div>';
        h += '<div class="card" style="margin-bottom:1.5rem;"><div class="card-header"><h3 class="card-title"><i class="fas fa-shopping-cart"></i> Recent Credit Sales</h3><small style="color:#f59e0b;">(Active Debtors Only)</small></div><div class="card-body"><div id="recentCreditSalesList">Loading...</div></div></div>';
        h += '<div class="card"><div class="card-header" style="display:flex;justify-content:space-between;align-items:center;"><h3 class="card-title"><i class="fas fa-money-bill"></i> Recent Debt Payments</h3><small style="color:#999;">Last 10</small></div><div class="card-body"><div style="display:flex;gap:0.5rem;margin-bottom:1rem;"><input type="text" id="debtPaymentSearch" class="form-control" placeholder="🔍 Search customer..." style="flex:1;" oninput="CashierDashboardComponent._filterDebtPayments()"><span id="debtPaymentTotal" style="font-weight:700;padding:0.5rem 1rem;background:#f5f5f5;border-radius:0.5rem;">💰 Total: KES 0</span></div><div id="recentDebtPaymentsList">Loading...</div><div id="debtPaymentsPagination" style="text-align:center;margin-top:0.5rem;color:#999;"></div></div></div>';
        return h;
    },

    async _loadCreditSales() {
        var user = this._getCurrentUser(); 
        if (!user) return;
        try {
            // ✅ REPLACED: fetch with ApiService
            var customers = await ApiService.get('/credit-customers');
            var custList = document.getElementById('creditTabCustomersList');
            if (custList) {
                if (customers.length === 0) { 
                    custList.innerHTML = '<p style="text-align:center;color:#999;padding:2rem;">No credit customers registered.</p>'; 
                } else {
                    var tHTML = '<div style="max-height:400px;overflow-y:auto;"><table class="table"><thead><tr><th>Customer</th><th>Phone</th><th>ID Number</th><th>Debt Limit</th><th>Total Debt</th><th>Available</th><th>Usage</th><th>Status</th><th>Actions</th></tr></thead><tbody>';
                    customers.sort(function(a,b){return (b.totalDebt||0)-(a.totalDebt||0);});
                    customers.forEach(function(c){
                        var pct = c.debtLimit>0?Math.round((c.totalDebt/c.debtLimit)*100):0;
                        var available = (c.debtLimit||0)-(c.totalDebt||0);
                        var sColor = pct>80?'#ef4444':pct>50?'#f59e0b':'#10b981';
                        var sText = pct>80?'Critical':pct>50?'Warning':c.totalDebt>0?'Active':'Clear';
                        tHTML += '<tr><td><strong>'+c.name+'</strong></td><td>'+(c.phone||'-')+'</td><td>'+(c.idNumber||'-')+'</td><td>KES '+(c.debtLimit||0).toLocaleString()+'</td><td style="color:#ef4444;font-weight:700;">KES '+(c.totalDebt||0).toLocaleString()+'</td><td style="color:'+sColor+';">KES '+available.toLocaleString()+'</td><td><div style="background:#eee;border-radius:10px;height:8px;width:100px;margin-bottom:2px;"><div style="background:'+sColor+';height:8px;border-radius:10px;width:'+pct+'%;"></div></div><small style="color:'+sColor+';">'+pct+'%</small></td><td><span style="background:'+sColor+'20;color:'+sColor+';padding:0.2rem 0.5rem;border-radius:1rem;font-size:0.8rem;font-weight:600;">'+sText+'</span></td><td style="white-space:nowrap;"><button class="btn btn-sm btn-outline" onclick="POSComponent.viewCustomerDetails('+c.id+')"><i class="fas fa-eye"></i></button> <button class="btn btn-sm btn-success" onclick="POSComponent.showDebtPayment('+c.id+')"><i class="fas fa-money-bill"></i></button></td></tr>';
                    });
                    tHTML += '</tbody></table></div>'; 
                    custList.innerHTML = tHTML;
                }
            }
        } catch(e) {
            console.error('Error loading credit customers:', e);
        }
        
        try {
            await SaleService.getAll(); 
            var allSales = SaleService._cache || [];
            var creditSales = allSales.filter(function(s){return s.paymentMethod==='credit'&&s.total>0;});
            creditSales.sort(function(a,b){return new Date(b.date||0)-new Date(a.date||0);});
            var recentDiv = document.getElementById('recentCreditSalesList');
            if(recentDiv){
                if(creditSales.length===0){recentDiv.innerHTML='<p style="text-align:center;color:#10b981;padding:2rem;">✅ No active credit sales. All debts are cleared!</p>';}
                else{
                    var r = creditSales.slice(0,10);
                    var csHTML = '<div style="max-height:300px;overflow-y:auto;"><table class="table"><thead><tr><th>Date</th><th>Customer</th><th>Receipt</th><th style="text-align:right;">Amount</th><th>Cashier</th></tr></thead><tbody>';
                    r.forEach(function(s){csHTML+='<tr><td>'+(s.date?new Date(s.date).toLocaleDateString('en-KE'):'-')+'</td><td><strong>'+(s.customerName||'Walk-in')+'</strong></td><td>'+(s.receiptNo||'-')+'</td><td style="text-align:right;font-weight:700;color:#ef4444;">KES '+Number(s.total||0).toLocaleString()+'</td><td>'+(s.cashierName||'N/A')+'</td></tr>';});
                    csHTML += '</tbody></table></div>'; 
                    recentDiv.innerHTML = csHTML;
                }
            }
        } catch(e) {
            console.error('Error loading credit sales:', e);
        }
        
        try {
            // ✅ REPLACED: fetch with ApiService - need to get all payments from all customers
            var customers = await ApiService.get('/credit-customers');
            var allPayments = [];
            for (var i = 0; i < customers.length; i++) {
                var payments = await ApiService.get('/debt-payments/' + customers[i].id);
                if (payments && payments.length) {
                    payments.forEach(function(p) { 
                        p.customerName = customers[i].name;
                        p.customerId = customers[i].id;
                        allPayments.push(p); 
                    });
                }
            }
            allPayments.sort(function(a,b){return new Date(b.date||0)-new Date(a.date||0);});
            this._allDebtPayments = allPayments;
            var payDiv = document.getElementById('recentDebtPaymentsList');
            if(payDiv){
                if(allPayments.length===0){payDiv.innerHTML='<p style="text-align:center;color:#999;padding:2rem;">No debt payments recorded.</p>';}
                else{
                    var rp = allPayments.slice(0,10);
                    var totalP = allPayments.reduce(function(s,p){return s+Number(p.amount||0);},0);
                    var totalEl = document.getElementById('debtPaymentTotal'); 
                    if(totalEl) totalEl.innerHTML = '💰 Total: KES ' + totalP.toLocaleString();
                    var payHTML = '<div style="max-height:300px;overflow-y:auto;"><table class="table"><thead><tr><th>Date</th><th>Customer</th><th>Amount</th><th>Method</th><th>Received By</th><th>Action</th></tr></thead><tbody>';
                    rp.forEach(function(p){
                        var dStr = p.date?new Date(p.date).toLocaleDateString('en-KE')+', '+new Date(p.date).toLocaleTimeString('en-KE',{hour:'2-digit',minute:'2-digit',second:'2-digit'}):'-';
                        var mColor = p.paymentMethod==='mpesa'?'#10b981':'#3b82f6';
                        payHTML += '<tr class="payment-row" data-search="'+(p.customerName||'').toLowerCase()+'"><td>'+dStr+'</td><td><strong>'+(p.customerName||'N/A')+'</strong></td><td style="font-weight:700;color:#10b981;">KES '+Number(p.amount||0).toLocaleString()+'</td><td style="color:'+mColor+';font-weight:600;">'+(p.paymentMethod||'CASH').toUpperCase()+'</td><td>'+(p.receivedBy||'N/A')+'</td><td><button class="btn btn-sm btn-outline" onclick="POSComponent.viewCustomerDetails('+(p.customerId||0)+')"><i class="fas fa-eye"></i></button></td></tr>';
                    });
                    payHTML += '</tbody></table></div>'; 
                    payDiv.innerHTML = payHTML;
                    var pagDiv = document.getElementById('debtPaymentsPagination'); 
                    if(pagDiv) pagDiv.innerHTML = 'Showing ' + Math.min(10,allPayments.length) + ' of ' + allPayments.length + ' payments';
                }
            }
        } catch(e) {
            console.error('Error loading debt payments:', e);
        }
    },

    _filterDebtPayments() {
        var s = (document.getElementById('debtPaymentSearch')?.value || '').toLowerCase();
        document.querySelectorAll('.payment-row').forEach(function(r) { 
            r.style.display = (r.getAttribute('data-search')||'').includes(s) ? '' : 'none'; 
        });
    },

    _renderReportsTab() {
        var h = '';
        h += '<div class="card"><div class="card-header" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.5rem;">';
        h += '<h3 class="card-title"><i class="fas fa-file-alt"></i> Daily Reports History</h3>';
        h += '<div style="display:flex;gap:0.5rem;align-items:center;flex-wrap:wrap;">';
        h += '<input type="date" id="reportSearchDate" class="form-control" style="width:180px;" onchange="CashierDashboardComponent._filterDailyReports()">';
        h += '<input type="text" id="reportSearchText" class="form-control" style="width:200px;" placeholder="Search by date..." oninput="CashierDashboardComponent._filterDailyReports()">';
        h += '<button class="btn btn-sm btn-outline" onclick="CashierDashboardComponent._clearReportFilter()">Clear</button>';
        h += '<button class="btn btn-sm btn-primary" onclick="CashierDashboardComponent._printAllReports()"><i class="fas fa-print"></i> Print All</button>';
        h += '</div></div><div class="card-body"><div id="dailyReportsContent"><p style="text-align:center;padding:2rem;color:#999;">Loading reports...</p></div></div></div>';
        return h;
    },

    async _loadReports() {
        var reportDiv = document.getElementById('dailyReportsContent'); 
        if (!reportDiv) return;
        reportDiv.innerHTML = '<p style="text-align:center;padding:2rem;"><i class="fas fa-spinner fa-spin"></i> Generating reports...</p>';
        try {
            await SaleService.getAll(); 
            var allSales = SaleService._cache || [];
            await ProductService.refresh(); 
            var products = ProductService._cache || [];
            var currentTotalStock = products.reduce(function(s,p){return s+(p.stock||0);},0);
            var dailyMap = {};
            allSales.forEach(function(sale){
                if(!sale.date)return; 
                var dk = sale.date.split('T')[0];
                if(!dailyMap[dk]) dailyMap[dk] = {date:dk,totalSales:0,transactions:0,itemsSold:0,stockAdded:0,closingStock:0};
                dailyMap[dk].totalSales += Number(sale.total||0); 
                dailyMap[dk].transactions += 1;
                if(sale.items) sale.items.forEach(function(item){ dailyMap[dk].itemsSold += (item.quantity||0); });
            });
            var dailyReports = Object.values(dailyMap).sort(function(a,b){return new Date(b.date)-new Date(a.date);});
            var stock = currentTotalStock;
            for(var i=dailyReports.length-1;i>=0;i--){ stock += dailyReports[i].itemsSold; stock -= dailyReports[i].stockAdded; dailyReports[i].closingStock = stock; }
            this._allDailyReports = dailyReports;
            this._renderDailyReportsTable(dailyReports, reportDiv);
        } catch(e) { 
            console.error('Error loading reports:', e);
            reportDiv.innerHTML = '<p style="text-align:center;color:#ef4444;">Error generating reports.</p>'; 
        }
    },

    _renderDailyReportsTable(reports, reportDiv) {
        if(!reports||reports.length===0){reportDiv.innerHTML='<p style="text-align:center;padding:2rem;color:#999;">No sales data available.</p>';return;}
        var totalSales=reports.reduce(function(s,r){return s+r.totalSales;},0);
        var totalTrans=reports.reduce(function(s,r){return s+r.transactions;},0);
        var totalItems=reports.reduce(function(s,r){return s+r.itemsSold;},0);
        var html='<div style="margin-bottom:1rem;padding:0.75rem;background:#f5f5f5;border-radius:0.5rem;display:flex;justify-content:space-between;flex-wrap:wrap;"><span>Total Days: <strong>'+reports.length+'</strong></span><span>Total Sales: <strong style="color:var(--primary);">KES '+totalSales.toLocaleString()+'</strong></span><span>Total Transactions: <strong>'+totalTrans+'</strong></span><span>Total Items: <strong>'+totalItems+'</strong></span></div>';
        html+='<div style="max-height:500px;overflow-y:auto;"><table class="table"><thead><tr><th>Date</th><th style="text-align:right;">Sales</th><th style="text-align:center;">Transactions</th><th style="text-align:center;">Items Sold</th><th style="text-align:center;">Stock Added</th><th style="text-align:right;">Closing Stock</th></tr></thead><tbody>';
        reports.forEach(function(r){
            var dObj=new Date(r.date+'T00:00:00');
            html+='<tr class="report-row" data-date="'+r.date+'"><td><strong>'+dObj.toLocaleDateString('en-KE',{weekday:'short',year:'numeric',month:'short',day:'numeric'})+'</strong><br><small style="color:#999;">'+r.date+'</small></td><td style="text-align:right;font-weight:700;color:var(--primary);">KES '+r.totalSales.toLocaleString()+'</td><td style="text-align:center;">'+r.transactions+'</td><td style="text-align:center;">'+r.itemsSold+'</td><td style="text-align:center;">'+r.stockAdded+'</td><td style="text-align:right;font-weight:600;">'+r.closingStock+'</td></tr>';
        });
        html+='</tbody></table></div>'; 
        reportDiv.innerHTML=html;
    },

    _filterDailyReports() {
        var sd = document.getElementById('reportSearchDate')?.value || '';
        var st = (document.getElementById('reportSearchText')?.value || '').toLowerCase();
        document.querySelectorAll('.report-row').forEach(function(r){
            var rd = r.getAttribute('data-date')||''; 
            var rt = (r.textContent||'').toLowerCase();
            r.style.display = ((!sd||rd===sd)&&(!st||rt.includes(st))) ? '' : 'none';
        });
    },

    _clearReportFilter() {
        var di = document.getElementById('reportSearchDate'); 
        if(di) di.value = '';
        var ti = document.getElementById('reportSearchText'); 
        if(ti) ti.value = '';
        this._filterDailyReports();
    },

    _printAllReports() {
        var reports = this._allDailyReports; 
        if(!reports||reports.length===0){this._showMessage('No reports!','warning');return;}
        var ph = '<div style="max-width:800px;margin:0 auto;font-family:Inter;"><div style="text-align:center;margin-bottom:20px;"><h2>TALAEN INVESTMENT HARDWARE</h2><p>P.O BOX 345, NANDI HILLS</p><h3>Daily Reports History</h3><p>Generated: '+new Date().toLocaleString('en-KE')+'</p></div><table style="width:100%;border-collapse:collapse;border:1px solid #ddd;"><tr style="background:#f5f5f5;"><th style="padding:8px;border:1px solid #ddd;">Date</th><th style="text-align:right;">Sales</th><th style="text-align:center;">Transactions</th><th style="text-align:center;">Items Sold</th><th style="text-align:center;">Stock Added</th><th style="text-align:right;">Closing Stock</th></tr>';
        reports.forEach(function(r){ph+='<tr><td style="padding:8px;border:1px solid #ddd;">'+r.date+'</td><td style="text-align:right;">KES '+r.totalSales.toLocaleString()+'</td><td style="text-align:center;">'+r.transactions+'</td><td style="text-align:center;">'+r.itemsSold+'</td><td style="text-align:center;">'+r.stockAdded+'</td><td style="text-align:right;">'+r.closingStock+'</td></tr>';});
        ph+='</table><p style="text-align:center;margin-top:20px;">Printed by: '+(this._getCurrentUser()?.fullName||'Cashier')+'</p></div>';
        var w=window.open('','_blank','width=900,height=600');
        w.document.write('<!DOCTYPE html><html><head><title>Daily Reports</title><style>body{font-family:Inter,sans-serif;padding:20px;}@media print{body{padding:0;}}button{background:#1a472a;color:white;border:none;padding:10px 20px;border-radius:8px;cursor:pointer;font-size:16px;}</style></head><body><div style="text-align:center;margin-bottom:20px;"><button onclick="window.print()">Print</button></div>'+ph+'<script>setTimeout(function(){window.print();},500);</script></body></html>');
        w.document.close();
    },

    async loadStats() {
        var user = this._getCurrentUser(); 
        if (!user) return;
        await SaleService.getAll(); 
        await ProductService.refresh();
        var data = await SaleService.getCashierSales(user.id); 
        var products = ProductService._cache || [];
        var statsDiv = document.getElementById('cashierStats');
        if (statsDiv) {
            var creditHTML = document.getElementById('creditStatCard') ? document.getElementById('creditStatCard').outerHTML : '';
            statsDiv.innerHTML = 
                '<div class="stat-card"><div class="stat-icon"><i class="fas fa-chart-line"></i></div><div class="stat-label">My Today Sales</div><div class="stat-value">KES ' + (data.totalToday||0).toLocaleString() + '</div><div class="stat-sub">' + (data.countToday||0) + ' transactions</div></div>' +
                '<div class="stat-card"><div class="stat-icon"><i class="fas fa-chart-bar"></i></div><div class="stat-label">My Total Sales</div><div class="stat-value">KES ' + (data.totalAll||0).toLocaleString() + '</div><div class="stat-sub">' + (data.countAll||0) + ' transactions</div></div>' +
                '<div class="stat-card"><div class="stat-icon"><i class="fas fa-box"></i></div><div class="stat-label">Available Products</div><div class="stat-value">' + products.length + '</div><div class="stat-sub">' + products.reduce(function(s,p){return s+(p.stock||0);},0) + ' units in stock</div></div>' +
                creditHTML;
        }
        // ✅ REPLACED: fetch with ApiService
        ApiService.get('/settings').then(function(s) {
            var banner = document.getElementById('announcementBanner');
            if (banner && s.announcement) {
                banner.innerHTML = '🎉 ' + s.announcement + ' 🎉';
                banner.style.display = 'block';
            }
        }).catch(function(){});
        await this.loadCreditOnly();
    },

    async loadCreditOnly() {
        try {
            // ✅ REPLACED: fetch with ApiService
            var creditData = await ApiService.get('/credit-summary');
            var creditCard = document.getElementById('creditStatCard');
            if (creditCard && creditData) {
                creditCard.innerHTML = '<div class="stat-icon"><i class="fas fa-credit-card"></i></div><div class="stat-label">Outstanding Debt</div><div class="stat-value" style="color:#ef4444;">KES ' + (creditData.totalDebt || 0).toLocaleString() + '</div><div class="stat-sub">' + (creditData.activeCustomers || 0) + ' customers with debt</div>';
            }
            // ✅ REPLACED: fetch with ApiService
            var customers = await ApiService.get('/credit-customers');
            var debtors = customers.filter(function(c) { return c.totalDebt > 0; });
            var custList = document.getElementById('creditCustomersList');
            if (custList) {
                if (debtors.length === 0) {
                    custList.innerHTML = '<p style="text-align:center;color:#10b981;padding:2rem;"><i class="fas fa-check-circle" style="font-size:2rem;"></i><br>No customers with outstanding debt. Great job!</p>';
                } else { 
                    var tHTML = '<table class="table"><thead><tr><th>Customer</th><th>Phone</th><th>Debt</th><th>Limit</th><th>Available</th></tr></thead><tbody>';
                    debtors.forEach(function(c) { 
                        var pct = Math.round((c.totalDebt / c.debtLimit) * 100); 
                        var color = pct > 80 ? '#ef4444' : pct > 50 ? '#f59e0b' : '#10b981';
                        tHTML += '<tr><td><strong>' + c.name + '</strong></td><td>' + (c.phone || '-') + '</td><td style="color:#ef4444;font-weight:700;">KES ' + c.totalDebt.toLocaleString() + '</td><td>KES ' + c.debtLimit.toLocaleString() + '</td><td style="color:' + color + ';">KES ' + (c.debtLimit - c.totalDebt).toLocaleString() + ' (' + pct + '% used)</td></tr>'; 
                    });
                    tHTML += '</tbody></table>'; 
                    custList.innerHTML = tHTML; 
                }
            }
        } catch(e) {
            console.error('Error loading credit data:', e);
        }
    }
};

// Make globally available
window.CashierDashboardComponent = CashierDashboardComponent;
