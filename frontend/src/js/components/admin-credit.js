// ============================================
// ADMIN CREDIT - With JWT Authentication
// ============================================

const AdminCreditComponent = {
    _allPayments: [],
    _allCustomers: [],
    _customerFilter: '',

    render() {
        var h = '';
        h += '<div class="welcome-banner"><h2><i class="fas fa-credit-card"></i> Credit Management</h2><p>Manage customer credit accounts, debt limits, and payments</p></div>';
        
        // 5 cards in a row
        h += '<div class="stats-grid" id="creditSummary" style="grid-template-columns: repeat(5, 1fr);">';
        h += '<div class="stat-card" id="totalCustomersCard" onclick="AdminCreditComponent.filterByAll()" style="cursor:pointer;"><div class="stat-icon"><i class="fas fa-users"></i></div><div class="stat-label">Total Customers</div><div class="stat-value" style="color:#3b82f6;">0</div><div class="stat-sub">All registered</div></div>';
        h += '<div class="stat-card" onclick="AdminCreditComponent.filterByDebt()" style="cursor:pointer;"><div class="stat-icon"><i class="fas fa-coins"></i></div><div class="stat-label">Total Outstanding</div><div class="stat-value" style="color:#ef4444;">KES 0</div><div class="stat-sub">All customers</div></div>';
        h += '<div class="stat-card" onclick="AdminCreditComponent.filterByDebt()" style="cursor:pointer;"><div class="stat-icon"><i class="fas fa-user-clock"></i></div><div class="stat-label">Customers with Debt</div><div class="stat-value">0</div><div class="stat-sub">Active debtors</div></div>';
        h += '<div class="stat-card"><div class="stat-icon"><i class="fas fa-file-invoice"></i></div><div class="stat-label">Today Credit Sales</div><div class="stat-value">KES 0</div><div class="stat-sub">Today</div></div>';
        h += '<div class="stat-card"><div class="stat-icon"><i class="fas fa-money-bill-wave"></i></div><div class="stat-label">Today Payments</div><div class="stat-value" style="color:#10b981;">KES 0</div><div class="stat-sub">Received today</div></div>';
        h += '</div>';
        
        // Customer list with search bar
        h += '<div class="card" style="margin-bottom:1.5rem;"><div class="card-header"><h3 class="card-title"><i class="fas fa-users"></i> All Credit Customers</h3><div style="display:flex;gap:0.5rem;align-items:center;">';
        h += '<div style="position:relative;flex:1;max-width:300px;"><i class="fas fa-search" style="position:absolute;left:10px;top:50%;transform:translateY(-50%);color:#999;"></i><input type="text" id="customerSearchInput" class="form-control" placeholder="Search name, phone, or ID..." oninput="AdminCreditComponent.filterCustomers()" style="padding-left:30px;"></div>';
        h += '<span id="customerCountBadge" style="font-size:0.85rem;color:#666;">0 customers</span>';
        h += '<button class="btn btn-sm btn-success" onclick="AdminCreditComponent.showRegisterCustomer()"><i class="fas fa-user-plus"></i> Register New</button>';
        h += '</div></div><div class="card-body"><div id="allCustomersTable">Loading...</div></div></div>';
        
        // Recent credit sales
        h += '<div class="card" style="margin-bottom:1.5rem;"><div class="card-header"><h3 class="card-title"><i class="fas fa-shopping-cart"></i> Recent Credit Sales <span style="font-size:0.8rem;color:#999;">(Active Debtors Only)</span></h3></div><div class="card-body"><div id="recentCreditSales">Loading...</div></div></div>';
        
        // Recent payments
        h += '<div class="card"><div class="card-header"><h3 class="card-title"><i class="fas fa-money-bill"></i> Recent Debt Payments</h3></div><div class="card-body"><div id="recentPayments">Loading...</div></div></div>';
        
        setTimeout(function() { AdminCreditComponent.loadAll(); }, 200);
        return h;
    },

    async loadAll() {
        try {
            await this.loadSummary();
            await this.loadCustomers();
            await this.loadRecentSales();
            await this.loadRecentPayments();
        } catch(e) {
            console.error('LoadAll error:', e);
        }
    },

    // ✅ Updated: 5 cards with totalCustomers
    async loadSummary() {
        try {
            const data = await ApiService.get('/credit-summary');
            var div = document.getElementById('creditSummary');
            if (div && data) {
                div.style.gridTemplateColumns = 'repeat(5, 1fr)';
                div.innerHTML = 
                    '<div class="stat-card" onclick="AdminCreditComponent.filterByAll()" style="cursor:pointer;"><div class="stat-icon"><i class="fas fa-users"></i></div><div class="stat-label">Total Customers</div><div class="stat-value" style="color:#3b82f6;">' + (data.totalCustomers || 0) + '</div><div class="stat-sub">All registered</div></div>' +
                    '<div class="stat-card" onclick="AdminCreditComponent.filterByDebt()" style="cursor:pointer;"><div class="stat-icon"><i class="fas fa-coins"></i></div><div class="stat-label">Total Outstanding</div><div class="stat-value" style="color:#ef4444;">KES ' + (Number(data.totalDebt || 0)).toLocaleString() + '</div><div class="stat-sub">All customers</div></div>' +
                    '<div class="stat-card" onclick="AdminCreditComponent.filterByDebt()" style="cursor:pointer;"><div class="stat-icon"><i class="fas fa-user-clock"></i></div><div class="stat-label">Customers with Debt</div><div class="stat-value">' + (data.activeCustomers || 0) + '</div><div class="stat-sub">Active debtors</div></div>' +
                    '<div class="stat-card"><div class="stat-icon"><i class="fas fa-file-invoice"></i></div><div class="stat-label">Today Credit Sales</div><div class="stat-value">KES ' + (Number(data.todayCreditSales || 0)).toLocaleString() + '</div><div class="stat-sub">Today</div></div>' +
                    '<div class="stat-card"><div class="stat-icon"><i class="fas fa-money-bill-wave"></i></div><div class="stat-label">Today Payments</div><div class="stat-value" style="color:#10b981;">KES ' + (Number(data.todayPayments || 0)).toLocaleString() + '</div><div class="stat-sub">Received today</div></div>';
            }
        } catch(e) {
            console.error('Error loading summary:', e);
        }
    },

    // ✅ Updated: Stores all customers, supports filtering
    async loadCustomers() {
        try {
            const customers = await ApiService.get('/credit-customers');
            this._allCustomers = customers || [];
            this.renderCustomerTable(this._allCustomers);
        } catch(e) {
            console.error('Error loading customers:', e);
            var div = document.getElementById('allCustomersTable');
            if (div) div.innerHTML = '<p style="text-align:center;color:#ef4444;">Error loading customers. Please refresh.</p>';
        }
    },

    // ✅ Filter customers by search input
    filterCustomers() {
        var searchInput = document.getElementById('customerSearchInput');
        var search = searchInput ? searchInput.value.toLowerCase().trim() : '';
        this._customerFilter = search;
        
        var filtered = this._allCustomers;
        if (search) {
            filtered = this._allCustomers.filter(function(c) {
                return (c.name || '').toLowerCase().indexOf(search) > -1 ||
                       (c.phone || '').toLowerCase().indexOf(search) > -1 ||
                       (c.idNumber || '').toLowerCase().indexOf(search) > -1;
            });
        }
        this.renderCustomerTable(filtered);
    },

    // ✅ Click card to show only customers with debt
    filterByDebt() {
        var searchInput = document.getElementById('customerSearchInput');
        if (searchInput) searchInput.value = '';
        this._customerFilter = '';
        var filtered = this._allCustomers.filter(function(c) { return Number(c.totalDebt || 0) > 0; });
        this.renderCustomerTable(filtered);
    },

    // ✅ Click card to show all customers
    filterByAll() {
        var searchInput = document.getElementById('customerSearchInput');
        if (searchInput) searchInput.value = '';
        this._customerFilter = '';
        this.renderCustomerTable(this._allCustomers);
    },

    // ✅ Renders the customer table
    renderCustomerTable(customers) {
        var div = document.getElementById('allCustomersTable');
        var countBadge = document.getElementById('customerCountBadge');
        
        if (countBadge) {
            countBadge.textContent = (customers ? customers.length : 0) + ' customers';
        }
        
        if (!div) return;
        
        if (!customers || !customers.length) {
            div.innerHTML = '<p style="text-align:center;color:#999;">No customers found.</p>';
            return;
        }
        
        var h = '<table class="table"><thead><tr><th>Customer</th><th>Phone</th><th>ID Number</th><th>Debt Limit</th><th>Total Debt</th><th>Available</th><th>Usage</th><th>Status</th><th>Actions</th></tr></thead><tbody>';
        customers.forEach(function(c) {
            var pct = Number(c.debtLimit) > 0 ? Math.round((Number(c.totalDebt) / Number(c.debtLimit)) * 100) : 0;
            var color = pct > 80 ? '#ef4444' : pct > 50 ? '#f59e0b' : '#10b981';
            var statusBadge = Number(c.isActive) === 0 ? '<span class="badge badge-danger">Inactive</span>' : Number(c.totalDebt) > 0 ? '<span class="badge badge-warning">Owing</span>' : '<span class="badge badge-success">Clear</span>';
            
            h += '<tr style="' + (Number(c.isActive) === 0 ? 'opacity:0.5;' : '') + '">';
            h += '<td><strong>' + (c.name || '-') + '</strong>' + (Number(c.isActive) === 0 ? ' <small style="color:#ef4444;">(Inactive)</small>' : '') + '</td>';
            h += '<td>' + (c.phone || '-') + '</td>';
            h += '<td>' + (c.idNumber || '-') + '</td>';
            h += '<td>KES ' + Number(c.debtLimit || 0).toLocaleString() + '</td>';
            h += '<td style="color:' + (Number(c.totalDebt) > 0 ? '#ef4444' : '#10b981') + ';font-weight:700;">KES ' + Number(c.totalDebt || 0).toLocaleString() + '</td>';
            h += '<td>KES ' + (Number(c.debtLimit || 0) - Number(c.totalDebt || 0)).toLocaleString() + '</td>';
            h += '<td><div style="width:80px;height:6px;background:#eee;border-radius:3px;"><div style="width:' + pct + '%;height:100%;background:' + color + ';border-radius:3px;"></div></div><small>' + pct + '%</small></td>';
            h += '<td>' + statusBadge + '</td>';
            h += '<td style="white-space:nowrap;">';
            h += '<button class="btn btn-sm btn-primary" onclick="AdminCreditComponent.viewProducts(' + c.id + ')" title="View Products"><i class="fas fa-box"></i></button> ';
            h += '<button class="btn btn-sm btn-info" onclick="AdminCreditComponent.viewHistory(' + c.id + ')" title="History"><i class="fas fa-history"></i></button> ';
            h += '<button class="btn btn-sm btn-success" onclick="AdminCreditComponent.showPayment(' + c.id + ')" title="Record Payment"><i class="fas fa-money-bill"></i></button> ';
            h += '<button class="btn btn-sm btn-warning" onclick="AdminCreditComponent.editCustomer(' + c.id + ')" title="Edit"><i class="fas fa-edit"></i></button> ';
            if (Number(c.isActive) === 1) {
                h += '<button class="btn btn-sm btn-danger" onclick="AdminCreditComponent.deactivateCustomer(' + c.id + ',\'' + (c.name || '').replace(/'/g, "\\'") + '\')" title="Deactivate"><i class="fas fa-user-slash"></i></button>';
            } else {
                h += '<button class="btn btn-sm btn-outline-success" onclick="AdminCreditComponent.activateCustomer(' + c.id + ',\'' + (c.name || '').replace(/'/g, "\\'") + '\')" title="Activate"><i class="fas fa-user-check"></i></button>';
            }
            h += '</td></tr>';
        });
        h += '</tbody></table>';
        div.innerHTML = h;
    },

    async loadRecentSales() {
        try {
            const sales = await ApiService.get('/credit-sales');
            const customers = this._allCustomers.length ? this._allCustomers : await ApiService.get('/credit-customers');
            
            var div = document.getElementById('recentCreditSales');
            if (!div) return;
            
            if (!sales || !sales.length || !customers || !customers.length) {
                div.innerHTML = '<p style="text-align:center;color:#10b981;padding:2rem;"><i class="fas fa-check-circle" style="font-size:2rem;"></i><br>No active credit sales. All debts are cleared!</p>';
                return;
            }
            
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
        } catch(e) { 
            console.error('Load recent sales error:', e); 
        }
    },

    async loadRecentPayments() {
        try {
            const customers = this._allCustomers.length ? this._allCustomers : await ApiService.get('/credit-customers');
            var allPayments = [];
            
            if (customers && customers.length) {
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
        } catch(e) { 
            console.error('Payments error:', e); 
        }
    },

    _renderPaymentsTable(payments, div) {
        if (!payments.length) { 
            div.innerHTML = '<p style="text-align:center;color:#999;padding:2rem;">No payments found.</p>'; 
            return; 
        }
        var totalShown = payments.reduce(function(s, p) { return s + Number(p.amount || 0); }, 0);
        
        var h = '<div style="display:flex;gap:0.5rem;margin-bottom:1rem;flex-wrap:wrap;align-items:center;">';
        h += '<select id="paymentFilter" class="form-control" onchange="AdminCreditComponent._filterPayments()" style="width:150px;">';
        h += '<option value="10">Last 10</option><option value="25">Last 25</option><option value="50">Last 50</option><option value="today">Today</option><option value="week">This Week</option><option value="month">This Month</option><option value="all">All Time</option></select>';
        h += '<input type="text" id="paymentSearch" class="form-control" placeholder="Search customer..." oninput="AdminCreditComponent._filterPayments()" style="width:200px;">';
        h += '<span style="margin-left:auto;font-weight:600;color:#10b981;">Total: KES ' + totalShown.toLocaleString() + '</span></div>';
        
        h += '<table class="table" id="paymentsTable"><thead><tr><th>Date</th><th>Customer</th><th>Amount</th><th>Method</th><th>Received By</th><th>Action</th></tr></thead><tbody>';
        payments.forEach(function(p) {
            var badge = p.paymentMethod === 'mpesa' ? '<span class="badge badge-info">M-PESA</span>' : '<span class="badge badge-success">CASH</span>';
            h += '<tr data-search="' + (p.customerName || '').toLowerCase() + '"><td><small>' + (p.date ? new Date(p.date).toLocaleString('en-KE') : '-') + '</small></td><td><strong>' + (p.customerName || '-') + '</strong></td><td style="color:#10b981;font-weight:600;">KES ' + Number(p.amount || 0).toLocaleString() + '</td><td>' + badge + '</td><td>' + (p.receivedBy || '-') + '</td><td><button class="btn btn-sm btn-danger" onclick="AdminCreditComponent.deletePayment(' + p.id + ',' + p.customerId + ',\'' + (p.customerName || '').replace(/'/g, "\\'") + '\',' + p.amount + ')" title="Delete"><i class="fas fa-trash"></i></button></td></tr>';
        });
        h += '</tbody></table>';
        div.innerHTML = h;
    },

    _filterPayments() {
        var filter = document.getElementById('paymentFilter')?.value || '10';
        var search = (document.getElementById('paymentSearch')?.value || '').toLowerCase();
        var all = this._allPayments || [];
        var filtered = [];
        var now = new Date();
        var today = now.toISOString().split('T')[0];
        
        if (filter === 'today') { 
            filtered = all.filter(function(p) { return p.date && p.date.startsWith(today); }); 
        } else if (filter === 'week') { 
            var weekAgo = new Date(now.getTime() - 7*24*60*60*1000).toISOString().split('T')[0]; 
            filtered = all.filter(function(p) { return p.date && p.date >= weekAgo; }); 
        } else if (filter === 'month') { 
            var monthAgo = new Date(now.getTime() - 30*24*60*60*1000).toISOString().split('T')[0]; 
            filtered = all.filter(function(p) { return p.date && p.date >= monthAgo; }); 
        } else if (filter === 'all') { 
            filtered = all; 
        } else { 
            filtered = all.slice(0, parseInt(filter)); 
        }
        
        if (search) { 
            filtered = filtered.filter(function(p) { return (p.customerName || '').toLowerCase().indexOf(search) > -1; }); 
        }
        
        var div = document.getElementById('recentPayments');
        if (div) this._renderPaymentsTable(filtered, div);
    },

    _loadMorePayments() {
        var el = document.getElementById('paymentFilter');
        if (el) el.value = 'all';
        this._filterPayments();
    },

    async viewProducts(customerId) {
        try {
            const customer = await ApiService.get('/credit-customers/' + customerId);
            const allSales = await ApiService.get('/credit-sales');
            
            var customerSales = allSales ? allSales.filter(function(s) { return s.customerId == customerId; }) : [];
            var h = '<div class="modal modal-lg"><div class="modal-header" style="background:linear-gradient(135deg,#8b5cf6,#7c3aed);color:white;"><h3 style="color:white;"><i class="fas fa-box"></i> Products Taken by ' + (customer ? customer.name : 'Customer') + '</h3><button class="btn btn-sm" style="color:white;" onclick="this.closest(\'.modal-overlay\').remove()">X</button></div><div class="modal-body"><p><strong>Total Debt:</strong> KES ' + Number(customer ? customer.totalDebt || 0 : 0).toLocaleString() + ' | <strong>Limit:</strong> KES ' + Number(customer ? customer.debtLimit || 0 : 0).toLocaleString() + '</p>';
            if (!customerSales.length) { 
                h += '<p style="text-align:center;color:#999;">No credit purchases found.</p>'; 
            } else {
                h += '<table class="table"><thead><tr><th>Date</th><th>Sale ID</th><th>Amount</th><th>Cashier</th><th>Action</th></tr></thead><tbody>';
                customerSales.forEach(function(s){ 
                    h += '<tr><td>'+(s.date?new Date(s.date).toLocaleDateString('en-KE'):'-')+'</td><td><strong>#'+(s.saleId||'-')+'</strong></td><td style="color:#ef4444;">KES '+Number(s.amount||0).toLocaleString()+'</td><td>'+(s.cashierName||'-')+'</td><td><button class="btn btn-sm btn-primary" onclick="AdminCreditComponent.viewSaleProducts('+s.saleId+')"><i class="fas fa-eye"></i> Items</button></td></tr>';
                });
                h += '</tbody></table>';
            }
            h += '</div><div class="modal-footer"><button class="btn btn-outline" onclick="this.closest(\'.modal-overlay\').remove()">Close</button></div></div>';
            var m = document.createElement('div'); m.className = 'modal-overlay'; m.innerHTML = h;
            document.body.appendChild(m); m.onclick = function(e){if(e.target===m)m.remove();};
        } catch(e) { console.error('Error viewing products:', e); }
    },

    async viewCustomerSales(customerId) {
        try {
            const customer = await ApiService.get('/credit-customers/' + customerId);
            const allSales = await ApiService.get('/credit-sales');
            
            var customerSales = allSales ? allSales.filter(function(s) { return s.customerId == customerId; }) : [];
            var totalCredit = customerSales.reduce(function(s, sale) { return s + Number(sale.amount||0); }, 0);
            
            var h = '<div class="modal modal-lg"><div class="modal-header" style="background:linear-gradient(135deg,#8b5cf6,#7c3aed);color:white;"><h3 style="color:white;"><i class="fas fa-shopping-cart"></i> Credit History - ' + (customer ? customer.name : '') + '</h3><button class="btn btn-sm" style="color:white;" onclick="this.closest(\'.modal-overlay\').remove()">X</button></div><div class="modal-body">';
            h += '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:1rem;margin-bottom:1.5rem;"><div style="text-align:center;padding:0.75rem;background:#fef2f2;border-radius:0.5rem;"><div style="font-size:1.5rem;font-weight:700;color:#ef4444;">KES ' + Number(customer ? customer.totalDebt || 0 : 0).toLocaleString() + '</div><small>Current Debt</small></div><div style="text-align:center;padding:0.75rem;background:#fef3c7;border-radius:0.5rem;"><div style="font-size:1.5rem;font-weight:700;color:#f59e0b;">KES ' + Number(customer ? customer.debtLimit || 0 : 0).toLocaleString() + '</div><small>Debt Limit</small></div><div style="text-align:center;padding:0.75rem;background:#eff6ff;border-radius:0.5rem;"><div style="font-size:1.5rem;font-weight:700;color:#3b82f6;">' + customerSales.length + '</div><small>Transactions</small></div><div style="text-align:center;padding:0.75rem;background:#f0fdf4;border-radius:0.5rem;"><div style="font-size:1.5rem;font-weight:700;color:#10b981;">KES ' + totalCredit.toLocaleString() + '</div><small>Total Credit</small></div></div>';
            
            if (customerSales.length > 0) {
                h += '<h4>Credit Purchases</h4><table class="table"><thead><tr><th>Date</th><th>Sale ID</th><th>Amount</th><th>Debt Before</th><th>Debt After</th><th>Cashier</th><th>Items</th></tr></thead><tbody>';
                customerSales.sort(function(a,b){return new Date(b.date)-new Date(a.date);}).forEach(function(s){
                    h += '<tr><td><small>'+(s.date?new Date(s.date).toLocaleString('en-KE'):'-')+'</small></td><td><strong>#'+(s.saleId||'-')+'</strong></td><td style="color:#ef4444;font-weight:600;">KES '+Number(s.amount||0).toLocaleString()+'</td><td>KES '+Number(s.debtBefore||0).toLocaleString()+'</td><td>KES '+Number(s.debtAfter||0).toLocaleString()+'</td><td>'+(s.cashierName||'-')+'</td><td><button class="btn btn-sm btn-outline-primary" onclick="AdminCreditComponent.viewSaleProducts('+s.saleId+')"><i class="fas fa-box"></i> Items</button></td></tr>';
                });
                h += '</tbody></table>';
            }
            
            if (customer && customer.payments && customer.payments.length > 0) {
                var totalPaid = customer.payments.reduce(function(s,p){return s+Number(p.amount||0);},0);
                h += '<h4 style="margin-top:1.5rem;">Payments (Total: KES '+totalPaid.toLocaleString()+')</h4><table class="table"><thead><tr><th>Date</th><th>Amount</th><th>Method</th><th>Received By</th></tr></thead><tbody>';
                customer.payments.forEach(function(p){
                    h += '<tr><td>'+(p.date?new Date(p.date).toLocaleDateString('en-KE'):'-')+'</td><td style="color:#10b981;font-weight:600;">KES '+Number(p.amount||0).toLocaleString()+'</td><td>'+(p.paymentMethod||'cash').toUpperCase()+'</td><td>'+(p.receivedBy||'-')+'</td></tr>';
                });
                h += '</tbody></table>';
            }
            h += '</div><div class="modal-footer"><button class="btn btn-outline" onclick="this.closest(\'.modal-overlay\').remove()">Close</button></div></div>';
            
            var m = document.createElement('div'); m.className = 'modal-overlay'; m.innerHTML = h;
            document.body.appendChild(m); m.onclick = function(e){if(e.target===m)m.remove();};
        } catch(e) { console.error('Error viewing customer sales:', e); }
    },

    async viewSaleProducts(saleId) {
        try {
            const sales = await ApiService.get('/sales');
            var sale = sales ? sales.find(function(s) { return s.id == saleId; }) : null;
            if (!sale) return;
            
            var h = '<div class="modal"><div class="modal-header" style="background:linear-gradient(135deg,#3b82f6,#2563eb);color:white;"><h3 style="color:white;"><i class="fas fa-receipt"></i> Items - '+(sale.receiptNo||'')+'</h3><button class="btn btn-sm" style="color:white;" onclick="this.closest(\'.modal-overlay\').remove()">X</button></div><div class="modal-body"><p><strong>Customer:</strong> '+(sale.customerName||'Walk-in')+' | <strong>Date:</strong> '+new Date(sale.date).toLocaleDateString('en-KE')+'</p>';
            if (sale.items && sale.items.length > 0) {
                h += '<table class="table"><thead><tr><th>Product</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead><tbody>';
                sale.items.forEach(function(item){ 
                    h += '<tr><td>'+item.productName+'</td><td>'+item.quantity+'</td><td>KES '+Number(item.price||0).toLocaleString()+'</td><td>KES '+(Number(item.price||0)*item.quantity).toLocaleString()+'</td></tr>';
                });
                h += '</tbody></table><p style="text-align:right;font-weight:700;">Total: KES '+Number(sale.total||0).toLocaleString()+'</p>';
            }
            h += '</div><div class="modal-footer"><button class="btn btn-outline" onclick="this.closest(\'.modal-overlay\').remove()">Close</button></div></div>';
            var m = document.createElement('div'); m.className = 'modal-overlay'; m.innerHTML = h;
            document.body.appendChild(m); m.onclick = function(e){if(e.target===m)m.remove();};
        } catch(e) { console.error('Error viewing sale products:', e); }
    },

    async deactivateCustomer(id, name) {
        showConfirm('Deactivate', 'Deactivate <strong>'+name+'</strong>?', async function(){
            const result = await ApiService.put('/credit-customers/' + id, { isActive: 0 });
            if (result && result.success) {
                await AdminCreditComponent.loadAll();
                showStyledAlert('Success', name + ' deactivated.', 'check-circle', '#10b981');
            }
        }, 'Deactivate', 'danger');
    },

    async activateCustomer(id, name) {
        const result = await ApiService.put('/credit-customers/' + id, { isActive: 1 });
        if (result && result.success) {
            await AdminCreditComponent.loadAll();
            showStyledAlert('Success', name + ' reactivated.', 'check-circle', '#10b981');
        }
    },

    async deletePayment(paymentId, customerId, customerName, amount) {
        showConfirm('Delete Payment','Delete <strong>KES '+Number(amount).toLocaleString()+'</strong> from <strong>'+customerName+'</strong>?<br><br><span style="color:#ef4444;">Debt restored by KES '+Number(amount).toLocaleString()+'</span>', async function(){
            const result = await ApiService.delete('/debt-payments/' + paymentId);
            if (result && result.success) {
                await AdminCreditComponent.loadAll();
                showStyledAlert('Deleted', 'Payment deleted.', 'check-circle', '#10b981');
            } else {
                showStyledAlert('Error', (result && result.message) || 'Failed', 'times-circle', '#ef4444');
            }
        },'Delete','danger');
    },

    showRegisterCustomer() {
        var m = document.createElement('div'); m.className = 'modal-overlay';
        m.innerHTML = '<div class="modal"><div class="modal-header" style="background:linear-gradient(135deg,#1a472a,#c49a2b);color:white;"><h3 style="color:white;"><i class="fas fa-user-plus"></i> Register Credit Customer</h3><button class="btn btn-sm" style="color:white;" onclick="this.closest(\'.modal-overlay\').remove()">X</button></div><div class="modal-body"><div class="form-group"><label>Customer Name *</label><input type="text" id="regCustName" class="form-control" autofocus></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;"><div class="form-group"><label>Phone</label><input type="text" id="regCustPhone" class="form-control" placeholder="254XXXXXXXXX"></div><div class="form-group"><label>ID Number</label><input type="text" id="regCustId" class="form-control" placeholder="National ID"></div></div><div class="form-group"><label>Address</label><input type="text" id="regCustAddress" class="form-control"></div><div class="form-group"><label>Debt Limit (KES) *</label><input type="number" id="regCustLimit" class="form-control" value="5000" min="1000"></div></div><div class="modal-footer"><button class="btn btn-outline" onclick="this.closest(\'.modal-overlay\').remove()">Cancel</button><button class="btn btn-success" id="saveCustBtn"><i class="fas fa-save"></i> Register</button></div></div>';
        document.body.appendChild(m); m.onclick = function(e){if(e.target===m)m.remove();};
        var self = this;
        m.querySelector('#saveCustBtn').onclick = async function(){
            var name = m.querySelector('#regCustName').value.trim();
            if(!name){ showStyledAlert('Required', 'Name required!', 'exclamation-triangle', '#f59e0b'); return; }
            const result = await ApiService.post('/credit-customers', {
                name: name,
                phone: m.querySelector('#regCustPhone').value,
                idNumber: m.querySelector('#regCustId').value,
                address: m.querySelector('#regCustAddress').value,
                debtLimit: parseFloat(m.querySelector('#regCustLimit').value) || 5000,
                cashierName: 'Admin'
            });
            if (result && result.success) {
                m.remove();
                await self.loadAll();
                showStyledAlert('Success', 'Customer registered!', 'check-circle', '#10b981');
            }
        };
    },

    async editCustomer(id) {
        try {
            const customer = await ApiService.get('/credit-customers/' + id);
            if (!customer) return;
            var m = document.createElement('div'); m.className = 'modal-overlay';
            m.innerHTML = '<div class="modal"><div class="modal-header" style="background:linear-gradient(135deg,#3b82f6,#2563eb);color:white;"><h3 style="color:white;"><i class="fas fa-edit"></i> Edit '+customer.name+'</h3><button class="btn btn-sm" style="color:white;" onclick="this.closest(\'.modal-overlay\').remove()">X</button></div><div class="modal-body"><div class="form-group"><label>Name</label><input type="text" id="editCustName" class="form-control" value="'+(customer.name||'')+'"></div><div class="form-group"><label>Debt Limit (KES)</label><input type="number" id="editCustLimit" class="form-control" value="'+(customer.debtLimit||0)+'"></div><div class="form-group"><label>Phone</label><input type="text" id="editCustPhone" class="form-control" value="'+(customer.phone||'')+'"></div></div><div class="modal-footer"><button class="btn btn-outline" onclick="this.closest(\'.modal-overlay\').remove()">Cancel</button><button class="btn btn-primary" id="updateCustBtn">Update</button></div></div>';
            document.body.appendChild(m); m.onclick = function(e){if(e.target===m)m.remove();};
            m.querySelector('#updateCustBtn').onclick = async function(){
                const result = await ApiService.put('/credit-customers/' + id, {
                    name: m.querySelector('#editCustName').value,
                    debtLimit: parseFloat(m.querySelector('#editCustLimit').value) || 5000,
                    phone: m.querySelector('#editCustPhone').value
                });
                if (result && result.success) { m.remove(); await AdminCreditComponent.loadAll(); }
            };
        } catch(e) { console.error('Error editing customer:', e); }
    },

    async viewHistory(id) {
        try {
            const customer = await ApiService.get('/credit-customers/' + id);
            if (!customer) return;
            var h = '<div class="modal modal-lg"><div class="modal-header" style="background:linear-gradient(135deg,#1a472a,#c49a2b);color:white;"><h3 style="color:white;"><i class="fas fa-history"></i> '+customer.name+' - History</h3><button class="btn btn-sm" style="color:white;" onclick="this.closest(\'.modal-overlay\').remove()">X</button></div><div class="modal-body"><p><strong>Debt:</strong> KES '+Number(customer.totalDebt||0).toLocaleString()+' | <strong>Limit:</strong> KES '+Number(customer.debtLimit||0).toLocaleString()+'</p>';
            if(customer.recentSales && customer.recentSales.length > 0){
                h+='<h4>Purchases</h4><table class="table"><thead><tr><th>Date</th><th>Amount</th><th>Debt After</th><th>Cashier</th></tr></thead><tbody>';
                customer.recentSales.forEach(function(s){
                    h+='<tr><td>'+new Date(s.date).toLocaleDateString('en-KE')+'</td><td style="color:#ef4444;">KES '+Number(s.amount).toLocaleString()+'</td><td>KES '+Number(s.debtAfter).toLocaleString()+'</td><td>'+s.cashierName+'</td></tr>';
                });
                h+='</tbody></table>';
            }
            if(customer.payments && customer.payments.length > 0){
                h+='<h4>Payments</h4><table class="table"><thead><tr><th>Date</th><th>Amount</th><th>Method</th><th>Received By</th></tr></thead><tbody>';
                customer.payments.forEach(function(p){
                    h+='<tr><td>'+new Date(p.date).toLocaleDateString('en-KE')+'</td><td style="color:#10b981;">KES '+Number(p.amount).toLocaleString()+'</td><td>'+p.paymentMethod+'</td><td>'+p.receivedBy+'</td></tr>';
                });
                h+='</tbody></table>';
            }
            h+='</div><div class="modal-footer"><button class="btn btn-outline" onclick="this.closest(\'.modal-overlay\').remove()">Close</button></div></div>';
            var m=document.createElement('div');m.className='modal-overlay';m.innerHTML=h;
            document.body.appendChild(m);m.onclick=function(e){if(e.target===m)m.remove();};
        } catch(e) { console.error('Error viewing history:', e); }
    },

    async showPayment(id) {
        try {
            const customer = await ApiService.get('/credit-customers/' + id);
            if (!customer) return;
            var m=document.createElement('div');m.className='modal-overlay';
            m.innerHTML='<div class="modal"><div class="modal-header" style="background:linear-gradient(135deg,#10b981,#059669);color:white;"><h3 style="color:white;"><i class="fas fa-money-bill"></i> Record Payment - '+customer.name+'</h3><button class="btn btn-sm" style="color:white;" onclick="this.closest(\'.modal-overlay\').remove()">X</button></div><div class="modal-body"><p>Current Debt: <strong style="color:#ef4444;">KES '+Number(customer.totalDebt||0).toLocaleString()+'</strong></p><div class="form-group"><label>Amount (KES)</label><input type="number" id="payAmount" class="form-control" min="1" max="'+(customer.totalDebt||0)+'"></div><div class="form-group"><label>Method</label><select id="payMethod" class="form-control"><option value="cash">Cash</option><option value="mpesa">M-Pesa</option></select></div></div><div class="modal-footer"><button class="btn btn-outline" onclick="this.closest(\'.modal-overlay\').remove()">Cancel</button><button class="btn btn-success" id="confirmPayBtn">Confirm</button></div></div>';
            document.body.appendChild(m);m.onclick=function(e){if(e.target===m)m.remove();};
            m.querySelector('#confirmPayBtn').onclick = async function(){
                var amount=parseFloat(m.querySelector('#payAmount').value)||0;
                if(amount<=0||amount>customer.totalDebt){
                    showStyledAlert('Invalid','Enter valid amount!','times-circle','#ef4444');
                    return;
                }
                const result = await ApiService.post('/debt-payments', {
                    customerId: id, customerName: customer.name, amount: amount,
                    paymentMethod: m.querySelector('#payMethod').value, receivedBy: 'Admin'
                });
                if (result && result.success) {
                    m.remove(); await AdminCreditComponent.loadAll();
                    showStyledAlert('Success', 'Payment recorded!', 'check-circle', '#10b981');
                }
            };
        } catch(e) { console.error('Error showing payment:', e); }
    }
};

window.AdminCreditComponent = AdminCreditComponent;
