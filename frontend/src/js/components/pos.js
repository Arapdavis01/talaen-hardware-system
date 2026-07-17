// ============================================
// POS COMPONENT - With JWT Authentication & Dual-Unit Support
// ============================================

const POSComponent = {
    _cart: [],
    _products: [],
    _selectedCustomerId: null,
    _selectedCustomer: null,
    _heldCarts: [],
    _heldCartCounter: 0,

    // ✅ Helper to get current user from JWT
    _getCurrentUser() {
        const userJson = localStorage.getItem('user');
        try {
            return userJson ? JSON.parse(userJson) : null;
        } catch (e) {
            return null;
        }
    },

    _showAlert(title, message, icon, color, callback) {
        var m = document.createElement('div'); m.className = 'modal-overlay';
        m.innerHTML = '<div class="modal"><div class="modal-header" style="background:linear-gradient(135deg,' + (color || '#3b82f6') + ',' + (color || '#2563eb') + ');color:white;"><h3 style="color:white;"><i class="fas fa-' + (icon || 'info-circle') + '"></i> ' + title + '</h3><button class="btn btn-sm" style="color:white;" onclick="this.closest(\'.modal-overlay\').remove()">X</button></div><div class="modal-body" style="text-align:center;"><div style="font-size:3rem;color:' + (color || '#3b82f6') + ';margin-bottom:1rem;"><i class="fas fa-' + (icon || 'info-circle') + '"></i></div><p style="font-size:1.1rem;">' + message + '</p></div><div class="modal-footer" style="justify-content:center;"><button class="btn btn-primary" id="alertOkBtn">OK</button></div></div>';
        document.body.appendChild(m); m.onclick = function(e){if(e.target===m)m.remove();};
        m.querySelector('#alertOkBtn').onclick = function(){ m.remove(); if(callback) callback(); };
    },

    async render() {
        try {
            this._products = await ApiService.get('/products') || [];
        } catch(e) { 
            this._products = ProductService._cache || []; 
        }
        
        if (this._products.length === 0) {
            return '<div class="card"><div class="card-body" style="text-align:center;padding:3rem;"><i class="fas fa-box-open" style="font-size:4rem;color:var(--gray-400);"></i><h3>No Products Available</h3><p>Please ask admin to add products first.</p></div></div>';
        }
        
        var grouped = {};
        this._products.forEach(function(p) { var key = p.name.toUpperCase(); if (!grouped[key]) grouped[key] = { displayName: p.name, variants: [] }; grouped[key].variants.push(p); });
        
        var html = '<div class="pos-grid"><div class="card"><div class="card-header"><h3 class="card-title"><i class="fas fa-boxes"></i> Products</h3><input type="text" id="searchProduct" class="form-control" placeholder="Search..." style="width:250px;" oninput="POSComponent.search()"></div><div class="card-body" style="max-height:500px;overflow-y:auto;">';
        var keys = Object.keys(grouped).sort();
        for (var i = 0; i < keys.length; i++) {
            var group = grouped[keys[i]], variants = group.variants;
            html += '<div style="margin-bottom:1rem;border:1px solid #ddd;border-radius:1rem;overflow:hidden;"><div style="background:#f5f5f5;padding:0.5rem 1rem;font-weight:700;">' + group.displayName + ' (' + variants.length + ' variants)</div><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:0.5rem;padding:0.5rem;">';
            for (var j = 0; j < variants.length; j++) {
                var p = variants[j];
                var stockColor = p.stock <= 0 ? '#ef4444' : p.stock <= (p.minStock || 10) ? '#f59e0b' : '#10b981';
                
                // Use ProductService for display if available
                var stockDisplay = '';
                var priceDisplay = '';
                
                if (typeof ProductService !== 'undefined') {
                    stockDisplay = ProductService.getStockDisplay(p);
                    priceDisplay = ProductService.getPriceDisplay(p);
                } else {
                    // Fallback
                    stockDisplay = p.stock + ' ' + (p.unit || 'pcs');
                    if (p.salesUnit && p.conversionFactor > 0) {
                        var salesQty = Math.floor(p.stock / p.conversionFactor);
                        var remainder = p.stock % p.conversionFactor;
                        if (salesQty > 0 && remainder > 0) {
                            stockDisplay = p.stock + ' ' + (p.unit || 'pcs') + ' (' + salesQty + ' ' + p.salesUnit + ' + ' + remainder + ' ' + (p.unit || 'pcs') + ')';
                        } else if (salesQty > 0) {
                            stockDisplay = p.stock + ' ' + (p.unit || 'pcs') + ' (' + salesQty + ' ' + p.salesUnit + ')';
                        }
                    }
                    priceDisplay = 'KES ' + (p.price || 0).toLocaleString() + '/' + (p.unit || 'pcs');
                    if (p.salesUnit && p.conversionFactor > 0) {
                        priceDisplay += ' | KES ' + (p.price * p.conversionFactor).toLocaleString() + '/' + p.salesUnit;
                    }
                }
                
                html += '<div class="product-item" onclick="POSComponent.showQuickAdd(' + p.id + ')" data-search="' + p.name.toLowerCase() + ' ' + (p.brand||'').toLowerCase() + ' ' + (p.variant||'').toLowerCase() + '" style="padding:0.75rem;cursor:pointer;border:2px solid #ddd;border-radius:0.75rem;text-align:center;">';
                if (p.brand) html += '<div style="font-weight:600;font-size:0.9rem;">' + p.brand + '</div>';
                html += '<div style="font-size:0.75rem;color:#666;">' + (p.variant || '') + '</div>';
                html += '<div style="font-weight:700;color:var(--secondary);font-size:0.95rem;margin:0.25rem 0;">' + priceDisplay + '</div>';
                html += '<div style="display:flex;align-items:center;justify-content:center;gap:0.25rem;font-size:0.7rem;">';
                html += '<span style="width:8px;height:8px;border-radius:50%;background:' + stockColor + ';display:inline-block;"></span>';
                html += 'Stock: ' + stockDisplay + '</div></div>';
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

    // ========== Quick Add Modal (FIXED for dual-unit) ==========
    showQuickAdd(productId) {
        var product = this._products.find(function(p) { return p.id == productId; });
        if (!product || product.stock <= 0) { this._showMessage('Out of stock!', 'danger'); return; }
        var self = this;

        // Check if product has alternative sales unit
        var hasAlternativeUnit = !!(product.salesUnit && product.conversionFactor > 0);
        var baseUnit = product.unit || 'pcs';
        var basePrice = parseFloat(product.price) || 0;
        var baseStock = parseInt(product.stock) || 0;

        // Build unit options
        var units = [{
            value: 'base',
            label: baseUnit.charAt(0).toUpperCase() + baseUnit.slice(1),
            price: basePrice,
            maxStock: baseStock,
            unit: baseUnit,
            isBase: true
        }];
        
        if (hasAlternativeUnit) {
            var conversionFactor = parseInt(product.conversionFactor);
            var salesUnit = product.salesUnit;
            var salesStock = Math.floor(baseStock / conversionFactor);
            var bulkPrice = basePrice * conversionFactor;
            
            units.push({
                value: 'sales',
                label: salesUnit.charAt(0).toUpperCase() + salesUnit.slice(1),
                price: bulkPrice,
                maxStock: salesStock,
                unit: salesUnit,
                isBase: false,
                conversionFactor: conversionFactor
            });
        }

        var html = '<div class="modal-overlay" id="quickAddModal"><div class="modal" style="max-width:450px;">';
        html += '<div class="modal-header" style="background:linear-gradient(135deg,#1a472a,#c49a2b);color:white;"><h3 style="color:white;margin:0;"><i class="fas fa-cart-plus"></i> Add to Cart</h3><button class="btn btn-sm" style="color:white;" onclick="document.getElementById(\'quickAddModal\').remove()">X</button></div>';
        html += '<div class="modal-body">';
        html += '<div style="text-align:center;margin-bottom:1rem;"><h4>' + product.name + '</h4>';
        if (product.brand) html += '<p style="color:#666;">' + product.brand + '</p>';
        if (product.variant) html += '<p style="color:#999;">' + product.variant + '</p>';
        
        // Show stock info
        var stockDisplay = typeof ProductService !== 'undefined' ? ProductService.getStockDisplay(product) : (baseStock + ' ' + baseUnit);
        html += '<p style="color:#666;font-size:0.9rem;">Available: ' + stockDisplay + '</p></div>';

        if (units.length > 1) {
            html += '<div class="form-group"><label><strong>Sell by:</strong></label>';
            html += '<div id="unitSelector" style="display:flex;gap:0.5rem;margin-top:0.5rem;">';
            units.forEach(function(u, idx) {
                var checked = idx === 0 ? ' checked' : '';
                var stockInfo = u.isBase ? u.maxStock + ' ' + u.unit : u.maxStock + ' ' + u.unit + ' (=' + (u.maxStock * (product.conversionFactor || 1)) + ' ' + baseUnit + ')';
                html += '<label style="flex:1;padding:0.75rem;border:2px solid ' + (checked ? 'var(--primary)' : '#ccc') + ';border-radius:0.75rem;text-align:center;cursor:pointer;" class="unit-option" data-value="' + u.value + '">';
                html += '<input type="radio" name="quickUnit" value="' + u.value + '"' + checked + ' style="display:none;">';
                html += '<div style="font-weight:700;">' + u.label + '</div>';
                html += '<div style="font-size:0.85rem;color:#666;">KES ' + u.price.toLocaleString() + '/' + u.unit + '</div>';
                html += '<div style="font-size:0.75rem;color:#999;">Available: ' + stockInfo + '</div>';
                html += '</label>';
            });
            html += '</div></div>';
        } else {
            var u = units[0];
            html += '<div style="text-align:center;margin-bottom:1rem;">';
            html += '<div style="font-weight:700;font-size:1.2rem;">KES ' + u.price.toLocaleString() + '/' + u.unit + '</div>';
            html += '<div style="color:#999;">Available: ' + u.maxStock + ' ' + u.unit + '</div>';
            html += '</div>';
            html += '<input type="hidden" id="quickUnit" value="base">';
        }

        html += '<div class="form-group"><label>Quantity:</label>';
        html += '<input type="number" id="quickQty" class="form-control" value="1" min="1" max="' + units[0].maxStock + '" style="font-size:1.2rem;text-align:center;" oninput="POSComponent._updateQuickAddTotal(' + productId + ')">';
        html += '</div>';

        html += '<div id="quickAddTotal" style="text-align:center;font-size:1.3rem;font-weight:700;margin:1rem 0;padding:0.75rem;background:#f5f5f5;border-radius:0.5rem;">Total: KES ' + (units[0].price * 1).toLocaleString() + '</div>';

        html += '<button class="btn btn-success" style="width:100%;padding:0.75rem;font-size:1.1rem;" id="quickAddBtn"><i class="fas fa-cart-plus"></i> Add to Cart</button>';
        html += '</div></div></div>';

        var oldModal = document.getElementById('quickAddModal');
        if (oldModal) oldModal.remove();

        var m = document.createElement('div');
        m.innerHTML = html;
        document.body.appendChild(m.firstElementChild);
        var modal = document.getElementById('quickAddModal');
        modal.onclick = function(e) { if (e.target === modal) modal.remove(); };

        if (units.length > 1) {
            modal.querySelectorAll('.unit-option').forEach(function(label) {
                label.addEventListener('click', function() {
                    var radio = label.querySelector('input[type="radio"]');
                    radio.checked = true;
                    modal.querySelectorAll('.unit-option').forEach(l => l.style.borderColor = '#ccc');
                    label.style.borderColor = 'var(--primary)';
                    var selVal = radio.value;
                    var selUnit = units.find(u => u.value === selVal);
                    var qtyInput = modal.querySelector('#quickQty');
                    qtyInput.max = selUnit.maxStock;
                    if (parseInt(qtyInput.value) > selUnit.maxStock) qtyInput.value = selUnit.maxStock;
                    self._updateQuickAddTotal(productId);
                });
            });
        }

        modal.querySelector('#quickAddBtn').onclick = function() {
            var qty = parseInt(modal.querySelector('#quickQty').value) || 1;
            var selectedUnitValue = modal.querySelector('input[name="quickUnit"]:checked')?.value || 'base';
            var selectedUnitObj = units.find(u => u.value === selectedUnitValue);
            if (!selectedUnitObj) return;
            self._addToCartWithUnit(product, qty, selectedUnitObj);
            modal.remove();
        };

        this._updateQuickAddTotal(productId);
    },

    _updateQuickAddTotal(productId) {
        var modal = document.getElementById('quickAddModal');
        if (!modal) return;
        var product = this._products.find(function(p) { return p.id == productId; });
        if (!product) return;

        var selectedUnitValue = modal.querySelector('input[name="quickUnit"]:checked')?.value || 'base';
        var qty = parseInt(modal.querySelector('#quickQty').value) || 0;
        var basePrice = parseFloat(product.price) || 0;
        
        var pricePerUnit;
        if (selectedUnitValue === 'base') {
            pricePerUnit = basePrice;
        } else {
            // Sales unit price = base price × conversion factor
            pricePerUnit = basePrice * (parseInt(product.conversionFactor) || 1);
        }

        var total = pricePerUnit * qty;
        var totalEl = document.getElementById('quickAddTotal');
        if (totalEl) totalEl.innerHTML = 'Total: KES ' + total.toLocaleString();
    },

    _addToCartWithUnit(product, quantity, selectedUnit) {
        if (!product || product.stock <= 0) { this._showMessage('Out of stock!', 'danger'); return; }

        var basePrice = parseFloat(product.price) || 0;
        var baseUnit = product.unit || 'pcs';
        var baseStock = parseInt(product.stock) || 0;
        
        var effPrice, maxQty, displayUnit, conversionFactor, soldInUnit;
        
        if (selectedUnit.isBase) {
            // Selling in base unit
            maxQty = baseStock;
            effPrice = basePrice;
            displayUnit = baseUnit;
            conversionFactor = 0;
            soldInUnit = null;
        } else {
            // Selling in sales unit (e.g., tonnes)
            conversionFactor = selectedUnit.conversionFactor || 1;
            maxQty = Math.floor(baseStock / conversionFactor);
            effPrice = basePrice * conversionFactor; // Price per sales unit
            displayUnit = selectedUnit.unit;
            soldInUnit = selectedUnit.unit;
        }

        quantity = Math.max(1, Math.min(quantity, maxQty));

        // Check if already in cart with same unit
        var existing = this._cart.find(function(i) { 
            return i.productId == product.id && i.soldInUnit === soldInUnit; 
        });
        
        if (existing) {
            var newTotal = existing.quantity + quantity;
            if (newTotal > maxQty) {
                this._showMessage('Not enough stock! Only ' + maxQty + ' ' + displayUnit + ' available.', 'warning');
                return;
            }
            existing.quantity = newTotal;
        } else {
            // Check if same product exists with different unit
            var differentUnit = this._cart.find(function(i) { return i.productId == product.id; });
            if (differentUnit) {
                this._showMessage('This product is already in cart with a different unit. Remove it first or adjust quantity there.', 'warning');
                return;
            }
            
            this._cart.push({
                productId: product.id,
                productName: (product.brand ? product.brand + ' - ' : '') + product.name,
                productVariant: product.variant || '',
                quantity: quantity,
                price: effPrice,
                unit: displayUnit,
                baseUnit: baseUnit,
                basePrice: basePrice,
                soldInUnit: soldInUnit,
                conversionFactor: conversionFactor
            });
        }

        this._updateCart();
        this._showMessage('Added ' + quantity + ' ' + displayUnit + ' to cart', 'success');
    },

    updateCartQty(productId, change) {
        var item = this._cart.find(function(i) { return i.productId == productId; }); 
        if (!item) return;
        var product = this._products.find(function(p) { return p.id == productId; });
        if (!product) { 
            this._cart = this._cart.filter(function(i) { return i.productId != productId; }); 
            this._updateCart(); 
            return; 
        }

        var baseStock = parseInt(product.stock) || 0;
        var maxQty;
        
        if (item.soldInUnit && item.conversionFactor > 0) {
            // Selling in sales unit, max is baseStock / conversionFactor
            maxQty = Math.floor(baseStock / item.conversionFactor);
        } else {
            maxQty = baseStock;
        }

        var newQty = item.quantity + change;
        if (newQty <= 0) {
            this._cart = this._cart.filter(function(i) { return i.productId != productId; });
        } else if (newQty <= maxQty) {
            item.quantity = newQty;
        } else {
            this._showMessage('Not enough stock! Max ' + maxQty + ' ' + (item.unit || 'units'), 'warning');
        }
        this._updateCart();
    },

    setCartQty(productId, newQty) {
        newQty = parseInt(newQty);
        var item = this._cart.find(function(i) { return i.productId == productId; });
        if (!item) return;
        var product = this._products.find(function(p) { return p.id == productId; });
        if (!product) { 
            this._cart = this._cart.filter(function(i) { return i.productId != productId; }); 
            this._updateCart(); 
            return; 
        }

        var baseStock = parseInt(product.stock) || 0;
        var maxQty;
        
        if (item.soldInUnit && item.conversionFactor > 0) {
            maxQty = Math.floor(baseStock / item.conversionFactor);
        } else {
            maxQty = baseStock;
        }

        if (isNaN(newQty) || newQty < 1) {
            this._showMessage('Quantity must be at least 1', 'warning');
            this._updateCart();
            return;
        }
        if (newQty > maxQty) {
            this._showMessage('Not enough stock! Max ' + maxQty + ' ' + (item.unit || 'units'), 'warning');
            this._updateCart();
            return;
        }
        item.quantity = newQty;
        this._updateCart();
    },

    removeFromCart(productId) { 
        this._cart = this._cart.filter(function(i) { return i.productId != productId; }); 
        this._updateCart(); 
    },

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

    // ========== HOLD CART METHODS ==========
    holdCart() {
        if (this._cart.length === 0) { this._showMessage('Cart is empty! Nothing to hold.', 'warning'); return; }
        var heldCart = { 
            id: ++this._heldCartCounter, 
            timestamp: new Date(), 
            cart: JSON.parse(JSON.stringify(this._cart)), 
            customerName: document.getElementById('customerName')?.value || '', 
            customerId: this._selectedCustomerId, 
            customer: this._selectedCustomer, 
            transportCost: parseFloat(document.getElementById('transportCost')?.value) || 0, 
            discountAmount: parseFloat(document.getElementById('discountAmount')?.value) || 0 
        };
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
            hc.cart.slice(0, 3).forEach(function(item) { 
                html += item.productName + ' x' + item.quantity + ' ' + (item.unit || '') + ', '; 
            });
            if (hc.cart.length > 3) html += '...';
            html += '</div></div>';
        });
        html += '</div><div class="modal-footer"><button class="btn btn-outline" onclick="this.closest(\'.modal-overlay\').remove()">Close</button></div></div>';
        m.innerHTML = html; document.body.appendChild(m); m.onclick = function(e){if(e.target===m)m.remove();};
    },

    _resumeCart(index) {
        if (index < 0 || index >= this._heldCarts.length) return;
        var self = this;
        if (this._cart.length > 0) { 
            this._showConfirm('Current Cart Not Empty', 'Hold current cart first before resuming Cart #' + this._heldCarts[index].id + '?', function() { 
                self.holdCart(); 
                self._doResumeCart(index); 
            }, 'Hold & Resume', 'warning'); 
        } else { 
            this._doResumeCart(index); 
        }
        document.querySelectorAll('.modal-overlay').forEach(function(m) { 
            if (m.querySelector('.fa-list')) m.remove(); 
        });
    },

    _doResumeCart(index) {
        var hc = this._heldCarts[index];
        this._cart = JSON.parse(JSON.stringify(hc.cart));
        this._selectedCustomerId = hc.customerId; 
        this._selectedCustomer = hc.customer;
        var cn = document.getElementById('customerName'); if (cn) cn.value = hc.customerName;
        var tc = document.getElementById('transportCost'); if (tc) tc.value = hc.transportCost;
        var disc = document.getElementById('discountAmount'); if (disc) disc.value = hc.discountAmount;
        if (hc.customerId && hc.customer) {
            var debtDiv = document.getElementById('customerDebtInfo');
            if (debtDiv) { 
                var customer = hc.customer; 
                var available = customer.debtLimit - customer.totalDebt; 
                var debtColor = customer.totalDebt > 0 ? '#ef4444' : '#10b981'; 
                var bgColor = customer.totalDebt > 0 ? '#fef2f2' : '#f0fdf4'; 
                debtDiv.style.display = 'block'; 
                debtDiv.style.background = bgColor; 
                debtDiv.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem;"><div><i class="fas fa-user-check"></i> <strong>' + customer.name + '</strong> <span style="font-size:0.8rem;color:#999;">(Credit Customer)</span></div><div><button class="btn btn-sm btn-outline" onclick="POSComponent.viewCustomerDetails(' + customer.id + ')" style="margin-right:0.25rem;"><i class="fas fa-info-circle"></i> Details</button><button class="btn btn-sm btn-danger" onclick="POSComponent.clearCustomerSelection()"><i class="fas fa-times"></i></button></div></div><div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:0.5rem;font-size:0.85rem;"><div style="text-align:center;background:white;padding:0.5rem;border-radius:0.25rem;"><small>Current Debt</small><br><span style="color:' + debtColor + ';font-weight:700;">KES ' + customer.totalDebt.toLocaleString() + '</span></div><div style="text-align:center;background:white;padding:0.5rem;border-radius:0.25rem;"><small>Debt Limit</small><br>KES ' + customer.debtLimit.toLocaleString() + '</div><div style="text-align:center;background:white;padding:0.5rem;border-radius:0.25rem;"><small>Available Credit</small><br><span style="color:#10b981;font-weight:700;">KES ' + available.toLocaleString() + '</span></div></div>'; 
                var pmSelect = document.getElementById('paymentMethod'); 
                if (pmSelect) pmSelect.value = 'credit'; 
                this.togglePaymentFields(); 
            }
        }
        this._heldCarts.splice(index, 1); 
        this._updateCart(); 
        this._updateHeldCartCount();
        this._showMessage('✅ Cart #' + hc.id + ' resumed!', 'success');
    },

    _deleteHeldCart(index) {
        var self = this; var hc = this._heldCarts[index];
        this._showConfirm('Delete Held Cart', 'Delete Cart #' + hc.id + '? This cannot be undone.', function() { 
            self._heldCarts.splice(index, 1); 
            self._updateHeldCartCount(); 
            self._showMessage('🗑️ Cart #' + hc.id + ' deleted.', 'warning'); 
            self.showHeldCarts(); 
        }, 'Delete', 'danger');
    },

    _updateHeldCartCount() { 
        var count = document.getElementById('heldCartCount'); 
        if (count) count.textContent = this._heldCarts.length; 
    },

    // ========== CUSTOMER METHODS ==========
    searchCustomers() {
        var q = document.getElementById('customerName')?.value.trim(); var div = document.getElementById('customerSuggestions');
        if (!q || q.length < 2) { if (div) div.style.display = 'none'; return; }
        var self = this;
        ApiService.get('/credit-customers/search/' + encodeURIComponent(q)).then(function(customers){
            if (!customers || !customers.length) { 
                div.style.display = 'block'; 
                div.innerHTML = '<div style="padding:0.75rem;text-align:center;color:#999;">No customer found. <a href="#" onclick="POSComponent.showRegisterCustomer();return false;" style="color:var(--primary);">Register new?</a></div>'; 
                return; 
            }
            var h = '';
            customers.forEach(function(c){ 
                var debtColor = c.totalDebt > 0 ? '#ef4444' : '#10b981'; 
                var available = c.debtLimit - c.totalDebt;
                h += '<div style="padding:0.75rem;border-bottom:1px solid #eee;cursor:pointer;display:flex;justify-content:space-between;align-items:center;" onclick="POSComponent.selectCustomer(' + c.id + ')">';
                h += '<div><strong>👤 ' + c.name + '</strong><br><small style="color:#999;">📞 ' + (c.phone || 'No phone') + ' | 🆔 ' + (c.idNumber || 'No ID') + '</small></div>';
                h += '<div style="text-align:right;"><span style="color:' + debtColor + ';font-weight:700;">Debt: KES ' + c.totalDebt.toLocaleString() + '</span><br><small style="color:#999;">Limit: KES ' + c.debtLimit.toLocaleString() + ' | Avail: KES ' + available.toLocaleString() + '</small></div></div>';
            });
            div.innerHTML = h; div.style.display = 'block';
        });
    },

    selectCustomer(customerId) {
        var self = this;
        ApiService.get('/credit-customers/' + customerId).then(function(customer){
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
            var user = self._getCurrentUser();
            ApiService.post('/credit-customers', {
                name: name,
                phone: m.querySelector('#regCustPhone').value,
                idNumber: m.querySelector('#regCustId').value,
                address: m.querySelector('#regCustAddress').value,
                debtLimit: parseFloat(m.querySelector('#regCustLimit').value) || 5000,
                cashierId: user?.id,
                cashierName: user?.fullName
            }).then(function(d){
                if(d.success){
                    m.remove();
                    self._showMessage('✅ Customer registered successfully!','success');
                    var nameInput=document.getElementById('customerName');
                    if(nameInput){nameInput.value=name;nameInput.dispatchEvent(new Event('input'));}
                }
            });
        };
    },

    viewCustomerDetails(customerId) {
        var self = this;
        ApiService.get('/credit-customers/' + customerId).then(function(customer){
            var m = document.createElement('div'); m.className = 'modal-overlay';
            var recentSalesHTML = '';
            if (customer.recentSales && customer.recentSales.length > 0) { 
                recentSalesHTML = '<h4 style="margin-top:1rem;">📋 Recent Credit Purchases</h4><table style="width:100%;border-collapse:collapse;font-size:0.9rem;"><tr style="border-bottom:1px solid #ddd;background:#f5f5f5;"><th>Date</th><th>Amount</th><th>Cashier</th></tr>'; 
                customer.recentSales.forEach(function(s){ 
                    recentSalesHTML += '<tr style="border-bottom:1px solid #eee;"><td>'+(s.date?new Date(s.date).toLocaleDateString('en-KE'):'-')+'</td><td style="color:#ef4444;">KES '+s.amount.toLocaleString()+'</td><td style="color:#666;">'+(s.cashierName||'-')+'</td></tr>'; 
                }); 
                recentSalesHTML += '</table>'; 
            }
            var paymentsHTML = '';
            if (customer.payments && customer.payments.length > 0) { 
                paymentsHTML = '<h4 style="margin-top:1rem;">💰 Recent Payments</h4><table style="width:100%;border-collapse:collapse;font-size:0.9rem;"><tr style="border-bottom:1px solid #ddd;background:#f5f5f5;"><th>Date</th><th>Amount</th><th>Received By</th></tr>'; 
                customer.payments.forEach(function(p){ 
                    paymentsHTML += '<tr style="border-bottom:1px solid #eee;"><td>'+(p.date?new Date(p.date).toLocaleDateString('en-KE'):'-')+'</td><td style="color:#10b981;">KES '+p.amount.toLocaleString()+'</td><td style="color:#666;">'+(p.receivedBy||'-')+'</td></tr>'; 
                }); 
                paymentsHTML += '</table>'; 
            }
            m.innerHTML = '<div class="modal modal-lg"><div class="modal-header" style="background:linear-gradient(135deg,#1a472a,#c49a2b);color:white;"><h3 style="color:white;"><i class="fas fa-user"></i> '+customer.name+'</h3><button class="btn btn-sm" style="color:white;" onclick="this.closest(\'.modal-overlay\').remove()">X</button></div><div class="modal-body"><div style="display:grid;grid-template-columns:1fr 1fr;gap:0.5rem;margin-bottom:1rem;background:#f5f5f5;padding:1rem;border-radius:0.5rem;"><div><strong>📞 Phone:</strong> '+(customer.phone||'-')+'</div><div><strong>🆔 ID Number:</strong> '+(customer.idNumber||'-')+'</div><div><strong>Address:</strong> '+(customer.address||'-')+'</div><div><strong>📅 Registered:</strong> '+(customer.dateRegistered?new Date(customer.dateRegistered).toLocaleDateString('en-KE'):'-')+'</div><div><strong>💰 Debt Limit:</strong> KES '+(customer.debtLimit||0).toLocaleString()+'</div><div><strong>💳 Total Debt:</strong> <span style="color:'+(customer.totalDebt>0?'#ef4444':'#10b981')+';font-weight:700;">KES '+(customer.totalDebt||0).toLocaleString()+'</span></div></div>'+recentSalesHTML+paymentsHTML+'</div><div class="modal-footer" style="justify-content:center;gap:0.5rem;"><button class="btn btn-success" onclick="this.closest(\'.modal-overlay\').remove();POSComponent.showDebtPayment('+customer.id+')"><i class="fas fa-money-bill"></i> Record Payment</button><button class="btn btn-outline" onclick="this.closest(\'.modal-overlay\').remove()">Close</button></div></div>';
            document.body.appendChild(m); m.onclick = function(e){if(e.target===m)m.remove();};
        });
    },

    showDebtPayment(customerId) {
        var self = this;
        ApiService.get('/credit-customers/' + customerId).then(function(customer){
            var m = document.createElement('div'); m.className = 'modal-overlay';
            m.innerHTML = '<div class="modal"><div class="modal-header" style="background:linear-gradient(135deg,#10b981,#059669);color:white;"><h3 style="color:white;"><i class="fas fa-money-bill"></i> Record Debt Payment</h3><button class="btn btn-sm" style="color:white;" onclick="this.closest(\'.modal-overlay\').remove()">X</button></div><div class="modal-body"><div style="text-align:center;margin-bottom:1rem;"><h3>👤 '+customer.name+'</h3><p>Current Debt: <strong style="color:#ef4444;">KES '+(customer.totalDebt||0).toLocaleString()+'</strong></p></div><div class="form-group"><label>Amount Paid (KES) *</label><input type="number" id="debtPaymentAmount" class="form-control" placeholder="Enter amount" min="1" max="'+(customer.totalDebt||0)+'" style="font-size:1.2rem;text-align:center;"></div><div class="form-group"><label>Payment Method</label><select id="debtPaymentMethod" class="form-control"><option value="cash">Cash</option><option value="mpesa">M-Pesa</option></select></div></div><div class="modal-footer"><button class="btn btn-outline" onclick="this.closest(\'.modal-overlay\').remove()">Cancel</button><button class="btn btn-success" id="confirmDebtPayment"><i class="fas fa-check"></i> Confirm Payment</button></div></div>';
            document.body.appendChild(m); m.onclick = function(e){if(e.target===m)m.remove();};
            m.querySelector('#confirmDebtPayment').onclick = function(){
                var amount = parseFloat(m.querySelector('#debtPaymentAmount').value) || 0;
                if (amount <= 0) { self._showAlert('Invalid Amount','Enter a valid amount!','exclamation-triangle','#f59e0b'); return; }
                if (amount > customer.totalDebt) { self._showAlert('Limit Exceeded','Amount cannot exceed debt of KES '+customer.totalDebt.toLocaleString(),'exclamation-triangle','#ef4444'); return; }
                var user = self._getCurrentUser();
                ApiService.post('/debt-payments', {
                    customerId: customerId,
                    customerName: customer.name,
                    amount: amount,
                    paymentMethod: m.querySelector('#debtPaymentMethod').value,
                    receivedBy: user?.fullName || 'Admin',
                    receivedById: user?.id || null
                }).then(function(d){
                    if(d.success){ 
                        var sm = document.createElement('div'); sm.className = 'modal-overlay'; 
                        sm.innerHTML = '<div class="modal"><div class="modal-header" style="background:linear-gradient(135deg,#10b981,#059669);color:white;"><h3 style="color:white;"><i class="fas fa-check-circle"></i> Payment Recorded!</h3><button class="btn btn-sm" style="color:white;" onclick="this.closest(\'.modal-overlay\').remove()">X</button></div><div class="modal-body" style="text-align:center;"><div style="font-size:3rem;color:#10b981;margin-bottom:1rem;"><i class="fas fa-money-check-alt"></i></div><h3>KES '+amount.toLocaleString()+'</h3><p style="color:#999;">From: <strong>'+customer.name+'</strong></p><div style="background:#f0fdf4;padding:1rem;border-radius:0.5rem;margin-top:1rem;"><p style="color:#10b981;">✅ Payment recorded!</p><p>Remaining Debt: <strong style="color:#ef4444;">KES '+(customer.totalDebt-amount).toLocaleString()+'</strong></p></div></div><div class="modal-footer" style="justify-content:center;"><button class="btn btn-primary" onclick="this.closest(\'.modal-overlay\').remove();AppRouter.navigate(\'cashier-dashboard\')">Dashboard</button><button class="btn btn-outline" onclick="this.closest(\'.modal-overlay\').remove()">Close</button></div></div>'; 
                        document.body.appendChild(sm); sm.onclick = function(e){if(e.target===sm)sm.remove();}; 
                        m.remove(); 
                        self._selectedCustomer=null;self._selectedCustomerId=null;
                        var debtDiv=document.getElementById('customerDebtInfo');if(debtDiv)debtDiv.style.display='none';
                        var nameInput=document.getElementById('customerName');if(nameInput)nameInput.value='';
                        setTimeout(function(){
                            if(typeof CashierDashboardComponent!=='undefined'&&CashierDashboardComponent.loadCreditOnly)CashierDashboardComponent.loadCreditOnly();
                            if(typeof AdminDashboardComponent!=='undefined'&&AdminDashboardComponent.loadCreditOnly)AdminDashboardComponent.loadCreditOnly();
                        },500); 
                    }
                });
            };
        });
    },

    // ========== SALE METHODS (FIXED for dual-unit) ==========
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
            ApiService.post('/mpesa/stk-push', {
                phoneNumber: phone,
                amount: Math.round(total),
                accountReference: 'TIH-SALE'
            }).then(function(d){
                btn.disabled = false; btn.innerHTML = '<i class="fas fa-paper-plane"></i> Send STK Push';
                if(d.success){ 
                    statusDiv.innerHTML = '<span style="color:#10b981;"><i class="fas fa-check-circle"></i> STK Push sent! Waiting...</span>'; 
                    var attempts=0; 
                    var checkStatus=setInterval(function(){
                        attempts++;
                        ApiService.get('/mpesa/transaction/'+d.checkoutRequestID).then(function(t){
                            if(t.status==='completed'){
                                clearInterval(checkStatus);
                                statusDiv.innerHTML='<span style="color:#10b981;">✅ Payment received! Ref: '+t.mpesaReceiptNumber+'</span>';
                                setTimeout(function(){m.remove();self._processSale(customerName,'mpesa',subtotalExclVAT,vatAmount,total,discount,0,0,t.mpesaReceiptNumber,null,transport);},1000);
                            }else if(t.status==='failed'){
                                clearInterval(checkStatus);
                                statusDiv.innerHTML='<span style="color:#ef4444;">❌ Payment failed</span>';
                            }
                            if(attempts>30){clearInterval(checkStatus);statusDiv.innerHTML='<span style="color:#f59e0b;">⚠️ Timeout</span>';}
                        });
                    },2000); 
                } else {
                    statusDiv.innerHTML='<span style="color:#ef4444;">❌ '+(d.message||'Failed')+'</span>';
                }
            }).catch(function(){
                btn.disabled=false;btn.innerHTML='<i class="fas fa-paper-plane"></i> Send STK Push';
                statusDiv.innerHTML='<span style="color:#ef4444;">Network error</span>';
            });
        };
        m.querySelector('#mpesaTillBtn').onclick = function(){ 
            var receipt=m.querySelector('#mpesaReceipt').value.trim();
            if(!receipt){self._showAlert('Required','Enter M-Pesa receipt number!','exclamation-triangle','#f59e0b');return;} 
            ApiService.post('/mpesa/till-payment', {
                saleId: null,
                mpesaReceiptNumber: receipt,
                phoneNumber: m.querySelector('#mpesaPhoneTill').value.trim(),
                amount: total
            }).then(function(){m.remove();self._processSale(customerName,'mpesa',subtotalExclVAT,vatAmount,total,discount,0,0,receipt,null,transport);}); 
        };
    },

    _processSale(name, pm, subtotalExclVAT, vatAmount, total, discount, tendered, change, mpesaRef, customerId, transport, phone) {
        var self = this; var user = this._getCurrentUser();
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
            // Map items with soldInUnit and conversionFactor for the API
            var mappedItems = self._cart.map(function(item) {
                return {
                    productId: item.productId,
                    productName: item.productName,
                    quantity: item.quantity,
                    price: item.price,
                    soldInUnit: item.soldInUnit || null,
                    conversionFactor: item.conversionFactor || 0,
                    total: item.price * item.quantity
                };
            });
            
            var saleData = { 
                items: mappedItems, 
                customerName: name, 
                paymentMethod: pm, 
                subtotal: subtotalInclVAT, 
                subtotalExclVAT: subtotalExclVAT, 
                tax: vatAmount, 
                discount: discount || 0, 
                total: total, 
                transportCost: transport || 0, 
                cashierId: user?.id, 
                cashierName: user?.fullName, 
                mpesaRef: mpesaRef || null, 
                isCredit: pm === 'credit' ? 1 : 0, 
                customerId: customerId || null, 
                customerPhone: phone || null 
            };
            var sale = await SaleService.create(saleData);
            if (pm === 'credit' && customerId && sale.saleId) { 
                await ApiService.post('/credit-sales', {
                    saleId: sale.saleId,
                    customerId: customerId,
                    customerName: name,
                    amount: total,
                    cashierId: user?.id,
                    cashierName: user?.fullName
                });
            }
            self._cart = []; self._updateCart(); self._selectedCustomerId = null; self._selectedCustomer = null;
            var at = document.getElementById('amountTendered'); if (at) at.value = '';
            var cd = document.getElementById('changeDisplay'); if (cd) cd.style.display = 'none';
            var cn = document.getElementById('customerName'); if (cn) cn.value = '';
            var debtDiv = document.getElementById('customerDebtInfo'); if (debtDiv) debtDiv.style.display = 'none';
            var tc = document.getElementById('transportCost'); if (tc) tc.value = '0';
            var disc = document.getElementById('discountAmount'); if (disc) disc.value = '0';
            var tillRef = document.getElementById('tillMpesaRef'); if (tillRef) tillRef.value = '';
            var tillPhone = document.getElementById('tillPhone'); if (tillPhone) tillPhone.value = '';
            setTimeout(function(){
                if(typeof CashierDashboardComponent!=='undefined'&&CashierDashboardComponent.loadCreditOnly)CashierDashboardComponent.loadCreditOnly();
                if(typeof AdminDashboardComponent!=='undefined'&&AdminDashboardComponent.loadCreditOnly)AdminDashboardComponent.loadCreditOnly();
            },500);
            self._showReceipt(sale);
        }, 'Confirm & Print Receipt', 'success');
    },

    // ========== RETURN/EXCHANGE METHODS ==========
    showReturnExchange() {
        var m = document.createElement('div'); m.className = 'modal-overlay';
        m.innerHTML = '<div class="modal modal-lg"><div class="modal-header" style="background:linear-gradient(135deg,#f59e0b,#d97706);color:white;"><h3 style="color:white;"><i class="fas fa-exchange-alt"></i> Return / Exchange</h3><button class="btn btn-sm" style="color:white;" onclick="this.closest(\'.modal-overlay\').remove()">X</button></div><div class="modal-body"><div class="form-group"><label>Receipt No</label><div style="display:flex;gap:0.5rem;"><input type="text" id="returnReceiptInput" class="form-control" placeholder="e.g., TIH-XXXXXX" style="flex:1;"><button class="btn btn-primary" id="returnSearchBtn"><i class="fas fa-search"></i> Search</button></div><div id="returnReceiptResult"></div></div><div id="returnProcessArea" style="display:none;margin-top:1rem;"></div></div><div class="modal-footer"><button class="btn btn-outline" onclick="this.closest(\'.modal-overlay\').remove()">Close</button></div></div>';
        document.body.appendChild(m); m.onclick = function(e){if(e.target===m)m.remove();};
        var self = this;
        m.querySelector('#returnSearchBtn').onclick = function() { self._searchReceipt(m); };
        m.querySelector('#returnReceiptInput').addEventListener('keydown', function(e) { if (e.key === 'Enter') { self._searchReceipt(m); } });
    },

    _searchReceipt(m) {
        var q = m.querySelector('#returnReceiptInput').value.trim();
        if (!q) { this._showMessage('Enter a receipt number!', 'warning'); return; }
        var self = this;
        ApiService.get('/sales/search/' + encodeURIComponent(q)).then(function(sale){
            var resultDiv = m.querySelector('#returnReceiptResult'), processDiv = m.querySelector('#returnProcessArea');
            if (sale.error) { resultDiv.innerHTML = '<div style="padding:1rem;background:#fef2f2;border-radius:0.5rem;color:#ef4444;">❌ Receipt not found</div>'; processDiv.style.display = 'none'; return; }
            var receiptNo = sale.receiptNo || sale.receiptno;
            ApiService.get('/returns/receipt/' + encodeURIComponent(receiptNo)).then(function(existingReturns){
                var returnedItems = existingReturns || [], returnedMap = {};
                returnedItems.forEach(function(r){ 
                    var rProductId = r.productId || r.productid;
                    var rReturnType = r.returnType || r.returntype;
                    var rQuantity = r.quantity || 0;
                    var key = rProductId + '-' + rReturnType; 
                    returnedMap[key] = (returnedMap[key] || 0) + rQuantity; 
                });
                var items = sale.items || [];
                var html = '<div style="padding:1rem;background:#f0fdf4;border-radius:0.5rem;margin-top:0.5rem;">';
                html += '<h4>✅ Sale Found: ' + receiptNo + '</h4>';
                html += '<p><strong>Customer:</strong> ' + (sale.customerName || sale.customername || 'Walk-in') + '</p>';
                html += '<p><strong>Date:</strong> ' + new Date(sale.date).toLocaleDateString('en-KE') + '</p>';
                html += '<p><strong>Total:</strong> KES ' + Number(sale.total || 0).toLocaleString() + '</p>';
                if (sale.is_returned || sale.isReturned) { html += '<p style="color:#f59e0b;"><strong>⚠️ This sale has already been partially/fully returned/exchanged.</strong></p>'; }
                html += '<hr><div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">';
                html += '<div><label><strong>Return Type:</strong></label><select id="returnTypeSelect" class="form-control"><option value="return">Return</option><option value="exchange">Exchange</option></select></div>';
                html += '<div><label><strong>Items:</strong></label><select id="returnItemSelect" class="form-control">';
                items.forEach(function(item){ 
                    var itemProductId = item.productId || item.productid;
                    var itemProductName = item.productName || item.productname || 'Unknown Item';
                    var itemPrice = item.price || 0;
                    var itemQuantity = item.quantity || 0;
                    var itemSoldInUnit = item.soldInUnit || item.soldinunit || '';
                    var itemConvFactor = item.conversionFactor || item.conversionfactor || 0;
                    var key = itemProductId + '-return'; 
                    var returnedQty = returnedMap[key] || 0; 
                    var available = itemQuantity - returnedQty; 
                    if (available > 0) { 
                        html += '<option value="' + itemProductId + '|' + itemProductName + '|' + itemPrice + '|' + available + '|' + itemSoldInUnit + '|' + itemConvFactor + '">' + itemProductName + ' (x' + available + ' available' + (itemSoldInUnit ? ' in ' + itemSoldInUnit : '') + ')</option>'; 
                    } 
                });
                html += '</select></div></div>';
                html += '<div class="form-group"><label>Quantity</label><input type="number" id="returnQty" class="form-control" value="1" min="1"></div>';
                html += '<div class="form-group"><label>Reason</label><input type="text" id="returnReason" class="form-control" placeholder="Reason for return/exchange"></div>';
                html += '<div id="exchangeProductSection" style="display:none;"><div class="form-group"><label>Exchange Product</label><input type="text" id="exchangeProductSearch" class="form-control" placeholder="Search product..." oninput="POSComponent._searchExchangeProduct(this.value)"><div id="exchangeResults"></div></div><div class="form-group"><label>Exchange Quantity</label><input type="number" id="exchangeQty" class="form-control" value="1" min="1"></div></div>';
                html += '<button class="btn btn-success" id="processReturnBtn" style="width:100%;margin-top:1rem;"><i class="fas fa-check"></i> Process Return/Exchange</button>';
                html += '</div>';
                
                // Put HTML in resultDiv
                resultDiv.innerHTML = html; 
                processDiv.style.display = 'block';
                
                // Store sale reference for the button handler
                var processBtn = document.getElementById('processReturnBtn');
                if (processBtn) {
                    processBtn.onclick = function() {
                        self._processReturn(sale, m);
                    };
                }
                
                // Return type change handler
                var returnTypeSelect = document.getElementById('returnTypeSelect');
                if (returnTypeSelect) {
                    returnTypeSelect.onchange = function() { 
                        var el = document.getElementById('exchangeProductSection'); 
                        if (el) el.style.display = this.value === 'exchange' ? 'block' : 'none'; 
                    };
                }
            });
        });
    },

    _searchExchangeProduct(query) {
        var resultsDiv = document.getElementById('exchangeResults');
        if (!resultsDiv) return;
        if (!query || query.length < 2) { resultsDiv.innerHTML = ''; return; }
        ApiService.get('/products/search?q=' + encodeURIComponent(query)).then(function(products){
            if (!products || products.length === 0) { resultsDiv.innerHTML = '<div style="padding:0.5rem;color:#999;">No products found</div>'; return; }
            var h = ''; 
            products.forEach(function(p){ 
                var stockDisplay = typeof ProductService !== 'undefined' ? ProductService.getStockDisplay(p) : (p.stock + ' ' + (p.unit || 'pcs'));
                h += '<div style="padding:0.5rem;border-bottom:1px solid #eee;cursor:pointer;" onclick="document.getElementById(\'exchangeProductSearch\').value=\'' + p.name + '\';document.getElementById(\'exchangeProductSearch\').dataset.id=\'' + p.id + '\';document.getElementById(\'exchangeProductSearch\').dataset.price=\'' + p.price + '\';resultsDiv.innerHTML=\'\';">' + p.name + ' - KES ' + p.price.toLocaleString() + ' (' + stockDisplay + ')</div>'; 
            });
            resultsDiv.innerHTML = h;
        });
    },

    _processReturn(sale, modal) {
        var self = this;
        // Use document.getElementById since HTML is in resultDiv
        var returnType = document.getElementById('returnTypeSelect').value;
        var itemSelect = document.getElementById('returnItemSelect');
        var selected = itemSelect.value.split('|');
        if (selected.length < 4) { this._showMessage('Select a valid item!', 'warning'); return; }
        var productId = parseInt(selected[0]), productName = selected[1], price = parseFloat(selected[2]), maxQty = parseInt(selected[3]);
        var soldInUnit = selected[4] || null;
        var conversionFactor = parseInt(selected[5]) || 0;
        var qty = parseInt(document.getElementById('returnQty').value) || 1;
        if (qty < 1 || qty > maxQty) { this._showMessage('Invalid quantity! Max available: ' + maxQty, 'warning'); return; }
        var reason = document.getElementById('returnReason').value || 'No reason provided';
        var refundAmount = returnType === 'return' ? (price * qty) : 0;
        var exchangeProductId = null, exchangeProductName = null, exchangeAmount = 0;
        if (returnType === 'exchange') {
            var exchangeSearch = document.getElementById('exchangeProductSearch');
            var exchangeId = exchangeSearch?.dataset?.id;
            var exchangePrice = parseFloat(exchangeSearch?.dataset?.price) || 0;
            var exchangeQty = parseInt(document.getElementById('exchangeQty').value) || 1;
            if (!exchangeId) { this._showMessage('Select an exchange product!', 'warning'); return; }
            exchangeProductId = parseInt(exchangeId);
            exchangeProductName = exchangeSearch.value;
            exchangeAmount = exchangePrice * exchangeQty;
        }
        var returnData = {
            originalSaleId: sale.id,
            originalReceiptNo: sale.receiptNo || sale.receiptno,
            customerName: sale.customerName || sale.customername || 'Walk-in',
            returnType: returnType,
            productId: productId,
            productName: productName,
            quantity: qty,
            returnAmount: refundAmount,
            returnedInUnit: soldInUnit,
            conversionFactor: conversionFactor,
            exchangeProductId: exchangeProductId,
            exchangeProductName: exchangeProductName,
            exchangeAmount: exchangeAmount,
            refundAmount: returnType === 'return' ? refundAmount : 0,
            reason: reason,
            cashierName: this._getCurrentUser()?.fullName || 'Cashier'
        };
        var msg = '<div style="text-align:center;"><h3>' + (returnType === 'return' ? 'Return' : 'Exchange') + '</h3><p><strong>Product:</strong> ' + productName + '</p><p><strong>Quantity:</strong> ' + qty + (soldInUnit ? ' ' + soldInUnit : '') + '</p>';
        if (returnType === 'return') msg += '<p><strong>Refund Amount:</strong> KES ' + refundAmount.toLocaleString() + '</p>';
        else msg += '<p><strong>Exchange Product:</strong> ' + exchangeProductName + ' x ' + exchangeQty + '</p>';
        msg += '</div>';
        this._showConfirm('Process ' + (returnType === 'return' ? 'Return' : 'Exchange'), msg, function(){
            ApiService.post('/returns', returnData).then(function(){
                self._showMessage('✅ ' + (returnType === 'return' ? 'Return' : 'Exchange') + ' processed successfully!', 'success');
                modal.remove();
                if (typeof CashierDashboardComponent !== 'undefined' && CashierDashboardComponent._currentView === 'returns') {
                    CashierDashboardComponent._loadMyReturns();
                }
            }).catch(function(e){ self._showMessage('Error: ' + e.message, 'danger'); });
        }, 'Confirm', 'success');
    },

    _updateCart() {
        var el=document.getElementById('cartItems'),count=document.getElementById('cartCount');if(!el)return;
        if(count)count.textContent=this._cart.reduce(function(s,i){return s+i.quantity;},0);
        if(this._cart.length===0){el.innerHTML='<div style="text-align:center;padding:2rem;color:#999;">Cart is empty</div>';}
        else{
            var h='';
            this._cart.forEach(function(item){
                var product = POSComponent._products.find(function(p){return p.id == item.productId;});
                var maxForInput = 9999;
                if (product) {
                    if (item.soldInUnit && item.conversionFactor > 0) {
                        maxForInput = Math.floor(product.stock / item.conversionFactor);
                    } else {
                        maxForInput = product.stock;
                    }
                }
                var unitDisplay = item.unit || 'pcs';
                h += '<div style="display:flex;justify-content:space-between;padding:0.5rem;border-bottom:1px solid #ddd;">';
                h += '<div><strong>'+item.productName+'</strong>'+(item.productVariant?'<br><small>'+item.productVariant+'</small>':'')+'<br><small>'+item.quantity+' x KES '+item.price.toLocaleString()+'/'+unitDisplay+'</small></div>';
                h += '<div style="text-align:right;"><strong>KES '+(item.price*item.quantity).toLocaleString()+'</strong><br>';
                h += '<div style="display:flex;align-items:center;gap:4px;justify-content:flex-end;">';
                h += '<button class="btn btn-sm btn-primary" onclick="POSComponent.updateCartQty('+item.productId+',-1)">-</button> ';
                h += '<input type="number" class="cart-qty-input" value="'+item.quantity+'" min="1" max="'+maxForInput+'" style="width:55px;text-align:center;padding:2px;border:1px solid #ccc;border-radius:4px;" onchange="POSComponent.setCartQty('+item.productId+', this.value)"> ';
                h += '<button class="btn btn-sm btn-primary" onclick="POSComponent.updateCartQty('+item.productId+',1)">+</button> ';
                h += '<button class="btn btn-sm btn-danger" onclick="POSComponent.removeFromCart('+item.productId+')">X</button>';
                h += '</div></div></div>';
            });
            el.innerHTML = h;
        }
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

    _showMessage(msg, type) { 
        var d=document.createElement('div');
        d.style.cssText='position:fixed;top:20px;right:20px;z-index:9999;padding:1rem 1.5rem;border-radius:1rem;color:white;font-weight:600;';
        d.style.background=type==='danger'?'#ef4444':type==='warning'?'#f59e0b':'#10b981';
        d.textContent=(type==='danger'?'❌ ':'✅ ')+msg;
        document.body.appendChild(d);
        setTimeout(function(){d.remove();},3000); 
    },

    _showConfirm(title, msg, onConfirm, btnText, btnType) { 
        var m = document.createElement('div');
        m.className = 'modal-overlay';
        
        var colors = {
            success: { gradient: 'linear-gradient(135deg,#10b981,#059669)', color: '#10b981' },
            danger: { gradient: 'linear-gradient(135deg,#ef4444,#dc2626)', color: '#ef4444' },
            warning: { gradient: 'linear-gradient(135deg,#f59e0b,#d97706)', color: '#f59e0b' },
            primary: { gradient: 'linear-gradient(135deg,#3b82f6,#2563eb)', color: '#3b82f6' }
        };
        var c = colors[btnType] || colors.primary;
        
        m.innerHTML = '<div class="modal"><div class="modal-header" style="background:' + c.gradient + ';color:white;"><h3 style="color:white;">' + title + '</h3></div><div class="modal-body">' + msg + '</div><div class="modal-footer"><button class="btn btn-outline" id="modalCancel">Cancel</button><button class="btn btn-' + (btnType || 'primary') + '" id="modalConfirm">' + (btnText || 'Confirm') + '</button></div></div>';
        document.body.appendChild(m);
        m.onclick = function(e) { if (e.target === m) m.remove(); };
        m.querySelector('#modalCancel').onclick = function() { m.remove(); };
        m.querySelector('#modalConfirm').onclick = function() { m.remove(); if (onConfirm) onConfirm(); }; 
    },

    _showReceipt(sale) {
        var h = SaleService.generateReceiptHTML(sale);
        var m = document.createElement('div'); m.className = 'modal-overlay';
        m.innerHTML = '<div class="modal modal-lg"><div class="modal-header" style="background:linear-gradient(135deg,#1a472a,#c49a2b);color:white;"><h3 style="color:white;"><i class="fas fa-receipt"></i> Receipt</h3><button class="btn btn-sm" style="color:white;" onclick="this.closest(\'.modal-overlay\').remove()">X</button></div><div class="modal-body">' + h + '</div><div class="modal-footer"><button class="btn btn-primary" onclick="SaleService.printReceipt(\'' + sale.receiptNo + '\')"><i class="fas fa-print"></i> Print</button><button class="btn btn-outline" onclick="this.closest(\'.modal-overlay\').remove()">Close</button></div></div>';
        document.body.appendChild(m); m.onclick = function(e){if(e.target===m)m.remove();};
    }
};

// Make globally available
window.POSComponent = POSComponent;
