const AdminDashboardComponent = {
    render() {
        var products = ProductService._cache || [];
        var sales = SaleService._cache || [];
        var lowStock = products.filter(function(p) { return p.stock <= (p.minStock || 10); });
        var today = new Date().toISOString().split('T')[0];
        var todaySales = sales.filter(function(s) { return s.date && s.date.startsWith(today); });
        var todayTotal = todaySales.reduce(function(s, sale) { return Number(s) + Number(sale.total||0); }, 0);
        var allTotal = sales.reduce(function(s, sale) { return Number(s) + Number(sale.total||0); }, 0);
        var totalStock = products.reduce(function(s, p) { return s + (p.stock || 0); }, 0);
        var totalInventoryValue = products.reduce(function(s, p) { return s + ((p.price || 0) * (p.stock || 0)); }, 0);
        
        var html = '<div class="welcome-banner"><h2><i class="fas fa-user-shield"></i> Admin Dashboard</h2><p>Welcome back, Administrator</p></div>';
        
        // Stats Grid - Clickable Cards
        html += '<div class="stats-grid">';
        
        // 1. INVENTORY
        html += '<div class="stat-card" style="border-top:3px solid #3b82f6;cursor:pointer;" onclick="AppRouter.navigate(\'pos\')">';
        html += '<div class="stat-icon"><i class="fas fa-clipboard-list"></i></div>';
        html += '<div class="stat-label">📋 Inventory</div>';
        html += '<div class="stat-value">KES ' + totalInventoryValue.toLocaleString() + '</div>';
        html += '<div class="stat-sub">Stock Value | ' + totalStock.toLocaleString() + ' items in stock</div></div>';
        
        // 2. SALES
        html += '<div class="stat-card" style="border-top:3px solid #10b981;cursor:pointer;" onclick="AppRouter.navigate(\'admin-sales\')">';
        html += '<div class="stat-icon"><i class="fas fa-receipt"></i></div>';
        html += '<div class="stat-label">🧾 Sales</div>';
        html += '<div class="stat-value">KES ' + allTotal.toLocaleString() + '</div>';
        html += '<div class="stat-sub">Total Revenue | Today: KES ' + todayTotal.toLocaleString() + ' (' + todaySales.length + ' sales)</div></div>';
        
        // 3. CREDIT
        html += '<div class="stat-card" id="creditStatCard" style="border-top:3px solid #f59e0b;cursor:pointer;" onclick="AppRouter.navigate(\'admin-credit\')">';
        html += '<div class="stat-icon"><i class="fas fa-credit-card"></i></div>';
        html += '<div class="stat-label">💳 Credit</div>';
        html += '<div class="stat-value" style="color:#ef4444;">KES 0</div>';
        html += '<div class="stat-sub">Loading...</div></div>';
        
        // 4. RETURNS
        html += '<div class="stat-card" id="returnsStatCard" style="border-top:3px solid #8b5cf6;cursor:pointer;" onclick="AppRouter.navigate(\'admin-returns\')">';
        html += '<div class="stat-icon"><i class="fas fa-exchange-alt"></i></div>';
        html += '<div class="stat-label">🔄 Returns/Exchanges</div>';
        html += '<div class="stat-value" style="color:#8b5cf6;">...</div>';
        html += '<div class="stat-sub">Loading...</div></div>';
        
        // 5. PURCHASES
        html += '<div class="stat-card" id="purchasesStatCard" style="border-top:3px solid #ec4899;cursor:pointer;" onclick="AppRouter.navigate(\'admin-purchases\')">';
        html += '<div class="stat-icon"><i class="fas fa-truck"></i></div>';
        html += '<div class="stat-label">🚚 Purchases</div>';
        html += '<div class="stat-value" style="color:#ec4899;">...</div>';
        html += '<div class="stat-sub">Loading...</div></div>';
        
        // 6. PRODUCTS
        html += '<div class="stat-card" style="border-top:3px solid #06b6d4;cursor:pointer;" onclick="AppRouter.navigate(\'admin-products\')">';
        html += '<div class="stat-icon"><i class="fas fa-boxes"></i></div>';
        html += '<div class="stat-label">📦 Products</div>';
        html += '<div class="stat-value">' + products.length + '</div>';
        html += '<div class="stat-sub">' + totalStock.toLocaleString() + ' total stock | ' + lowStock.length + ' low stock</div></div>';
        
        // 7. REPORTS
        html += '<div class="stat-card" style="border-top:3px solid #64748b;cursor:pointer;" onclick="AppRouter.navigate(\'admin-reports\')">';
        html += '<div class="stat-icon"><i class="fas fa-chart-bar"></i></div>';
        html += '<div class="stat-label">📈 Reports</div>';
        html += '<div class="stat-value" style="color:#64748b;">📊</div>';
        html += '<div class="stat-sub">View analytics & reports</div></div>';
        
        html += '</div>';
        
        // Cashier Performance
        html += '<div class="card" style="margin-bottom:1.5rem;"><div class="card-header"><h3 class="card-title"><i class="fas fa-users"></i> Cashier Performance</h3></div><div class="card-body"><div id="cashierTable">Loading...</div></div></div>';
        
        // Credit Customers
        html += '<div class="card" style="margin-bottom:1.5rem;"><div class="card-header"><h3 class="card-title"><i class="fas fa-credit-card"></i> Credit Customers <span id="debtorCount" style="color:#ef4444;"></span></h3></div><div class="card-body"><div id="creditCustomersTable">Loading...</div></div></div>';
        
        // Low Stock
        if (lowStock.length > 0) {
            html += '<div class="card"><div class="card-header"><h3 class="card-title"><i class="fas fa-exclamation-circle"></i> Low Stock</h3></div><div class="card-body"><table class="table"><thead><tr><th>Product</th><th>Brand</th><th>Stock</th></tr></thead><tbody>';
            lowStock.forEach(function(p) { html += '<tr><td><strong>' + p.name + '</strong></td><td>' + (p.brand||'-') + '</td><td><span class="badge badge-danger">' + p.stock + ' ' + p.unit + '</span></td></tr>'; });
            html += '</tbody></table></div></div>';
        }
        
        setTimeout(function() { AdminDashboardComponent.loadStats(); }, 200);
        setInterval(function() { AdminDashboardComponent.loadCreditOnly(); }, 15000);
        return html;
    },

    async loadStats() {
        try {
            var summary = await SaleService.getCashiersSummary();
            var rows = '';
            summary.forEach(function(c) {
                rows += '<tr><td><strong>' + c.name + '</strong></td><td>' + c.username + '</td><td>KES ' + Number(c.totalToday||0).toLocaleString() + '</td><td>' + c.countToday + ' sales</td><td>KES ' + Number(c.totalAll||0).toLocaleString() + '</td><td>' + c.countAll + ' total</td></tr>';
            });
            var ct = document.getElementById('cashierTable'); 
            if (ct) ct.innerHTML = '<table class="table"><thead><tr><th>Cashier</th><th>Username</th><th>Today Sales</th><th>Today Count</th><th>Total Sales</th><th>Total Count</th></tr></thead><tbody>' + (rows || '<tr><td colspan="6" style="text-align:center;">No cashier sales yet</td></tr>') + '</tbody></table>';
        } catch(e) {}
        
        try {
            var returnsRes = await fetch('http://localhost:8080/api/returns/summary');
            var returnsData = await returnsRes.json();
            var returnsCard = document.getElementById('returnsStatCard');
            if (returnsCard) {
                returnsCard.innerHTML = '<div class="stat-icon"><i class="fas fa-exchange-alt"></i></div>' +
                    '<div class="stat-label">🔄 Returns/Exchanges</div>' +
                    '<div class="stat-value" style="color:#8b5cf6;">KES ' + Number(returnsData.totalRefunded || 0).toLocaleString() + '</div>' +
                    '<div class="stat-sub">' + (returnsData.totalReturns || 0) + ' returns | ' + (returnsData.totalExchanges || 0) + ' exchanges | Today: ' + (returnsData.todayReturns || 0) + '</div>';
            }
        } catch(e) {}
        
        try {
            var poRes = await fetch('http://localhost:8080/api/purchase-orders');
            var pos = await poRes.json();
            var today = new Date().toISOString().split('T')[0];
            var todayPOs = pos.filter(function(po) { return po.date && po.date.startsWith(today); });
            var todayPOAmount = todayPOs.reduce(function(s, po) { return s + Number(po.total || 0); }, 0);
            var suppliers = [];
            pos.forEach(function(po) { if (suppliers.indexOf(po.supplierName) === -1) suppliers.push(po.supplierName); });
            var todaySuppliers = [];
            todayPOs.forEach(function(po) { if (todaySuppliers.indexOf(po.supplierName) === -1) todaySuppliers.push(po.supplierName); });
            
            var purchasesCard = document.getElementById('purchasesStatCard');
            if (purchasesCard) {
                purchasesCard.innerHTML = '<div class="stat-icon"><i class="fas fa-truck"></i></div>' +
                    '<div class="stat-label">🚚 Purchases</div>' +
                    '<div class="stat-value" style="color:#ec4899;">' + todayPOs.length + ' POs</div>' +
                    '<div class="stat-sub">Today: KES ' + todayPOAmount.toLocaleString() + ' | ' + suppliers.length + ' suppliers | ' + todaySuppliers.length + ' active today</div>';
            }
        } catch(e) {}
        
        await this.loadCreditOnly();
    },

    async loadCreditOnly() {
        try {
            var creditRes = await fetch('http://localhost:8080/api/credit-summary');
            var creditData = await creditRes.json();
            var creditCard = document.getElementById('creditStatCard');
            if (creditCard) {
                creditCard.innerHTML = '<div class="stat-icon"><i class="fas fa-credit-card"></i></div><div class="stat-label">💳 Credit</div><div class="stat-value" style="color:#ef4444;">KES ' + (Number(creditData.totalDebt) || 0).toLocaleString() + '</div><div class="stat-sub">' + (creditData.activeCustomers || 0) + ' owing | Paid today: KES ' + (Number(creditData.todayPayments) || 0).toLocaleString() + '</div>';
            }
            var custRes = await fetch('http://localhost:8080/api/credit-customers');
            var customers = await custRes.json();
            var debtors = customers.filter(function(c) { return Number(c.totalDebt) > 0; });
            var debtorCount = document.getElementById('debtorCount');
            if (debtorCount) debtorCount.textContent = '(' + debtors.length + ' with debt)';
            var custTable = document.getElementById('creditCustomersTable');
            if (custTable) {
                if (debtors.length === 0) {
                    custTable.innerHTML = '<p style="text-align:center;color:#10b981;padding:2rem;"><i class="fas fa-check-circle" style="font-size:2rem;"></i><br>No outstanding debts.</p>';
                } else {
                    var tableHTML = '<table class="table"><thead><tr><th>Customer</th><th>Phone</th><th>Debt</th><th>Limit</th><th>Usage</th><th>Registered By</th><th>Date</th></tr></thead><tbody>';
                    debtors.forEach(function(c) {
                        var pct = Math.round((Number(c.totalDebt) / Number(c.debtLimit)) * 100);
                        var color = pct > 80 ? '#ef4444' : pct > 50 ? '#f59e0b' : '#10b981';
                        tableHTML += '<tr><td><strong>' + c.name + '</strong></td><td>' + (c.phone || '-') + '</td><td style="color:#ef4444;font-weight:700;">KES ' + Number(c.totalDebt||0).toLocaleString() + '</td><td>KES ' + Number(c.debtLimit||0).toLocaleString() + '</td><td><span style="color:' + color + ';font-weight:700;">' + pct + '%</span></td><td>' + (c.registeredBy || '-') + '</td><td>' + (c.dateRegistered ? new Date(c.dateRegistered).toLocaleDateString('en-KE') : '-') + '</td></tr>';
                    });
                    tableHTML += '</tbody></table>';
                    custTable.innerHTML = tableHTML;
                }
            }
        } catch(e) { console.error('Credit stats error:', e); }
    },

    showReturnsManagement() {
        var container = document.getElementById('mainContent');
        if (!container) return;
        container.innerHTML = '<div style="text-align:center;padding:3rem;"><i class="fas fa-spinner fa-spin"></i> Loading returns...</div>';
        fetch('http://localhost:8080/api/returns').then(function(r){return r.json();}).then(function(returns){
            if (!returns || returns.length === 0) {
                container.innerHTML = '<div class="card"><div class="card-body" style="text-align:center;padding:3rem;"><i class="fas fa-exchange-alt" style="font-size:4rem;color:#ccc;"></i><h3>No Returns/Exchanges Yet</h3><button class="btn btn-primary" onclick="AppRouter.navigate(\'admin-dashboard\')">Back</button></div></div>';
                return;
            }
            var totalReturns = returns.filter(function(r){return r.returnType==='return';}).length;
            var totalExchanges = returns.filter(function(r){return r.returnType==='exchange';}).length;
            var totalRefund = returns.reduce(function(s,r){return s+Number(r.refundAmount||0);},0);
            var html = '<div class="card"><div class="card-header" style="background:linear-gradient(135deg,#f59e0b,#d97706);color:white;"><h3 style="color:white;"><i class="fas fa-exchange-alt"></i> Returns & Exchanges</h3><button class="btn btn-sm" style="background:rgba(255,255,255,0.2);color:white;" onclick="AppRouter.navigate(\'admin-dashboard\')">Back</button></div><div class="card-body">';
            html += '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:1rem;margin-bottom:1.5rem;"><div style="text-align:center;padding:1rem;background:#fef2f2;border-radius:0.5rem;"><div style="font-size:2rem;font-weight:700;color:#ef4444;">'+totalReturns+'</div><small>Returns</small></div><div style="text-align:center;padding:1rem;background:#fef3c7;border-radius:0.5rem;"><div style="font-size:2rem;font-weight:700;color:#f59e0b;">'+totalExchanges+'</div><small>Exchanges</small></div><div style="text-align:center;padding:1rem;background:#f0fdf4;border-radius:0.5rem;"><div style="font-size:2rem;font-weight:700;color:#10b981;">KES '+totalRefund.toLocaleString()+'</div><small>Refunded</small></div><div style="text-align:center;padding:1rem;background:#eff6ff;border-radius:0.5rem;"><div style="font-size:2rem;font-weight:700;color:#3b82f6;">'+returns.length+'</div><small>Total</small></div></div>';
            html += '<div style="display:flex;gap:1rem;margin-bottom:1rem;"><input type="text" id="returnSearchInput" class="form-control" placeholder="Search..." oninput="AdminDashboardComponent._filterReturns()" style="flex:1;"><select id="returnTypeFilter" class="form-control" onchange="AdminDashboardComponent._filterReturns()" style="width:200px;"><option value="all">All</option><option value="return">Returns</option><option value="exchange">Exchanges</option></select></div>';
            html += '<table class="table" id="returnsTable"><thead><tr><th>Date</th><th>Receipt</th><th>Customer</th><th>Type</th><th>Product</th><th>Qty</th><th>Exchange</th><th>Refund</th><th>Cashier</th></tr></thead><tbody>';
            returns.forEach(function(r){var b=r.returnType==='exchange'?'<span style="background:#fef3c7;color:#d97706;padding:3px 8px;border-radius:4px;">🔄 Exchange</span>':'<span style="background:#fef2f2;color:#dc2626;padding:3px 8px;border-radius:4px;">↩️ Return</span>';var ref=Number(r.refundAmount)>0?'<span style="color:#10b981;">KES '+Number(r.refundAmount).toLocaleString()+'</span>':'-';html+='<tr data-search="'+(r.originalReceiptNo||'')+' '+(r.customerName||'')+' '+(r.productName||'')+'"><td>'+(r.date?new Date(r.date).toLocaleDateString('en-KE'):'-')+'</td><td><strong>'+(r.originalReceiptNo||'-')+'</strong></td><td>'+(r.customerName||'-')+'</td><td>'+b+'</td><td>'+(r.productName||'-')+'</td><td>'+r.quantity+'</td><td>'+(r.exchangeProductName||'-')+'</td><td>'+ref+'</td><td>'+(r.cashierName||'-')+'</td></tr>';});
            html += '</tbody></table></div></div>';
            container.innerHTML = html;
        }).catch(function(){container.innerHTML='<div class="card"><div class="card-body" style="text-align:center;padding:3rem;color:#ef4444;">Error loading returns.</div></div>';});
    },

    _filterReturns() {
        var search = (document.getElementById('returnSearchInput')?.value || '').toLowerCase();
        var typeFilter = document.getElementById('returnTypeFilter')?.value || 'all';
        document.querySelectorAll('#returnsTable tbody tr').forEach(function(row) {
            var matchSearch = !search || (row.dataset.search || '').includes(search);
            var isReturn = row.innerHTML.indexOf('Return</span>') > -1;
            var matchType = typeFilter === 'all' || (typeFilter === 'return' && isReturn) || (typeFilter === 'exchange' && !isReturn);
            row.style.display = (matchSearch && matchType) ? '' : 'none';
        });
    }
};