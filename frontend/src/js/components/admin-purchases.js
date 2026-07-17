// ============================================
// ADMIN PURCHASES - With JWT Authentication & Dual-Unit Support
// ============================================

const AdminPurchasesComponent = {
    _poItems: [],
    _editingPOId: null,
    _editingPONumber: null,

    render() {
        var h = '';
        h += '<div class="card" style="margin-bottom:1.5rem;"><div class="card-header"><h3 class="card-title"><i class="fas fa-truck"></i> Create Purchase Order</h3></div><div class="card-body">';
        h += '<div style="display:grid;grid-template-columns:1fr 1fr auto;gap:1rem;align-items:end;">';
        h += '<div class="form-group"><label>Supplier *</label><select id="supplierSelect" class="form-control"><option value="">Select Supplier...</option></select></div>';
        h += '<div class="form-group"><label>Notes</label><input type="text" id="poNotes" class="form-control" placeholder="Order notes..."></div>';
        h += '<button class="btn btn-outline" onclick="AdminPurchasesComponent.showAddSupplier()" style="height:42px;"><i class="fas fa-plus"></i> New Supplier</button></div>';
        h += '<hr><h4>Select Products</h4>';
        h += '<div class="form-group"><label>Search Products</label><input type="text" id="productSearch" class="form-control" placeholder="Select supplier first, then search products..." oninput="AdminPurchasesComponent.searchProducts()"></div>';
        h += '<div id="productResults" style="max-height:300px;overflow-y:auto;margin-bottom:1rem;border:1px solid #ddd;border-radius:0.5rem;display:none;"></div>';
        h += '<div id="poItemsList" style="margin:1rem 0;"><p style="color:#999;text-align:center;">No items added yet.</p></div>';
        h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-top:1rem;">';
        h += '<div><div class="form-group" style="margin-bottom:0.5rem;"><label>Overall Discount</label><div style="display:flex;gap:0.5rem;align-items:center;">';
        h += '<select id="discountType" class="form-control" style="width:100px;" onchange="AdminPurchasesComponent.toggleDiscountType()"><option value="kes">KES</option><option value="pct">%</option></select>';
        h += '<input type="number" id="poDiscount" class="form-control" value="0" oninput="AdminPurchasesComponent.calculateTotal()" style="flex:1;">';
        h += '<span id="discountSymbol" style="font-weight:700;">KES</span></div>';
        h += '<small style="color:#10b981;" id="discountSaved"></small></div></div>';
        h += '<div style="text-align:right;font-size:1.1rem;background:#f5f5f5;padding:1rem;border-radius:0.5rem;">';
        h += '<strong>Subtotal (before discounts):</strong> KES <span id="poSubtotal">0</span><br>';
        h += '<strong style="color:#ef4444;">Overall Discount:</strong> -KES <span id="poDiscountDisplay">0</span><br>';
        h += '<strong style="font-size:1.3rem;color:var(--primary);">TOTAL (Buy):</strong> KES <span id="poTotal" style="font-size:1.3rem;font-weight:700;">0</span><br>';
        h += '<hr style="margin:0.5rem 0;">';
        h += '<strong style="color:#10b981;">Expected Revenue:</strong> KES <span id="poRevenue">0</span><br>';
        h += '<strong style="color:#10b981;font-size:1.1rem;">Expected Profit:</strong> KES <span id="poProfit" style="font-size:1.1rem;font-weight:700;">0</span>';
        h += '</div></div>';
        h += '<button class="btn btn-primary btn-lg" style="width:100%;margin-top:1rem;" id="submitPOBtn" onclick="AdminPurchasesComponent.submitPO()"><i class="fas fa-save"></i> Submit Purchase Order</button>';
        h += '<button class="btn btn-outline" id="cancelEditBtn" style="display:none;width:100%;margin-top:0.5rem;" onclick="AdminPurchasesComponent.cancelEdit()"><i class="fas fa-times"></i> Cancel Edit</button>';
        h += '</div></div>';
        
        // Purchase Orders History with search & filter
        h += '<div class="card"><div class="card-header"><h3 class="card-title"><i class="fas fa-list"></i> Purchase Orders History</h3>';
        h += '<div style="display:flex;gap:0.5rem;flex-wrap:wrap;">';
        h += '<input type="text" id="poSearchInput" class="form-control" placeholder=" Search by supplier, PO number, or date..." oninput="AdminPurchasesComponent._filterPOs()" style="width:300px;">';
        h += '<select id="poStatusFilter" class="form-control" onchange="AdminPurchasesComponent._filterPOs()" style="width:150px;">';
        h += '<option value="all">All Status</option>';
        h += '<option value="pending">Pending</option>';
        h += '<option value="received">Received</option>';
        h += '</select>';
        h += '<select id="poGroupFilter" class="form-control" onchange="AdminPurchasesComponent._filterPOs()" style="width:150px;">';
        h += '<option value="grouped">Group by Supplier</option>';
        h += '<option value="list">List All</option>';
        h += '</select>';
        h += '</div></div><div class="card-body"><div id="poHistory">Loading...</div></div></div>';
        
        setTimeout(function(){ AdminPurchasesComponent.loadSuppliers(); AdminPurchasesComponent.loadPOs(); }, 200);
        return h;
    },

    // ============================================
    // ✅ UPDATED: Using ApiService with JWT & Dual-Unit Support
    // ============================================

    // ========== FILTERED & GROUPED PO HISTORY ==========
    _allPOs: [],

    loadPOs() {
        var self = this;
        ApiService.get('/purchase-orders')
            .then(function(pos){
                self._allPOs = pos || [];
                self._renderPOs(pos);
            })
            .catch(function(e){
                console.error('Error loading POs:', e);
                var div = document.getElementById('poHistory');
                if (div) div.innerHTML = '<p style="color:#ef4444;text-align:center;">Error loading purchase orders.</p>';
            });
    },

    _renderPOs(pos) {
        var div = document.getElementById('poHistory');
        if (!div) return;
        
        if (!pos || !pos.length) {
            div.innerHTML = '<p style="text-align:center;color:#999;padding:2rem;">No purchase orders found.</p>';
            return;
        }
        
        var groupMode = (document.getElementById('poGroupFilter')?.value || 'grouped') === 'grouped';
        
        if (groupMode) {
            this._renderGroupedPOs(pos, div);
        } else {
            this._renderListPOs(pos, div);
        }
    },

    _renderGroupedPOs(pos, div) {
        var grouped = {};
        pos.forEach(function(po) {
            var key = po.supplierName || 'Unknown';
            if (!grouped[key]) {
                grouped[key] = {
                    supplierName: key,
                    totalAmount: 0,
                    totalItems: 0,
                    poCount: 0,
                    lastDate: po.date,
                    statuses: {},
                    orders: []
                };
            }
            grouped[key].totalAmount += Number(po.total || 0);
            grouped[key].totalItems += (po.items ? po.items.length : 0);
            grouped[key].poCount++;
            if (new Date(po.date) > new Date(grouped[key].lastDate)) {
                grouped[key].lastDate = po.date;
            }
            var st = po.status || 'pending';
            grouped[key].statuses[st] = (grouped[key].statuses[st] || 0) + 1;
            grouped[key].orders.push(po);
        });
        
        var suppliers = Object.values(grouped).sort(function(a, b) {
            return new Date(b.lastDate) - new Date(a.lastDate);
        });
        
        var totalAll = pos.reduce(function(s, po) { return s + Number(po.total || 0); }, 0);
        
        var h = '<div style="margin-bottom:0.5rem;font-weight:600;"> Total: <span style="color:var(--primary);">KES ' + totalAll.toLocaleString() + '</span> | Suppliers: ' + suppliers.length + ' | POs: ' + pos.length + '</div>';
        
        suppliers.forEach(function(g, idx) {
            var statusHTML = '';
            if (g.statuses.pending) statusHTML += '<span class="badge badge-warning">' + g.statuses.pending + ' pending</span> ';
            if (g.statuses.received) statusHTML += '<span class="badge badge-success">' + g.statuses.received + ' received</span> ';
            
            h += '<div class="supplier-group" style="margin-bottom:0.5rem;border:1px solid #ddd;border-radius:0.75rem;overflow:hidden;" data-search="' + g.supplierName.toLowerCase() + '">';
            h += '<div style="background:#f8fafc;padding:0.75rem 1rem;cursor:pointer;display:flex;justify-content:space-between;align-items:center;" onclick="AdminPurchasesComponent._toggleSupplier(' + idx + ')">';
            h += '<div>';
            h += '<strong style="font-size:1.1rem;"> ' + g.supplierName + '</strong>';
            h += '<br><small style="color:#666;">' + g.poCount + ' orders | ' + g.totalItems + ' items | Last: ' + new Date(g.lastDate).toLocaleDateString('en-KE') + '</small>';
            h += '</div>';
            h += '<div style="text-align:right;">';
            h += '<strong style="color:var(--primary);">KES ' + g.totalAmount.toLocaleString() + '</strong>';
            h += '<br><small>' + statusHTML + '</small>';
            h += '<br><small style="color:#3b82f6;">▶ Click to expand</small>';
            h += '</div></div>';
            
            h += '<div class="supplier-detail" id="supplierDetail_' + idx + '" style="display:none;border-top:1px solid #eee;">';
            h += '<table class="table" style="margin:0;font-size:0.9rem;"><thead><tr><th>PO Number</th><th>Items</th><th>Total</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead><tbody>';
            g.orders.sort(function(a, b) { return new Date(b.date) - new Date(a.date); }).forEach(function(po) {
                h += '<tr>';
                h += '<td><strong>' + po.poNumber + '</strong></td>';
                h += '<td>' + (po.items ? po.items.length : 0) + ' items</td>';
                h += '<td>KES ' + Number(po.total || 0).toLocaleString() + '</td>';
                h += '<td><span class="badge ' + (po.status === 'received' ? 'badge-success' : 'badge-warning') + '">' + po.status + '</span></td>';
                h += '<td><small>' + new Date(po.date).toLocaleDateString('en-KE') + '</small></td>';
                h += '<td style="white-space:nowrap;">';
                if (po.status === 'pending') {
                    h += '<button class="btn btn-sm btn-primary" onclick="AdminPurchasesComponent.editPO(' + po.id + ')"><i class="fas fa-edit"></i></button> ';
                    h += '<button class="btn btn-sm btn-success" onclick="AdminPurchasesComponent.receivePO(' + po.id + ')"><i class="fas fa-check"></i></button> ';
                }
                h += '<button class="btn btn-sm btn-outline" onclick="AdminPurchasesComponent.printExistingPO(\'' + po.poNumber + '\')"><i class="fas fa-print"></i></button>';
                h += '</td></tr>';
            });
            h += '</tbody></table></div></div>';
        });
        
        div.innerHTML = h;
    },

    _renderListPOs(pos, div) {
        var h = '<table class="table"><thead><tr><th>PO Number</th><th>Supplier</th><th>Items</th><th>Total</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead><tbody>';
        pos.forEach(function(po) {
            h += '<tr data-search="' + (po.supplierName || '').toLowerCase() + ' ' + (po.poNumber || '').toLowerCase() + ' ' + (po.date || '') + '">';
            h += '<td><strong>' + po.poNumber + '</strong></td>';
            h += '<td>' + po.supplierName + '</td>';
            h += '<td>' + (po.items ? po.items.length : 0) + ' items</td>';
            h += '<td>KES ' + Number(po.total || 0).toLocaleString() + '</td>';
            h += '<td><span class="badge ' + (po.status === 'received' ? 'badge-success' : 'badge-warning') + '">' + po.status + '</span></td>';
            h += '<td>' + new Date(po.date).toLocaleDateString('en-KE') + '</td>';
            h += '<td style="white-space:nowrap;">';
            if (po.status === 'pending') {
                h += '<button class="btn btn-sm btn-primary" onclick="AdminPurchasesComponent.editPO(' + po.id + ')"><i class="fas fa-edit"></i></button> ';
                h += '<button class="btn btn-sm btn-success" onclick="AdminPurchasesComponent.receivePO(' + po.id + ')"><i class="fas fa-check"></i></button> ';
            }
            h += '<button class="btn btn-sm btn-outline" onclick="AdminPurchasesComponent.printExistingPO(\'' + po.poNumber + '\')"><i class="fas fa-print"></i></button>';
            h += '</td></tr>';
        });
        h += '</tbody></table>';
        div.innerHTML = h;
    },

    _toggleSupplier(idx) {
        var detail = document.getElementById('supplierDetail_' + idx);
        if (detail) {
            detail.style.display = detail.style.display === 'none' ? 'block' : 'none';
        }
    },

    _filterPOs() {
        var search = (document.getElementById('poSearchInput')?.value || '').toLowerCase();
        var statusFilter = document.getElementById('poStatusFilter')?.value || 'all';
        var all = this._allPOs || [];
        
        var filtered = all.filter(function(po) {
            var matchSearch = !search || 
                (po.supplierName || '').toLowerCase().indexOf(search) > -1 ||
                (po.poNumber || '').toLowerCase().indexOf(search) > -1 ||
                (po.date || '').indexOf(search) > -1;
            var matchStatus = statusFilter === 'all' || po.status === statusFilter;
            return matchSearch && matchStatus;
        });
        
        this._renderPOs(filtered);
    },

    // ========== SUPPLIER FUNCTIONS ==========
    
    loadSuppliers() {
        ApiService.get('/suppliers')
            .then(function(suppliers){
                var sel = document.getElementById('supplierSelect'); if(!sel)return;
                sel.innerHTML = '<option value="">Select Supplier...</option>';
                suppliers.forEach(function(s){ sel.innerHTML += '<option value="'+s.id+'">'+s.name+'</option>'; });
            });
    },

    showAddSupplier() {
        var m = document.createElement('div'); m.className = 'modal-overlay';
        m.innerHTML = '<div class="modal"><div class="modal-header" style="background:linear-gradient(135deg,#1a472a,#c49a2b);color:white;"><h3 style="color:white;"><i class="fas fa-plus-circle"></i> Add Supplier</h3><button class="btn btn-sm" style="color:white;" onclick="this.closest(\'.modal-overlay\').remove()">X</button></div><div class="modal-body"><div class="form-group"><label>Supplier Name *</label><input type="text" id="supName" class="form-control" autofocus></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;"><div class="form-group"><label>Phone</label><input type="text" id="supPhone" class="form-control"></div><div class="form-group"><label>Email</label><input type="text" id="supEmail" class="form-control"></div></div><div class="form-group"><label>Address</label><input type="text" id="supAddress" class="form-control"></div></div><div class="modal-footer"><button class="btn btn-outline" onclick="this.closest(\'.modal-overlay\').remove()">Cancel</button><button class="btn btn-success" id="saveSupplierBtn"><i class="fas fa-save"></i> Save</button></div></div>';
        document.body.appendChild(m); m.onclick = function(e){if(e.target===m)m.remove();};
        m.querySelector('#saveSupplierBtn').onclick = async function(){
            var n = document.getElementById('supName').value.trim(); if(!n){showStyledAlert('Required', 'Name required!', 'exclamation-triangle', '#f59e0b');return;}
            await ApiService.post('/suppliers', {
                name: n,
                phone: document.getElementById('supPhone').value,
                email: document.getElementById('supEmail').value,
                address: document.getElementById('supAddress').value
            });
            m.remove(); AdminPurchasesComponent.loadSuppliers();
        };
    },

    _showSupplierWarning() {
        var m = document.createElement('div'); m.className = 'modal-overlay';
        m.innerHTML = '<div class="modal"><div class="modal-header" style="background:linear-gradient(135deg,#f59e0b,#d97706);color:white;"><h3 style="color:white;"><i class="fas fa-exclamation-triangle"></i> Supplier Required</h3></div><div class="modal-body" style="text-align:center;"><div style="font-size:3rem;color:var(--warning);margin-bottom:1rem;"><i class="fas fa-user-tie"></i></div><p style="font-size:1.1rem;">Please select a supplier first before adding products.</p></div><div class="modal-footer" style="justify-content:center;"><button class="btn btn-primary" onclick="this.closest(\'.modal-overlay\').remove()"><i class="fas fa-check"></i> OK</button></div></div>';
        document.body.appendChild(m); m.onclick = function(e) { if (e.target === m) m.remove(); };
    },

    // ========== PRODUCT SEARCH & ADD (with dual-unit) ==========

    searchProducts() {
        var supplierSelect = document.getElementById('supplierSelect');
        if (!supplierSelect || !supplierSelect.value) { this._showSupplierWarning(); document.getElementById('productSearch').value = ''; return; }
        var q = (document.getElementById('productSearch').value || '').toLowerCase();
        var div = document.getElementById('productResults'); if(q.length < 1){div.style.display='none';return;} div.style.display = 'block';
        ApiService.get('/products/with-prices')
            .then(function(products){
                var filtered = products.filter(function(p){return p.name.toLowerCase().includes(q) || (p.brand||'').toLowerCase().includes(q);});
                var h = ''; if(filtered.length === 0){h='<p style="padding:1rem;color:#999;">No products found</p>';}
                else{filtered.forEach(function(p){
                    // Stock display with dual-unit
                    var stockDisplay = typeof ProductService !== 'undefined' && ProductService.getStockDisplay 
                        ? ProductService.getStockDisplay(p) 
                        : (p.stock + ' ' + (p.unit || 'pcs'));
                    
                    // Price display
                    var priceDisplay = typeof ProductService !== 'undefined' && ProductService.getPriceDisplay
                        ? ProductService.getPriceDisplay(p)
                        : 'KES ' + (p.price || 0).toLocaleString() + '/' + (p.unit || 'pcs');
                    
                    h += '<div style="padding:0.75rem;border-bottom:1px solid #eee;cursor:pointer;display:grid;grid-template-columns:1fr auto auto auto auto;gap:0.5rem;align-items:center;" onclick="AdminPurchasesComponent.addPOItem('+p.id+')">';
                    h += '<div><strong>'+(p.brand||'')+' '+p.name+'</strong><br><small style="color:#999;">'+(p.variant||'')+'</small></div>';
                    h += '<div style="text-align:center;"><small style="color:#999;">Buy</small><br>KES '+(p.lastPrice||p.cost||0).toLocaleString()+'</div>';
                    h += '<div style="text-align:center;" title="' + priceDisplay + '"><small style="color:#999;">Sell</small><br>KES '+(p.price||0).toLocaleString()+'/' + (p.unit||'pcs') + '</div>';
                    h += '<div style="text-align:center;" title="' + stockDisplay + '"><small style="color:#999;">Stock</small><br>' + p.stock + ' ' + (p.unit||'pcs') + '</div>';
                    h += '<button class="btn btn-sm btn-success">+ Add</button></div>';
                });} div.innerHTML = h;
            });
    },

    addPOItem(productId) {
        var supplierSelect = document.getElementById('supplierSelect');
        if (!supplierSelect || !supplierSelect.value) { this._showSupplierWarning(); return; }
        var self = this;
        ApiService.get('/products/with-prices')
            .then(function(products){
                var p = products.find(function(x){return x.id == productId;}); if(!p)return;
                var buyPrice = p.lastPrice || p.cost || 0;
                var hasAlternativeUnit = !!(p.salesUnit && p.conversionFactor > 0);
                
                var m = document.createElement('div'); m.className = 'modal-overlay';
                m.innerHTML = '<div class="modal modal-lg"><div class="modal-header" style="background:linear-gradient(135deg,#1a472a,#c49a2b);color:white;"><h3 style="color:white;"><i class="fas fa-cart-plus"></i> Add to Purchase Order</h3><button class="btn btn-sm" style="color:white;" onclick="this.closest(\'.modal-overlay\').remove()">X</button></div><div class="modal-body"><div style="text-align:center;margin-bottom:1rem;"><h4>'+(p.brand||'')+' '+p.name+'</h4><p style="color:#999;">'+(p.variant||'')+'</p>';
                
                // Stock display
                var stockDisplay = typeof ProductService !== 'undefined' && ProductService.getStockDisplay 
                    ? ProductService.getStockDisplay(p) 
                    : (p.stock + ' ' + (p.unit || 'pcs'));
                m.innerHTML += '<p style="color:#666;">Current Stock: <strong>' + stockDisplay + '</strong></p></div>';
                
                m.innerHTML += '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:0.5rem;text-align:center;margin-bottom:1rem;"><div style="background:#f5f5f5;padding:0.75rem;border-radius:0.5rem;"><small>Buy Price (per ' + (p.unit||'pcs') + ')</small><br><input type="number" id="modalBuyPrice" class="form-control" value="'+buyPrice+'" step="0.01" style="text-align:center;font-weight:700;"></div><div style="background:#f5f5f5;padding:0.75rem;border-radius:0.5rem;"><small>Sell Price</small><br><strong>KES '+(p.price||0).toLocaleString()+'/' + (p.unit||'pcs') + '</strong></div><div style="background:#f5f5f5;padding:0.75rem;border-radius:0.5rem;"><small>Base Unit</small><br><strong>' + (p.unit||'pcs') + '</strong></div></div>';
                
                // 🔥 DUAL-UNIT: Order unit selection
                if (hasAlternativeUnit) {
                    var conversionFactor = parseInt(p.conversionFactor);
                    var salesUnit = p.salesUnit;
                    m.innerHTML += '<div style="background:#fff8e1;padding:1rem;border-radius:0.75rem;border:1px solid #f59e0b;margin-bottom:1rem;">';
                    m.innerHTML += '<p style="color:#f59e0b;font-weight:600;margin-bottom:0.5rem;"><i class="fas fa-sync-alt"></i> Order Unit</p>';
                    m.innerHTML += '<div style="display:flex;gap:0.5rem;">';
                    m.innerHTML += '<label style="flex:1;padding:0.75rem;border:2px solid var(--primary);border-radius:0.75rem;text-align:center;cursor:pointer;" class="order-unit-option" data-unit="base">';
                    m.innerHTML += '<input type="radio" name="orderUnit" value="base" checked style="display:none;">';
                    m.innerHTML += '<div style="font-weight:700;">' + (p.unit||'pcs').charAt(0).toUpperCase() + (p.unit||'pcs').slice(1) + '</div>';
                    m.innerHTML += '<div style="font-size:0.85rem;color:#666;">Base Unit</div>';
                    m.innerHTML += '</label>';
                    m.innerHTML += '<label style="flex:1;padding:0.75rem;border:2px solid #ccc;border-radius:0.75rem;text-align:center;cursor:pointer;" class="order-unit-option" data-unit="sales">';
                    m.innerHTML += '<input type="radio" name="orderUnit" value="sales" style="display:none;">';
                    m.innerHTML += '<div style="font-weight:700;">' + salesUnit.charAt(0).toUpperCase() + salesUnit.slice(1) + '</div>';
                    m.innerHTML += '<div style="font-size:0.85rem;color:#666;">1 ' + salesUnit + ' = ' + conversionFactor + ' ' + (p.unit||'pcs') + '</div>';
                    m.innerHTML += '</label>';
                    m.innerHTML += '</div>';
                    m.innerHTML += '<small style="color:#666;">Ordering in <strong>' + salesUnit + '</strong> will auto-convert to base units when received.</small>';
                    m.innerHTML += '</div>';
                }
                
                m.innerHTML += '<div class="form-group"><label>Quantity</label><input type="number" id="modalQty" class="form-control" value="1" min="1" style="font-size:1.2rem;text-align:center;" autofocus>';
                if (hasAlternativeUnit) {
                    m.innerHTML += '<small id="qtyHint" style="color:#666;">Enter quantity in <strong>' + (p.unit||'pcs') + '</strong></small>';
                }
                m.innerHTML += '</div>';
                
                m.innerHTML += '<div class="form-group"><label>Discount (KES)</label><input type="number" id="modalDiscount" class="form-control" value="0" min="0"></div>';
                m.innerHTML += '<div style="text-align:center;margin-top:0.5rem;"><strong>Total: KES <span id="modalTotal">'+buyPrice.toLocaleString()+'</span></strong></div>';
                m.innerHTML += '<div id="conversionInfo" style="margin-top:0.5rem;padding:0.5rem;background:#f0fdf4;border-radius:0.5rem;font-size:0.85rem;color:#10b981;display:none;"></div>';
                
                m.innerHTML += '</div><div class="modal-footer"><button class="btn btn-outline" onclick="this.closest(\'.modal-overlay\').remove()">Cancel</button><button class="btn btn-success" id="confirmAddBtn"><i class="fas fa-plus"></i> Add</button></div></div>';
                document.body.appendChild(m); m.onclick = function(e) { if (e.target === m) m.remove(); };
                
                // Unit selection handler
                if (hasAlternativeUnit) {
                    m.querySelectorAll('.order-unit-option').forEach(function(label) {
                        label.addEventListener('click', function() {
                            var radio = label.querySelector('input[type="radio"]');
                            radio.checked = true;
                            m.querySelectorAll('.order-unit-option').forEach(l => l.style.borderColor = '#ccc');
                            label.style.borderColor = 'var(--primary)';
                            var qtyHint = m.querySelector('#qtyHint');
                            var convInfo = m.querySelector('#conversionInfo');
                            if (radio.value === 'sales') {
                                if (qtyHint) qtyHint.innerHTML = 'Enter quantity in <strong>' + salesUnit + '</strong> (will be converted to ' + (p.unit||'pcs') + ' on receive)';
                                if (convInfo) {
                                    convInfo.style.display = 'block';
                                    convInfo.innerHTML = '📦 1 ' + salesUnit + ' = <strong>' + conversionFactor + ' ' + (p.unit||'pcs') + '</strong> | Receiving will add <strong>' + conversionFactor + ' × qty</strong> to stock';
                                }
                            } else {
                                if (qtyHint) qtyHint.innerHTML = 'Enter quantity in <strong>' + (p.unit||'pcs') + '</strong>';
                                if (convInfo) convInfo.style.display = 'none';
                            }
                            updateModalTotal();
                        });
                    });
                }
                
                var updateModalTotal = function() { 
                    var q = parseInt(m.querySelector('#modalQty').value) || 1; 
                    var d = parseFloat(m.querySelector('#modalDiscount').value) || 0; 
                    var bp = parseFloat(m.querySelector('#modalBuyPrice')?.value) || buyPrice; 
                    var t = bp * q - d; 
                    m.querySelector('#modalTotal').textContent = t.toLocaleString(); 
                };
                m.querySelector('#modalQty').oninput = updateModalTotal; 
                m.querySelector('#modalDiscount').oninput = updateModalTotal; 
                m.querySelector('#modalBuyPrice').oninput = updateModalTotal;
                
                m.querySelector('#confirmAddBtn').onclick = function() { 
                    var qty = parseInt(m.querySelector('#modalQty').value) || 1; 
                    if (qty <= 0) return; 
                    var disc = parseFloat(m.querySelector('#modalDiscount').value) || 0; 
                    var bp = parseFloat(m.querySelector('#modalBuyPrice')?.value) || buyPrice; 
                    var itemTotal = (bp * qty) - disc; 
                    if (itemTotal <= 0) { showStyledAlert('Error', 'Total cannot be zero', 'times-circle', '#ef4444'); return; }
                    
                    // 🔥 DUAL-UNIT: Get ordered unit
                    var orderedInUnit = null;
                    var convFactor = 0;
                    var baseQty = qty;
                    if (hasAlternativeUnit) {
                        var selectedUnit = m.querySelector('input[name="orderUnit"]:checked')?.value || 'base';
                        if (selectedUnit === 'sales') {
                            orderedInUnit = p.salesUnit;
                            convFactor = parseInt(p.conversionFactor);
                            baseQty = qty * convFactor;
                        }
                    }
                    
                    self._poItems.push({ 
                        productName: p.name, 
                        brand: p.brand||'', 
                        variant: p.variant||'', 
                        quantity: qty, 
                        orderedInUnit: orderedInUnit,
                        conversionFactor: convFactor,
                        baseQuantity: baseQty,
                        unitPrice: bp, 
                        sellingPrice: p.price||0, 
                        lastPrice: bp, 
                        currentStock: p.stock, 
                        discount: disc, 
                        total: itemTotal 
                    }); 
                    self._renderPOItems(); 
                    document.getElementById('productResults').style.display = 'none'; 
                    document.getElementById('productSearch').value = ''; 
                    m.remove(); 
                };
            });
    },

    // ========== PO ITEMS RENDERING (with dual-unit display) ==========

    _renderPOItems() {
        var div = document.getElementById('poItemsList'); 
        if(this._poItems.length === 0){
            div.innerHTML='<p style="color:#999;text-align:center;">No items added yet.</p>';
            this.calculateTotal();
            return;
        }
        var h = '<table class="table"><thead><tr><th>Product</th><th>Brand</th><th>Variant</th><th>Qty</th><th>Unit</th><th>Buy Price</th><th>Sell Price</th><th>Discount</th><th>Total</th><th></th></tr></thead><tbody>';
        this._poItems.forEach(function(i,idx){ 
            var qtyDisplay = i.quantity;
            var unitDisplay = '';
            if (i.orderedInUnit && i.conversionFactor > 0) {
                unitDisplay = i.orderedInUnit + ' (' + i.baseQuantity + ' base units)';
            }
            h += '<tr>';
            h += '<td>'+i.productName+'</td>';
            h += '<td>'+i.brand+'</td>';
            h += '<td>'+i.variant+'</td>';
            h += '<td>'+i.quantity+'</td>';
            h += '<td>'+(unitDisplay || '-')+'</td>';
            h += '<td>KES '+i.unitPrice.toLocaleString()+'</td>';
            h += '<td>KES '+i.sellingPrice.toLocaleString()+'</td>';
            h += '<td>'+(i.discount?'-KES '+i.discount.toLocaleString():'0')+'</td>';
            h += '<td>KES '+i.total.toLocaleString()+'</td>';
            h += '<td><button class="btn btn-sm btn-danger" onclick="AdminPurchasesComponent.removeItem('+idx+')">X</button></td>';
            h += '</tr>'; 
        });
        h += '</tbody></table>'; 
        div.innerHTML = h; 
        this.calculateTotal();
    },

    removeItem(idx) { this._poItems.splice(idx,1); this._renderPOItems(); },
    toggleDiscountType() { document.getElementById('discountSymbol').textContent = document.getElementById('discountType').value === 'kes' ? 'KES' : '%'; this.calculateTotal(); },

    calculateTotal() {
        var subtotalBefore = this._poItems.reduce(function(s,i){return s + (i.unitPrice * i.quantity);}, 0);
        var totalAfterItems = this._poItems.reduce(function(s,i){return s + i.total;}, 0);
        var discountType = document.getElementById('discountType')?.value || 'kes';
        var discountInput = parseFloat(document.getElementById('poDiscount')?.value) || 0;
        var overallDiscount = discountType === 'pct' ? totalAfterItems * (discountInput / 100) : discountInput;
        var total = totalAfterItems - overallDiscount;
        var revenue = this._poItems.reduce(function(s,i){return s + (i.sellingPrice * i.quantity);}, 0);
        var profit = revenue - total;
        var st = document.getElementById('poSubtotal'); if(st) st.textContent = subtotalBefore.toLocaleString();
        var dd = document.getElementById('poDiscountDisplay'); if(dd) dd.textContent = overallDiscount.toLocaleString();
        var tt = document.getElementById('poTotal'); if(tt) tt.textContent = total.toLocaleString();
        var rev = document.getElementById('poRevenue'); if(rev) rev.textContent = revenue.toLocaleString();
        var prof = document.getElementById('poProfit'); if(prof) { prof.textContent = profit.toLocaleString(); prof.style.color = profit >= 0 ? '#10b981' : '#ef4444'; }
    },

    // ========== SUBMIT & RECEIVE ==========

    submitPO() {
        var supplierSelect = document.getElementById('supplierSelect');
        if (!supplierSelect || !supplierSelect.value) { this._showSupplierWarning(); return; }
        var supplierName = supplierSelect.options[supplierSelect.selectedIndex].text;
        if (this._poItems.length === 0) { showStyledAlert('Required', 'Add at least one item!', 'exclamation-triangle', '#f59e0b'); return; }
        if (this._editingPOId) { this._updateExistingPO(); return; }
        var discountType = document.getElementById('discountType')?.value || 'kes'; var discountInput = parseFloat(document.getElementById('poDiscount')?.value) || 0;
        var totalAfterItems = this._poItems.reduce(function(s,i){return s+i.total;},0);
        var overallDiscount = discountType === 'pct' ? totalAfterItems * (discountInput / 100) : discountInput;
        var total = totalAfterItems - overallDiscount; var notes = document.getElementById('poNotes')?.value || '';
        var self = this; var btn = document.getElementById('submitPOBtn');
        if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...'; }
        
        // 🔥 Include dual-unit fields in items
        var itemsWithUnits = this._poItems.map(function(item) {
            return {
                productName: item.productName,
                brand: item.brand,
                variant: item.variant,
                quantity: item.quantity,
                orderedInUnit: item.orderedInUnit || null,
                conversionFactor: item.conversionFactor || 0,
                baseQuantity: item.baseQuantity || item.quantity,
                unitPrice: item.unitPrice,
                sellingPrice: item.sellingPrice,
                lastPrice: item.lastPrice,
                currentStock: item.currentStock,
                discount: item.discount,
                total: item.total
            };
        });
        
        ApiService.post('/purchase-orders', {
            supplierName: supplierName,
            supplierId: supplierSelect.value,
            items: itemsWithUnits,
            notes: notes,
            total: total,
            createdBy: 'Admin'
        })
        .then(function(d) {
            if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-save"></i> Submit Purchase Order'; }
            if (d.success) {
                self._poItems = []; self._renderPOItems(); document.getElementById('poNotes').value = ''; document.getElementById('poDiscount').value = '0';
                self._editingPOId = null; self._editingPONumber = null;
                self.loadPOs(); self.calculateTotal();
                showStyledAlert('Success', 'PO ' + d.poNumber + ' created!', 'check-circle', '#10b981');
            } else { showStyledAlert('Error', d.message || 'Failed', 'times-circle', '#ef4444'); }
        }).catch(function(e) { if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-save"></i> Submit Purchase Order'; } });
    },

    printExistingPO(poNumber) {
        ApiService.get('/purchase-orders').then(function(pos){
            var po = pos.find(function(p){return p.poNumber === poNumber;}); if(!po)return;
            var h = '<div style="max-width:400px;margin:0 auto;font-family:Inter;font-size:14px;"><div style="text-align:center;border-bottom:2px dashed #ccc;padding-bottom:10px;margin-bottom:10px;"><img src="../assets/talaen02.jpg" style="width:50px;height:50px;border-radius:10px;"><br><strong>TALAEN INVESTMENT HARDWARE</strong><br><strong>PURCHASE ORDER</strong><br><strong>'+po.poNumber+'</strong></div><p><strong>Supplier:</strong> '+po.supplierName+'</p><p><strong>Status:</strong> '+po.status.toUpperCase()+'</p><table style="width:100%;border-collapse:collapse;"><tr style="border-bottom:2px solid #333;"><th>Product</th><th>Qty</th><th>Unit</th><th>Price</th><th>Total</th></tr>';
            (po.items||[]).forEach(function(i){
                var unitDisplay = i.orderedInUnit || '-';
                if (i.conversionFactor > 0) unitDisplay = i.quantity + ' ' + i.orderedInUnit + ' (' + i.baseQuantity + ' base)';
                h+='<tr><td>'+i.productName+'</td><td>'+i.quantity+'</td><td>'+unitDisplay+'</td><td>'+i.unitPrice.toLocaleString()+'</td><td>'+i.total.toLocaleString()+'</td></tr>';
            });
            h += '</table><p><strong>Total:</strong> KES '+Number(po.total).toLocaleString()+'</p></div>';
            var w = window.open('', '_blank', 'width=500,height=600'); w.document.write('<!DOCTYPE html><html><head><title>PO</title><style>body{font-family:Inter;padding:20px;}button{background:#1a472a;color:white;border:none;padding:10px 20px;border-radius:8px;cursor:pointer;}</style></head><body><button onclick="window.print()">Print</button><br><br>'+h+'</body></html>'); w.document.close();
        });
    },

    editPO(poId) {
        var self = this;
        ApiService.get('/purchase-orders').then(function(pos){
            var po = pos.find(function(p){return p.id === poId;}); if (!po) return;
            self._poItems = [];
            (po.items || []).forEach(function(i) { 
                self._poItems.push({ 
                    productName: i.productName, 
                    brand: i.brand||'', 
                    variant: i.variant||'', 
                    quantity: i.quantity, 
                    orderedInUnit: i.orderedInUnit || null,
                    conversionFactor: i.conversionFactor || 0,
                    baseQuantity: i.baseQuantity || i.quantity,
                    unitPrice: i.unitPrice, 
                    sellingPrice: i.sellingPrice||0, 
                    lastPrice: i.lastPrice||i.unitPrice, 
                    currentStock: i.currentStock||0, 
                    discount: i.discount || 0, 
                    total: i.total 
                }); 
            });
            var sel = document.getElementById('supplierSelect'); if (sel && po.supplierId) sel.value = po.supplierId;
            if (document.getElementById('poNotes')) document.getElementById('poNotes').value = po.notes || '';
            self._renderPOItems(); self.calculateTotal();
            self._editingPOId = poId; self._editingPONumber = po.poNumber;
            var btn = document.getElementById('submitPOBtn'); if (btn) { btn.innerHTML = '<i class="fas fa-save"></i> Update Purchase Order'; }
            var cancelBtn = document.getElementById('cancelEditBtn'); if (cancelBtn) cancelBtn.style.display = 'block';
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    },

    cancelEdit() {
        this._poItems = []; this._renderPOItems(); this._editingPOId = null; this._editingPONumber = null;
        document.getElementById('poNotes').value = ''; document.getElementById('poDiscount').value = '0';
        var btn = document.getElementById('submitPOBtn'); if (btn) { btn.innerHTML = '<i class="fas fa-save"></i> Submit Purchase Order'; }
        var cancelBtn = document.getElementById('cancelEditBtn'); if (cancelBtn) cancelBtn.style.display = 'none';
        this.calculateTotal();
    },

    _updateExistingPO() {
        var self = this; var discountType = document.getElementById('discountType')?.value || 'kes'; var discountInput = parseFloat(document.getElementById('poDiscount')?.value) || 0;
        var totalAfterItems = this._poItems.reduce(function(s,i){return s+i.total;},0);
        var overallDiscount = discountType === 'pct' ? totalAfterItems * (discountInput / 100) : discountInput;
        var total = totalAfterItems - overallDiscount; var notes = document.getElementById('poNotes')?.value || '';
        var supplierSelect = document.getElementById('supplierSelect'); var supplierName = supplierSelect.options[supplierSelect.selectedIndex].text;
        var btn = document.getElementById('submitPOBtn'); if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...'; }
        
        var itemsWithUnits = this._poItems.map(function(item) {
            return {
                productName: item.productName,
                brand: item.brand,
                variant: item.variant,
                quantity: item.quantity,
                orderedInUnit: item.orderedInUnit || null,
                conversionFactor: item.conversionFactor || 0,
                baseQuantity: item.baseQuantity || item.quantity,
                unitPrice: item.unitPrice,
                sellingPrice: item.sellingPrice,
                lastPrice: item.lastPrice,
                currentStock: item.currentStock,
                discount: item.discount,
                total: item.total
            };
        });
        
        ApiService.put('/purchase-orders/' + this._editingPOId + '/update', {
            supplierName: supplierName,
            supplierId: supplierSelect.value,
            items: itemsWithUnits,
            notes: notes,
            total: total
        })
        .then(function(d){
            if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-save"></i> Submit Purchase Order'; }
            var cancelBtn = document.getElementById('cancelEditBtn'); if (cancelBtn) cancelBtn.style.display = 'none';
            if (d.success) { 
                self._poItems = []; self._renderPOItems(); self._editingPOId = null; self._editingPONumber = null;
                document.getElementById('poNotes').value = ''; document.getElementById('poDiscount').value = '0'; self.loadPOs(); self.calculateTotal();
                showStyledAlert('Success', 'PO updated!', 'check-circle', '#10b981');
            } else { showStyledAlert('Error', d.message || 'Failed', 'times-circle', '#ef4444'); }
        }).catch(function(e) { if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-save"></i> Submit Purchase Order'; } });
    },

    receivePO(id) {
        var self = this;
        showConfirm('Receive Stock', 'Confirm receiving this Purchase Order? Stock will be updated in base units!', async function() {
            try {
                await ApiService.put('/purchase-orders/'+id+'/receive');
                await ProductService.refresh();
                self.loadPOs();
                showStyledAlert('Success', 'Stock received and converted to base units!', 'check-circle', '#10b981');
            }
            catch(e) { showStyledAlert('Error', e.message, 'times-circle', '#ef4444'); }
        }, 'Receive', 'success');
    }
};

// Make globally available
window.AdminPurchasesComponent = AdminPurchasesComponent;
