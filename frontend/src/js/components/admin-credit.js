// ============================================
// ADMIN CREDIT - With JWT Authentication
// ============================================

const AdminCreditComponent = {
    _allPayments: [],
    _allCustomers: [],
    _modalCustomers: [],
    _modalFilterType: 'all',

    render() {
        var h = '';
        h += '<div class="welcome-banner"><h2><i class="fas fa-credit-card"></i> Credit Management</h2><p>Manage customer credit accounts, debt limits, and payments</p></div>';
        
        h += '<div class="stats-grid" id="creditSummary" style="grid-template-columns: repeat(5, 1fr);">';
        h += '<div class="stat-card" onclick="AdminCreditComponent.showAllCustomersModal()" style="cursor:pointer;"><div class="stat-icon"><i class="fas fa-users"></i></div><div class="stat-label">Total Customers</div><div class="stat-value" style="color:#3b82f6;">0</div><div class="stat-sub">Click to view</div></div>';
        h += '<div class="stat-card"><div class="stat-icon"><i class="fas fa-coins"></i></div><div class="stat-label">Total Outstanding</div><div class="stat-value" style="color:#ef4444;">KES 0</div><div class="stat-sub">All customers</div></div>';
        h += '<div class="stat-card" onclick="AdminCreditComponent.showDebtCustomersModal()" style="cursor:pointer;"><div class="stat-icon"><i class="fas fa-user-clock"></i></div><div class="stat-label">Customers with Debt</div><div class="stat-value">0</div><div class="stat-sub">Click to view</div></div>';
        h += '<div class="stat-card"><div class="stat-icon"><i class="fas fa-file-invoice"></i></div><div class="stat-label">Today Credit Sales</div><div class="stat-value">KES 0</div><div class="stat-sub">Today</div></div>';
        h += '<div class="stat-card"><div class="stat-icon"><i class="fas fa-money-bill-wave"></i></div><div class="stat-label">Today Payments</div><div class="stat-value" style="color:#10b981;">KES 0</div><div class="stat-sub">Received today</div></div>';
        h += '</div>';
        
        h += '<div class="card" style="margin-bottom:1.5rem;"><div class="card-header"><h3 class="card-title"><i class="fas fa-shopping-cart"></i> Recent Credit Sales <span style="font-size:0.8rem;color:#999;">(Active Debtors Only)</span></h3></div><div class="card-body"><div id="recentCreditSales">Loading...</div></div></div>';
        h += '<div class="card"><div class="card-header"><h3 class="card-title"><i class="fas fa-money-bill"></i> Recent Debt Payments</h3></div><div class="card-body"><div id="recentPayments">Loading...</div></div></div>';
        
        setTimeout(function() { AdminCreditComponent.loadAll(); }, 200);
        return h;
    },

    async loadAll() {
        try { await this.loadSummary(); await this.loadRecentSales(); await this.loadRecentPayments(); }
        catch(e) { console.error('LoadAll error:', e); }
    },

    async loadSummary() {
        try {
            const data = await ApiService.get('/credit-summary');
            const customers = await ApiService.get('/credit-customers');
            this._allCustomers = customers || [];
            var div = document.getElementById('creditSummary');
            if (div && data) {
                div.style.gridTemplateColumns = 'repeat(5, 1fr)';
                div.innerHTML = 
                    '<div class="stat-card" onclick="AdminCreditComponent.showAllCustomersModal()" style="cursor:pointer;"><div class="stat-icon"><i class="fas fa-users"></i></div><div class="stat-label">Total Customers</div><div class="stat-value" style="color:#3b82f6;">'+(data.totalCustomers||0)+'</div><div class="stat-sub">Click to view</div></div>'+
                    '<div class="stat-card"><div class="stat-icon"><i class="fas fa-coins"></i></div><div class="stat-label">Total Outstanding</div><div class="stat-value" style="color:#ef4444;">KES '+(Number(data.totalDebt||0)).toLocaleString()+'</div><div class="stat-sub">All customers</div></div>'+
                    '<div class="stat-card" onclick="AdminCreditComponent.showDebtCustomersModal()" style="cursor:pointer;"><div class="stat-icon"><i class="fas fa-user-clock"></i></div><div class="stat-label">Customers with Debt</div><div class="stat-value">'+(data.activeCustomers||0)+'</div><div class="stat-sub">Click to view</div></div>'+
                    '<div class="stat-card"><div class="stat-icon"><i class="fas fa-file-invoice"></i></div><div class="stat-label">Today Credit Sales</div><div class="stat-value">KES '+(Number(data.todayCreditSales||0)).toLocaleString()+'</div><div class="stat-sub">Today</div></div>'+
                    '<div class="stat-card"><div class="stat-icon"><i class="fas fa-money-bill-wave"></i></div><div class="stat-label">Today Payments</div><div class="stat-value" style="color:#10b981;">KES '+(Number(data.todayPayments||0)).toLocaleString()+'</div><div class="stat-sub">Received today</div></div>';
            }
        } catch(e) { console.error('Error loading summary:', e); }
    },

    showAllCustomersModal() { this._showCustomersModal('all', 'All Registered Customers', this._allCustomers); },
    showDebtCustomersModal() { var d = this._allCustomers.filter(function(c){return Number(c.totalDebt||0)>0;}); this._showCustomersModal('debt', 'Customers with Debt', d); },

    _showCustomersModal(type, title, customerList) {
        this._modalFilterType = type; this._modalCustomers = customerList || [];
        var m = document.createElement('div'); m.className = 'modal-overlay';
        var h = '<div class="modal" style="max-width:95%;width:1200px;"><div class="modal-header" style="background:linear-gradient(135deg,#1a472a,#c49a2b);color:white;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.5rem;">';
        h += '<h3 style="color:white;margin:0;"><i class="fas fa-users"></i> '+title+' <span style="font-size:0.9rem;opacity:0.8;">('+customerList.length+' customers)</span></h3>';
        h += '<div style="display:flex;gap:0.5rem;align-items:center;">';
        h += '<div style="position:relative;"><i class="fas fa-search" style="position:absolute;left:10px;top:50%;transform:translateY(-50%);color:#999;"></i><input type="text" id="modalCustomerSearch" class="form-control" placeholder="Search name, phone, or ID..." oninput="AdminCreditComponent._filterModalCustomers()" style="padding-left:30px;width:250px;"></div>';
        h += '<button class="btn btn-sm btn-success" onclick="AdminCreditComponent.showRegisterCustomer()"><i class="fas fa-user-plus"></i> Register</button>';
        h += '<button class="btn btn-sm" style="color:white;background:rgba(255,255,255,0.2);" onclick="this.closest(\'.modal-overlay\').remove()">X</button>';
        h += '</div></div><div class="modal-body" style="max-height:70vh;overflow-y:auto;"><div id="modalCustomerTable"></div></div>';
        h += '<div class="modal-footer"><button class="btn btn-outline" onclick="this.closest(\'.modal-overlay\').remove()">Close</button></div></div>';
        m.innerHTML = h; document.body.appendChild(m);
        m.onclick = function(e){ if(e.target === m) m.remove(); };
        this._renderModalTable(customerList);
    },

    _filterModalCustomers() {
        var search = (document.getElementById('modalCustomerSearch')?.value || '').toLowerCase().trim();
        var filtered = this._modalCustomers || [];
        if (search) { filtered = filtered.filter(function(c){ return (c.name||'').toLowerCase().indexOf(search)>-1 || (c.phone||'').toLowerCase().indexOf(search)>-1 || (c.idNumber||'').toLowerCase().indexOf(search)>-1; }); }
        this._renderModalTable(filtered);
    },

    _renderModalTable(customers) {
        var div = document.getElementById('modalCustomerTable'); if (!div) return;
        if (!customers || !customers.length) { div.innerHTML = '<p style="text-align:center;color:#999;padding:3rem;"><i class="fas fa-search" style="font-size:2rem;display:block;margin-bottom:1rem;"></i>No customers found.</p>'; return; }
        var h = '<table class="table"><thead><tr><th>Customer</th><th>Phone</th><th>ID Number</th><th>Debt Limit</th><th>Total Debt</th><th>Available</th><th>Usage</th><th>Status</th><th>Actions</th></tr></thead><tbody>';
        customers.forEach(function(c){
            var pct = Number(c.debtLimit)>0 ? Math.round((Number(c.totalDebt)/Number(c.debtLimit))*100) : 0;
            var color = pct>80?'#ef4444':pct>50?'#f59e0b':'#10b981';
            var badge = Number(c.isActive)===0?'<span class="badge badge-danger">Inactive</span>':Number(c.totalDebt)>0?'<span class="badge badge-warning">Owing</span>':'<span class="badge badge-success">Clear</span>';
            h += '<tr style="'+(Number(c.isActive)===0?'opacity:0.5;':'')+'">';
            h += '<td><strong>'+(c.name||'-')+'</strong>'+(Number(c.isActive)===0?' <small style="color:#ef4444;">(Inactive)</small>':'')+'</td>';
            h += '<td>'+(c.phone||'-')+'</td><td>'+(c.idNumber||'-')+'</td>';
            h += '<td>KES '+Number(c.debtLimit||0).toLocaleString()+'</td>';
            h += '<td style="color:'+(Number(c.totalDebt)>0?'#ef4444':'#10b981')+';font-weight:700;">KES '+Number(c.totalDebt||0).toLocaleString()+'</td>';
            h += '<td>KES '+(Number(c.debtLimit||0)-Number(c.totalDebt||0)).toLocaleString()+'</td>';
            h += '<td><div style="width:80px;height:6px;background:#eee;border-radius:3px;"><div style="width:'+pct+'%;height:100%;background:'+color+';border-radius:3px;"></div></div><small>'+pct+'%</small></td>';
            h += '<td>'+badge+'</td>';
            h += '<td style="white-space:nowrap;">';
            h += '<button class="btn btn-sm btn-primary" onclick="AdminCreditComponent.viewProducts('+c.id+')"><i class="fas fa-box"></i></button> ';
            h += '<button class="btn btn-sm btn-info" onclick="AdminCreditComponent.viewHistory('+c.id+')"><i class="fas fa-history"></i></button> ';
            h += '<button class="btn btn-sm btn-success" onclick="AdminCreditComponent.showPayment('+c.id+')"><i class="fas fa-money-bill"></i></button> ';
            h += '<button class="btn btn-sm btn-warning" onclick="AdminCreditComponent.editCustomer('+c.id+')"><i class="fas fa-edit"></i></button> ';
            h += Number(c.isActive)===1?'<button class="btn btn-sm btn-danger" onclick="AdminCreditComponent.deactivateCustomer('+c.id+',\''+(c.name||'').replace(/'/g,"\\'")+'\')"><i class="fas fa-user-slash"></i></button>':'<button class="btn btn-sm btn-outline-success" onclick="AdminCreditComponent.activateCustomer('+c.id+',\''+(c.name||'').replace(/'/g,"\\'")+'\')"><i class="fas fa-user-check"></i></button>';
            h += '</td></tr>';
        });
        h += '</tbody></table>'; div.innerHTML = h;
    },

    async loadRecentSales() {
        try {
            const sales = await ApiService.get('/credit-sales');
            const customers = this._allCustomers.length ? this._allCustomers : await ApiService.get('/credit-customers');
            var div = document.getElementById('recentCreditSales'); if (!div) return;
            if (!sales||!sales.length||!customers||!customers.length) { div.innerHTML = '<p style="text-align:center;color:#10b981;padding:2rem;"><i class="fas fa-check-circle" style="font-size:2rem;"></i><br>No active credit sales.</p>'; return; }
            var debtors = customers.filter(function(c){return Number(c.totalDebt)>0;});
            var debtorIds = debtors.map(function(c){return c.id;});
            var activeSales = sales.filter(function(s){return debtorIds.indexOf(s.customerId)>-1;});
            if (!activeSales.length) { div.innerHTML = '<p style="text-align:center;color:#10b981;padding:2rem;"><i class="fas fa-check-circle" style="font-size:2rem;"></i><br>All debts are cleared!</p>'; return; }
            var grouped = {};
            activeSales.forEach(function(s){
                if(!grouped[s.customerId]) grouped[s.customerId]={customerId:s.customerId,customerName:s.customerName,totalAmount:0,currentDebt:0,salesCount:0,lastDate:s.date};
                grouped[s.customerId].totalAmount+=Number(s.amount||0); grouped[s.customerId].salesCount++;
                if(Number(s.debtAfter||0)>grouped[s.customerId].currentDebt) grouped[s.customerId].currentDebt=Number(s.debtAfter||0);
                if(new Date(s.date)>new Date(grouped[s.customerId].lastDate)) grouped[s.customerId].lastDate=s.date;
            });
            var cg = Object.values(grouped).sort(function(a,b){return new Date(b.lastDate)-new Date(a.lastDate);});
            var h = '<table class="table"><thead><tr><th>Customer</th><th>Current Debt</th><th>Total Credit</th><th>Transactions</th><th>Last Purchase</th><th>Actions</th></tr></thead><tbody>';
            cg.forEach(function(g){
                var c = debtors.find(function(d){return d.id==g.customerId;});
                var dl = c ? Number(c.debtLimit) : 5000;
                var pct = dl>0?Math.round((g.currentDebt/dl)*100):0;
                var color = pct>80?'#ef4444':pct>50?'#f59e0b':'#10b981';
                h += '<tr><td><strong>'+g.customerName+'</strong></td><td><span style="color:'+color+';font-weight:700;">KES '+g.currentDebt.toLocaleString()+'</span><br><small>'+pct+'% of KES '+dl.toLocaleString()+'</small></td><td>KES '+g.totalAmount.toLocaleString()+'</td><td><span class="badge badge-info">'+g.salesCount+'</span></td><td><small>'+(g.lastDate?new Date(g.lastDate).toLocaleDateString('en-KE'):'-')+'</small></td><td style="white-space:nowrap;"><button class="btn btn-sm btn-primary" onclick="AdminCreditComponent.viewCustomerSales('+g.customerId+')">View</button> <button class="btn btn-sm btn-success" onclick="AdminCreditComponent.showPayment('+g.customerId+')">Pay</button></td></tr>';
            });
            h += '</tbody></table>'; div.innerHTML = h;
        } catch(e) { console.error('Load recent sales error:', e); }
    },

    async loadRecentPayments() {
        try {
            const customers = this._allCustomers.length ? this._allCustomers : await ApiService.get('/credit-customers');
            var allPayments = [];
            if (customers && customers.length) {
                for (var i = 0; i < customers.length; i++) {
                    var payments = await ApiService.get('/debt-payments/' + customers[i].id);
                    if (payments && payments.length) { payments.forEach(function(p){ p.customerName = customers[i].name; p.customerId = customers[i].id; allPayments.push(p); }); }
                }
            }
            allPayments.sort(function(a,b){return new Date(b.date)-new Date(a.date);});
            this._allPayments = allPayments;
            var div = document.getElementById('recentPayments');
            if (div) { if (!allPayments.length) { div.innerHTML = '<p style="text-align:center;color:#999;padding:2rem;">No payments recorded yet.</p>'; return; } this._renderPaymentsTable(allPayments.slice(0,10), div); }
        } catch(e) { console.error('Payments error:', e); }
    },

    _renderPaymentsTable(payments, div) {
        if (!payments.length) { div.innerHTML = '<p style="text-align:center;color:#999;">No payments.</p>'; return; }
        var total = payments.reduce(function(s,p){return s+Number(p.amount||0);},0);
        var h = '<div style="display:flex;gap:0.5rem;margin-bottom:1rem;flex-wrap:wrap;align-items:center;"><select id="paymentFilter" class="form-control" onchange="AdminCreditComponent._filterPayments()" style="width:150px;"><option value="10">Last 10</option><option value="25">Last 25</option><option value="50">Last 50</option><option value="today">Today</option><option value="week">This Week</option><option value="month">This Month</option><option value="all">All Time</option></select><input type="text" id="paymentSearch" class="form-control" placeholder="Search..." oninput="AdminCreditComponent._filterPayments()" style="width:200px;"><span style="margin-left:auto;font-weight:600;color:#10b981;">Total: KES '+total.toLocaleString()+'</span></div>';
        h += '<table class="table"><thead><tr><th>Date</th><th>Customer</th><th>Amount</th><th>Method</th><th>Received By</th><th>Action</th></tr></thead><tbody>';
        payments.forEach(function(p){
            var badge = p.paymentMethod==='mpesa'?'<span class="badge badge-info">M-PESA</span>':'<span class="badge badge-success">CASH</span>';
            h += '<tr><td><small>'+(p.date?new Date(p.date).toLocaleString('en-KE'):'-')+'</small></td><td><strong>'+(p.customerName||'-')+'</strong></td><td style="color:#10b981;font-weight:600;">KES '+Number(p.amount||0).toLocaleString()+'</td><td>'+badge+'</td><td>'+(p.receivedBy||'-')+'</td><td><button class="btn btn-sm btn-danger" onclick="AdminCreditComponent.deletePayment('+p.id+','+p.customerId+',\''+(p.customerName||'').replace(/'/g,"\\'")+'\','+p.amount+')"><i class="fas fa-trash"></i></button></td></tr>';
        });
        h += '</tbody></table>'; div.innerHTML = h;
    },

    _filterPayments() {
        var filter = document.getElementById('paymentFilter')?.value || '10';
        var search = (document.getElementById('paymentSearch')?.value || '').toLowerCase();
        var all = this._allPayments || [];
        var filtered = [], now = new Date(), today = now.toISOString().split('T')[0];
        if (filter==='today') filtered = all.filter(function(p){return p.date&&p.date.startsWith(today);});
        else if (filter==='week') { var w = new Date(now.getTime()-7*24*60*60*1000).toISOString().split('T')[0]; filtered = all.filter(function(p){return p.date&&p.date>=w;}); }
        else if (filter==='month') { var m = new Date(now.getTime()-30*24*60*60*1000).toISOString().split('T')[0]; filtered = all.filter(function(p){return p.date&&p.date>=m;}); }
        else if (filter==='all') filtered = all;
        else filtered = all.slice(0, parseInt(filter));
        if (search) filtered = filtered.filter(function(p){return (p.customerName||'').toLowerCase().indexOf(search)>-1;});
        var div = document.getElementById('recentPayments'); if (div) this._renderPaymentsTable(filtered, div);
    },

    async viewProducts(cid) {
        try {
            const c = await ApiService.get('/credit-customers/'+cid);
            const sales = await ApiService.get('/credit-sales');
            var cs = sales ? sales.filter(function(s){return s.customerId==cid;}) : [];
            var h = '<div class="modal modal-lg"><div class="modal-header" style="background:linear-gradient(135deg,#8b5cf6,#7c3aed);color:white;"><h3 style="color:white;">Products - '+(c?c.name:'')+'</h3><button class="btn btn-sm" style="color:white;" onclick="this.closest(\'.modal-overlay\').remove()">X</button></div><div class="modal-body"><p><strong>Debt:</strong> KES '+Number(c?c.totalDebt||0:0).toLocaleString()+' | <strong>Limit:</strong> KES '+Number(c?c.debtLimit||0:0).toLocaleString()+'</p>';
            if(!cs.length) h+='<p style="text-align:center;color:#999;">No purchases.</p>';
            else { h+='<table class="table"><thead><tr><th>Date</th><th>Sale ID</th><th>Amount</th><th>Cashier</th><th>Items</th></tr></thead><tbody>';
                cs.forEach(function(s){ h+='<tr><td>'+(s.date?new Date(s.date).toLocaleDateString('en-KE'):'-')+'</td><td>#'+(s.saleId||'-')+'</td><td style="color:#ef4444;">KES '+Number(s.amount||0).toLocaleString()+'</td><td>'+(s.cashierName||'-')+'</td><td><button class="btn btn-sm btn-primary" onclick="AdminCreditComponent.viewSaleProducts('+s.saleId+')"><i class="fas fa-eye"></i></button></td></tr>'; });
                h+='</tbody></table>'; }
            h+='</div><div class="modal-footer"><button class="btn btn-outline" onclick="this.closest(\'.modal-overlay\').remove()">Close</button></div></div>';
            var m=document.createElement('div');m.className='modal-overlay';m.innerHTML=h;document.body.appendChild(m);m.onclick=function(e){if(e.target===m)m.remove();};
        } catch(e) {}
    },

    async viewCustomerSales(cid) {
        try {
            const c = await ApiService.get('/credit-customers/'+cid);
            const sales = await ApiService.get('/credit-sales');
            var cs = sales ? sales.filter(function(s){return s.customerId==cid;}) : [];
            var tc = cs.reduce(function(s,sl){return s+Number(sl.amount||0);},0);
            var h = '<div class="modal modal-lg"><div class="modal-header" style="background:linear-gradient(135deg,#8b5cf6,#7c3aed);color:white;"><h3 style="color:white;">Credit History - '+(c?c.name:'')+'</h3><button class="btn btn-sm" style="color:white;" onclick="this.closest(\'.modal-overlay\').remove()">X</button></div><div class="modal-body">';
            h+='<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:1rem;margin-bottom:1.5rem;"><div style="text-align:center;padding:0.75rem;background:#fef2f2;border-radius:0.5rem;"><div style="font-size:1.5rem;font-weight:700;color:#ef4444;">KES '+Number(c?c.totalDebt||0:0).toLocaleString()+'</div><small>Current Debt</small></div><div style="text-align:center;padding:0.75rem;background:#fef3c7;border-radius:0.5rem;"><div style="font-size:1.5rem;font-weight:700;color:#f59e0b;">KES '+Number(c?c.debtLimit||0:0).toLocaleString()+'</div><small>Debt Limit</small></div><div style="text-align:center;padding:0.75rem;background:#eff6ff;border-radius:0.5rem;"><div style="font-size:1.5rem;font-weight:700;color:#3b82f6;">'+cs.length+'</div><small>Transactions</small></div><div style="text-align:center;padding:0.75rem;background:#f0fdf4;border-radius:0.5rem;"><div style="font-size:1.5rem;font-weight:700;color:#10b981;">KES '+tc.toLocaleString()+'</div><small>Total Credit</small></div></div>';
            if(cs.length){ h+='<h4>Purchases</h4><table class="table"><thead><tr><th>Date</th><th>Sale ID</th><th>Amount</th><th>Debt Before</th><th>Debt After</th><th>Cashier</th></tr></thead><tbody>';
                cs.sort(function(a,b){return new Date(b.date)-new Date(a.date);}).forEach(function(s){ h+='<tr><td>'+(s.date?new Date(s.date).toLocaleString('en-KE'):'-')+'</td><td>#'+(s.saleId||'-')+'</td><td style="color:#ef4444;">KES '+Number(s.amount||0).toLocaleString()+'</td><td>KES '+Number(s.debtBefore||0).toLocaleString()+'</td><td>KES '+Number(s.debtAfter||0).toLocaleString()+'</td><td>'+(s.cashierName||'-')+'</td></tr>'; });
                h+='</tbody></table>'; }
            if(c&&c.payments&&c.payments.length){ var tp=c.payments.reduce(function(s,p){return s+Number(p.amount||0);},0); h+='<h4>Payments (Total: KES '+tp.toLocaleString()+')</h4><table class="table"><thead><tr><th>Date</th><th>Amount</th><th>Method</th><th>Received By</th></tr></thead><tbody>';
                c.payments.forEach(function(p){ h+='<tr><td>'+(p.date?new Date(p.date).toLocaleDateString('en-KE'):'-')+'</td><td style="color:#10b981;">KES '+Number(p.amount||0).toLocaleString()+'</td><td>'+(p.paymentMethod||'cash').toUpperCase()+'</td><td>'+(p.receivedBy||'-')+'</td></tr>'; }); h+='</tbody></table>'; }
            h+='</div><div class="modal-footer"><button class="btn btn-outline" onclick="this.closest(\'.modal-overlay\').remove()">Close</button></div></div>';
            var m=document.createElement('div');m.className='modal-overlay';m.innerHTML=h;document.body.appendChild(m);m.onclick=function(e){if(e.target===m)m.remove();};
        } catch(e) {}
    },

    async viewSaleProducts(sid) {
        try {
            const sales = await ApiService.get('/sales');
            var s = sales ? sales.find(function(sl){return sl.id==sid;}) : null; if(!s) return;
            var h = '<div class="modal"><div class="modal-header" style="background:linear-gradient(135deg,#3b82f6,#2563eb);color:white;"><h3 style="color:white;">Items - '+(s.receiptNo||'')+'</h3><button class="btn btn-sm" style="color:white;" onclick="this.closest(\'.modal-overlay\').remove()">X</button></div><div class="modal-body">';
            if(s.items&&s.items.length){ h+='<table class="table"><thead><tr><th>Product</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead><tbody>';
                s.items.forEach(function(i){ h+='<tr><td>'+i.productName+'</td><td>'+i.quantity+'</td><td>KES '+Number(i.price||0).toLocaleString()+'</td><td>KES '+(Number(i.price||0)*i.quantity).toLocaleString()+'</td></tr>'; });
                h+='</tbody></table><p style="text-align:right;font-weight:700;">Total: KES '+Number(s.total||0).toLocaleString()+'</p>'; }
            h+='</div><div class="modal-footer"><button class="btn btn-outline" onclick="this.closest(\'.modal-overlay\').remove()">Close</button></div></div>';
            var m=document.createElement('div');m.className='modal-overlay';m.innerHTML=h;document.body.appendChild(m);m.onclick=function(e){if(e.target===m)m.remove();};
        } catch(e) {}
    },

    async viewHistory(id) {
        try {
            const c = await ApiService.get('/credit-customers/'+id); if(!c) return;
            var h = '<div class="modal modal-lg"><div class="modal-header" style="background:linear-gradient(135deg,#1a472a,#c49a2b);color:white;"><h3 style="color:white;">'+c.name+' - History</h3><button class="btn btn-sm" style="color:white;" onclick="this.closest(\'.modal-overlay\').remove()">X</button></div><div class="modal-body"><p><strong>Debt:</strong> KES '+Number(c.totalDebt||0).toLocaleString()+' | <strong>Limit:</strong> KES '+Number(c.debtLimit||0).toLocaleString()+'</p>';
            if(c.recentSales&&c.recentSales.length){ h+='<h4>Purchases</h4><table class="table"><thead><tr><th>Date</th><th>Amount</th><th>Debt After</th><th>Cashier</th></tr></thead><tbody>'; c.recentSales.forEach(function(s){ h+='<tr><td>'+new Date(s.date).toLocaleDateString('en-KE')+'</td><td style="color:#ef4444;">KES '+Number(s.amount).toLocaleString()+'</td><td>KES '+Number(s.debtAfter).toLocaleString()+'</td><td>'+s.cashierName+'</td></tr>'; }); h+='</tbody></table>'; }
            if(c.payments&&c.payments.length){ h+='<h4>Payments</h4><table class="table"><thead><tr><th>Date</th><th>Amount</th><th>Method</th><th>Received By</th></tr></thead><tbody>'; c.payments.forEach(function(p){ h+='<tr><td>'+new Date(p.date).toLocaleDateString('en-KE')+'</td><td style="color:#10b981;">KES '+Number(p.amount).toLocaleString()+'</td><td>'+p.paymentMethod+'</td><td>'+p.receivedBy+'</td></tr>'; }); h+='</tbody></table>'; }
            h+='</div><div class="modal-footer"><button class="btn btn-outline" onclick="this.closest(\'.modal-overlay\').remove()">Close</button></div></div>';
            var m=document.createElement('div');m.className='modal-overlay';m.innerHTML=h;document.body.appendChild(m);m.onclick=function(e){if(e.target===m)m.remove();};
        } catch(e) {}
    },

    showRegisterCustomer() {
        var m = document.createElement('div'); m.className = 'modal-overlay';
        m.innerHTML = '<div class="modal"><div class="modal-header" style="background:linear-gradient(135deg,#1a472a,#c49a2b);color:white;"><h3 style="color:white;"><i class="fas fa-user-plus"></i> Register Credit Customer</h3><button class="btn btn-sm" style="color:white;" onclick="this.closest(\'.modal-overlay\').remove()">X</button></div><div class="modal-body"><div class="form-group"><label>Customer Name *</label><input type="text" id="regCustName" class="form-control" autofocus></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;"><div class="form-group"><label>Phone</label><input type="text" id="regCustPhone" class="form-control"></div><div class="form-group"><label>ID Number</label><input type="text" id="regCustId" class="form-control"></div></div><div class="form-group"><label>Address</label><input type="text" id="regCustAddress" class="form-control"></div><div class="form-group"><label>Debt Limit (KES) *</label><input type="number" id="regCustLimit" class="form-control" value="5000" min="1000"></div></div><div class="modal-footer"><button class="btn btn-outline" onclick="this.closest(\'.modal-overlay\').remove()">Cancel</button><button class="btn btn-success" id="saveCustBtn"><i class="fas fa-save"></i> Register</button></div></div>';
        document.body.appendChild(m); m.onclick = function(e){if(e.target===m)m.remove();};
        var self = this;
        m.querySelector('#saveCustBtn').onclick = async function(){
            var name = m.querySelector('#regCustName').value.trim();
            if(!name){ showStyledAlert('Required','Name required!','exclamation-triangle','#f59e0b'); return; }
            const result = await ApiService.post('/credit-customers',{name:name,phone:m.querySelector('#regCustPhone').value,idNumber:m.querySelector('#regCustId').value,address:m.querySelector('#regCustAddress').value,debtLimit:parseFloat(m.querySelector('#regCustLimit').value)||5000,cashierName:'Admin'});
            if(result&&result.success){ m.remove(); await self.loadAll(); showStyledAlert('Success','Customer registered!','check-circle','#10b981'); }
        };
    },

    async editCustomer(id) {
        try {
            const c = await ApiService.get('/credit-customers/'+id); if(!c) return;
            var m = document.createElement('div'); m.className = 'modal-overlay';
            m.innerHTML = '<div class="modal"><div class="modal-header" style="background:linear-gradient(135deg,#3b82f6,#2563eb);color:white;"><h3 style="color:white;">Edit '+c.name+'</h3><button class="btn btn-sm" style="color:white;" onclick="this.closest(\'.modal-overlay\').remove()">X</button></div><div class="modal-body"><div class="form-group"><label>Name</label><input type="text" id="editCustName" class="form-control" value="'+(c.name||'')+'"></div><div class="form-group"><label>Debt Limit (KES)</label><input type="number" id="editCustLimit" class="form-control" value="'+(c.debtLimit||0)+'"></div><div class="form-group"><label>Phone</label><input type="text" id="editCustPhone" class="form-control" value="'+(c.phone||'')+'"></div></div><div class="modal-footer"><button class="btn btn-outline" onclick="this.closest(\'.modal-overlay\').remove()">Cancel</button><button class="btn btn-primary" id="updateCustBtn">Update</button></div></div>';
            document.body.appendChild(m); m.onclick = function(e){if(e.target===m)m.remove();};
            m.querySelector('#updateCustBtn').onclick = async function(){
                const result = await ApiService.put('/credit-customers/'+id,{name:m.querySelector('#editCustName').value,debtLimit:parseFloat(m.querySelector('#editCustLimit').value)||5000,phone:m.querySelector('#editCustPhone').value});
                if(result&&result.success){ m.remove(); await AdminCreditComponent.loadAll(); }
            };
        } catch(e) {}
    },

    async showPayment(id) {
        try {
            const c = await ApiService.get('/credit-customers/'+id); if(!c) return;
            var m=document.createElement('div');m.className='modal-overlay';
            m.innerHTML='<div class="modal"><div class="modal-header" style="background:linear-gradient(135deg,#10b981,#059669);color:white;"><h3 style="color:white;">Record Payment - '+c.name+'</h3><button class="btn btn-sm" style="color:white;" onclick="this.closest(\'.modal-overlay\').remove()">X</button></div><div class="modal-body"><p>Current Debt: <strong style="color:#ef4444;">KES '+Number(c.totalDebt||0).toLocaleString()+'</strong></p><div class="form-group"><label>Amount (KES)</label><input type="number" id="payAmount" class="form-control" min="1" max="'+(c.totalDebt||0)+'"></div><div class="form-group"><label>Method</label><select id="payMethod" class="form-control"><option value="cash">Cash</option><option value="mpesa">M-Pesa</option></select></div></div><div class="modal-footer"><button class="btn btn-outline" onclick="this.closest(\'.modal-overlay\').remove()">Cancel</button><button class="btn btn-success" id="confirmPayBtn">Confirm</button></div></div>';
            document.body.appendChild(m);m.onclick=function(e){if(e.target===m)m.remove();};
            m.querySelector('#confirmPayBtn').onclick = async function(){
                var amount=parseFloat(m.querySelector('#payAmount').value)||0;
                if(amount<=0||amount>c.totalDebt){ showStyledAlert('Invalid','Enter valid amount!','times-circle','#ef4444'); return; }
                const result = await ApiService.post('/debt-payments',{customerId:id,customerName:c.name,amount:amount,paymentMethod:m.querySelector('#payMethod').value,receivedBy:'Admin'});
                if(result&&result.success){ m.remove(); await AdminCreditComponent.loadAll(); showStyledAlert('Success','Payment recorded!','check-circle','#10b981'); }
            };
        } catch(e) {}
    },

    async deactivateCustomer(id, name) {
        showConfirm('Deactivate','Deactivate <strong>'+name+'</strong>?', async function(){
            const result = await ApiService.put('/credit-customers/'+id,{isActive:0});
            if(result&&result.success){ await AdminCreditComponent.loadAll(); showStyledAlert('Success',name+' deactivated.','check-circle','#10b981'); }
        },'Deactivate','danger');
    },

    async activateCustomer(id, name) {
        const result = await ApiService.put('/credit-customers/'+id,{isActive:1});
        if(result&&result.success){ await AdminCreditComponent.loadAll(); showStyledAlert('Success',name+' reactivated.','check-circle','#10b981'); }
    },

    async deletePayment(pid, cid, cname, amount) {
        showConfirm('Delete Payment','Delete <strong>KES '+Number(amount).toLocaleString()+'</strong> from <strong>'+cname+'</strong>?', async function(){
            const result = await ApiService.delete('/debt-payments/'+pid);
            if(result&&result.success){ await AdminCreditComponent.loadAll(); showStyledAlert('Deleted','Payment deleted.','check-circle','#10b981'); }
        },'Delete','danger');
    }
};

window.AdminCreditComponent = AdminCreditComponent;
