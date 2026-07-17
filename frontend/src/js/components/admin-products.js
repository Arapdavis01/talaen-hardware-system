// ============================================
// ADMIN PRODUCTS - With JWT Authentication & Dual-Unit Support
// ============================================

const AdminProductsComponent = {
    render: function() {
        var products = ProductService._cache || [];
        var grouped = {};
        products.forEach(function(p) {
            var key = p.name.toUpperCase();
            if (!grouped[key]) grouped[key] = { displayName: p.name, variants: [] };
            grouped[key].variants.push(p);
        });
        
        var h = '<div class="card"><div class="card-header"><h3 class="card-title"><i class="fas fa-boxes"></i> Products (' + products.length + ' items)</h3>';
        h += '<div style="display:flex;gap:0.5rem;"><input type="text" id="productSearchFilter" class="form-control" placeholder=" Search by name, brand, variant, or category (e.g., cement)..." style="width:350px;" oninput="AdminProductsComponent.filterProducts()"><button class="btn btn-success" onclick="AdminProductsComponent.showAddForm()"><i class="fas fa-plus"></i> Add Product</button></div>';
        h += '</div><div class="card-body">';
        
        if (products.length === 0) {
            h += '<p style="text-align:center;padding:3rem;color:var(--gray-500);">No products yet. Click <strong>Add Product</strong> to get started.</p>';
        } else {
            var keys = Object.keys(grouped).sort();
            for (var i = 0; i < keys.length; i++) {
                var group = grouped[keys[i]];
                var variants = group.variants;
                h += '<div class="product-group-container" data-group="' + group.displayName.toLowerCase() + '" style="margin-bottom:1rem;border:1px solid #ddd;border-radius:1rem;overflow:hidden;">';
                h += '<div class="group-header" style="background:linear-gradient(135deg,rgba(26,71,42,0.05),rgba(196,154,43,0.05));padding:0.75rem 1rem;display:flex;justify-content:space-between;align-items:center;">';
                h += '<strong style="color:var(--primary);"><i class="fas fa-box"></i> ' + group.displayName + ' <span class="badge badge-info">' + variants.length + ' variants</span></strong>';
                h += '<button class="btn btn-sm btn-success" onclick="AdminProductsComponent.addVariant(\'' + group.displayName.replace(/'/g, "\\'") + '\', \'' + (variants[0]?.category || 'General').replace(/'/g, "\\'") + '\')"><i class="fas fa-plus"></i> Add Variant</button>';
                h += '</div>';
                h += '<div style="overflow-x:auto;"><table class="table" style="margin:0;min-width:900px;"><thead><tr><th>Brand</th><th>Variant</th><th>Category</th><th>Buy Price</th><th>Sell Price</th><th>Stock</th><th>Unit</th><th>Sales Unit</th><th>Conv.</th><th>Status</th><th>Actions</th></tr></thead><tbody>';
                
                variants.forEach(function(p) {
                    var threshold = ProductService.getStockAlertThreshold ? ProductService.getStockAlertThreshold(p.id) : 10;
                    var status = p.stock === 0 ? '<span class="badge badge-danger">Out</span>' : p.stock <= threshold ? '<span class="badge badge-warning">Low</span>' : '<span class="badge badge-success">OK</span>';
                    
                    // Dual-unit display
                    var stockDisplay = typeof ProductService !== 'undefined' && ProductService.getStockDisplay 
                        ? ProductService.getStockDisplay(p) 
                        : (p.stock + ' ' + (p.unit || 'pcs'));
                    
                    var priceDisplay = typeof ProductService !== 'undefined' && ProductService.getPriceDisplay 
                        ? '<span title="' + ProductService.getPriceDisplay(p) + '">KES ' + (p.price || 0).toLocaleString() + '/' + (p.unit || 'pcs') + '</span>'
                        : 'KES ' + (p.price || 0).toLocaleString() + '/' + (p.unit || 'pcs');
                    
                    var salesUnitDisplay = p.salesUnit ? p.salesUnit : '-';
                    var conversionDisplay = p.conversionFactor ? p.conversionFactor : '-';
                    
                    // Highlight dual-unit products
                    var rowStyle = '';
                    if (p.salesUnit && p.conversionFactor > 0) {
                        rowStyle = 'background:rgba(196,154,43,0.03);';
                    }
                    
                    var searchData = (p.name || '').toLowerCase() + ' ' + (p.brand || '').toLowerCase() + ' ' + (p.variant || '').toLowerCase() + ' ' + (p.category || '').toLowerCase();
                    
                    h += '<tr class="product-row" data-search="' + searchData + '" style="' + rowStyle + '">';
                    h += '<td><strong>' + (p.brand || '-') + '</strong></td>';
                    h += '<td>' + (p.variant || '-') + '</td>';
                    h += '<td>' + (p.category || '-') + '</td>';
                    h += '<td>KES ' + (p.cost || 0).toLocaleString() + '</td>';
                    h += '<td style="color:var(--secondary);font-weight:600;">' + priceDisplay + '</td>';
                    h += '<td title="' + stockDisplay + '">' + (p.stock || 0) + '</td>';
                    h += '<td>' + (p.unit || 'pcs') + '</td>';
                    h += '<td>' + salesUnitDisplay + '</td>';
                    h += '<td>' + conversionDisplay + '</td>';
                    h += '<td>' + status + '</td>';
                    h += '<td><div style="display:flex;gap:0.25rem;">';
                    h += '<button class="btn btn-sm btn-primary" onclick="AdminProductsComponent.editProduct(' + p.id + ')" title="Edit"><i class="fas fa-edit"></i></button>';
                    h += '<button class="btn btn-sm btn-warning" onclick="AdminProductsComponent.restockProduct(' + p.id + ')" title="Restock"><i class="fas fa-plus"></i></button>';
                    h += '<button class="btn btn-sm btn-danger" onclick="AdminProductsComponent.deleteProduct(' + p.id + ')" title="Delete"><i class="fas fa-trash"></i></button>';
                    h += '</div></td></tr>';
                });
                
                h += '</tbody></table></div></div>';
            }
        }
        h += '</div></div>';
        return h;
    },

    filterProducts: function() {
        var q = (document.getElementById('productSearchFilter')?.value || '').toLowerCase().trim();
        var groups = document.querySelectorAll('.product-group-container');
        
        groups.forEach(function(group) {
            var groupName = (group.dataset.group || '').toLowerCase();
            var rows = group.querySelectorAll('.product-row');
            var anyVisible = false;
            
            rows.forEach(function(row) {
                var rowSearch = (row.dataset.search || '').toLowerCase();
                var match = !q || rowSearch.indexOf(q) > -1 || groupName.indexOf(q) > -1;
                row.style.display = match ? '' : 'none';
                if (match) anyVisible = true;
            });
            
            var header = group.querySelector('.group-header');
            var table = group.querySelector('table');
            
            if (!q || anyVisible) {
                group.style.display = '';
                if (header) header.style.display = '';
                if (table) table.style.display = '';
            } else {
                group.style.display = 'none';
            }
        });
        
        var allGroups = document.querySelectorAll('.product-group-container');
        var allHidden = true;
        allGroups.forEach(function(g) { if (g.style.display !== 'none') allHidden = false; });
        
        var existingMsg = document.getElementById('noSearchResults');
        if (existingMsg) existingMsg.remove();
        
        if (q && allHidden) {
            var cardBody = document.querySelector('.card-body');
            if (cardBody) {
                var msg = document.createElement('div');
                msg.id = 'noSearchResults';
                msg.style.cssText = 'text-align:center;padding:2rem;color:#999;';
                msg.innerHTML = '<i class="fas fa-search" style="font-size:3rem;display:block;margin-bottom:1rem;"></i><strong>No products found</strong><br><small>Try a different search term</small>';
                cardBody.appendChild(msg);
            }
        }
    },

    // ============================================
    // ADD PRODUCT FORM
    // ============================================

    showAddForm: function() {
        var m = document.createElement('div'); m.className = 'modal-overlay';
        m.innerHTML = '<div class="modal modal-lg"><div class="modal-header" style="background:linear-gradient(135deg,#1a472a,#c49a2b);color:white;"><h3 style="color:white;"><i class="fas fa-plus-circle"></i> Add New Product</h3><button class="btn btn-sm" style="color:white;" onclick="this.closest(\'.modal-overlay\').remove()">X</button></div>' +
            '<div class="modal-body">' +
            '<div class="form-group"><label>Product Name *</label><input type="text" id="prodName" class="form-control" placeholder="e.g., Cement" autofocus></div>' +
            '<div class="form-group"><label>Brand *</label><input type="text" id="prodBrand" class="form-control" placeholder="e.g., Bamburi"></div>' +
            '<div class="form-group"><label>Variant/Size</label><input type="text" id="prodVariant" class="form-control" placeholder="e.g., 50kg"></div>' +
            '<div class="form-group"><label>Category</label><input type="text" id="prodCategory" class="form-control" placeholder="e.g., Building Materials" list="categoryList"><datalist id="categoryList"></datalist></div>' +
            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">' +
            '<div class="form-group"><label>Buying Price/Cost (KES)</label><input type="number" id="prodCost" class="form-control" placeholder="0.00" step="0.01" min="0"></div>' +
            '<div class="form-group"><label>Selling Price (KES) *</label><input type="number" id="prodPrice" class="form-control" placeholder="0.00" step="0.01" min="0"></div>' +
            '</div>' +
            '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:1rem;">' +
            '<div class="form-group"><label>Initial Stock</label><input type="number" id="prodStock" class="form-control" value="0" min="0"></div>' +
            '<div class="form-group"><label>Min Stock Alert</label><input type="number" id="prodMinStock" class="form-control" value="10" min="0"></div>' +
            '<div class="form-group"><label>Base Unit *</label><select id="prodUnit" class="form-control">' +
            '<option value="pcs">Pieces (pcs)</option><option value="kg">Kilograms (kg)</option><option value="bag">Bag</option><option value="sheet">Sheet</option><option value="box">Box</option><option value="bucket">Bucket</option><option value="wheelbarrow">Wheelbarrow</option><option value="tonne">Tonne</option><option value="length">Length</option><option value="pair">Pair</option><option value="roll">Roll</option><option value="litre">Litre</option><option value="can">Can</option><option value="packet">Packet</option></select></div>' +
            '</div>' +
            '<hr style="margin:1rem 0;">' +
            '<div style="background:#fff8e1;padding:1rem;border-radius:0.75rem;border:1px solid #f59e0b;">' +
            '<p style="color:#f59e0b;font-weight:600;margin-bottom:0.5rem;"><i class="fas fa-sync-alt"></i> Alternative Sales Unit (Optional)</p>' +
            '<p style="font-size:0.85rem;color:#666;margin-bottom:0.75rem;">Set this if the product can be sold in a different unit (e.g., sand sold by wheelbarrow but also by tonne). Stock is always stored in the <strong>base unit</strong>. Price entered above is per <strong>base unit</strong>.</p>' +
            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">' +
            '<div class="form-group"><label>Sales Unit Name</label><input type="text" id="prodSalesUnit" class="form-control" placeholder="e.g., tonne, kg, box"></div>' +
            '<div class="form-group"><label>Conversion Factor</label><input type="number" id="prodConvFactor" class="form-control" placeholder="e.g., 24 (1 base = 24 sales)" min="1" step="1">' +
            '<small style="color:#666;">How many base units = 1 sales unit?</small></div>' +
            '</div>' +
            '<div id="conversionPreview" style="margin-top:0.75rem;padding:0.5rem;background:white;border-radius:0.5rem;font-size:0.85rem;color:#666;display:none;"></div>' +
            '</div>' +
            '</div>' +
            '<div class="modal-footer"><button class="btn btn-outline" onclick="this.closest(\'.modal-overlay\').remove()">Cancel</button><button class="btn btn-success" id="saveBtn"><i class="fas fa-save"></i> Add Product</button></div></div>';
        document.body.appendChild(m); m.onclick = function(e) { if (e.target === m) m.remove(); };
        
        // Populate category datalist
        var catList = m.querySelector('#categoryList');
        if (catList && typeof ProductService !== 'undefined') {
            ProductService.getCategories().then(function(cats) {
                cats.forEach(function(c) {
                    var opt = document.createElement('option');
                    opt.value = c;
                    catList.appendChild(opt);
                });
            });
        }
        
        // Live preview for conversion
        var salesUnitInput = m.querySelector('#prodSalesUnit');
        var convFactorInput = m.querySelector('#prodConvFactor');
        var unitSelect = m.querySelector('#prodUnit');
        var priceInput = m.querySelector('#prodPrice');
        var previewDiv = m.querySelector('#conversionPreview');
        
        function updatePreview() {
            var salesUnit = salesUnitInput.value.trim();
            var convFactor = parseInt(convFactorInput.value) || 0;
            var baseUnit = unitSelect.value;
            var price = parseFloat(priceInput.value) || 0;
            
            if (salesUnit && convFactor > 0) {
                previewDiv.style.display = 'block';
                var bulkPrice = price * convFactor;
                previewDiv.innerHTML = '<strong>Preview:</strong> 1 ' + salesUnit + ' = ' + convFactor + ' ' + baseUnit + ' | Price per ' + salesUnit + ': <strong>KES ' + bulkPrice.toLocaleString() + '</strong>';
            } else {
                previewDiv.style.display = 'none';
            }
        }
        
        salesUnitInput.addEventListener('input', updatePreview);
        convFactorInput.addEventListener('input', updatePreview);
        unitSelect.addEventListener('change', updatePreview);
        priceInput.addEventListener('input', updatePreview);
        
        m.querySelector('#saveBtn').onclick = async function() {
            var n = document.getElementById('prodName').value.trim();
            var b = document.getElementById('prodBrand').value.trim();
            var p = parseFloat(document.getElementById('prodPrice').value);
            
            if (!n || !b || !p) { 
                showStyledAlert('Required', 'Name, Brand, and Price required!', 'exclamation-triangle', '#f59e0b'); 
                return; 
            }
            
            var salesUnit = document.getElementById('prodSalesUnit').value.trim() || null;
            var convFactor = parseInt(document.getElementById('prodConvFactor').value) || 0;
            
            // If sales unit specified but no conversion factor, warn
            if (salesUnit && !convFactor) {
                showStyledAlert('Missing Info', 'Please enter a conversion factor for the sales unit.', 'exclamation-triangle', '#f59e0b');
                return;
            }
            
            await ApiService.post('/products', {
                name: n,
                brand: b,
                variant: document.getElementById('prodVariant').value.trim(),
                category: document.getElementById('prodCategory').value.trim(),
                price: p,
                cost: parseFloat(document.getElementById('prodCost').value) || 0,
                stock: parseInt(document.getElementById('prodStock').value) || 0,
                minStock: parseInt(document.getElementById('prodMinStock').value) || 10,
                unit: document.getElementById('prodUnit').value,
                salesUnit: salesUnit,
                conversionFactor: convFactor
            });
            
            await ProductService.refresh();
            m.remove();
            AppRouter.render();
        };
    },

    // ============================================
    // ADD VARIANT FORM
    // ============================================

    addVariant: function(productName, category) {
        var m = document.createElement('div'); m.className = 'modal-overlay';
        m.innerHTML = '<div class="modal modal-lg"><div class="modal-header" style="background:linear-gradient(135deg,#1a472a,#c49a2b);color:white;"><h3 style="color:white;"><i class="fas fa-plus-circle"></i> Add Variant: ' + productName + '</h3><button class="btn btn-sm" style="color:white;" onclick="this.closest(\'.modal-overlay\').remove()">X</button></div>' +
            '<div class="modal-body">' +
            '<div class="form-group"><label>Brand *</label><input type="text" id="varBrand" class="form-control" autofocus></div>' +
            '<div class="form-group"><label>Variant</label><input type="text" id="varVariant" class="form-control"></div>' +
            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">' +
            '<div class="form-group"><label>Buying Price/Cost (KES)</label><input type="number" id="varCost" class="form-control" step="0.01" value="0" min="0"></div>' +
            '<div class="form-group"><label>Selling Price (KES) *</label><input type="number" id="varPrice" class="form-control" step="0.01" min="0"></div>' +
            '</div>' +
            '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:1rem;">' +
            '<div class="form-group"><label>Initial Stock</label><input type="number" id="varStock" class="form-control" value="0" min="0"></div>' +
            '<div class="form-group"><label>Min Stock Alert</label><input type="number" id="varMinStock" class="form-control" value="10" min="0"></div>' +
            '<div class="form-group"><label>Base Unit *</label><select id="varUnit" class="form-control">' +
            '<option value="pcs">Pieces (pcs)</option><option value="kg">Kilograms (kg)</option><option value="bag">Bag</option><option value="sheet">Sheet</option><option value="box">Box</option><option value="bucket">Bucket</option><option value="wheelbarrow">Wheelbarrow</option><option value="tonne">Tonne</option><option value="length">Length</option><option value="pair">Pair</option><option value="roll">Roll</option><option value="litre">Litre</option><option value="can">Can</option><option value="packet">Packet</option></select></div>' +
            '</div>' +
            '<hr style="margin:1rem 0;">' +
            '<div style="background:#fff8e1;padding:1rem;border-radius:0.75rem;border:1px solid #f59e0b;">' +
            '<p style="color:#f59e0b;font-weight:600;margin-bottom:0.5rem;"><i class="fas fa-sync-alt"></i> Alternative Sales Unit (Optional)</p>' +
            '<p style="font-size:0.85rem;color:#666;margin-bottom:0.75rem;">Set this if this variant can be sold in a different unit.</p>' +
            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">' +
            '<div class="form-group"><label>Sales Unit Name</label><input type="text" id="varSalesUnit" class="form-control" placeholder="e.g., tonne, kg"></div>' +
            '<div class="form-group"><label>Conversion Factor</label><input type="number" id="varConvFactor" class="form-control" placeholder="e.g., 24" min="1" step="1">' +
            '<small style="color:#666;">How many base units = 1 sales unit?</small></div>' +
            '</div>' +
            '<div id="varConversionPreview" style="margin-top:0.75rem;padding:0.5rem;background:white;border-radius:0.5rem;font-size:0.85rem;color:#666;display:none;"></div>' +
            '</div>' +
            '</div>' +
            '<div class="modal-footer"><button class="btn btn-outline" onclick="this.closest(\'.modal-overlay\').remove()">Cancel</button><button class="btn btn-success" id="addBtn"><i class="fas fa-save"></i> Add Variant</button></div></div>';
        document.body.appendChild(m); m.onclick = function(e) { if (e.target === m) m.remove(); };
        
        // Live preview for conversion
        var salesUnitInput = m.querySelector('#varSalesUnit');
        var convFactorInput = m.querySelector('#varConvFactor');
        var unitSelect = m.querySelector('#varUnit');
        var priceInput = m.querySelector('#varPrice');
        var previewDiv = m.querySelector('#varConversionPreview');
        
        function updatePreview() {
            var salesUnit = salesUnitInput.value.trim();
            var convFactor = parseInt(convFactorInput.value) || 0;
            var baseUnit = unitSelect.value;
            var price = parseFloat(priceInput.value) || 0;
            
            if (salesUnit && convFactor > 0) {
                previewDiv.style.display = 'block';
                var bulkPrice = price * convFactor;
                previewDiv.innerHTML = '<strong>Preview:</strong> 1 ' + salesUnit + ' = ' + convFactor + ' ' + baseUnit + ' | Price per ' + salesUnit + ': <strong>KES ' + bulkPrice.toLocaleString() + '</strong>';
            } else {
                previewDiv.style.display = 'none';
            }
        }
        
        salesUnitInput.addEventListener('input', updatePreview);
        convFactorInput.addEventListener('input', updatePreview);
        unitSelect.addEventListener('change', updatePreview);
        priceInput.addEventListener('input', updatePreview);
        
        m.querySelector('#addBtn').onclick = async function() {
            var b = document.getElementById('varBrand').value.trim();
            var p = parseFloat(document.getElementById('varPrice').value);
            
            if (!b || !p) { 
                showStyledAlert('Required', 'Brand and Price required!', 'exclamation-triangle', '#f59e0b'); 
                return; 
            }
            
            var salesUnit = document.getElementById('varSalesUnit').value.trim() || null;
            var convFactor = parseInt(document.getElementById('varConvFactor').value) || 0;
            
            if (salesUnit && !convFactor) {
                showStyledAlert('Missing Info', 'Please enter a conversion factor for the sales unit.', 'exclamation-triangle', '#f59e0b');
                return;
            }
            
            await ApiService.post('/products', {
                name: productName,
                brand: b,
                variant: document.getElementById('varVariant').value.trim(),
                category: category,
                price: p,
                cost: parseFloat(document.getElementById('varCost').value) || 0,
                stock: parseInt(document.getElementById('varStock').value) || 0,
                minStock: parseInt(document.getElementById('varMinStock').value) || 10,
                unit: document.getElementById('varUnit').value,
                salesUnit: salesUnit,
                conversionFactor: convFactor
            });
            
            await ProductService.refresh();
            m.remove();
            AppRouter.render();
        };
    },

    // ============================================
    // EDIT PRODUCT FORM
    // ============================================

    editProduct: function(id) {
        var p = ProductService.getById(id); 
        if (!p) return;
        
        var m = document.createElement('div'); m.className = 'modal-overlay';
        m.innerHTML = '<div class="modal modal-lg"><div class="modal-header" style="background:linear-gradient(135deg,#1a472a,#c49a2b);color:white;"><h3 style="color:white;"><i class="fas fa-edit"></i> Edit: ' + (p.brand||'') + ' ' + p.name + '</h3><button class="btn btn-sm" style="color:white;" onclick="this.closest(\'.modal-overlay\').remove()">X</button></div>' +
            '<div class="modal-body">' +
            '<div class="form-group"><label>Brand</label><input type="text" id="editBrand" class="form-control" value="' + (p.brand||'') + '"></div>' +
            '<div class="form-group"><label>Variant</label><input type="text" id="editVariant" class="form-control" value="' + (p.variant||'') + '"></div>' +
            '<div class="form-group"><label>Category</label><input type="text" id="editCategory" class="form-control" value="' + (p.category||'') + '"></div>' +
            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">' +
            '<div class="form-group"><label>Buying Price/Cost (KES)</label><input type="number" id="editCost" class="form-control" value="' + (p.cost||0) + '" step="0.01" min="0"></div>' +
            '<div class="form-group"><label>Selling Price (KES)</label><input type="number" id="editPrice" class="form-control" value="' + p.price + '" step="0.01" min="0"></div>' +
            '</div>' +
            '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:1rem;">' +
            '<div class="form-group"><label>Stock (Base Units)</label><input type="number" id="editStock" class="form-control" value="' + p.stock + '" min="0">' +
            '<small style="color:#666;">' + (typeof ProductService !== 'undefined' ? ProductService.getStockDisplay(p) : (p.stock + ' ' + (p.unit || 'pcs'))) + '</small></div>' +
            '<div class="form-group"><label>Min Stock Alert</label><input type="number" id="editMinStock" class="form-control" value="' + (p.minStock || 10) + '" min="0"></div>' +
            '<div class="form-group"><label>Base Unit</label><select id="editUnit" class="form-control">' +
            '<option value="pcs"' + (p.unit === 'pcs' ? ' selected' : '') + '>Pieces (pcs)</option>' +
            '<option value="kg"' + (p.unit === 'kg' ? ' selected' : '') + '>Kilograms (kg)</option>' +
            '<option value="bag"' + (p.unit === 'bag' ? ' selected' : '') + '>Bag</option>' +
            '<option value="sheet"' + (p.unit === 'sheet' ? ' selected' : '') + '>Sheet</option>' +
            '<option value="box"' + (p.unit === 'box' ? ' selected' : '') + '>Box</option>' +
            '<option value="bucket"' + (p.unit === 'bucket' ? ' selected' : '') + '>Bucket</option>' +
            '<option value="wheelbarrow"' + (p.unit === 'wheelbarrow' ? ' selected' : '') + '>Wheelbarrow</option>' +
            '<option value="tonne"' + (p.unit === 'tonne' ? ' selected' : '') + '>Tonne</option>' +
            '<option value="length"' + (p.unit === 'length' ? ' selected' : '') + '>Length</option>' +
            '<option value="pair"' + (p.unit === 'pair' ? ' selected' : '') + '>Pair</option>' +
            '<option value="roll"' + (p.unit === 'roll' ? ' selected' : '') + '>Roll</option>' +
            '<option value="litre"' + (p.unit === 'litre' ? ' selected' : '') + '>Litre</option>' +
            '<option value="can"' + (p.unit === 'can' ? ' selected' : '') + '>Can</option>' +
            '<option value="packet"' + (p.unit === 'packet' ? ' selected' : '') + '>Packet</option>' +
            '</select></div>' +
            '</div>' +
            '<hr style="margin:1rem 0;">' +
            '<div style="background:#fff8e1;padding:1rem;border-radius:0.75rem;border:1px solid #f59e0b;">' +
            '<p style="color:#f59e0b;font-weight:600;margin-bottom:0.5rem;"><i class="fas fa-sync-alt"></i> Alternative Sales Unit (Optional)</p>' +
            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">' +
            '<div class="form-group"><label>Sales Unit Name</label><input type="text" id="editSalesUnit" class="form-control" value="' + (p.salesUnit || '') + '" placeholder="e.g., tonne, kg"></div>' +
            '<div class="form-group"><label>Conversion Factor</label><input type="number" id="editConvFactor" class="form-control" value="' + (p.conversionFactor || '') + '" placeholder="e.g., 24" min="0" step="1">' +
            '<small style="color:#666;">Set to 0 to disable alternative unit</small></div>' +
            '</div>' +
            '<div id="editConversionPreview" style="margin-top:0.75rem;padding:0.5rem;background:white;border-radius:0.5rem;font-size:0.85rem;color:#666;display:none;"></div>' +
            '</div>' +
            '</div>' +
            '<div class="modal-footer"><button class="btn btn-outline" onclick="this.closest(\'.modal-overlay\').remove()">Cancel</button><button class="btn btn-primary" id="updateBtn"><i class="fas fa-save"></i> Update</button></div></div>';
        document.body.appendChild(m); m.onclick = function(e) { if (e.target === m) m.remove(); };
        
        // Live preview
        var salesUnitInput = m.querySelector('#editSalesUnit');
        var convFactorInput = m.querySelector('#editConvFactor');
        var unitSelect = m.querySelector('#editUnit');
        var priceInput = m.querySelector('#editPrice');
        var previewDiv = m.querySelector('#editConversionPreview');
        
        function updatePreview() {
            var salesUnit = salesUnitInput.value.trim();
            var convFactor = parseInt(convFactorInput.value) || 0;
            var baseUnit = unitSelect.value;
            var price = parseFloat(priceInput.value) || 0;
            
            if (salesUnit && convFactor > 0) {
                previewDiv.style.display = 'block';
                var bulkPrice = price * convFactor;
                previewDiv.innerHTML = '<strong>Preview:</strong> 1 ' + salesUnit + ' = ' + convFactor + ' ' + baseUnit + ' | Price per ' + salesUnit + ': <strong>KES ' + bulkPrice.toLocaleString() + '</strong>';
            } else {
                previewDiv.style.display = 'none';
            }
        }
        
        // Initial preview
        updatePreview();
        
        salesUnitInput.addEventListener('input', updatePreview);
        convFactorInput.addEventListener('input', updatePreview);
        unitSelect.addEventListener('change', updatePreview);
        priceInput.addEventListener('input', updatePreview);
        
        m.querySelector('#updateBtn').onclick = async function() {
            var salesUnit = document.getElementById('editSalesUnit').value.trim() || null;
            var convFactor = parseInt(document.getElementById('editConvFactor').value) || 0;
            
            await ApiService.put('/products/' + id, {
                name: p.name,
                brand: document.getElementById('editBrand').value.trim(),
                variant: document.getElementById('editVariant').value.trim(),
                category: document.getElementById('editCategory').value.trim(),
                price: parseFloat(document.getElementById('editPrice').value),
                cost: parseFloat(document.getElementById('editCost').value) || 0,
                stock: parseInt(document.getElementById('editStock').value),
                minStock: parseInt(document.getElementById('editMinStock').value) || 10,
                unit: document.getElementById('editUnit').value,
                salesUnit: salesUnit,
                conversionFactor: convFactor
            });
            
            await ProductService.refresh();
            m.remove();
            AppRouter.render();
        };
    },

    // ============================================
    // RESTOCK PRODUCT (with dual-unit awareness)
    // ============================================

    restockProduct: function(id) {
        var p = ProductService.getById(id);
        if (!p) return;
        
        var stockDisplay = typeof ProductService !== 'undefined' && ProductService.getStockDisplay 
            ? ProductService.getStockDisplay(p) 
            : (p.stock + ' ' + (p.unit || 'pcs'));
        
        var m = document.createElement('div'); m.className = 'modal-overlay';
        m.innerHTML = '<div class="modal"><div class="modal-header" style="background:linear-gradient(135deg,#f59e0b,#d97706);color:white;"><h3 style="color:white;"><i class="fas fa-plus-circle"></i> Restock: ' + (p.brand||'') + ' ' + p.name + '</h3><button class="btn btn-sm" style="color:white;" onclick="this.closest(\'.modal-overlay\').remove()">X</button></div>' +
            '<div class="modal-body">' +
            '<div style="text-align:center;margin-bottom:1rem;">' +
            '<p><strong>Current Stock:</strong> ' + stockDisplay + '</p>' +
            '<p style="color:#666;">Base Unit: <strong>' + (p.unit || 'pcs') + '</strong></p>' +
            '</div>' +
            '<div class="form-group"><label>Quantity to Add (in base units: ' + (p.unit || 'pcs') + ')</label>' +
            '<input type="number" id="restockQty" class="form-control" value="1" min="1" style="font-size:1.2rem;text-align:center;" autofocus></div>';
        
        if (p.salesUnit && p.conversionFactor > 0) {
            m.innerHTML += '<div style="background:#f0fdf4;padding:0.75rem;border-radius:0.5rem;margin-top:0.5rem;font-size:0.85rem;color:#666;">' +
                '<strong>Quick Reference:</strong> ' + p.conversionFactor + ' ' + (p.unit || 'pcs') + ' = 1 ' + p.salesUnit + '<br>' +
                'Enter <strong>' + p.conversionFactor + '</strong> to add 1 ' + p.salesUnit + ', or <strong>' + (p.conversionFactor * 5) + '</strong> to add 5 ' + p.salesUnit + 's' +
                '</div>';
        }
        
        m.innerHTML += '</div>' +
            '<div class="modal-footer"><button class="btn btn-outline" onclick="this.closest(\'.modal-overlay\').remove()">Cancel</button><button class="btn btn-warning" id="restockBtn"><i class="fas fa-plus"></i> Add Stock</button></div></div>';
        document.body.appendChild(m); m.onclick = function(e) { if (e.target === m) m.remove(); };
        
        m.querySelector('#restockBtn').onclick = async function() {
            var qty = parseInt(document.getElementById('restockQty').value);
            if (!qty || qty <= 0) {
                showStyledAlert('Invalid', 'Enter a valid quantity!', 'exclamation-triangle', '#f59e0b');
                return;
            }
            
            await ApiService.put('/products/' + id + '/stock', { quantity: qty });
            await ProductService.refresh();
            m.remove();
            AppRouter.render();
        };
        
        // Allow Enter key to submit
        m.querySelector('#restockQty').addEventListener('keydown', function(e) {
            if (e.key === 'Enter') m.querySelector('#restockBtn').click();
        });
    },

    // ============================================
    // DELETE PRODUCT
    // ============================================

    deleteProduct: function(id) {
        var p = ProductService.getById(id);
        var name = p ? (p.brand ? p.brand + ' ' : '') + p.name : 'this product';
        
        showConfirm('Delete Product', 'Are you sure you want to delete <strong>' + name + '</strong>? This will deactivate the product.', async function() {
            await ApiService.delete('/products/' + id);
            await ProductService.refresh();
            AppRouter.render();
        }, 'Delete', 'danger');
    }
};

// Make globally available
window.AdminProductsComponent = AdminProductsComponent;
