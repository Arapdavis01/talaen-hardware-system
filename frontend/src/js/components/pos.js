const POSComponent = {
    _cart: [],
    _products: [],
    _selectedCustomerId: null,
    _selectedCustomer: null,
    _heldCarts: [],
    _heldCartCounter: 0,

    _showAlert(title, message, icon, color, callback) {
        var m = document.createElement('div'); m.className = 'modal-overlay';
        m.innerHTML = '<div class="modal"><div class="modal-header" style="background:linear-gradient(135deg,' + (color || '#3b82f6') + ',' + (color || '#2563eb') + ');color:white;"><h3 style="color:white;"><i class="fas fa-' + (icon || 'info-circle') + '"></i> ' + title + '</h3><button class="btn btn-sm" style="color:white;" onclick="this.closest(\'.modal-overlay\').remove()">X</button></div><div class="modal-body" style="text-align:center;"><div style="font-size:3rem;color:' + (color || '#3b82f6') + ';margin-bottom:1rem;"><i class="fas fa-' + (icon || 'info-circle') + '"></i></div><p style="font-size:1.1rem;">' + message + '</p></div><div class="modal-footer" style="justify-content:center;"><button class="btn btn-primary" id="alertOkBtn">OK</button></div></div>';
        document.body.appendChild(m); m.onclick = function(e){if(e.target===m)m.remove();};
        m.querySelector('#alertOkBtn').onclick = function(){ m.remove(); if(callback) callback(); };
    },

    async render() {
        try {
            var res = await fetch('http://localhost:8080/api/products');
            if (res.ok) this._products = await res.json();
        } catch(e) { this._products = ProductService._cache || []; }
        
        if (this._products.length === 0) {
            return '<div class="card"><div class="card-body" style="text-align:center;padding:3rem;"><i class="fas fa-box-open" style="font-size:4rem;color:var(--gray-400);"></i><h3>No Products Available</h3><p>Please ask admin to add products first.</p></div></div>';
        }
        
        var grouped = {};
        this._products.forEach(function(p) { var key = p.name.toUpperCase(); if (!grouped[key]) grouped[key] = { displayName: p.name, variants: [] }; grouped[key].variants.push(p); });
        
        var html = '<div class="pos-grid"><div class="card"><div class="card-header"><h3 class="card-title"><i class="fas fa-boxes"></i> Products</h3><input type="text" id="searchProduct" class="form-control" placeholder="Search..." style="width:250px;" oninput="POSComponent.search()"></div><div class="card-body" style="max-height:500px;overflow-y:auto;">';
        var keys = Object.keys(grouped).sort();
        for (var i = 0; i < keys.length; i++) {
            var group = grouped[keys[i]], variants = group.variants;
            html += '<div style="margin-bottom:1rem;border:1px solid #ddd;border-radius:1rem;overflow:hidden;"><div style="background:#f5f5f5;padding:0.5rem 1rem;font-weight:700;">' + group.displayName + ' (' + variants.length + ' variants)</div><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:0.5rem;padding:0.5rem;">';
            for (var j = 0; j < variants.length; j++) {
                var p = variants[j], stockColor = p.stock <= 0 ? '#ef4444' : p.stock <= 10 ? '#f59e0b' : '#10b981';
                html += '<div class="product-item" onclick="POSComponent.addToCart(' + p.id + ')" data-search="' + p.name.toLowerCase() + ' ' + (p.brand||'').toLowerCase() + ' ' + (p.variant||'').toLowerCase() + '" style="padding:0.75rem;cursor:pointer;border:2px solid #ddd;border-radius:0.75rem;text-align:center;">';
                if (p.brand) html += '<div style="font-weight:600;font-size:0.9rem;">' + p.brand + '</div>';
                html += '<div style="font-size:0.75rem;color:#666;">' + (p.variant || '') + '</div>';
                html += '<div style="font-weight:700;color:var(--secondary);font-size:1.1rem;margin:0.25rem 0;">KES ' + (p.price||0).toLocaleString() + '</div>';
                html += '<div style="display:flex;align-items:center;justify-content:center;gap:0.25rem;font-size:0.7rem;">';
                html += '<span style="width:8px;height:8px;border-radius:50%;background:' + stockColor + ';display:inline-block;"></span>';
                html += 'Stock: ' + p.stock + ' ' + (p.unit||'pcs') + '</div></div>';
            }
            html += '</div></div>';
        }
        html += '</div></div>';
        
        html += '<div class="card"><div class="card-header"><h3 class="card-title"><i class="fas fa-shopping-cart"></i> Cart <span class="badge badge-primary" id="cartCount">0</span></h3></div><div class="card-body"><div class="form-group"><label>Customer Name</label><div style="display:flex;gap:0.5rem;"><input type="text" id="customerName" class="form-control" placeholder="Type name to search or enter new..." oninput="POSComponent.searchCustomers()" autocomplete="off" style="flex:1;"><button class="btn btn-sm btn-outline" onclick="POSComponent.showRegisterCustomer()" title="Register New Credit Customer" style="white-space:nowrap;"><i class="fas fa-user-plus"></i> Register</button></div><div id="customerSuggestions" style="display:none;max-height:200px;overflow-y:auto;border:1px solid #ddd;border-radius:0.5rem;margin-top:0.25rem;"></div><div id="customerDebtInfo" style="display:none;margin-top:0.5rem;padding:0.75rem;border-radius:0.5rem;"></div></div><div id="cartItems" style="max-height:300px;overflow-y:auto;margin-bottom:1rem;"><div style="text-align:center;padding:2rem;color:#999;">Cart is empty</div></div><div class="cart-total"><div style="display:flex;justify-content:space-between;"><span>Subtotal (excl. VAT):</span><span id="subtotalDisplay">KES 0.00</span></div><div style="display:flex;justify-content:space-between;"><span>VAT (16%):</span><span id="taxDisplay">KES 0.00</span></div><div style="display:flex;justify-content:space-between;align-items:center;margin-top:0.25rem;"><span>Discount:</span><input type="number" id="discountAmount" class="form-control" value="0" min="0" step="50" oninput="POSComponent._updateCart()" style="width:120px;text-align:right;font-size:0.9rem;padding:0.25rem;"></div><div style="display:flex;justify-content:space-between;align-items:center;margin-top:0.25rem;"><span>Transport:</span><input type="number" id="transportCost" class="form-control" value="0" min="0" step="50" oninput="POSComponent._updateCart()" style="width:120px;text-align:right;font-size:0.9rem;padding:0.25rem;"></div><div style="display:flex;justify-content:space-between;font-size:1.3rem;font-weight:700;border-top:2px solid #ddd;padding-top:0.5rem;margin-top:0.5rem;"><span>TOTAL:</span><span id="totalAmount">KES 0.00</span></div></div>';
        
        html += '<select id="paymentMethod" class="form-control" style="margin-bottom:0.5rem;" onchange="POSComponent.togglePaymentFields()"><option value="cash">Cash</option><option value="mpesa">M-PESA</option><option value="credit">Credit</option><option value="till">Till Payment (Remote)</option></select>';
        html += '<div id="cashPaymentFields"><div class="form-group"><label>Amount Tendered (KES)</label><input type="number" id="amountTendered" class="form-control" placeholder="Enter amount given by customer" oninput="POSComponent.calculateChange()" style="font-size:1.1rem;"></div><div id="changeDisplay" style="text-align:center;font-size:1.2rem;font-weight:700;padding:0.5rem;margin-top:0.5rem;border-radius:0.5rem;display:none;"></div></div>';
        html += '<div id="tillPaymentFields" style="display:none;"><div class="form-group"><label>Customer Phone</label><input type="text" id="tillPhone" class="form-control" placeholder="254XXXXXXXXX"></div><div class="form-group"><label>M-Pesa Till Receipt Number *</label><input type="text" id="tillMpesaRef" class="form-control" placeholder="e.g., UEFK4422AR"></div></div>';
        
        html += '<div style="display:flex;gap:0.5rem;margin-bottom:0.5rem;">';
        html += '<button class="btn btn-info" style="flex:1;padding:0.75rem;background:#8b5cf6;border-color:#8b5cf6;color:white;" onclick="POSComponent.holdCart()"><i class="fas fa-pause"></i> Hold Cart</button>';
        html += '<button class="btn btn-outline" style="flex:1;padding:0.75rem;" onclick="POSComponent.showHeldCarts()"><i class="fas fa-list"></i> Held Carts (<span id="heldCartCount">0</span>)</button>';
        html += '</div>';
        
        html += '<button class="btn btn-success" style="width:100%;margin-bottom:0.5rem;padding:0.75rem;" onclick="POSComponent.completeSale()"><i class="fas fa-check-circle"></i> Complete Sale</button>';
        html += '<button class="btn btn-warning" style="width:100%;margin-bottom:0.5rem;padding:0.75rem;background:#f59e0b;border-color:#f59e0b;color:white;" onclick="POSComponent.showReturnExchange()"><i class="fas fa-exchange-alt"></i> Return / Exchange</button>';
        html += '<button class="btn btn-danger" style="width:100%;padding:0.75rem;" onclick="POSComponent.clearCart()"><i class="fas fa-trash"></i> Clear Cart</button></div></div></div>';
        return html;
    },

    togglePaymentFields() { 
        var m = document.getElementById('paymentMethod').value; 
        var f = document.getElementById('cashPaymentFields'); 
        var t = document.getElementById('tillPaymentFields');
        if (f) f.style.display = m === 'cash' ? 'block' : 'none'; 
        if (t) t.style.display = m === 'till' ? 'block' : 'none';
    },

    calculateChange() {
        var t = document.getElementById('amountTendered').value;
        var totalText = document.getElementById('totalAmount').textContent.replace(/[^0-9.]/g, '');
        var total = parseFloat(totalText) || 0;
        var d = document.getElementById('changeDisplay');
        if (t && total > 0) { var change = parseFloat(t) - total; d.style.display = 'block';
            d.innerHTML = change >= 0 ? '<span style="color:#10b981;">✅ Change: KES ' + change.toLocaleString() + '</span>' : '<span style="color:#ef4444;">❌ Insufficient! Need KES ' + Math.abs(change).toLocaleString() + ' more</span>';
        } else { d.style.display = 'none'; }
    },

    search() { var s = (document.getElementById('searchProduct')?.value || '').toLowerCase(); document.querySelectorAll('.product-item').forEach(function(el) { el.style.display = (el.dataset.search || '').includes(s) ? '' : 'none'; }); },

    // UPDATED: Clear search AND keep focus on search bar
    addToCart(productId) {
        var product = this._products.find(function(p) { return p.id == productId; });
        if (!product || product.stock <= 0) { this._showMessage('Out of stock!', 'danger'); return; }
        var existing = this._cart.find(function(i) { return i.productId == productId; });
        if (existing) { if (existing.quantity < product.stock) existing.quantity++; else { this._showMessage('No more stock!', 'warning'); return; } }
        else { this._cart.push({ productId: product.id, productName: (product.brand?product.brand+' - ':'')+product.name, productVariant: product.variant||'', quantity: 1, price: product.price, unit: product.unit }); }
        
        // Clear the search bar and keep focus on it
        var searchInput = document.getElementById('searchProduct');
        if (searchInput) {
            searchInput.value = '';
            searchInput.focus();
        }
        this.search();
        
        this._updateCart();
    },

    updateCartQty(productId, change) {
        var item = this._cart.find(function(i) { return i.productId == productId; }); if (!item) return;
        var product = this._products.find(function(p) { return p.id == productId; });
        var newQty = item.quantity + change;
        if (newQty <= 0) this._cart = this._cart.filter(function(i) { return i.productId != productId; });
        else if (product && newQty <= product.stock) item.quantity = newQty;
        else { this._showMessage('Not enough stock!', 'warning'); return; }
        this._updateCart();
    },

    removeFromCart(productId) { this._cart = this._cart.filter(function(i) { return i.productId != productId; }); this._updateCart(); },

    clearCart() {
        if (this._cart.length === 0) return; var self = this;
        this._showConfirm('Clear Cart', 'Are you sure you want to clear all items?', function() {
            self._cart = []; self._updateCart(); self._selectedCustomerId = null; self._selectedCustomer = null;
            var at = document.getElementById('amountTendered'); if (at) at.value = '';
            var cd = document.getElementById('changeDisplay'); if (cd) cd.style.display = 'none';
            var debtDiv = document.getElementById('customerDebtInfo'); if (debtDiv) debtDiv.style.display = 'none';
            var tc = document.getElementById('transportCost'); if (tc) tc.value = '0';
            var disc = document.getElementById('discountAmount'); if (disc) disc.value = '0';
            var tillRef = document.getElementById('tillMpesaRef'); if (tillRef) tillRef.value = '';
            var tillPhone = document.getElementById('tillPhone'); if (tillPhone) tillPhone.value = '';
        });
    },

    // ============ HOLD CART METHODS ============
    holdCart() {
        if (this._cart.length === 0) { this._showMessage('Cart is empty! Nothing to hold.', 'warning'); return; }
        var heldCart = { id: ++this._heldCartCounter, timestamp: new Date(), cart: JSON.parse(JSON.stringify(this._cart)), customerName: document.getElementById('customerName')?.value || '', customerId: this._selectedCustomerId, customer: this._selectedCustomer, transportCost: parseFloat(document.getElementById('transportCost')?.value) || 0, discountAmount: parseFloat(document.getElementById('discountAmount')?.value) || 0 };
        this._heldCarts.push(heldCart);
        this._cart = []; this._selectedCustomerId = null; this._selectedCustomer = null;
        var cn = document.getElementById('customerName'); if (cn) cn.value = '';
        var tc = document.getElementById('transportCost'); if (tc) tc.value = '0';
        var disc = document.getElementById('discountAmount'); if (disc) disc.value = '0';
        var debtDiv = document.getElementById('customerDebtInfo'); if (debtDiv) debtDiv.style.display = 'none';
        this._updateCart(); this._updateHeldCartCount();
        this._showMessage('✅ Cart #' + heldCart.id + ' held! You can resume it later.', 'success');
    },

    showHeldCarts() {
        var self = this;
        if (this._heldCarts.length === 0) { this._showMessage('No held carts available.', 'info'); return; }
        var m = document.createElement('div'); m.className = 'modal-overlay';
        var html = '<div class="modal modal-lg"><div class="modal-header" style="background:linear-gradient(135deg,#8b5cf6,#6d28d9);color:white;"><h3 style="color:white;"><i class="fas fa-list"></i> Held Carts (' + this._heldCarts.length + ')</h3><button class="btn btn-sm" style="color:white;" onclick="this.closest(\'.modal-overlay\').remove()">X</button></div><div class="modal-body" style="max-height:500px;overflow-y:auto;">';
        this._heldCarts.forEach(function(hc, index) {
            var itemCount = hc.cart.reduce(function(s, i) { return s + i.quantity; }, 0);
            var total = hc.cart.reduce(function(s, i) { return s + (i.price * i.quantity); }, 0);
            var timeAgo = Math.floor((new Date() - new Date(hc.timestamp)) / 60000);
            var timeStr = timeAgo < 1 ? 'Just now' : timeAgo + ' min ago';
            html += '<div style="border:1px solid #ddd;border-radius:0.75rem;padding:1rem;margin-bottom:0.75rem;background:white;"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem;"><div><strong style="font-size:1.1rem;">🛒 Cart #' + hc.id + '</strong> <span style="color:#999;font-size:0.85rem;">' + timeStr + '</span></div><div style="display:flex;gap:0.5rem;"><button class="btn btn-sm btn-success" onclick="POSComponent._resumeCart(' + index + ')"><i class="fas fa-play"></i> Resume</button><button class="btn btn-sm btn-danger" onclick="POSComponent._deleteHeldCart(' + index + ')"><i class="fas fa-trash"></i></button></div></div>';
            if (hc.customerName) html += '<div style="color:#666;margin-bottom:0.25rem;">👤 <strong>' + hc.customerName + '</strong></div>';
            html += '<div style="color:#666;margin-bottom:0.5rem;">📦 ' + itemCount + ' items | Total: <strong>KES ' + total.toLocaleString() + '</strong></div>';
            html += '<div style="font-size:0.85rem;color:#999;">';
            hc.cart.slice(0, 3).forEach(function(item) { html += item.productName + ' x' + item.quantity + ', '; });
            if (hc.cart.length > 3) html += '...';
            html += '</div></div>';
        });
        html += '</div><div class="modal-footer"><button class="btn btn-outline" onclick="this.closest(\'.modal-overlay\').remove()">Close</button></div></div>';
        m.innerHTML = html; document.body.appendChild(m); m.onclick = function(e){if(e.target===m)m.remove();};
    },

    _resumeCart(index) {
        if (index < 0 || index >= this._heldCarts.length) return;
        var self = this;
        if (this._cart.length > 0) { this._showConfirm('Current Cart Not Empty', 'Hold current cart first before resuming Cart #' + this._heldCarts[index].id + '?', function() { self.holdCart(); self._doResumeCart(index); }, 'Hold & Resume', 'warning'); }
        else { this._doResumeCart(index); }
        document.querySelectorAll('.modal-overlay').forEach(function(m) { if (m.querySelector('.fa-list')) m.remove(); });
    },

    _doResumeCart(index) {
        var hc = this._heldCarts[index];
        this._cart = JSON.parse(JSON.stringify(hc.cart));
        this._selectedCustomerId = hc.customerId; this._selectedCustomer = hc.customer;
        var cn = document.getElementById('customerName'); if (cn) cn.value = hc.customerName;
        var tc = document.getElementById('transportCost'); if (tc) tc.value = hc.transportCost;
        var disc = document.getElementById('discountAmount'); if (disc) disc.value = hc.discountAmount;
        if (hc.customerId && hc.customer) {
            var debtDiv = document.getElementById('customerDebtInfo');
            if (debtDiv) { var customer = hc.customer; var available = customer.debtLimit - customer.totalDebt; var debtColor = customer.totalDebt > 0 ? '#ef4444' : '#10b981'; var bgColor = customer.totalDebt > 0 ? '#fef2f2' : '#f0fdf4'; debtDiv.style.display = 'block'; debtDiv.style.background = bgColor; debtDiv.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem;"><div><i class="fas fa-user-check"></i> <strong>' + customer.name + '</strong> <span style="font-size:0.8rem;color:#999;">(Credit Customer)</span></div><div><button class="btn btn-sm btn-outline" onclick="POSComponent.viewCustomerDetails(' + customer.id + ')" style="margin-right:0.25rem;"><i class="fas fa-info-circle"></i> Details</button><button class="btn btn-sm btn-danger" onclick="POSComponent.clearCustomerSelection()"><i class="fas fa-times"></i></button></div></div><div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:0.5rem;font-size:0.85rem;"><div style="text-align:center;background:white;padding:0.5rem;border-radius:0.25rem;"><small>Current Debt</small><br><span style="color:' + debtColor + ';font-weight:700;">KES ' + customer.totalDebt.toLocaleString() + '</span></div><div style="text-align:center;background:white;padding:0.5rem;border-radius:0.25rem;"><small>Debt Limit</small><br>KES ' + customer.debtLimit.toLocaleString() + '</div><div style="text-align:center;background:white;padding:0.5rem;border-radius:0.25rem;"><small>Available Credit</small><br><span style="color:#10b981;font-weight:700;">KES ' + available.toLocaleString() + '</span></div></div>'; var pmSelect = document.getElementById('paymentMethod'); if (pmSelect) pmSelect.value = 'credit'; this.togglePaymentFields(); }
        }
        this._heldCarts.splice(index, 1); this._updateCart(); this._updateHeldCartCount();
        this._showMessage('✅ Cart #' + hc.id + ' resumed!', 'success');
    },

    _deleteHeldCart(index) {
        var self = this; var hc = this._heldCarts[index];
        this._showConfirm('Delete Held Cart', 'Delete Cart #' + hc.id + '? This cannot be undone.', function() { self._heldCarts.splice(index, 1); self._updateHeldCartCount(); self._showMessage('🗑️ Cart #' + hc.id + ' deleted.', 'warning'); self.showHeldCarts(); }, 'Delete', 'danger');
    },

    _updateHeldCartCount() { var count = document.getElementById('heldCartCount'); if (count) count.textContent = this._heldCarts.length; },

    searchCustomers() {
        var q = document.getElementById('customerName')?.value.trim(); var div = document.getElementById('customerSuggestions');
        if (!q || q.length < 2) { if (div) div.style.display = 'none'; return; }
        var self = this;
        fetch('http://localhost:8080/api/credit-customers/search/' + encodeURIComponent(q)).then(function(r){return r.json();}).then(function(customers){
            if (!customers.length) { div.style.display = 'block'; div.innerHTML = '<div style="padding:0.75rem;text-align:center;color:#999;">No customer found. <a href="#" onclick="POSComponent.showRegisterCustomer();return false;" style="color:var(--primary);">Register new?</a></div>'; return; }
            var h = '';
            customers.forEach(function(c){ var debtColor = c.totalDebt > 0 ? '#ef4444' : '#10b981'; var available = c.debtLimit - c.totalDebt;
                h += '<div style="padding:0.75rem;border-bottom:1px solid #eee;cursor:pointer;display:flex;justify-content:space-between;align-items:center;" onclick="POSComponent.selectCustomer(' + c.id + ')">';
                h += '<div><strong>👤 ' + c.name + '</strong><br><small style="color:#999;">📞 ' + (c.phone || 'No phone') + ' | 🆔 ' + (c.idNumber || 'No ID') + '</small></div>';
                h += '<div style="text-align:right;"><span style="color:' + debtColor + ';font-weight:700;">Debt: KES ' + c.totalDebt.toLocaleString() + '</span><br><small style="color:#999;">Limit: KES ' + c.debtLimit.toLocaleString() + ' | Avail: KES ' + available.toLocaleString() + '</small></div></div>';
            });
            div.innerHTML = h; div.style.display = 'block';
        });
    },

    selectCustomer(customerId) {
        var self = this;
        fetch('http://localhost:8080/api/credit-customers/' + customerId).then(function(r){return r.json();}).then(function(customer){
            if (!customer) return;
            var nameInput = document.getElementById('customerName'); if (nameInput) nameInput.value = customer.name;
            var div = document.getElementById('customerSuggestions'); if (div) div.style.display = 'none';
            var debtDiv = document.getElementById('customerDebtInfo');
            if (debtDiv) {
                var available = customer.debtLimit - customer.totalDebt, debtColor = customer.totalDebt > 0 ? '#ef4444' : '#10b981', bgColor = customer.totalDebt > 0 ? '#fef2f2' : '#f0fdf4';
                debtDiv.style.display = 'block'; debtDiv.style.background = bgColor;
                debtDiv.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem;"><div><i class="fas fa-user-check"></i> <strong>' + customer.name + '</strong> <span style="font-size:0.8rem;color:#999;">(Credit Customer)</span></div><div><button class="btn btn-sm btn-outline" onclick="POSComponent.viewCustomerDetails(' + customerId + ')" style="margin-right:0.25rem;"><i class="fas fa-info-circle"></i> Details</button><button class="btn btn-sm btn-danger" onclick="POSComponent.clearCustomerSelection()"><i class="fas fa-times"></i></button></div></div><div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:0.5rem;font-size:0.85rem;"><div style="text-align:center;background:white;padding:0.5rem;border-radius:0.25rem;"><small>Current Debt</small><br><span style="color:' + debtColor + ';font-weight:700;">KES ' + customer.totalDebt.toLocaleString() + '</span></div><div style="text-align:center;background:white;padding:0.5rem;border-radius:0.25rem;"><small>Debt Limit</small><br>KES ' + customer.debtLimit.toLocaleString() + '</div><div style="text-align:center;background:white;padding:0.5rem;border-radius:0.25rem;"><small>Available Credit</small><br><span style="color:#10b981;font-weight:700;">KES ' + available.toLocaleString() + '</span></div></div>';
                self._selectedCustomerId = customerId; self._selectedCustomer = customer;
                var pmSelect = document.getElementById('paymentMethod'); if (pmSelect) pmSelect.value = 'credit';
                self.togglePaymentFields();
            }
        });
    },

    clearCustomerSelection() {
        this._selectedCustomerId = null; this._selectedCustomer = null;
        var debtDiv = document.getElementById('customerDebtInfo'); if (debtDiv) debtDiv.style.display = 'none';
        var nameInput = document.getElementById('customerName'); if (nameInput) nameInput.value = '';
        var pmSelect = document.getElementById('paymentMethod'); if (pmSelect) pmSelect.value = 'cash';
        this.togglePaymentFields();
    },

    showRegisterCustomer() {
        var self = this; var currentName = document.getElementById('customerName')?.value || '';
        var m = document.createElement('div'); m.className = 'modal-overlay';
        m.innerHTML = '<div class="modal"><div class="modal-header" style="background:linear-gradient(135deg,#1a472a,#c49a2b);color:white;"><h3 style="color:white;"><i class="fas fa-user-plus"></i> Register Credit Customer</h3><button class="btn btn-sm" style="color:white;" onclick="this.closest(\'.modal-overlay\').remove()">X</button></div><div class="modal-body"><div class="form-group"><label>Customer Name *</label><input type="text" id="regCustName" class="form-control" value="' + currentName + '" autofocus></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;"><div class="form-group"><label>Phone Number</label><input type="text" id="regCustPhone" class="form-control" placeholder="254XXXXXXXXX"></div><div class="form-group"><label>ID Number</label><input type="text" id="regCustId" class="form-control" placeholder="National ID"></div></div><div class="form-group"><label>Address</label><input type="text" id="regCustAddress" class="form-control" placeholder="Customer address"></div><div class="form-group"><label>Debt Limit (KES) *</label><input type="number" id="regCustLimit" class="form-control" value="5000" min="1000"></div></div><div class="modal-footer"><button class="btn btn-outline" onclick="this.closest(\'.modal-overlay\').remove()">Cancel</button><button class="btn btn-success" id="saveCustBtn"><i class="fas fa-save"></i> Register Customer</button></div></div>';
        document.body.appendChild(m); m.onclick = function(e){if(e.target===m)m.remove();};
        m.querySelector('#saveCustBtn').onclick = function(){
            var name = m.querySelector('#regCustName').value.trim();
            if(!name){ self._showAlert('Required','Customer name is required!','exclamation-triangle','#f59e0b'); return; }
            var user = AuthService.getCurrentUser();
            fetch('http://localhost:8080/api/credit-customers',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:name,phone:m.querySelector('#regCustPhone').value,idNumber:m.querySelector('#regCustId').value,address:m.querySelector('#regCustAddress').value,debtLimit:parseFloat(m.querySelector('#regCustLimit').value)||5000,cashierId:user?.id,cashierName:user?.fullName})}).then(function(r){return r.json();}).then(function(d){if(d.success){m.remove();self._showMessage('✅ Customer registered successfully!','success');var nameInput=document.getElementById('customerName');if(nameInput){nameInput.value=name;nameInput.dispatchEvent(new Event('input'));}}});
        };
    },

    viewCustomerDetails(customerId) {
        var self = this;
        fetch('http://localhost:8080/api/credit-customers/' + customerId).then(function(r){return r.json();}).then(function(customer){
            var m = document.createElement('div'); m.className = 'modal-overlay';
            var recentSalesHTML = '';
            if (customer.recentSales && customer.recentSales.length > 0) { recentSalesHTML = '<h4 style="margin-top:1rem;">📋 Recent Credit Purchases</h4><table style="width:100%;border-collapse:collapse;font-size:0.9rem;"><tr style="border-bottom:1px solid #ddd;background:#f5f5f5;"><th>Date</th><th>Amount</th><th>Cashier</th></tr>'; customer.recentSales.forEach(function(s){ recentSalesHTML += '<tr style="border-bottom:1px solid #eee;"><td>'+(s.date?new Date(s.date).toLocaleDateString('en-KE'):'-')+'</td><td style="color:#ef4444;">KES '+s.amount.toLocaleString()+'</td><td style="color:#666;">'+(s.cashierName||'-')+'</td></tr>'; }); recentSalesHTML += '</table>'; }
            var paymentsHTML = '';
            if (customer.payments && customer.payments.length > 0) { paymentsHTML = '<h4 style="margin-top:1rem;">💰 Recent Payments</h4><table style="width:100%;border-collapse:collapse;font-size:0.9rem;"><tr style="border-bottom:1px solid #ddd;background:#f5f5f5;"><th>Date</th><th>Amount</th><th>Received By</th></tr>'; customer.payments.forEach(function(p){ paymentsHTML += '<tr style="border-bottom:1px solid #eee;"><td>'+(p.date?new Date(p.date).toLocaleDateString('en-KE'):'-')+'</td><td style="color:#10b981;">KES '+p.amount.toLocaleString()+'</td><td style="color:#666;">'+(p.receivedBy||'-')+'</td></tr>'; }); paymentsHTML += '</table>'; }
            m.innerHTML = '<div class="modal modal-lg"><div class="modal-header" style="background:linear-gradient(135deg,#1a472a,#c49a2b);color:white;"><h3 style="color:white;"><i class="fas fa-user"></i> '+customer.name+'</h3><button class="btn btn-sm" style="color:white;" onclick="this.closest(\'.modal-overlay\').remove()">X</button></div><div class="modal-body"><div style="display:grid;grid-template-columns:1fr 1fr;gap:0.5rem;margin-bottom:1rem;background:#f5f5f5;padding:1rem;border-radius:0.5rem;"><div><strong>📞 Phone:</strong> '+(customer.phone||'-')+'</div><div><strong>🆔 ID Number:</strong> '+(customer.idNumber||'-')+'</div><div><strong>Address:</strong> '+(customer.address||'-')+'</div><div><strong>📅 Registered:</strong> '+(customer.dateRegistered?new Date(customer.dateRegistered).toLocaleDateString('en-KE'):'-')+'</div><div><strong>💰 Debt Limit:</strong> KES '+(customer.debtLimit||0).toLocaleString()+'</div><div><strong>💳 Total Debt:</strong> <span style="color:'+(customer.totalDebt>0?'#ef4444':'#10b981')+';font-weight:700;">KES '+(customer.totalDebt||0).toLocaleString()+'</span></div></div>'+recentSalesHTML+paymentsHTML+'</div><div class="modal-footer" style="justify-content:center;gap:0.5rem;"><button class="btn btn-success" onclick="this.closest(\'.modal-overlay\').remove();POSComponent.showDebtPayment('+customer.id+')"><i class="fas fa-money-bill"></i> Record Payment</button><button class="btn btn-outline" onclick="this.closest(\'.modal-overlay\').remove()">Close</button></div></div>';
            document.body.appendChild(m); m.onclick = function(e){if(e.target===m)m.remove();};
        });
    },

    showDebtPayment(customerId) {
        var self = this;
        fetch('http://localhost:8080/api/credit-customers/' + customerId).then(function(r){return r.json();}).then(function(customer){
            var m = document.createElement('div'); m.className = 'modal-overlay';
            m.innerHTML = '<div class="modal"><div class="modal-header" style="background:linear-gradient(135deg,#10b981,#059669);color:white;"><h3 style="color:white;"><i class="fas fa-money-bill"></i> Record Debt Payment</h3><button class="btn btn-sm" style="color:white;" onclick="this.closest(\'.modal-overlay\').remove()">X</button></div><div class="modal-body"><div style="text-align:center;margin-bottom:1rem;"><h3>👤 '+customer.name+'</h3><p>Current Debt: <strong style="color:#ef4444;">KES '+(customer.totalDebt||0).toLocaleString()+'</strong></p></div><div class="form-group"><label>Amount Paid (KES) *</label><input type="number" id="debtPaymentAmount" class="form-control" placeholder="Enter amount" min="1" max="'+(customer.totalDebt||0)+'" style="font-size:1.2rem;text-align:center;"></div><div class="form-group"><label>Payment Method</label><select id="debtPaymentMethod" class="form-control"><option value="cash">Cash</option><option value="mpesa">M-Pesa</option></select></div></div><div class="modal-footer"><button class="btn btn-outline" onclick="this.closest(\'.modal-overlay\').remove()">Cancel</button><button class="btn btn-success" id="confirmDebtPayment"><i class="fas fa-check"></i> Confirm Payment</button></div></div>';
            document.body.appendChild(m); m.onclick = function(e){if(e.target===m)m.remove();};
            m.querySelector('#confirmDebtPayment').onclick = function(){
                var amount = parseFloat(m.querySelector('#debtPaymentAmount').value) || 0;
                if (amount <= 0) { self._showAlert('Invalid Amount','Enter a valid amount!','exclamation-triangle','#f59e0b'); return; }
                if (amount > customer.totalDebt) { self._showAlert('Limit Exceeded','Amount cannot exceed debt of KES '+customer.totalDebt.toLocaleString(),'exclamation-triangle','#ef4444'); return; }
                var user = AuthService.getCurrentUser();
                fetch('http://localhost:8080/api/debt-payments',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({customerId:customerId,customerName:customer.name,amount:amount,paymentMethod:m.querySelector('#debtPaymentMethod').value,receivedBy:user?.fullName||'Admin',receivedById:user?.id||null})}).then(function(r){return r.json();}).then(function(d){
                    if(d.success){ var sm = document.createElement('div'); sm.className = 'modal-overlay'; sm.innerHTML = '<div class="modal"><div class="modal-header" style="background:linear-gradient(135deg,#10b981,#059669);color:white;"><h3 style="color:white;"><i class="fas fa-check-circle"></i> Payment Recorded!</h3><button class="btn btn-sm" style="color:white;" onclick="this.closest(\'.modal-overlay\').remove()">X</button></div><div class="modal-body" style="text-align:center;"><div style="font-size:3rem;color:#10b981;margin-bottom:1rem;"><i class="fas fa-money-check-alt"></i></div><h3>KES '+amount.toLocaleString()+'</h3><p style="color:#999;">From: <strong>'+customer.name+'</strong></p><div style="background:#f0fdf4;padding:1rem;border-radius:0.5rem;margin-top:1rem;"><p style="color:#10b981;">✅ Payment recorded!</p><p>Remaining Debt: <strong style="color:#ef4444;">KES '+(customer.totalDebt-amount).toLocaleString()+'</strong></p></div></div><div class="modal-footer" style="justify-content:center;"><button class="btn btn-primary" onclick="this.closest(\'.modal-overlay\').remove();AppRouter.navigate(\'cashier-dashboard\')">Dashboard</button><button class="btn btn-outline" onclick="this.closest(\'.modal-overlay\').remove()">Close</button></div></div>'; document.body.appendChild(sm); sm.onclick = function(e){if(e.target===sm)sm.remove();}; m.remove(); self._selectedCustomer=null;self._selectedCustomerId=null;var debtDiv=document.getElementById('customerDebtInfo');if(debtDiv)debtDiv.style.display='none';var nameInput=document.getElementById('customerName');if(nameInput)nameInput.value='';setTimeout(function(){if(typeof CashierDashboardComponent!=='undefined'&&CashierDashboardComponent.loadCreditOnly)CashierDashboardComponent.loadCreditOnly();if(typeof AdminDashboardComponent!=='undefined'&&AdminDashboardComponent.loadCreditOnly)AdminDashboardComponent.loadCreditOnly();},500); }
                });
            };
        });
    },

    completeSale() {
        var self = this;
        if (this._cart.length === 0) { this._showMessage('Cart is empty!', 'warning'); return; }
        var subtotalInclVAT = this._cart.reduce(function(s, i) { return s + (i.price * i.quantity); }, 0);
        var subtotalExclVAT = subtotalInclVAT / 1.16;
        var vatAmount = subtotalInclVAT - subtotalExclVAT;
        var transport = parseFloat(document.getElementById('transportCost')?.value) || 0;
        var discount = parseFloat(document.getElementById('discountAmount')?.value) || 0;
        if (discount > subtotalInclVAT) { this._showMessage('Discount cannot exceed items total!', 'warning'); return; }
        var totalAfterDiscount = subtotalInclVAT - discount;
        var total = totalAfterDiscount + transport;
        var name = document.getElementById('customerName')?.value || 'Walk-in Customer';
        var pm = document.getElementById('paymentMethod')?.value || 'cash';
        var tendered = 0, change = 0;
        if (pm === 'cash') {
            tendered = parseFloat(document.getElementById('amountTendered')?.value) || 0;
            if (tendered < total) { this._showMessage('Insufficient amount! Need KES ' + (total - tendered).toLocaleString() + ' more', 'danger'); return; }
            change = tendered - total;
            this._processSale(name, pm, subtotalExclVAT, vatAmount, total, discount, tendered, change, null, null, transport);
        } else if (pm === 'mpesa') {
            this._showMpesaPayment(total, name, subtotalExclVAT, vatAmount, discount, transport);
        } else if (pm === 'credit') {
            if (!this._selectedCustomerId) { this._showMessage('Please select a registered credit customer first!', 'warning'); return; }
            var available = this._selectedCustomer.debtLimit - this._selectedCustomer.totalDebt;
            if (total > available) { this._showMessage('❌ Debt limit exceeded! Available: KES ' + available.toLocaleString() + ', Sale: KES ' + total.toLocaleString(), 'danger'); return; }
            this._processSale(name, pm, subtotalExclVAT, vatAmount, total, discount, 0, 0, null, this._selectedCustomerId, transport);
        } else if (pm === 'till') {
            var tillRef = document.getElementById('tillMpesaRef')?.value.trim();
            var tillPhone = document.getElementById('tillPhone')?.value.trim();
            if (!tillRef) { this._showMessage('Enter M-Pesa Till receipt number!', 'warning'); return; }
            this._processSale(name, 'mpesa', subtotalExclVAT, vatAmount, total, discount, 0, 0, tillRef, null, transport, tillPhone);
        }
    },

    _showMpesaPayment(total, customerName, subtotalExclVAT, vatAmount, discount, transport) {
        var self = this; var m = document.createElement('div'); m.className = 'modal-overlay';
        m.innerHTML = '<div class="modal"><div class="modal-header" style="background:linear-gradient(135deg,#1a472a,#10b981);color:white;"><h3 style="color:white;"><i class="fas fa-mobile-alt"></i> M-Pesa Payment</h3><button class="btn btn-sm" style="color:white;" onclick="this.closest(\'.modal-overlay\').remove()">X</button></div><div class="modal-body"><div style="text-align:center;margin-bottom:1rem;"><div style="font-size:3rem;color:#10b981;margin-bottom:0.5rem;"><i class="fas fa-money-bill-wave"></i></div><h3>KES '+total.toLocaleString()+'</h3><p style="color:#999;">Customer: '+customerName+'</p></div><div class="form-group"><label>Payment Method</label><select id="mpesaPaymentType" class="form-control" onchange="document.getElementById(\'mpesaTillSection\').style.display=this.value===\'till\'?\'block\':\'none\';document.getElementById(\'mpesaStkSection\').style.display=this.value===\'stk\'?\'block\':\'none\';"><option value="stk">Send STK Push</option><option value="till">Customer Paid via Till</option></select></div><div id="mpesaStkSection"><div class="form-group"><label>Customer Phone</label><input type="text" id="mpesaPhone" class="form-control" placeholder="254XXXXXXXXX"></div><button class="btn btn-success" id="mpesaStkBtn" style="width:100%;"><i class="fas fa-paper-plane"></i> Send STK Push</button><div id="mpesaStkStatus" style="margin-top:0.5rem;text-align:center;"></div></div><div id="mpesaTillSection" style="display:none;"><div class="form-group"><label>M-Pesa Receipt *</label><input type="text" id="mpesaReceipt" class="form-control" placeholder="e.g., UEFK4422AR" autofocus></div><div class="form-group"><label>Phone (optional)</label><input type="text" id="mpesaPhoneTill" class="form-control" placeholder="254XXXXXXXXX"></div><button class="btn btn-success" id="mpesaTillBtn" style="width:100%;"><i class="fas fa-check"></i> Confirm Till Payment</button></div></div><div class="modal-footer"><button class="btn btn-outline" onclick="this.closest(\'.modal-overlay\').remove()">Cancel</button></div></div>';
        document.body.appendChild(m); m.onclick = function(e){if(e.target===m)m.remove();};
        m.querySelector('#mpesaStkBtn').onclick = function(){
            var phone = m.querySelector('#mpesaPhone').value.trim();
            if(!phone){ self._showAlert('Required','Enter phone number!','exclamation-triangle','#f59e0b'); return; }
            var btn = m.querySelector('#mpesaStkBtn'); btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
            var statusDiv = m.querySelector('#mpesaStkStatus'); statusDiv.innerHTML = '<span style="color:#3b82f6;"><i class="fas fa-spinner fa-spin"></i> Sending STK Push...</span>';
            fetch('http://localhost:8080/api/mpesa/stk-push',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({phoneNumber:phone,amount:Math.round(total),accountReference:'TIH-SALE'})}).then(function(r){return r.json();}).then(function(d){
                btn.disabled = false; btn.innerHTML = '<i class="fas fa-paper-plane"></i> Send STK Push';
                if(d.success){ statusDiv.innerHTML = '<span style="color:#10b981;"><i class="fas fa-check-circle"></i> STK Push sent! Waiting...</span>'; var attempts=0; var checkStatus=setInterval(function(){attempts++;fetch('http://localhost:8080/api/mpesa/transaction/'+d.checkoutRequestID).then(function(r){return r.json();}).then(function(t){if(t.status==='completed'){clearInterval(checkStatus);statusDiv.innerHTML='<span style="color:#10b981;">✅ Payment received! Ref: '+t.mpesaReceiptNumber+'</span>';setTimeout(function(){m.remove();self._processSale(customerName,'mpesa',subtotalExclVAT,vatAmount,total,discount,0,0,t.mpesaReceiptNumber,null,transport);},1000);}else if(t.status==='failed'){clearInterval(checkStatus);statusDiv.innerHTML='<span style="color:#ef4444;">❌ Payment failed</span>';}if(attempts>30){clearInterval(checkStatus);statusDiv.innerHTML='<span style="color:#f59e0b;">⚠️ Timeout</span>';}});},2000); }else{statusDiv.innerHTML='<span style="color:#ef4444;">❌ '+(d.message||'Failed')+'</span>';}
            }).catch(function(){btn.disabled=false;btn.innerHTML='<i class="fas fa-paper-plane"></i> Send STK Push';statusDiv.innerHTML='<span style="color:#ef4444;">Network error</span>';});
        };
        m.querySelector('#mpesaTillBtn').onclick = function(){ var receipt=m.querySelector('#mpesaReceipt').value.trim();if(!receipt){self._showAlert('Required','Enter M-Pesa receipt number!','exclamation-triangle','#f59e0b');return;}fetch('http://localhost:8080/api/mpesa/till-payment',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({saleId:null,mpesaReceiptNumber:receipt,phoneNumber:m.querySelector('#mpesaPhoneTill').value.trim(),amount:total})}).then(function(){m.remove();self._processSale(customerName,'mpesa',subtotalExclVAT,vatAmount,total,discount,0,0,receipt,null,transport);}); };
    },

    _processSale(name, pm, subtotalExclVAT, vatAmount, total, discount, tendered, change, mpesaRef, customerId, transport, phone) {
        var self = this; var user = AuthService.getCurrentUser();
        var subtotalInclVAT = subtotalExclVAT + vatAmount;
        var msg = '<div style="text-align:center;"><p style="font-size:1.2rem;"><strong>Total: KES ' + total.toLocaleString() + '</strong></p><p>Customer: ' + name + '</p><p>Payment: ' + (pm === 'mpesa' && mpesaRef && !phone ? 'M-PESA (Till)' : pm.toUpperCase()) + '</p>';
        if (discount > 0) msg += '<p style="color:#ef4444;">Discount: -KES ' + discount.toLocaleString() + '</p>';
        if (transport > 0) msg += '<p>Transport: KES ' + transport.toLocaleString() + '</p>';
        if (pm === 'cash') msg += '<p>Tendered: KES ' + tendered.toLocaleString() + '</p><p style="color:#10b981;font-weight:700;">Change: KES ' + change.toLocaleString() + '</p>';
        if (pm === 'mpesa' && mpesaRef) msg += '<p style="color:#10b981;">M-Pesa Ref: <strong>' + mpesaRef + '</strong></p>';
        if (phone) msg += '<p style="color:#666;">Phone: <strong>' + phone + '</strong></p>';
        if (pm === 'credit') msg += '<p style="color:#f59e0b;"><strong>CREDIT SALE</strong></p>';
        msg += '</div>';
        this._showConfirm('Complete Sale', msg, async function() {
            var saleData = { items: self._cart, customerName: name, paymentMethod: pm, subtotal: subtotalInclVAT, subtotalExclVAT: subtotalExclVAT, tax: vatAmount, discount: discount || 0, total: total, transportCost: transport || 0, cashierId: user?.id, cashierName: user?.fullName, mpesaRef: mpesaRef || null, isCredit: pm === 'credit' ? 1 : 0, customerId: customerId || null, customerPhone: phone || null };
            var sale = await SaleService.create(saleData);
            if (pm === 'credit' && customerId && sale.saleId) { await fetch('http://localhost:8080/api/credit-sales', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({saleId: sale.saleId, customerId: customerId, customerName: name, amount: total, cashierId: user?.id, cashierName: user?.fullName}) }); }
            self._cart = []; self._updateCart(); self._selectedCustomerId = null; self._selectedCustomer = null;
            var at = document.getElementById('amountTendered'); if (at) at.value = '';
            var cd = document.getElementById('changeDisplay'); if (cd) cd.style.display = 'none';
            var cn = document.getElementById('customerName'); if (cn) cn.value = '';
            var debtDiv = document.getElementById('customerDebtInfo'); if (debtDiv) debtDiv.style.display = 'none';
            var tc = document.getElementById('transportCost'); if (tc) tc.value = '0';
            var disc = document.getElementById('discountAmount'); if (disc) disc.value = '0';
            var tillRef = document.getElementById('tillMpesaRef'); if (tillRef) tillRef.value = '';
            var tillPhone = document.getElementById('tillPhone'); if (tillPhone) tillPhone.value = '';
            setTimeout(function(){if(typeof CashierDashboardComponent!=='undefined'&&CashierDashboardComponent.loadCreditOnly)CashierDashboardComponent.loadCreditOnly();if(typeof AdminDashboardComponent!=='undefined'&&AdminDashboardComponent.loadCreditOnly)AdminDashboardComponent.loadCreditOnly();},500);
            self._showReceipt(sale);
        }, 'Confirm & Print Receipt', 'success');
    },

    showReturnExchange() { var m = document.createElement('div'); m.className = 'modal-overlay'; m.innerHTML = '<div class="modal modal-lg"><div class="modal-header" style="background:linear-gradient(135deg,#f59e0b,#d97706);color:white;"><h3 style="color:white;"><i class="fas fa-exchange-alt"></i> Return / Exchange</h3><button class="btn btn-sm" style="color:white;" onclick="this.closest(\'.modal-overlay\').remove()">X</button></div><div class="modal-body"><div class="form-group"><label>Search Receipt Number</label><input type="text" id="returnReceiptSearch" class="form-control" placeholder="e.g., TIH-MP77L0LG" oninput="POSComponent._searchReceipt()"></div><div id="returnReceiptResult" style="margin-top:1rem;"></div><div id="returnProcessArea" style="display:none;margin-top:1rem;"></div></div><div class="modal-footer"><button class="btn btn-outline" onclick="this.closest(\'.modal-overlay\').remove()">Cancel</button></div></div>'; document.body.appendChild(m); m.onclick = function(e){if(e.target===m)m.remove();}; },

    _searchReceipt() {
        var q = document.getElementById('returnReceiptSearch')?.value.trim();
        if (!q || q.length < 3) { document.getElementById('returnReceiptResult').innerHTML = ''; document.getElementById('returnProcessArea').style.display = 'none'; return; }
        var self = this;
        fetch('http://localhost:8080/api/sales/search/' + encodeURIComponent(q)).then(function(r){return r.json();}).then(function(sale){
            var resultDiv = document.getElementById('returnReceiptResult'), processDiv = document.getElementById('returnProcessArea');
            if (sale.error) { resultDiv.innerHTML = '<div style="padding:1rem;background:#fef2f2;border-radius:0.5rem;color:#ef4444;">❌ Receipt not found</div>'; processDiv.style.display = 'none'; return; }
            fetch('http://localhost:8080/api/returns/receipt/' + encodeURIComponent(sale.receiptNo)).then(function(r){return r.json();}).then(function(existingReturns){
                var returnedItems = existingReturns || [], returnedMap = {};
                returnedItems.forEach(function(ret){ var k=ret.productId; if(!returnedMap[k])returnedMap[k]={totalQty:0,returns:[]}; returnedMap[k].totalQty+=ret.quantity; returnedMap[k].returns.push({type:ret.returnType,qty:ret.quantity,date:ret.date}); });
                var hasReturns = returnedItems.length > 0;
                resultDiv.innerHTML = '<div style="background:#f5f5f5;padding:1rem;border-radius:0.5rem;"><strong>📋 '+sale.receiptNo+'</strong><br>Customer: '+(sale.customerName||'Walk-in')+'<br>Total: KES '+Number(sale.total||0).toLocaleString()+'<br>Payment: '+sale.paymentMethod+'<br>Date: '+(sale.date?new Date(sale.date).toLocaleDateString('en-KE'):'N/A')+(hasReturns?'<br><div style="margin-top:0.5rem;padding:0.5rem;background:#fef3c7;border-radius:0.25rem;"><span style="color:#f59e0b;">⚠️ Previous returns: '+returnedItems.length+' item(s)</span></div>':'')+'</div>';
                var itemsHTML = '<h4 style="margin-top:1rem;">Select Items to Return:</h4>'; var hasAvailableItems = false;
                sale.items.forEach(function(item){ var ri=returnedMap[item.productId],alreadyQty=ri?ri.totalQty:0,remQty=item.quantity-alreadyQty,isFull=remQty<=0;if(!isFull)hasAvailableItems=true;
                    if(isFull){itemsHTML+='<div style="display:flex;align-items:center;gap:1rem;padding:0.75rem;border:1px solid #fecaca;border-radius:0.5rem;margin-bottom:0.5rem;background:#fef2f2;"><div style="color:#ef4444;font-size:1.5rem;">🚫</div><div style="flex:1;"><strong style="color:#999;text-decoration:line-through;">'+item.productName+'</strong><br><small style="color:#999;">Original: '+item.quantity+' x KES '+Number(item.price).toLocaleString()+'</small><br><span style="color:#ef4444;">❌ Fully Returned ('+alreadyQty+' items)</span></div></div>';}
                    else if(alreadyQty>0){itemsHTML+='<div style="display:flex;align-items:center;gap:1rem;padding:0.75rem;border:1px solid #fcd34d;border-radius:0.5rem;margin-bottom:0.5rem;background:#fffbeb;"><input type="checkbox" id="ret_item_'+item.id+'" onchange="POSComponent._updateReturnTotal()" data-price="'+item.price+'" data-qty="'+remQty+'" data-product="'+item.productName+'" data-id="'+item.productId+'"><div style="flex:1;"><strong>'+item.productName+'</strong><br><small>Original: '+item.quantity+' x KES '+Number(item.price).toLocaleString()+'</small><br><span style="color:#f59e0b;">⚠️ Already returned: '+alreadyQty+' | Available: '+remQty+'</span></div><div><span>Qty:</span><input type="number" id="ret_qty_'+item.id+'" value="1" min="1" max="'+remQty+'" style="width:60px;text-align:center;padding:0.25rem;" onchange="POSComponent._updateReturnTotal()"></div></div>';}
                    else{itemsHTML+='<div style="display:flex;align-items:center;gap:1rem;padding:0.75rem;border:1px solid #ddd;border-radius:0.5rem;margin-bottom:0.5rem;background:white;"><input type="checkbox" id="ret_item_'+item.id+'" onchange="POSComponent._updateReturnTotal()" data-price="'+item.price+'" data-qty="'+item.quantity+'" data-product="'+item.productName+'" data-id="'+item.productId+'"><div style="flex:1;"><strong>'+item.productName+'</strong><br><small>'+item.quantity+' x KES '+Number(item.price).toLocaleString()+'</small></div><div><span>Qty:</span><input type="number" id="ret_qty_'+item.id+'" value="1" min="1" max="'+item.quantity+'" style="width:60px;text-align:center;padding:0.25rem;" onchange="POSComponent._updateReturnTotal()"></div></div>';}
                });
                if(!hasAvailableItems){itemsHTML+='<div style="text-align:center;padding:2rem;background:#fef2f2;border-radius:0.5rem;color:#ef4444;"><i class="fas fa-exclamation-circle" style="font-size:2rem;"></i><br><strong>All items fully returned!</strong></div>';}
                itemsHTML+='<div class="form-group" style="margin-top:1rem;"><label>Return Type</label><select id="returnType" class="form-control" onchange="POSComponent._toggleExchange()"><option value="return">Return (Refund)</option><option value="exchange">Exchange (Swap Product)</option></select></div>';
                itemsHTML+='<div id="exchangeSection" style="display:none;margin-top:1rem;padding:1rem;background:#fef3c7;border-radius:0.5rem;"><div class="form-group"><label><i class="fas fa-search"></i> Search Exchange Product</label><input type="text" id="exchangeProductSearch" class="form-control" placeholder="Type product name..." oninput="POSComponent._searchExchangeProduct()" autocomplete="off"><div id="exchangeProductResults" style="max-height:200px;overflow-y:auto;margin-top:0.5rem;"></div></div><div id="selectedExchangeProduct" style="display:none;margin-top:0.5rem;padding:0.75rem;background:white;border-radius:0.5rem;border:2px solid #10b981;"></div></div>';
                if(hasAvailableItems){itemsHTML+='<div class="form-group"><label>Reason (optional)</label><input type="text" id="returnReason" class="form-control" placeholder="Reason for return/exchange"></div><div id="returnTotalDisplay" style="text-align:center;font-size:1.2rem;font-weight:700;margin:1rem 0;padding:1rem;background:#f5f5f5;border-radius:0.5rem;"></div><button class="btn btn-warning" style="width:100%;padding:0.75rem;background:#f59e0b;border-color:#f59e0b;color:white;font-size:1.1rem;" onclick="POSComponent._processReturn('+sale.id+',\''+sale.receiptNo+'\',\''+(sale.customerName||'Walk-in')+'\')"><i class="fas fa-check"></i> Process Return/Exchange</button>';}
                processDiv.innerHTML = itemsHTML; processDiv.style.display = 'block'; processDiv._saleData = sale; processDiv._existingReturns = returnedMap;
            });
        }).catch(function(){document.getElementById('returnReceiptResult').innerHTML='<div style="padding:1rem;background:#fef2f2;border-radius:0.5rem;color:#ef4444;">Error searching receipt</div>';});
    },

    _searchExchangeProduct() {
        var q = document.getElementById('exchangeProductSearch')?.value.trim(); var resultsDiv = document.getElementById('exchangeProductResults');
        if (!q || q.length < 2) { if (resultsDiv) resultsDiv.innerHTML = ''; return; }
        fetch('http://localhost:8080/api/products/search?q=' + encodeURIComponent(q)).then(function(r){return r.json();}).then(function(products){
            if (!products || products.length === 0) { resultsDiv.innerHTML = '<div style="padding:0.5rem;color:#999;">No products found</div>'; return; }
            var html = '';
            products.forEach(function(p){if(p.stock<=0)return;var pn=(p.name||'').replace(/'/g,"\\'");html+='<div style="padding:0.75rem;border:1px solid #ddd;border-radius:0.5rem;margin-bottom:0.5rem;cursor:pointer;background:white;" onclick="POSComponent._selectExchangeProduct('+p.id+',\''+pn+'\','+(p.price||0)+','+(p.stock||0)+',\''+(p.unit||'pcs').replace(/'/g,"\\'")+'\')"><div style="display:flex;justify-content:space-between;"><div><strong>'+p.name+'</strong>'+(p.brand?' - '+p.brand:'')+(p.variant?'<br><small>'+p.variant+'</small>':'')+'</div><div style="text-align:right;"><strong style="color:#10b981;">KES '+(p.price||0).toLocaleString()+'</strong><br><small>Stock: '+p.stock+' '+(p.unit||'pcs')+'</small></div></div></div>';});
            resultsDiv.innerHTML = html || '<div style="padding:0.5rem;color:#999;">No available products</div>';
        });
    },

    _selectExchangeProduct(productId, productName, price, stock, unit) {
        var pd = document.getElementById('returnProcessArea'); pd._selectedExchangeProduct = { id: productId, name: productName, price: price, stock: stock, unit: unit };
        var sd = document.getElementById('selectedExchangeProduct'); if (sd) { sd.style.display='block'; sd.innerHTML='<div style="display:flex;justify-content:space-between;"><div><strong style="color:#10b981;">✅ Selected: '+productName+'</strong><br><small>Price: KES '+price.toLocaleString()+' | Stock: '+stock+' '+unit+'</small></div><button class="btn btn-sm btn-danger" onclick="POSComponent._removeExchangeProduct()"><i class="fas fa-times"></i> Change</button></div>'; }
        document.getElementById('exchangeProductResults').innerHTML = ''; this._updateReturnTotal();
    },

    _removeExchangeProduct() { var pd = document.getElementById('returnProcessArea'); if (pd) pd._selectedExchangeProduct = null; var sd = document.getElementById('selectedExchangeProduct'); if (sd) sd.style.display = 'none'; this._updateReturnTotal(); },

    _updateReturnTotal() {
        var total = 0;
        document.querySelectorAll('#returnProcessArea input[type="checkbox"]:checked').forEach(function(cb){var qi=document.getElementById('ret_qty_'+cb.id.replace('ret_item_',''));var qty=parseInt(qi?.value)||1;var max=parseInt(cb.dataset.qty);if(qty>max){qty=max;if(qi)qi.value=max;}total+=parseFloat(cb.dataset.price)*qty;});
        var pd=document.getElementById('returnProcessArea'), ep=pd?._selectedExchangeProduct;
        var exchangeAmt = ep ? ep.price : 0;
        var refund = total - exchangeAmt;
        var display = document.getElementById('returnTotalDisplay');
        if (display) {
            var html = '<div>📦 Items Value (incl. VAT): <span style="color:#ef4444;">KES ' + total.toLocaleString() + '</span></div>';
            html += '<div style="color:#f59e0b;font-size:0.85rem;">⚠️ Transport is NON-REFUNDABLE</div>';
            if (ep && exchangeAmt > 0) { html += '<div>🔄 Exchange Product: <span style="color:#10b981;">'+ep.name+'</span></div><div>💲 Exchange Price (incl. VAT): <span style="color:#10b981;">KES '+exchangeAmt.toLocaleString()+'</span></div>'; }
            html += '<div style="margin-top:0.5rem;font-size:1.1rem;font-weight:700;">';
            if (ep && exchangeAmt > 0) { if(refund>0)html+='<span style="color:#10b981;">✅ Refund: KES '+refund.toLocaleString()+'</span>'; else if(refund<0)html+='<span style="color:#ef4444;">⚠️ Customer Owes: KES '+Math.abs(refund).toLocaleString()+'</span>'; else html+='<span style="color:#3b82f6;">💰 Even Exchange</span>'; }
            html += '</div>'; display.innerHTML = html;
        }
    },

    _toggleExchange() { var type = document.getElementById('returnType')?.value; var sec = document.getElementById('exchangeSection'); if (sec) { sec.style.display = type==='exchange'?'block':'none'; if (type!=='exchange') this._removeExchangeProduct(); } this._updateReturnTotal(); },

    _printReturnReceipt() { var m = document.querySelector('.modal-overlay'); var w = window.open('', '_blank', 'width=450,height=600'); w.document.write('<!DOCTYPE html><html><head><title>Return Receipt</title><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet"><style>body{font-family:Inter,sans-serif;padding:20px;}@media print{body{padding:0;}}button{background:#1a472a;color:white;border:none;padding:10px 20px;border-radius:8px;cursor:pointer;font-size:16px;}</style></head><body><div style="text-align:center;margin-bottom:20px;"><button onclick="window.print()">Print</button></div>'+(m?._receiptHTML||'')+'</body></html>'); w.document.close(); },

    _processReturn(saleId, receiptNo, customerName) {
        var self = this;
        var checkboxes = document.querySelectorAll('#returnProcessArea input[type="checkbox"]:checked');
        if (checkboxes.length === 0) { this._showAlert('Required', 'Select at least one item!', 'exclamation-triangle', '#f59e0b'); return; }
        var returnType = document.getElementById('returnType')?.value || 'return';
        var reason = document.getElementById('returnReason')?.value || '';
        var pd = document.getElementById('returnProcessArea'), ep = pd?._selectedExchangeProduct;
        var exchangeName = ep ? ep.name : '';
        var exchangeAmt = ep ? ep.price : 0;
        var exchangeProductId = ep ? ep.id : null;
        var exchangeUnit = ep ? ep.unit : '';
        if (returnType === 'exchange' && !ep) { this._showAlert('Required', 'Select exchange product!', 'exclamation-triangle', '#f59e0b'); return; }
        var totalReturn = 0, returnItems = [];
        checkboxes.forEach(function(cb){var qi=document.getElementById('ret_qty_'+cb.id.replace('ret_item_',''));var qty=parseInt(qi?.value)||1;if(qty>parseInt(cb.dataset.qty)){self._showAlert('Invalid','Qty exceeds available!','exclamation-triangle','#f59e0b');return;}var itemTotal=parseFloat(cb.dataset.price)*qty;totalReturn+=itemTotal;returnItems.push({originalSaleId:saleId,originalReceiptNo:receiptNo,customerName:customerName,returnType:returnType,productId:parseInt(cb.dataset.id),productName:cb.dataset.product,quantity:qty,returnAmount:itemTotal,exchangeProductId:exchangeProductId,exchangeProductName:exchangeName,exchangeAmount:exchangeAmt,refundAmount:totalReturn-exchangeAmt,reason:reason,cashierName:AuthService.getCurrentUser()?.fullName||'Cashier'});});
        var refund = totalReturn - exchangeAmt;
        var msg = '<div style="text-align:center;"><h3>Confirm Return/Exchange</h3><p>Receipt: <strong>'+receiptNo+'</strong></p><p>Customer: <strong>'+customerName+'</strong></p><p>Type: <strong style="color:#f59e0b;">'+returnType.toUpperCase()+'</strong></p><p>Items: <strong>'+returnItems.length+'</strong></p><p>Items Value (incl. VAT): <strong style="color:#ef4444;">KES '+totalReturn.toLocaleString()+'</strong></p>';
        if(returnType==='exchange'&&exchangeName){msg+='<p>Exchange For: <strong style="color:#10b981;">'+exchangeName+' (incl. VAT KES '+exchangeAmt.toLocaleString()+')</strong></p>';}
        if(returnType==='exchange'){if(refund>0)msg+='<p style="color:#10b981;">💵 Refund: <strong>KES '+refund.toLocaleString()+'</strong></p>';else if(refund<0)msg+='<p style="color:#ef4444;">💰 Customer Owes: <strong>KES '+Math.abs(refund).toLocaleString()+'</strong></p>';else msg+='<p style="color:#3b82f6;">🔄 Even Exchange</p>';}
        else{msg+='<p style="color:#10b981;">💵 Refund: <strong>KES '+totalReturn.toLocaleString()+'</strong></p>';}
        msg+='<div style="margin-top:0.5rem;padding:0.5rem;background:#fef3c7;border-radius:0.5rem;"><p style="color:#f59e0b;margin:0;">⚠️ Transport is <strong>NON-REFUNDABLE</strong></p><p style="color:#666;margin:5px 0 0 0;font-size:0.85rem;">Customer pays transport separately for exchanged items.</p></div></div>';
        this._showConfirm('Process Return/Exchange', msg, function(){
            Promise.all(returnItems.map(function(item){return fetch('http://localhost:8080/api/returns',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(item)}).then(function(r){return r.json();});})).then(function(){
                fetch('http://localhost:8080/api/sales/'+saleId+'/mark-returned',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({isReturned:true,returnType:returnType,returnDate:new Date().toISOString()})}).catch(function(){});
                var now = new Date();
                var rhtml = '<div style="max-width:400px;margin:0 auto;font-family:Inter;font-size:14px;"><div style="text-align:center;border-bottom:2px dashed #ccc;padding-bottom:10px;margin-bottom:10px;"><strong>TALAEN INVESTMENT HARDWARE</strong><br><small>P.O BOX 345, NANDI HILLS</small><br><small style="font-size:9px;">Tel: 0717149902, 0724985188</small><br><div style="border-top:1px dashed #ccc;border-bottom:1px dashed #ccc;padding:4px 0;margin:8px 0;"><strong style="color:#ef4444;">'+(returnType==='exchange'?'EXCHANGE RECEIPT':'RETURN RECEIPT')+'</strong></div><strong>RET-'+Date.now().toString(36).toUpperCase()+'</strong></div>';
                rhtml+='<div style="margin-bottom:10px;"><div style="display:flex;justify-content:space-between;padding:2px 0;"><span>Date:</span><span>'+now.toLocaleDateString('en-KE')+'</span></div><div style="display:flex;justify-content:space-between;padding:2px 0;"><span>Time:</span><span>'+now.toLocaleTimeString('en-KE',{hour:'2-digit',minute:'2-digit',second:'2-digit'})+'</span></div><div style="display:flex;justify-content:space-between;padding:2px 0;"><span>Customer:</span><span>'+customerName+'</span></div><div style="display:flex;justify-content:space-between;padding:2px 0;"><span>Original Receipt:</span><span>'+receiptNo+'</span></div><div style="display:flex;justify-content:space-between;padding:2px 0;"><span>Type:</span><span style="color:#ef4444;font-weight:700;">'+returnType.toUpperCase()+'</span></div></div>';
                rhtml+='<table style="width:100%;border-collapse:collapse;margin:15px 0;"><thead><tr style="border-bottom:2px solid #333;"><th style="text-align:left;padding:4px;">Item</th><th style="text-align:center;padding:4px;">Qty</th><th style="text-align:right;padding:4px;">Amount (incl. VAT)</th></tr></thead><tbody>';
                checkboxes.forEach(function(cb){var qty=parseInt(document.getElementById('ret_qty_'+cb.id.replace('ret_item_','')).value)||1;var itemTotal=parseFloat(cb.dataset.price)*qty;rhtml+='<tr><td style="text-align:left;padding:3px;">'+cb.dataset.product+'</td><td style="text-align:center;padding:3px;">'+qty+'</td><td style="text-align:right;padding:3px;">KES '+itemTotal.toLocaleString()+'</td></tr>';});
                rhtml+='</tbody></table><div style="border-top:2px solid #333;padding-top:10px;"><div style="display:flex;justify-content:space-between;padding:2px 0;"><span>Items Value (incl. VAT):</span><span>KES '+totalReturn.toLocaleString()+'</span></div>';
                if(returnType==='exchange'&&exchangeName){rhtml+='<div style="display:flex;justify-content:space-between;padding:2px 0;"><span>Exchange Product:</span><span>'+exchangeName+'</span></div><div style="display:flex;justify-content:space-between;padding:2px 0;"><span>Exchange Value (incl. VAT):</span><span>KES '+exchangeAmt.toLocaleString()+'</span></div>';}
                var refundAmt=totalReturn-exchangeAmt;
                if(refundAmt>0)rhtml+='<div style="display:flex;justify-content:space-between;padding:2px 0;"><span>Refund:</span><span style="color:#10b981;font-weight:700;">KES '+refundAmt.toLocaleString()+'</span></div>';else if(refundAmt<0)rhtml+='<div style="display:flex;justify-content:space-between;padding:2px 0;"><span>Customer Owes:</span><span style="color:#ef4444;font-weight:700;">KES '+Math.abs(refundAmt).toLocaleString()+'</span></div>';
                rhtml+='<div style="display:flex;justify-content:space-between;padding:2px 0;color:#f59e0b;font-size:0.85rem;"><span>Transport:</span><span>Non-refundable</span></div>';if(reason)rhtml+='<div style="display:flex;justify-content:space-between;padding:2px 0;"><span>Reason:</span><span>'+reason+'</span></div>';rhtml+='</div><p style="text-align:center;margin-top:10px;color:#f59e0b;font-size:0.85rem;">⚠️ Original transport NOT refunded</p><p style="text-align:center;color:#666;">Processed by: '+(AuthService.getCurrentUser()?.fullName||'Cashier')+'</p></div>';
                var rm = document.createElement('div'); rm.className = 'modal-overlay';
                rm.innerHTML = '<div class="modal modal-lg"><div class="modal-header" style="background:linear-gradient(135deg,#ef4444,#dc2626);color:white;"><h3 style="color:white;"><i class="fas fa-exchange-alt"></i> '+(returnType==='exchange'?'Exchange':'Return')+' Receipt</h3><button class="btn btn-sm" style="color:white;" onclick="this.closest(\'.modal-overlay\').remove()">X</button></div><div class="modal-body">'+rhtml+'</div><div class="modal-footer" style="justify-content:center;gap:1rem;"><button class="btn btn-primary btn-lg" onclick="POSComponent._printReturnReceipt()"><i class="fas fa-print"></i> Print</button><button class="btn btn-outline" onclick="this.closest(\'.modal-overlay\').remove()">Close</button></div></div>';
                rm._receiptHTML = rhtml; document.body.appendChild(rm); rm.onclick = function(e){if(e.target===rm)rm.remove();};
                document.querySelectorAll('.modal-overlay').forEach(function(m){ if(m!==rm&&!m._receiptHTML)m.remove(); });
                if (returnType === 'exchange' && refundAmt < 0) { self._showExchangePayment(Math.abs(refundAmt), exchangeName, exchangeProductId, exchangeUnit, customerName); }
                ProductService._fetchFromAPI(); SaleService.getAll();
            }).catch(function(){ self._showAlert('Error','Failed to process return/exchange.','times-circle','#ef4444'); });
        }, 'Confirm', 'warning');
    },

    _showExchangePayment(amountOwed, exchangeProductName, exchangeProductId, exchangeUnit, customerName) {
        var self = this; var m = document.createElement('div'); m.className = 'modal-overlay';
        m.innerHTML = '<div class="modal"><div class="modal-header" style="background:linear-gradient(135deg,#f59e0b,#d97706);color:white;"><h3 style="color:white;"><i class="fas fa-money-bill"></i> Collect Exchange Payment</h3><button class="btn btn-sm" style="color:white;" onclick="this.closest(\'.modal-overlay\').remove()">X</button></div><div class="modal-body"><div style="text-align:center;margin-bottom:1rem;"><h3>💰 Amount Due: KES ' + amountOwed.toLocaleString() + '</h3><p style="color:#666;">Exchange for: <strong>' + exchangeProductName + '</strong></p><p style="color:#666;">Customer: <strong>' + customerName + '</strong></p></div><div class="form-group"><label>Add Transport for Exchanged Item? (optional)</label><input type="number" id="exchangeTransportCost" class="form-control" value="0" min="0" step="50" oninput="POSComponent._updateExchangeTotal(' + amountOwed + ')" style="font-size:1rem;"></div><div style="text-align:center;font-size:1.2rem;font-weight:700;margin:1rem 0;padding:0.75rem;background:#f5f5f5;border-radius:0.5rem;">Total to Pay: <span id="exchangeTotalDisplay">KES ' + amountOwed.toLocaleString() + '</span></div><div class="form-group"><label>Payment Method</label><select id="exchangePaymentMethod" class="form-control" onchange="POSComponent._toggleExchangePaymentFields()"><option value="cash"> Cash</option><option value="mpesa"> M-PESA (STK Push)</option></select></div><div id="exchangeCashFields"><div class="form-group"><label>Amount Tendered (KES)</label><input type="number" id="exchangeAmountTendered" class="form-control" placeholder="Enter amount" oninput="POSComponent._calculateExchangeChange()" style="font-size:1.1rem;"></div><div id="exchangeChangeDisplay" style="text-align:center;font-size:1.1rem;font-weight:700;padding:0.5rem;border-radius:0.5rem;display:none;"></div><button class="btn btn-success" id="confirmExchangeCashBtn" style="width:100%;margin-top:0.5rem;"><i class="fas fa-check"></i> Complete Payment</button></div><div id="exchangeMpesaFields" style="display:none;"><div class="form-group"><label>Customer Phone Number</label><input type="text" id="exchangeMpesaPhone" class="form-control" placeholder="254XXXXXXXXX"></div><button class="btn btn-success" id="exchangeMpesaStkBtn" style="width:100%;"><i class="fas fa-paper-plane"></i> Send STK Push</button><div id="exchangeMpesaStkStatus" style="margin-top:0.5rem;text-align:center;"></div></div></div><div class="modal-footer"><button class="btn btn-outline" onclick="this.closest(\'.modal-overlay\').remove()">Cancel</button></div></div>';
        document.body.appendChild(m); m.onclick = function(e){if(e.target===m)m.remove();};
        m.querySelector('#confirmExchangeCashBtn').onclick = function(){
            var transportCost = parseFloat(document.getElementById('exchangeTransportCost')?.value) || 0;
            var grandTotal = amountOwed + transportCost;
            var tendered = parseFloat(document.getElementById('exchangeAmountTendered')?.value) || 0;
            if (tendered < grandTotal) { self._showAlert('Insufficient', 'Need KES ' + (grandTotal - tendered).toLocaleString() + ' more!', 'exclamation-triangle', '#f59e0b'); return; }
            var change = tendered - grandTotal;
            var priceExclVAT = amountOwed / 1.16;
            var vatAmount = amountOwed - priceExclVAT;
            var saleData = { items: [{ productId: exchangeProductId, productName: exchangeProductName, quantity: 1, price: amountOwed, unit: exchangeUnit }], customerName: customerName, paymentMethod: 'cash', subtotal: amountOwed, subtotalExclVAT: priceExclVAT, tax: vatAmount, discount: 0, total: grandTotal, transportCost: transportCost, cashierId: AuthService.getCurrentUser()?.id, cashierName: AuthService.getCurrentUser()?.fullName };
            SaleService.create(saleData).then(function(sale) { m.remove(); self._showExchangeReceipt(sale, amountOwed, transportCost, grandTotal, 'cash', tendered, change); });
        };
        m.querySelector('#exchangeMpesaStkBtn').onclick = function(){
            var phone = m.querySelector('#exchangeMpesaPhone').value.trim();
            if (!phone) { self._showAlert('Required', 'Enter customer phone number!', 'exclamation-triangle', '#f59e0b'); return; }
            var transportCost = parseFloat(document.getElementById('exchangeTransportCost')?.value) || 0;
            var grandTotal = amountOwed + transportCost;
            var btn = m.querySelector('#exchangeMpesaStkBtn');
            btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
            var statusDiv = m.querySelector('#exchangeMpesaStkStatus');
            statusDiv.innerHTML = '<span style="color:#3b82f6;"><i class="fas fa-spinner fa-spin"></i> Sending STK Push... Check your phone.</span>';
            fetch('http://localhost:8080/api/mpesa/stk-push', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({phoneNumber: phone, amount: Math.round(grandTotal), accountReference: 'TIH-EXCH'}) })
            .then(function(r){return r.json();}).then(function(d) {
                btn.disabled = false; btn.innerHTML = '<i class="fas fa-paper-plane"></i> Send STK Push';
                if (d.success) {
                    statusDiv.innerHTML = '<span style="color:#10b981;"><i class="fas fa-check-circle"></i> STK Push sent! Waiting for payment...</span>';
                    var attempts = 0;
                    var checkStatus = setInterval(function() {
                        attempts++;
                        fetch('http://localhost:8080/api/mpesa/transaction/' + d.checkoutRequestID).then(function(r){return r.json();}).then(function(t) {
                            if (t.status === 'completed') {
                                clearInterval(checkStatus);
                                statusDiv.innerHTML = '<span style="color:#10b981;"><i class="fas fa-check-circle"></i> Payment received! Ref: ' + t.mpesaReceiptNumber + '</span>';
                                var priceExclVAT = amountOwed / 1.16;
                                var vatAmount = amountOwed - priceExclVAT;
                                var saleData = { items: [{ productId: exchangeProductId, productName: exchangeProductName, quantity: 1, price: amountOwed, unit: exchangeUnit }], customerName: customerName, paymentMethod: 'mpesa', subtotal: amountOwed, subtotalExclVAT: priceExclVAT, tax: vatAmount, discount: 0, total: grandTotal, transportCost: transportCost, cashierId: AuthService.getCurrentUser()?.id, cashierName: AuthService.getCurrentUser()?.fullName, mpesaRef: t.mpesaReceiptNumber };
                                setTimeout(function() { SaleService.create(saleData).then(function(sale) { m.remove(); self._showExchangeReceipt(sale, amountOwed, transportCost, grandTotal, 'mpesa', 0, 0, t.mpesaReceiptNumber); }); }, 500);
                            } else if (t.status === 'failed') { clearInterval(checkStatus); statusDiv.innerHTML = '<span style="color:#ef4444;"><i class="fas fa-times-circle"></i> Payment failed or cancelled</span>'; }
                            if (attempts > 30) { clearInterval(checkStatus); statusDiv.innerHTML = '<span style="color:#f59e0b;"><i class="fas fa-exclamation-triangle"></i> Check timeout.</span>'; }
                        });
                    }, 2000);
                } else { statusDiv.innerHTML = '<span style="color:#ef4444;"><i class="fas fa-times-circle"></i> ' + (d.message || 'Failed to send STK Push') + '</span>'; }
            }).catch(function(e) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-paper-plane"></i> Send STK Push'; statusDiv.innerHTML = '<span style="color:#ef4444;">Network error</span>'; });
        };
    },

    _updateExchangeTotal(amountOwed) { var transport = parseFloat(document.getElementById('exchangeTransportCost')?.value) || 0; var total = amountOwed + transport; var display = document.getElementById('exchangeTotalDisplay'); if (display) display.textContent = 'KES ' + total.toLocaleString(); this._calculateExchangeChange(); },

    _calculateExchangeChange() {
        var tendered = parseFloat(document.getElementById('exchangeAmountTendered')?.value) || 0;
        var totalText = document.getElementById('exchangeTotalDisplay')?.textContent.replace(/[^0-9.]/g, '') || '0';
        var total = parseFloat(totalText) || 0; var d = document.getElementById('exchangeChangeDisplay');
        if (d && tendered > 0 && total > 0) { var change = tendered - total; d.style.display = 'block';
            d.innerHTML = change >= 0 ? '<span style="color:#10b981;">✅ Change: KES ' + change.toLocaleString() + '</span>' : '<span style="color:#ef4444;">❌ Insufficient! Need KES ' + Math.abs(change).toLocaleString() + ' more</span>';
        } else if (d) { d.style.display = 'none'; }
    },

    _toggleExchangePaymentFields() { var pm = document.getElementById('exchangePaymentMethod')?.value; var cf = document.getElementById('exchangeCashFields'); var mf = document.getElementById('exchangeMpesaFields'); if (cf) cf.style.display = pm === 'cash' ? 'block' : 'none'; if (mf) mf.style.display = pm === 'mpesa' ? 'block' : 'none'; },

    _showExchangeReceipt(sale, exchangeAmount, transportCost, grandTotal, pm, tendered, change, mpesaRef) {
        var now = new Date();
        var receiptHTML = '<div style="max-width:400px;margin:0 auto;font-family:Inter;font-size:14px;">';
        receiptHTML += '<div style="text-align:center;border-bottom:2px dashed #ccc;padding-bottom:10px;margin-bottom:10px;">';
        receiptHTML += '<img src="../assets/talaen02.jpg" style="width:50px;height:50px;border-radius:10px;object-fit:cover;margin-bottom:5px;"><br>';
        receiptHTML += '<strong>TALAEN INVESTMENT HARDWARE</strong><br><small>P.O BOX 345, NANDI HILLS</small><br>';
        receiptHTML += '<small style="font-size:9px;">Tel: 0717149902, 0724985188</small><br>';
        receiptHTML += '<div style="border-top:1px dashed #ccc;border-bottom:1px dashed #ccc;padding:4px 0;margin:8px 0;">';
        receiptHTML += '<strong style="color:#f59e0b;letter-spacing:1px;">EXCHANGE PAYMENT RECEIPT</strong></div>';
        receiptHTML += '<strong>'+(sale.receiptNo||'')+'</strong></div>';
        receiptHTML += '<div style="margin-bottom:10px;">';
        receiptHTML += '<div style="display:flex;justify-content:space-between;padding:2px 0;"><span>Date:</span><span>'+now.toLocaleDateString('en-KE')+'</span></div>';
        receiptHTML += '<div style="display:flex;justify-content:space-between;padding:2px 0;"><span>Time:</span><span>'+now.toLocaleTimeString('en-KE',{hour:'2-digit',minute:'2-digit',second:'2-digit'})+'</span></div>';
        receiptHTML += '<div style="display:flex;justify-content:space-between;padding:2px 0;"><span>Customer:</span><span>'+(sale.customerName||'Walk-in')+'</span></div>';
        receiptHTML += '<div style="display:flex;justify-content:space-between;padding:2px 0;"><span>Payment:</span><span>'+pm.toUpperCase()+'</span></div>';
        receiptHTML += '<div style="display:flex;justify-content:space-between;padding:2px 0;"><span>Type:</span><span style="color:#f59e0b;font-weight:700;">EXCHANGE PAYMENT</span></div>';
        if(mpesaRef)receiptHTML+='<div style="display:flex;justify-content:space-between;padding:2px 0;"><span>M-Pesa Ref:</span><span style="color:#10b981;">'+mpesaRef+'</span></div>';
        receiptHTML+='</div>';
        var exchPriceExclVAT = exchangeAmount / 1.16;
        var exchVAT = exchangeAmount - exchPriceExclVAT;
        receiptHTML += '<div style="border-top:2px solid #333;padding-top:10px;">';
        receiptHTML += '<div style="display:flex;justify-content:space-between;padding:2px 0;"><span>Exchange Item (excl. VAT):</span><span>KES '+exchPriceExclVAT.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})+'</span></div>';
        receiptHTML += '<div style="display:flex;justify-content:space-between;padding:2px 0;"><span>VAT (16%):</span><span>KES '+exchVAT.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})+'</span></div>';
        receiptHTML += '<div style="display:flex;justify-content:space-between;padding:2px 0;font-weight:700;"><span>Item Total (incl. VAT):</span><span>KES '+exchangeAmount.toLocaleString()+'</span></div>';
        if(transportCost>0)receiptHTML+='<div style="display:flex;justify-content:space-between;padding:2px 0;"><span>Transport:</span><span>KES '+transportCost.toLocaleString()+'</span></div>';
        receiptHTML+='<div style="display:flex;justify-content:space-between;font-size:1.2em;font-weight:bold;margin:10px 0;padding:5px 0;border-top:1px dashed #ccc;"><span>TOTAL PAID:</span><span>KES '+grandTotal.toLocaleString()+'</span></div>';
        if(pm==='cash'&&tendered>0){receiptHTML+='<div style="display:flex;justify-content:space-between;padding:2px 0;"><span>Tendered:</span><span>KES '+tendered.toLocaleString()+'</span></div><div style="display:flex;justify-content:space-between;padding:2px 0;color:#10b981;font-weight:700;"><span>Change:</span><span>KES '+change.toLocaleString()+'</span></div>';}
        receiptHTML+='</div>';
        receiptHTML += '<div style="text-align:center;margin-top:20px;border-top:1px dashed #ccc;padding-top:15px;">';
        receiptHTML += '<p style="color:#666;margin:0;">Thank you for your business</p>';
        receiptHTML += '<p style="font-weight:700;color:var(--primary);margin:5px 0;font-size:1.1em;">TALAEN INVESTMENT</p>';
        receiptHTML += '<p style="color:#666;margin:0;">Welcome again!</p></div>';
        receiptHTML += '<p style="text-align:center;color:#666;margin-top:5px;">Processed by: '+(AuthService.getCurrentUser()?.fullName||'Cashier')+'</p></div>';
        var rm = document.createElement('div'); rm.className = 'modal-overlay';
        rm.innerHTML = '<div class="modal modal-lg"><div class="modal-header" style="background:linear-gradient(135deg,#f59e0b,#d97706);color:white;"><h3 style="color:white;"><i class="fas fa-receipt"></i> Exchange Payment Receipt</h3><button class="btn btn-sm" style="color:white;" onclick="this.closest(\'.modal-overlay\').remove()">X</button></div><div class="modal-body">'+receiptHTML+'</div><div class="modal-footer" style="justify-content:center;gap:1rem;"><button class="btn btn-primary btn-lg" onclick="POSComponent._printReceipt()"><i class="fas fa-print"></i> Print</button><button class="btn btn-outline" onclick="this.closest(\'.modal-overlay\').remove();AppRouter.render();">Close</button></div></div>';
        rm._receiptHTML = receiptHTML; document.body.appendChild(rm); rm.onclick = function(e){if(e.target===rm)rm.remove();};
        document.querySelectorAll('.modal-overlay').forEach(function(m){ if(m!==rm&&!m._receiptHTML)m.remove(); });
        ProductService._fetchFromAPI(); SaleService.getAll();
    },

    _showReceipt(sale) {
        var now = new Date();
        var receiptHTML = '<div style="max-width:400px;margin:0 auto;font-family:Inter;font-size:14px;"><div style="text-align:center;border-bottom:2px dashed #ccc;padding-bottom:10px;margin-bottom:10px;"><img src="../assets/talaen02.jpg" style="width:50px;height:50px;border-radius:10px;object-fit:cover;margin-bottom:5px;"><br><strong>TALAEN INVESTMENT HARDWARE</strong><br><small>P.O BOX 345, NANDI HILLS</small><br><small style="font-size:9px;">Tel: 0717149902, 0724985188</small><br><small>Quality Hardware & Building Materials</small><br><div style="border-top:1px dashed #ccc;border-bottom:1px dashed #ccc;padding:4px 0;margin:8px 0;"><strong style="letter-spacing:1px;">SALES RECEIPT</strong></div><strong>'+(sale.receiptNo||'')+'</strong></div>';
        receiptHTML+='<div style="margin-bottom:10px;"><div style="display:flex;justify-content:space-between;padding:2px 0;"><span>Date:</span><span>'+now.toLocaleDateString('en-KE')+'</span></div><div style="display:flex;justify-content:space-between;padding:2px 0;"><span>Time:</span><span>'+now.toLocaleTimeString('en-KE',{hour:'2-digit',minute:'2-digit',second:'2-digit'})+'</span></div><div style="display:flex;justify-content:space-between;padding:2px 0;"><span>Customer:</span><span>'+(sale.customerName||'Walk-in')+'</span></div><div style="display:flex;justify-content:space-between;padding:2px 0;"><span>Payment:</span><span>'+(sale.paymentMethod||'cash').toUpperCase()+(sale.isCredit?' (CREDIT)':'')+'</span></div>';if(sale.mpesaRef)receiptHTML+='<div style="display:flex;justify-content:space-between;padding:2px 0;"><span>M-Pesa Ref:</span><span style="color:#10b981;">'+sale.mpesaRef+'</span></div>';if(sale.customerPhone)receiptHTML+='<div style="display:flex;justify-content:space-between;padding:2px 0;"><span>Phone:</span><span>'+sale.customerPhone+'</span></div>';if(Number(sale.transportCost)>0)receiptHTML+='<div style="display:flex;justify-content:space-between;padding:2px 0;"><span>Transport:</span><span>KES '+Number(sale.transportCost).toLocaleString()+'</span></div>';receiptHTML+='<div style="display:flex;justify-content:space-between;padding:2px 0;"><span>Cashier:</span><span>'+(sale.cashierName||'N/A')+'</span></div></div>';
        receiptHTML+='<table style="width:100%;border-collapse:collapse;margin:15px 0;"><thead><tr style="border-bottom:2px solid #333;"><th style="text-align:left;padding:4px;">Item</th><th style="text-align:center;padding:4px;">Qty</th><th style="text-align:right;padding:4px;">Price</th><th style="text-align:right;padding:4px;">Total</th></tr></thead><tbody>';if(sale.items)for(var i=0;i<sale.items.length;i++){var item=sale.items[i];receiptHTML+='<tr><td style="text-align:left;padding:4px;">'+item.productName+'</td><td style="text-align:center;padding:4px;">'+item.quantity+'</td><td style="text-align:right;padding:4px;">'+(item.price||0).toLocaleString()+'</td><td style="text-align:right;padding:4px;">'+((item.price||0)*(item.quantity||0)).toLocaleString()+'</td></tr>';}receiptHTML+='</tbody></table>';
        var subtotalInclVAT = (sale.subtotal || 0);
        var subtotalExclVAT = subtotalInclVAT / 1.16;
        var vatAmount = subtotalInclVAT - subtotalExclVAT;
        var transportCost = Number(sale.transportCost) || 0;
        var discountAmount = Number(sale.discount) || 0;
        var totalAfterDiscount = subtotalInclVAT - discountAmount;
        var grandTotal = totalAfterDiscount + transportCost;
        receiptHTML+='<div style="border-top:2px solid #333;padding-top:10px;">';
        receiptHTML+='<div style="display:flex;justify-content:space-between;padding:2px 0;"><span>Subtotal (excl. VAT):</span><span>KES '+subtotalExclVAT.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})+'</span></div>';
        receiptHTML+='<div style="display:flex;justify-content:space-between;padding:2px 0;"><span>VAT (16%):</span><span>KES '+vatAmount.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})+'</span></div>';
        if(discountAmount>0)receiptHTML+='<div style="display:flex;justify-content:space-between;padding:2px 0;color:#ef4444;"><span>Discount:</span><span>-KES '+discountAmount.toLocaleString()+'</span></div>';
        if(transportCost>0)receiptHTML+='<div style="display:flex;justify-content:space-between;padding:2px 0;"><span>Transport:</span><span>KES '+transportCost.toLocaleString()+'</span></div>';
        receiptHTML+='<div style="display:flex;justify-content:space-between;font-size:1.2em;font-weight:bold;margin:10px 0;padding:5px 0;"><span>TOTAL:</span><span>KES '+grandTotal.toLocaleString()+'</span></div></div>';
        receiptHTML+='<div style="text-align:center;margin-top:20px;border-top:1px dashed #ccc;padding-top:15px;"><p style="color:#666;margin:0;">Thank you for shopping at</p><p style="font-weight:700;color:var(--primary);margin:5px 0;font-size:1.1em;">TALAEN INVESTMENT</p><p style="color:#666;margin:0;">Welcome again!</p></div></div>';
        var m=document.createElement('div');m.className='modal-overlay';
        m.innerHTML='<div class="modal modal-lg"><div class="modal-header" style="background:linear-gradient(135deg,#1a472a,#c49a2b);color:white;"><h3 style="color:white;"><i class="fas fa-receipt"></i> Receipt</h3><button class="btn btn-sm" style="color:white;" onclick="this.closest(\'.modal-overlay\').remove()">X</button></div><div class="modal-body">'+receiptHTML+'</div><div class="modal-footer" style="justify-content:center;gap:1rem;"><button class="btn btn-primary btn-lg" onclick="POSComponent._printReceipt()"><i class="fas fa-print"></i> Print</button><button class="btn btn-outline" onclick="this.closest(\'.modal-overlay\').remove();AppRouter.render();">Close</button></div></div>';
        document.body.appendChild(m);m._receiptHTML=receiptHTML;m.onclick=function(e){if(e.target===m){m.remove();AppRouter.render();}};
    },

    _printReceipt() { var m=document.querySelector('.modal-overlay');var w=window.open('','_blank','width=450,height=600');w.document.write('<!DOCTYPE html><html><head><title>Receipt</title><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet"><style>body{font-family:Inter,sans-serif;padding:20px;}@media print{body{padding:0;}}button{background:#1a472a;color:white;border:none;padding:10px 20px;border-radius:8px;cursor:pointer;font-size:16px;}</style></head><body><div style="text-align:center;margin-bottom:20px;"><button onclick="window.print()">Print</button></div>'+(m?._receiptHTML||'')+'<script>setTimeout(function(){window.print();},500);</script></body></html>');w.document.close(); },

    _updateCart() {
        var el=document.getElementById('cartItems'),count=document.getElementById('cartCount');if(!el)return;
        if(count)count.textContent=this._cart.reduce(function(s,i){return s+i.quantity;},0);
        if(this._cart.length===0){el.innerHTML='<div style="text-align:center;padding:2rem;color:#999;">Cart is empty</div>';}
        else{var h='';this._cart.forEach(function(item){h+='<div style="display:flex;justify-content:space-between;padding:0.5rem;border-bottom:1px solid #ddd;"><div><strong>'+item.productName+'</strong>'+(item.productVariant?'<br><small>'+item.productVariant+'</small>':'')+'<br><small>'+item.quantity+' x KES '+item.price.toLocaleString()+'</small></div><div style="text-align:right;"><strong>KES '+(item.price*item.quantity).toLocaleString()+'</strong><br><button class="btn btn-sm btn-primary" onclick="POSComponent.updateCartQty('+item.productId+',-1)">-</button> <span>'+item.quantity+'</span> <button class="btn btn-sm btn-primary" onclick="POSComponent.updateCartQty('+item.productId+',1)">+</button> <button class="btn btn-sm btn-danger" onclick="POSComponent.removeFromCart('+item.productId+')">X</button></div></div>';});el.innerHTML=h;}
        var subtotalInclVAT=this._cart.reduce(function(s,i){return s+(i.price*i.quantity);},0);
        var subtotalExclVAT=subtotalInclVAT/1.16;
        var vatAmount=subtotalInclVAT-subtotalExclVAT;
        var transport=parseFloat(document.getElementById('transportCost')?.value)||0;
        var discount=parseFloat(document.getElementById('discountAmount')?.value)||0;
        var totalAfterDiscount=subtotalInclVAT-discount;
        var grandTotal=totalAfterDiscount+transport;
        document.getElementById('subtotalDisplay').textContent='KES '+subtotalExclVAT.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2});
        document.getElementById('taxDisplay').textContent='KES '+vatAmount.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2});
        document.getElementById('totalAmount').textContent='KES '+grandTotal.toLocaleString();
        this.calculateChange();
    },

    _showMessage(msg, type) { var d=document.createElement('div');d.style.cssText='position:fixed;top:20px;right:20px;z-index:9999;padding:1rem 1.5rem;border-radius:1rem;color:white;font-weight:600;';d.style.background=type==='danger'?'#ef4444':type==='warning'?'#f59e0b':'#10b981';d.textContent=(type==='danger'?'❌ ':'✅ ')+msg;document.body.appendChild(d);setTimeout(function(){d.remove();},3000); },

    _showConfirm(title, msg, onConfirm, btnText, btnType) { var m=document.createElement('div');m.className='modal-overlay';m.innerHTML='<div class="modal"><div class="modal-header"><h3>'+title+'</h3></div><div class="modal-body">'+msg+'</div><div class="modal-footer"><button class="btn btn-outline" id="modalCancel">Cancel</button><button class="btn btn-'+(btnType||'primary')+'" id="modalConfirm">'+(btnText||'Confirm')+'</button></div></div>';document.body.appendChild(m);m.onclick=function(e){if(e.target===m)m.remove();};m.querySelector('#modalCancel').onclick=function(){m.remove();};m.querySelector('#modalConfirm').onclick=function(){m.remove();if(onConfirm)onConfirm();}; }
};