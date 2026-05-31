const AdminCreditComponent = {
    _allPayments: [],

    render() {
        var h = '';
        h += '<div class="welcome-banner"><h2><i class="fas fa-credit-card"></i> Credit Management</h2><p>Manage customer credit accounts, debt limits, and payments</p></div>';
        
        h += '<div class="stats-grid" id="creditSummary">';
        h += '<div class="stat-card"><div class="stat-icon"><i class="fas fa-coins"></i></div><div class="stat-label">Total Outstanding</div><div class="stat-value" style="color:#ef4444;">KES 0</div><div class="stat-sub">All customers</div></div>';
        h += '<div class="stat-card"><div class="stat-icon"><i class="fas fa-users"></i></div><div class="stat-label">Customers with Debt</div><div class="stat-value">0</div><div class="stat-sub">Active debtors</div></div>';
        h += '<div class="stat-card"><div class="stat-icon"><i class="fas fa-file-invoice"></i></div><div class="stat-label">Today Credit Sales</div><div class="stat-value">KES 0</div><div class="stat-sub">0 transactions</div></div>';
        h += '<div class="stat-card"><div class="stat-icon"><i class="fas fa-money-bill-wave"></i></div><div class="stat-label">Today Payments</div><div class="stat-value" style="color:#10b981;">KES 0</div><div class="stat-sub">Received today</div></div>';
        h += '</div>';
        
        h += '<div class="card" style="margin-bottom:1.5rem;"><div class="card-header"><h3 class="card-title"><i class="fas fa-users"></i> All Credit Customers</h3><button class="btn btn-sm btn-success" onclick="AdminCreditComponent.showRegisterCustomer()" style="float:right;"><i class="fas fa-user-plus"></i> Register New</button></div><div class="card-body"><div id="allCustomersTable">Loading...</div></div></div>';
        
        h += '<div class="card" style="margin-bottom:1.5rem;"><div class="card-header"><h3 class="card-title"><i class="fas fa-shopping-cart"></i> Recent Credit Sales <span style="font-size:0.8rem;color:#999;">(Active Debtors Only)</span></h3></div><div class="card-body"><div id="recentCreditSales">Loading...</div></div></div>';
        
        h += '<div class="card"><div class="card-header"><h3 class="card-title"><i class="fas fa-money-bill"></i> Recent Debt Payments</h3></div><div class="card-body"><div id="recentPayments">Loading...</div></div></div>';
        
        setTimeout(function() { AdminCreditComponent.loadAll(); }, 200);
        return h;
    },

    async loadAll() {
        await this.loadSummary();
        await this.loadCustomers();
        await this.loadRecentSales();
        await this.loadRecentPayments();
    },

    async loadSummary() {
        try {
            var res = await fetch('/api/credit-summary');
            var data = await res.json();
            var div = document.getElementById('creditSummary');
            if (div) {
                div.innerHTML = 
                    '<div class="stat-card"><div class="stat-icon"><i class="fas fa-coins"></i></div><div class="stat-label">Total Outstanding</div><div class="stat-value" style="color:#ef4444;">KES ' + (Number(data.totalDebt) || 0).toLocaleString() + '</div><div class="stat-sub">All customers</div></div>' +
                    '<div class="stat-card"><div class="stat-icon"><i class="fas fa-users"></i></div><div class="stat-label">Customers with Debt</div><div class="stat-value">' + (data.activeCustomers || 0) + '</div><div class="stat-sub">Active debtors</div></div>' +
                    '<div class="stat-card"><div class="stat-icon"><i class="fas fa-file-invoice"></i></div><div class="stat-label">Today Credit Sales</div><div class="stat-value">KES ' + (Number(data.todayCreditSales) || 0).toLocaleString() + '</div><div class="stat-sub">Today</div></div>' +
                    '<div class="stat-card"><div class="stat-icon"><i class="fas fa-money-bill-wave"></i></div><div class="stat-label">Today Payments</div><div class="stat-value" style="color:#10b981;">KES ' + (Number(data.todayPayments) || 0).toLocaleString() + '</div><div class="stat-sub">Received today</div></div>';
            }
        } catch(e) {}
    },

    async loadCustomers() {
        try {
            var res = await fetch('/api/credit-customers');
            var customers = await res.json();
            var div = document.getElementById('allCustomersTable');
            if (div) {
                if (!customers.length) {
                    div.innerHTML = '<p style="text-align:center;color:#999;">No credit customers registered yet.</p>';
                } else {
                    var h = '<table class="table"><thead><tr><th>Customer</th><th>Phone</th><th>ID Number</th><th>Debt Limit</th><th>Total Debt</th><th>Available</th><th>Usage</th><th>Status</th><th>Actions</th></tr></thead><tbody>';
                    customers.forEach(function(c) {
                        var pct = c.debtLimit > 0 ? Math.round((Number(c.totalDebt) / Number(c.debtLimit)) * 100) : 0;
                        var color = pct > 80 ? '#ef4444' : pct > 50 ? '#f59e0b' : '#10b981';
                        var statusBadge = c.isActive === 0 ? '<span class="badge badge-danger">Inactive</span>' : Number(c.totalDebt) > 0 ? '<span class="badge badge-warning">Owing</span>' : '<span class="badge badge-success">Clear</span>';
                        
                        h += '<tr style="' + (c.isActive === 0 ? 'opacity:0.5;' : '') + '">';
                        h += '<td><strong>' + c.name + '</strong>' + (c.isActive === 0 ? ' <small style="color:#ef4444;">(Inactive)</small>' : '') + '</td>';
                        h += '<td>' + (c.phone || '-') + '</td>';
                        h += '<td>' + (c.idNumber || '-') + '</td>';
                        h += '<td>KES ' + Number(c.debtLimit || 0).toLocaleString() + '</td>';
                        h += '<td style="color:' + (Number(c.totalDebt) > 0 ? '#ef4444' : '#10b981') + ';font-weight:700;">KES ' + Number(c.totalDebt || 0).toLocaleString() + '</td>';
                        h += '<td>KES ' + (Number(c.debtLimit) - Number(c.totalDebt)).toLocaleString() + '</td>';
                        h += '<td><div style="width:80px;height:6px;background:#eee;border-radius:3px;"><div style="width:' + pct + '%;height:100%;background:' + color + ';border-radius:3px;"></div></div><small>' + pct + '%</small></td>';
                        h += '<td>' + statusBadge + '</td>';
                        h += '<td style="white-space:nowrap;">';
                        h += '<button class="btn btn-sm btn-primary" onclick="AdminCreditComponent.viewProducts(' + c.id + ')" title="View Products Taken"><i class="fas fa-box"></i></button> ';
                        h += '<button class="btn btn-sm btn-info" onclick="AdminCreditComponent.viewHistory(' + c.id + ')" title="History"><i class="fas fa-history"></i></button> ';
                        h += '<button class="btn btn-sm btn-success" onclick="AdminCreditComponent.showPayment(' + c.id + ')" title="Record Payment"><i class="fas fa-money-bill"></i></button> ';
                        h += '<button class="btn btn-sm btn-warning" onclick="AdminCreditComponent.editCustomer(' + c.id + ')" title="Edit"><i class="fas fa-edit"></i></button> ';
                        if (c.isActive === 1) {
                            h += '<button class="btn btn-sm btn-danger" onclick="AdminCreditComponent.deactivateCustomer(' + c.id + ',\'' + c.name.replace(/'/g, "\\'") + '\')" title="Deactivate"><i class="fas fa-user-slash"></i></button>';
                        } else {
                            h += '<button class="btn btn-sm btn-outline-success" onclick="AdminCreditComponent.activateCustomer(' + c.id + ',\'' + c.name.replace(/'/g, "\\'") + '\')" title="Activate"><i class="fas fa-user-check"></i></button>';
                        }
                        h += '</td>';
                        h += '</tr>';
                    });
                    h += '</tbody></table>';
                    div.innerHTML = h;
                }
            }
        } catch(e) {}
    },

    async loadRecentSales() {
        try {
            var res = await fetch('/api/credit-sales');
            var sales = await res.json();
            var div = document.getElementById('recentCreditSales');
            if (div) {
                var custRes = await fetch('/api/credit-customers');
                var customers = await custRes.json();
                var debtors = customers.filter(function(c) { return Number(c.totalDebt) > 0; });
                var debtorIds = debtors.map(function(c) { return c.id; });
                var activeSales = sales.filter(function(s) { return debtorIds.indexOf(s.customerId) > -1; });
                
                if (!activeSales.length) {
                    div.innerHTML = '<p style="text-align:center;color:#10b981;padding:2rem;"><i class="fas fa-check-circle" style="font-size:2rem;"></i><br>No active credit sales. All debts are cleared!</p>';
                    return;
                }
                
                var grouped = {};
                activeSales.forEach(function(s) {
                    if (!grouped[s.customerId]) {
                        grouped[s.customerId] = { customerId: s.customerId, customerName: s.customerName, totalAmount: 0, currentDebt: 0, salesCount: 0, lastDate: s.date };
                    }
                    grouped[s.customerId].totalAmount += Number(s.amount || 0);
                    grouped[s.customerId].salesCount++;
                    if (Number(s.debtAfter || 0) > grouped[s.customerId].currentDebt) grouped[s.customerId].currentDebt = Number(s.debtAfter || 0);
                    if (new Date(s.date) > new Date(grouped[s.customerId].lastDate)) grouped[s.customerId].lastDate = s.date;
                });
                
                var customerGroups = Object.values(grouped).sort(function(a, b) { return new Date(b.lastDate) - new Date(a.lastDate); });
                
                var h = '<table class="table"><thead><tr><th>Customer</th><th>Current Debt</th><th>Total Credit</th><th>Transactions</th><th>Last Purchase</th><th>Actions</th></tr></thead><tbody>';
                customerGroups.forEach(function(g) {
                    var customer = debtors.find(function(d) { return d.id == g.customerId; });
                    var debtLimit = customer ? Number(customer.debtLimit) : 5000;
                    var pct = debtLimit > 0 ? Math.round((g.currentDebt / debtLimit) * 100) : 0;
                    var color = pct > 80 ? '#ef4444' : pct > 50 ? '#f59e0b' : '#10b981';
                    h += '<tr><td><strong>' + g.customerName + '</strong></td><td><span style="color:' + color + ';font-weight:700;">KES ' + g.currentDebt.toLocaleString() + '</span><br><small>' + pct + '% of KES ' + debtLimit.toLocaleString() + '</small></td><td>KES ' + g.totalAmount.toLocaleString() + '</td><td><span class="badge badge-info">' + g.salesCount + ' sales</span></td><td><small>' + (g.lastDate ? new Date(g.lastDate).toLocaleDateString('en-KE') : '-') + '</small></td><td style="white-space:nowrap;"><button class="btn btn-sm btn-primary" onclick="AdminCreditComponent.viewCustomerSales(' + g.customerId + ')"><i class="fas fa-eye"></i> View</button> <button class="btn btn-sm btn-success" onclick="AdminCreditComponent.showPayment(' + g.customerId + ')"><i class="fas fa-money-bill"></i> Pay</button></td></tr>';
                });
                h += '</tbody></table>';
                div.innerHTML = h;
            }
        } catch(e) { console.error('Load recent sales error:', e); }
    },

    viewCustomerSales(customerId) {
        fetch('/api/credit-customers/' + customerId).then(function(r){return r.json();}).then(function(c){
            fetch('/api/credit-sales').then(function(r){return r.json();}).then(function(allSales){
                var customerSales = allSales.filter(function(s) { return s.customerId == customerId; });
                var totalCredit = customerSales.reduce(function(s, sale) { return s + Number(sale.amount||0); }, 0);
                var h = '<div class="modal modal-lg"><div class="modal-header" style="background:linear-gradient(135deg,#8b5cf6,#7c3aed);color:white;"><h3 style="color:white;"><i class="fas fa-shopping-cart"></i> Credit History - ' + c.name + '</h3><button class="btn btn-sm" style="color:white;" onclick="this.closest(\'.modal-overlay\').remove()">X</button></div><div class="modal-body">';
                h += '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:1rem;margin-bottom:1.5rem;"><div style="text-align:center;padding:0.75rem;background:#fef2f2;border-radius:0.5rem;"><div style="font-size:1.5rem;font-weight:700;color:#ef4444;">KES ' + Number(c.totalDebt||0).toLocaleString() + '</div><small>Current Debt</small></div><div style="text-align:center;padding:0.75rem;background:#fef3c7;border-radius:0.5rem;"><div style="font-size:1.5rem;font-weight:700;color:#f59e0b;">KES ' + Number(c.debtLimit||0).toLocaleString() + '</div><small>Debt Limit</small></div><div style="text-align:center;padding:0.75rem;background:#eff6ff;border-radius:0.5rem;"><div style="font-size:1.5rem;font-weight:700;color:#3b82f6;">' + customerSales.length + '</div><small>Transactions</small></div><div style="text-align:center;padding:0.75rem;background:#f0fdf4;border-radius:0.5rem;"><div style="font-size:1.5rem;font-weight:700;color:#10b981;">KES ' + totalCredit.toLocaleString() + '</div><small>Total Credit</small></div></div>';
                if (customerSales.length > 0) { h += '<h4>📋 Credit Purchases</h4><table class="table"><thead><tr><th>Date</th><th>Sale ID</th><th>Amount</th><th>Debt Before</th><th>Debt After</th><th>Cashier</th><th>Items</th></tr></thead><tbody>'; customerSales.sort(function(a,b){return new Date(b.date)-new Date(a.date);}).forEach(function(s){ h += '<tr><td><small>'+(s.date?new Date(s.date).toLocaleString('en-KE'):'-')+'</small></td><td><strong>#'+(s.saleId||'-')+'</strong></td><td style="color:#ef4444;font-weight:600;">KES '+Number(s.amount||0).toLocaleString()+'</td><td>KES '+Number(s.debtBefore||0).toLocaleString()+'</td><td>KES '+Number(s.debtAfter||0).toLocaleString()+'</td><td>'+(s.cashierName||'-')+'</td><td><button class="btn btn-sm btn-outline-primary" onclick="AdminCreditComponent.viewSaleProducts('+s.saleId+')"><i class="fas fa-box"></i> Items</button></td></tr>'; }); h += '</tbody></table>'; }
                if (c.payments && c.payments.length > 0) { var totalPaid = c.payments.reduce(function(s,p){return s+Number(p.amount||0);},0); h += '<h4 style="margin-top:1.5rem;">💳 Payments (Total: KES '+totalPaid.toLocaleString()+')</h4><table class="table"><thead><tr><th>Date</th><th>Amount</th><th>Method</th><th>Received By</th></tr></thead><tbody>'; c.payments.forEach(function(p){ h += '<tr><td>'+(p.date?new Date(p.date).toLocaleDateString('en-KE'):'-')+'</td><td style="color:#10b981;font-weight:600;">KES '+Number(p.amount||0).toLocaleString()+'</td><td>'+(p.paymentMethod||'cash').toUpperCase()+'</td><td>'+(p.receivedBy||'-')+'</td></tr>'; }); h += '</tbody></table>'; }
                h += '</div><div class="modal-footer"><button class="btn btn-outline" onclick="this.closest(\'.modal-overlay\').remove()">Close</button></div></div>';
                var m = document.createElement('div'); m.className = 'modal-overlay'; m.innerHTML = h;
                document.body.appendChild(m); m.onclick = function(e){if(e.target===m)m.remove();};
            });
        });
    },

    // ========== FILTERABLE PAYMENTS ==========
    async loadRecentPayments() {
        try {
            var res = await fetch('/api/credit-customers');
            var customers = await res.json();
            var allPayments = [];
            for (var i = 0; i < customers.length; i++) {
                var pres = await fetch('/api/debt-payments/' + customers[i].id);
                var payments = await pres.json();
                payments.forEach(function(p) { 
                    p.customerName = customers[i].name;
                    p.customerId = customers[i].id;
                    allPayments.push(p); 
                });
            }
            allPayments.sort(function(a, b) { return new Date(b.date) - new Date(a.date); });
            this._allPayments = allPayments;
            
            var div = document.getElementById('recentPayments');
            if (div) {
                if (!allPayments.length) {
                    div.innerHTML = '<p style="text-align:center;color:#999;padding:2rem;">No payments recorded yet.</p>';
                    return;
                }
                this._renderPaymentsTable(allPayments.slice(0, 10), div);
            }
        } catch(e) { console.error('Payments error:', e); }
    },

    _renderPaymentsTable(payments, div) {
        if (!payments.length) { div.innerHTML = '<p style="text-align:center;color:#999;padding:2rem;">No payments found.</p>'; return; }
        var totalShown = payments.reduce(function(s, p) { return s + Number(p.amount || 0); }, 0);
        
        var h = '<div style="display:flex;gap:0.5rem;margin-bottom:1rem;flex-wrap:wrap;align-items:center;">';
        h += '<select id="paymentFilter" class="form-control" onchange="AdminCreditComponent._filterPayments()" style="width:150px;">';
        h += '<option value="10">Last 10</option><option value="25">Last 25</option><option value="50">Last 50</option><option value="today">Today</option><option value="week">This Week</option><option value="month">This Month</option><option value="all">All Time</option></select>';
        h += '<input type="text" id="paymentSearch" class="form-control" placeholder="🔍 Search customer..." oninput="AdminCreditComponent._filterPayments()" style="width:200px;">';
        h += '<span style="margin-left:auto;font-weight:600;color:#10b981;">💰 Total: KES ' + totalShown.toLocaleString() + '</span></div>';
        
        h += '<table class="table" id="paymentsTable"><thead><tr><th>Date</th><th>Customer</th><th>Amount</th><th>Method</th><th>Received By</th><th>Action</th></tr></thead><tbody>';
        payments.forEach(function(p) {
            var badge = p.paymentMethod === 'mpesa' ? '<span class="badge badge-info">M-PESA</span>' : '<span class="badge badge-success">CASH</span>';
            h += '<tr data-search="' + (p.customerName || '').toLowerCase() + '"><td><small>' + (p.date ? new Date(p.date).toLocaleString('en-KE') : '-') + '</small></td><td><strong>' + p.customerName + '</strong></td><td style="color:#10b981;font-weight:600;">KES ' + Number(p.amount || 0).toLocaleString() + '</td><td>' + badge + '</td><td>' + (p.receivedBy || '-') + '</td><td><button class="btn btn-sm btn-danger" onclick="AdminCreditComponent.deletePayment(' + p.id + ',' + p.customerId + ',\'' + (p.customerName || '').replace(/'/g, "\\'") + '\',' + p.amount + ')" title="Delete"><i class="fas fa-trash"></i></button></td></tr>';
        });
        h += '</tbody></table>';
        
        var currentFilter = document.getElementById('paymentFilter')?.value || '10';
        if (currentFilter !== 'all' && currentFilter !== 'today' && currentFilter !== 'week' && currentFilter !== 'month' && payments.length < this._allPayments.length) {
            h += '<div style="text-align:center;margin-top:1rem;"><button class="btn btn-outline-primary" onclick="AdminCreditComponent._loadMorePayments()"><i class="fas fa-chevron-down"></i> Load All (' + this._allPayments.length + ' total)</button></div>';
        }
        h += '<div style="text-align:center;margin-top:0.5rem;"><small style="color:#999;">Showing ' + payments.length + ' of ' + (this._allPayments ? this._allPayments.length : 0) + ' payments</small></div>';
        
        div.innerHTML = h;
    },

    _filterPayments() {
        var filter = document.getElementById('paymentFilter')?.value || '10';
        var search = (document.getElementById('paymentSearch')?.value || '').toLowerCase();
        var all = this._allPayments || [];
        var filtered = [];
        var now = new Date();
        var today = now.toISOString().split('T')[0];
        
        if (filter === 'today') { filtered = all.filter(function(p) { return p.date && p.date.startsWith(today); }); }
        else if (filter === 'week') { var weekAgo = new Date(now.getTime() - 7*24*60*60*1000).toISOString().split('T')[0]; filtered = all.filter(function(p) { return p.date && p.date >= weekAgo; }); }
        else if (filter === 'month') { var monthAgo = new Date(now.getTime() - 30*24*60*60*1000).toISOString().split('T')[0]; filtered = all.filter(function(p) { return p.date && p.date >= monthAgo; }); }
        else if (filter === 'all') { filtered = all; }
        else { filtered = all.slice(0, parseInt(filter)); }
        
        if (search) { filtered = filtered.filter(function(p) { return (p.customerName || '').toLowerCase().indexOf(search) > -1; }); }
        
        var div = document.getElementById('recentPayments');
        if (div) this._renderPaymentsTable(filtered, div);
    },

    _loadMorePayments() {
        var el = document.getElementById('paymentFilter');
        if (el) el.value = 'all';
        this._filterPayments();
    },

    // ========== OTHER FUNCTIONS ==========
    viewProducts(customerId) {
        fetch('/api/credit-customers/' + customerId).then(function(r){return r.json();}).then(function(c){
            fetch('/api/credit-sales').then(function(r){return r.json();}).then(function(allSales){
                var customerSales = allSales.filter(function(s) { return s.customerId == customerId; });
                var h = '<div class="modal modal-lg"><div class="modal-header" style="background:linear-gradient(135deg,#8b5cf6,#7c3aed);color:white;"><h3 style="color:white;"><i class="fas fa-box"></i> Products Taken by ' + c.name + '</h3><button class="btn btn-sm" style="color:white;" onclick="this.closest(\'.modal-overlay\').remove()">X</button></div><div class="modal-body"><p><strong>Total Debt:</strong> KES ' + Number(c.totalDebt||0).toLocaleString() + ' | <strong>Limit:</strong> KES ' + Number(c.debtLimit||0).toLocaleString() + '</p>';
                if (!customerSales.length) { h += '<p style="text-align:center;color:#999;">No credit purchases found.</p>'; }
                else { h += '<table class="table"><thead><tr><th>Date</th><th>Sale ID</th><th>Amount</th><th>Cashier</th><th>Action</th></tr></thead><tbody>'; customerSales.forEach(function(s){ h += '<tr><td>'+(s.date?new Date(s.date).toLocaleDateString('en-KE'):'-')+'</td><td><strong>#'+(s.saleId||'-')+'</strong></td><td style="color:#ef4444;">KES '+Number(s.amount||0).toLocaleString()+'</td><td>'+(s.cashierName||'-')+'</td><td><button class="btn btn-sm btn-primary" onclick="AdminCreditComponent.viewSaleProducts('+s.saleId+')"><i class="fas fa-eye"></i> Items</button></td></tr>'; }); h += '</tbody></table>'; }
                h += '</div><div class="modal-footer"><button class="btn btn-outline" onclick="this.closest(\'.modal-overlay\').remove()">Close</button></div></div>';
                var m = document.createElement('div'); m.className = 'modal-overlay'; m.innerHTML = h;
                document.body.appendChild(m); m.onclick = function(e){if(e.target===m)m.remove();};
            });
        });
    },

    viewSaleProducts(saleId) {
        fetch('/api/sales').then(function(r){return r.json();}).then(function(sales){
            var sale = sales.find(function(s) { return s.id == saleId; });
            if (!sale) { showStyledAlert('Error', 'Sale not found', 'times-circle', '#ef4444'); return; }
            var h = '<div class="modal"><div class="modal-header" style="background:linear-gradient(135deg,#3b82f6,#2563eb);color:white;"><h3 style="color:white;"><i class="fas fa-receipt"></i> Items - '+(sale.receiptNo||'')+'</h3><button class="btn btn-sm" style="color:white;" onclick="this.closest(\'.modal-overlay\').remove()">X</button></div><div class="modal-body"><p><strong>Customer:</strong> '+(sale.customerName||'Walk-in')+' | <strong>Date:</strong> '+new Date(sale.date).toLocaleDateString('en-KE')+'</p>';
            if (sale.items && sale.items.length > 0) { h += '<table class="table"><thead><tr><th>Product</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead><tbody>'; sale.items.forEach(function(item){ h += '<tr><td>'+item.productName+'</td><td>'+item.quantity+'</td><td>KES '+Number(item.price||0).toLocaleString()+'</td><td>KES '+(Number(item.price||0)*item.quantity).toLocaleString()+'</td></tr>'; }); h += '</tbody></table><p style="text-align:right;font-weight:700;">Total: KES '+Number(sale.total||0).toLocaleString()+'</p>'; }
            h += '</div><div class="modal-footer"><button class="btn btn-outline" onclick="this.closest(\'.modal-overlay\').remove()">Close</button></div></div>';
            var m = document.createElement('div'); m.className = 'modal-overlay'; m.innerHTML = h;
            document.body.appendChild(m); m.onclick = function(e){if(e.target===m)m.remove();};
        });
    },

    deactivateCustomer(id, name) {
        showConfirm('Deactivate', 'Deactivate <strong>'+name+'</strong>?', function(){
            fetch('/api/credit-customers/'+id,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({isActive:0})}).then(function(r){return r.json();}).then(function(d){if(d.success){AdminCreditComponent.loadAll();showStyledAlert('Success',name+' deactivated.','check-circle','#10b981');}});
        },'Deactivate','danger');
    },

    activateCustomer(id, name) {
        fetch('/api/credit-customers/'+id,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({isActive:1})}).then(function(r){return r.json();}).then(function(d){if(d.success){AdminCreditComponent.loadAll();showStyledAlert('Success',name+' reactivated.','check-circle','#10b981');}});
    },

    deletePayment(paymentId, customerId, customerName, amount) {
        showConfirm('Delete Payment','Delete <strong>KES '+Number(amount).toLocaleString()+'</strong> from <strong>'+customerName+'</strong>?<br><br><span style="color:#ef4444;">⚠️ Debt restored by KES '+Number(amount).toLocaleString()+'</span>',function(){
            fetch('/api/debt-payments/'+paymentId,{method:'DELETE'}).then(function(r){return r.json();}).then(function(d){if(d.success){AdminCreditComponent.loadAll();showStyledAlert('Deleted','Payment deleted.','check-circle','#10b981');}else{showStyledAlert('Error',d.message||'Failed','times-circle','#ef4444');}});
        },'Delete','danger');
    },

    showRegisterCustomer() {
        var m = document.createElement('div'); m.className = 'modal-overlay';
        m.innerHTML = '<div class="modal"><div class="modal-header" style="background:linear-gradient(135deg,#1a472a,#c49a2b);color:white;"><h3 style="color:white;"><i class="fas fa-user-plus"></i> Register Credit Customer</h3><button class="btn btn-sm" style="color:white;" onclick="this.closest(\'.modal-overlay\').remove()">X</button></div><div class="modal-body"><div class="form-group"><label>Customer Name *</label><input type="text" id="regCustName" class="form-control" autofocus></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;"><div class="form-group"><label>Phone</label><input type="text" id="regCustPhone" class="form-control" placeholder="254XXXXXXXXX"></div><div class="form-group"><label>ID Number</label><input type="text" id="regCustId" class="form-control" placeholder="National ID"></div></div><div class="form-group"><label>Address</label><input type="text" id="regCustAddress" class="form-control"></div><div class="form-group"><label>Debt Limit (KES) *</label><input type="number" id="regCustLimit" class="form-control" value="5000" min="1000"></div></div><div class="modal-footer"><button class="btn btn-outline" onclick="this.closest(\'.modal-overlay\').remove()">Cancel</button><button class="btn btn-success" id="saveCustBtn"><i class="fas fa-save"></i> Register</button></div></div>';
        document.body.appendChild(m); m.onclick = function(e){if(e.target===m)m.remove();};
        var self = this;
        m.querySelector('#saveCustBtn').onclick = function(){
            var name = m.querySelector('#regCustName').value.trim();
            if(!name){ showStyledAlert('Required','Name required!','exclamation-triangle','#f59e0b'); return; }
            fetch('/api/credit-customers',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:name,phone:m.querySelector('#regCustPhone').value,idNumber:m.querySelector('#regCustId').value,address:m.querySelector('#regCustAddress').value,debtLimit:parseFloat(m.querySelector('#regCustLimit').value)||5000,cashierName:'Admin'})}).then(function(r){return r.json();}).then(function(d){if(d.success){m.remove();self.loadAll();showStyledAlert('Success','Registered!','check-circle','#10b981');}});
        };
    },

    editCustomer(id) {
        fetch('/api/credit-customers/'+id).then(function(r){return r.json();}).then(function(c){
            var m = document.createElement('div'); m.className = 'modal-overlay';
            m.innerHTML = '<div class="modal"><div class="modal-header" style="background:linear-gradient(135deg,#3b82f6,#2563eb);color:white;"><h3 style="color:white;"><i class="fas fa-edit"></i> Edit '+c.name+'</h3><button class="btn btn-sm" style="color:white;" onclick="this.closest(\'.modal-overlay\').remove()">X</button></div><div class="modal-body"><div class="form-group"><label>Name</label><input type="text" id="editCustName" class="form-control" value="'+(c.name||'')+'"></div><div class="form-group"><label>Debt Limit (KES)</label><input type="number" id="editCustLimit" class="form-control" value="'+(c.debtLimit||0)+'"></div><div class="form-group"><label>Phone</label><input type="text" id="editCustPhone" class="form-control" value="'+(c.phone||'')+'"></div></div><div class="modal-footer"><button class="btn btn-outline" onclick="this.closest(\'.modal-overlay\').remove()">Cancel</button><button class="btn btn-primary" id="updateCustBtn">Update</button></div></div>';
            document.body.appendChild(m); m.onclick = function(e){if(e.target===m)m.remove();};
            m.querySelector('#updateCustBtn').onclick = function(){
                fetch('/api/credit-customers/'+id,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:m.querySelector('#editCustName').value,debtLimit:parseFloat(m.querySelector('#editCustLimit').value)||5000,phone:m.querySelector('#editCustPhone').value})}).then(function(r){return r.json();}).then(function(d){if(d.success){m.remove();AdminCreditComponent.loadAll();}});
            };
        });
    },

    viewHistory(id) {
        fetch('/api/credit-customers/'+id).then(function(r){return r.json();}).then(function(c){
            var h = '<div class="modal modal-lg"><div class="modal-header" style="background:linear-gradient(135deg,#1a472a,#c49a2b);color:white;"><h3 style="color:white;"><i class="fas fa-history"></i> '+c.name+' - History</h3><button class="btn btn-sm" style="color:white;" onclick="this.closest(\'.modal-overlay\').remove()">X</button></div><div class="modal-body"><p><strong>Debt:</strong> KES '+Number(c.totalDebt||0).toLocaleString()+' | <strong>Limit:</strong> KES '+Number(c.debtLimit||0).toLocaleString()+'</p>';
            if(c.recentSales&&c.recentSales.length>0){h+='<h4>Purchases</h4><table class="table"><thead><tr><th>Date</th><th>Amount</th><th>Debt After</th><th>Cashier</th></tr></thead><tbody>';c.recentSales.forEach(function(s){h+='<tr><td>'+new Date(s.date).toLocaleDateString('en-KE')+'</td><td style="color:#ef4444;">KES '+Number(s.amount).toLocaleString()+'</td><td>KES '+Number(s.debtAfter).toLocaleString()+'</td><td>'+s.cashierName+'</td></tr>';});h+='</tbody></table>';}
            if(c.payments&&c.payments.length>0){h+='<h4>Payments</h4><table class="table"><thead><tr><th>Date</th><th>Amount</th><th>Method</th><th>Received By</th></tr></thead><tbody>';c.payments.forEach(function(p){h+='<tr><td>'+new Date(p.date).toLocaleDateString('en-KE')+'</td><td style="color:#10b981;">KES '+Number(p.amount).toLocaleString()+'</td><td>'+p.paymentMethod+'</td><td>'+p.receivedBy+'</td></tr>';});h+='</tbody></table>';}
            h+='</div><div class="modal-footer"><button class="btn btn-outline" onclick="this.closest(\'.modal-overlay\').remove()">Close</button></div></div>';
            var m=document.createElement('div');m.className='modal-overlay';m.innerHTML=h;
            document.body.appendChild(m);m.onclick=function(e){if(e.target===m)m.remove();};
        });
    },

    showPayment(id) {
        fetch('/api/credit-customers/'+id).then(function(r){return r.json();}).then(function(c){
            var m=document.createElement('div');m.className='modal-overlay';
            m.innerHTML='<div class="modal"><div class="modal-header" style="background:linear-gradient(135deg,#10b981,#059669);color:white;"><h3 style="color:white;"><i class="fas fa-money-bill"></i> Record Payment - '+c.name+'</h3><button class="btn btn-sm" style="color:white;" onclick="this.closest(\'.modal-overlay\').remove()">X</button></div><div class="modal-body"><p>Current Debt: <strong style="color:#ef4444;">KES '+Number(c.totalDebt||0).toLocaleString()+'</strong></p><div class="form-group"><label>Amount (KES)</label><input type="number" id="payAmount" class="form-control" min="1" max="'+(c.totalDebt||0)+'"></div><div class="form-group"><label>Method</label><select id="payMethod" class="form-control"><option value="cash">Cash</option><option value="mpesa">M-Pesa</option></select></div></div><div class="modal-footer"><button class="btn btn-outline" onclick="this.closest(\'.modal-overlay\').remove()">Cancel</button><button class="btn btn-success" id="confirmPayBtn">Confirm</button></div></div>';
            document.body.appendChild(m);m.onclick=function(e){if(e.target===m)m.remove();};
            m.querySelector('#confirmPayBtn').onclick=function(){
                var amount=parseFloat(m.querySelector('#payAmount').value)||0;
                if(amount<=0||amount>c.totalDebt){showStyledAlert('Invalid','Enter valid amount!','times-circle','#ef4444');return;}
                fetch('/api/debt-payments',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({customerId:id,customerName:c.name,amount:amount,paymentMethod:m.querySelector('#payMethod').value,receivedBy:'Admin'})}).then(function(r){return r.json();}).then(function(d){if(d.success){m.remove();AdminCreditComponent.loadAll();showStyledAlert('Success','Payment recorded!','check-circle','#10b981');}});
            };
        });
    }
};