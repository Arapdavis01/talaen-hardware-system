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
                h += '<table class="table" style="margin:0;"><thead><tr><th>Brand</th><th>Variant</th><th>Category</th><th>Buy Price</th><th>Sell Price</th><th>Stock</th><th>Unit</th><th>Sales Unit</th><th>Conv.</th><th>Status</th><th>Actions</th></tr></thead><tbody>';
                
                variants.forEach(function(p) {
                    var threshold = ProductService.getStockAlertThreshold ? ProductService.getStockAlertThreshold(p.id) : 10;
                    var status = p.stock === 0 ? '<span class="badge badge-danger">Out</span>' : p.stock <= threshold ? '<span class="badge badge-warning">Low</span>' : '<span class="badge badge-success">OK</span>';
                    // Show sales unit and conversion factor if set
                    var salesUnitDisplay = p.salesUnit ? p.salesUnit : '-';
                    var conversionDisplay = p.conversionFactor ? p.conversionFactor : '-';
                    // Add data-search with ALL searchable fields + group name
                    var searchData = (p.name || '').toLowerCase() + ' ' + (p.brand || '').toLowerCase() + ' ' + (p.variant || '').toLowerCase() + ' ' + (p.category || '').toLowerCase();
                    h += '<tr class="product-row" data-search="' + searchData + '">';
                    h += '<td><strong>' + (p.brand || '-') + '</strong></td><td>' + (p.variant || '-') + '</td><td>' + (p.category || '-') + '</td>';
                    h += '<td>KES ' + (p.cost || 0).toLocaleString() + '</td>';
                    h += '<td style="color:var(--secondary);font-weight:600;">KES ' + (p.price || 0).toLocaleString() + '</td>';
                    h += '<td>' + (p.stock || 0) + '</td>';
                    h += '<td>' + (p.unit || 'pcs') + '</td>';
                    h += '<td>' + salesUnitDisplay + '</td>';
                    h += '<td>' + conversionDisplay + '</td>';
                    h += '<td>' + status + '</td>';
                    h += '<td><div style="display:flex;gap:0.25rem;">';
                    h += '<button class="btn btn-sm btn-primary" onclick="AdminProductsComponent.editProduct(' + p.id + ')"><i class="fas fa-edit"></i></button>';
                    h += '<button class="btn btn-sm btn-warning" onclick="AdminProductsComponent.restockProduct(' + p.id + ')"><i class="fas fa-plus"></i></button>';
                    h += '<button class="btn btn-sm btn-danger" onclick="AdminProductsComponent.deleteProduct(' + p.id + ')"><i class="fas fa-trash"></i></button>';
                    h += '</div></td></tr>';
                });
                
                h += '</tbody></table></div>';
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

    showAddForm: function() {
        var m = document.createElement('div'); m.className = 'modal-overlay';
        m.innerHTML = '<div class="modal"><div class="modal-header" style="background:linear-gradient(135deg,#1a472a,#c49a2b);color:white;"><h3 style="color:white;"><i class="fas fa-plus-circle"></i> Add New Product</h3><button class="btn btn-sm" style="color:white;" onclick="this.closest(\'.modal-overlay\').remove()">X</button></div>' +
            '<div class="modal-body"><div class="form-group"><label>Product Name *</label><input type="text" id="prodName" class="form-control" placeholder="e.g., Cement" autofocus></div>' +
            '<div class="form-group"><label>Brand *</label><input type="text" id="prodBrand" class="form-control" placeholder="e.g., Bamburi"></div>' +
            '<div class="form-group"><label>Variant/Size</label><input type="text" id="prodVariant" class="form-control" placeholder="e.g., 50kg"></div>' +
            '<div class="form-group"><label>Category</label><input type="text" id="prodCategory" class="form-control" placeholder="e.g., Building Materials"></div>' +
            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;"><div class="form-group"><label>Buying Price/Cost (KES)</label><input type="number" id="prodCost" class="form-control" placeholder="0.00"></div><div class="form-group"><label>Selling Price (KES) *</label><input type="number" id="prodPrice" class="form-control" placeholder="0.00"></div></div>' +
            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;"><div class="form-group"><label>Stock</label><input type="number" id="prodStock" class="form-control" value="0"></div><div class="form-group"><label>Main Unit</label><select id="prodUnit" class="form-control"><option value="pcs">Pieces</option><option value="kg">Kg</option><option value="bag">Bag</option><option value="sheet">Sheet</option><option value="box">Box</option><option value="bucket">Bucket</option><option value="tonne">Tonne</option><option value="length">Length</option><option value="pair">Pair</option><option value="roll">Roll</option><option value="litre">Litre</option></select></div></div>' +
            '<hr><p style="color:#f59e0b;font-weight:600;"><i class="fas fa-sync-alt"></i> Alternative Sales Unit (optional)</p>' +
            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">' +
            '<div class="form-group"><label>Sales Unit</label><input type="text" id="prodSalesUnit" class="form-control" placeholder="e.g., wheelbarrow, kg"></div>' +
            '<div class="form-group"><label>Conversion Factor</label><input type="number" id="prodConvFactor" class="form-control" placeholder="e.g., 20 (1 main = 20 sales)" step="0.01" min="1"></div>' +
            '</div>' +
            '<small style="color:#999;">If set, 1 main unit = this many sales units. Price per sales unit = price / factor.</small>' +
            '</div>' +
            '<div class="modal-footer"><button class="btn btn-outline" onclick="this.closest(\'.modal-overlay\').remove()">Cancel</button><button class="btn btn-success" id="saveBtn"><i class="fas fa-save"></i> Add Product</button></div></div>';
        document.body.appendChild(m); m.onclick = function(e) { if (e.target === m) m.remove(); };
        m.querySelector('#saveBtn').onclick = async function() {
            var n = document.getElementById('prodName').value.trim(), b = document.getElementById('prodBrand').value.trim(), p = parseFloat(document.getElementById('prodPrice').value);
            if (!n || !b || !p) { showStyledAlert('Required', 'Name, Brand, and Price required!', 'exclamation-triangle', '#f59e0b'); return; }
            var salesUnit = document.getElementById('prodSalesUnit').value.trim();
            var convFactor = parseFloat(document.getElementById('prodConvFactor').value) || 1;
            await fetch('/api/products', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: n,
                    brand: b,
                    variant: document.getElementById('prodVariant').value.trim(),
                    category: document.getElementById('prodCategory').value.trim(),
                    price: p,
                    cost: parseFloat(document.getElementById('prodCost').value) || 0,
                    stock: parseInt(document.getElementById('prodStock').value) || 0,
                    unit: document.getElementById('prodUnit').value,
                    salesUnit: salesUnit,
                    conversionFactor: convFactor
                })
            });
            await ProductService._fetchFromAPI(); m.remove(); AppRouter.render();
        };
    },

    addVariant: function(productName, category) {
        var m = document.createElement('div'); m.className = 'modal-overlay';
        m.innerHTML = '<div class="modal"><div class="modal-header" style="background:linear-gradient(135deg,#1a472a,#c49a2b);color:white;"><h3 style="color:white;"><i class="fas fa-plus-circle"></i> Add Variant: ' + productName + '</h3><button class="btn btn-sm" style="color:white;" onclick="this.closest(\'.modal-overlay\').remove()">X</button></div>' +
            '<div class="modal-body"><div class="form-group"><label>Brand *</label><input type="text" id="varBrand" class="form-control"></div><div class="form-group"><label>Variant</label><input type="text" id="varVariant" class="form-control"></div>' +
            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;"><div class="form-group"><label>Buying Price/Cost (KES)</label><input type="number" id="varCost" class="form-control" step="0.01" value="0"></div><div class="form-group"><label>Selling Price (KES) *</label><input type="number" id="varPrice" class="form-control" step="0.01"></div></div>' +
            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;"><div class="form-group"><label>Stock</label><input type="number" id="varStock" class="form-control" value="0"></div><div class="form-group"><label>Main Unit</label><select id="varUnit" class="form-control"><option value="pcs">Pieces</option><option value="kg">Kg</option><option value="bag">Bag</option><option value="sheet">Sheet</option><option value="box">Box</option><option value="bucket">Bucket</option><option value="tonne">Tonne</option><option value="length">Length</option><option value="pair">Pair</option><option value="roll">Roll</option><option value="litre">Litre</option></select></div></div>' +
            '<hr><p style="color:#f59e0b;font-weight:600;"><i class="fas fa-sync-alt"></i> Alternative Sales Unit (optional)</p>' +
            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">' +
            '<div class="form-group"><label>Sales Unit</label><input type="text" id="varSalesUnit" class="form-control" placeholder="e.g., wheelbarrow"></div>' +
            '<div class="form-group"><label>Conversion Factor</label><input type="number" id="varConvFactor" class="form-control" placeholder="e.g., 20" step="0.01" min="1"></div>' +
            '</div>' +
            '<small style="color:#999;">If set, 1 main unit = this many sales units.</small>' +
            '</div>' +
            '<div class="modal-footer"><button class="btn btn-outline" onclick="this.closest(\'.modal-overlay\').remove()">Cancel</button><button class="btn btn-success" id="addBtn"><i class="fas fa-save"></i> Add Variant</button></div></div>';
        document.body.appendChild(m); m.onclick = function(e) { if (e.target === m) m.remove(); };
        m.querySelector('#addBtn').onclick = async function() {
            var b = document.getElementById('varBrand').value.trim(), p = parseFloat(document.getElementById('varPrice').value);
            if (!b || !p) { showStyledAlert('Required', 'Brand and Price required!', 'exclamation-triangle', '#f59e0b'); return; }
            var salesUnit = document.getElementById('varSalesUnit').value.trim();
            var convFactor = parseFloat(document.getElementById('varConvFactor').value) || 1;
            await fetch('/api/products', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: productName,
                    brand: b,
                    variant: document.getElementById('varVariant').value.trim(),
                    category: category,
                    price: p,
                    cost: parseFloat(document.getElementById('varCost').value) || 0,
                    stock: parseInt(document.getElementById('varStock').value) || 0,
                    unit: document.getElementById('varUnit').value,
                    salesUnit: salesUnit,
                    conversionFactor: convFactor
                })
            });
            await ProductService._fetchFromAPI(); m.remove(); AppRouter.render();
        };
    },

    editProduct: function(id) {
        var p = ProductService.getById(id); if (!p) return;
        var m = document.createElement('div'); m.className = 'modal-overlay';
        m.innerHTML = '<div class="modal"><div class="modal-header" style="background:linear-gradient(135deg,#1a472a,#c49a2b);color:white;"><h3 style="color:white;"><i class="fas fa-edit"></i> Edit: ' + (p.brand||'') + ' ' + p.name + '</h3><button class="btn btn-sm" style="color:white;" onclick="this.closest(\'.modal-overlay\').remove()">X</button></div>' +
            '<div class="modal-body"><div class="form-group"><label>Brand</label><input type="text" id="editBrand" class="form-control" value="' + (p.brand||'') + '"></div><div class="form-group"><label>Variant</label><input type="text" id="editVariant" class="form-control" value="' + (p.variant||'') + '"></div>' +
            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;"><div class="form-group"><label>Buying Price/Cost (KES)</label><input type="number" id="editCost" class="form-control" value="' + (p.cost||0) + '" step="0.01"></div><div class="form-group"><label>Selling Price (KES)</label><input type="number" id="editPrice" class="form-control" value="' + p.price + '" step="0.01"></div></div>' +
            '<div class="form-group"><label>Stock</label><input type="number" id="editStock" class="form-control" value="' + p.stock + '"></div>' +
            // Edit: add sales unit and conversion factor fields
            '<hr><p style="color:#f59e0b;font-weight:600;"><i class="fas fa-sync-alt"></i> Alternative Sales Unit (optional)</p>' +
            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">' +
            '<div class="form-group"><label>Sales Unit</label><input type="text" id="editSalesUnit" class="form-control" value="' + (p.salesUnit || '') + '" placeholder="e.g., wheelbarrow"></div>' +
            '<div class="form-group"><label>Conversion Factor</label><input type="number" id="editConvFactor" class="form-control" value="' + (p.conversionFactor || '') + '" placeholder="e.g., 20" step="0.01" min="1"></div>' +
            '</div>' +
            '</div>' +
            '<div class="modal-footer"><button class="btn btn-outline" onclick="this.closest(\'.modal-overlay\').remove()">Cancel</button><button class="btn btn-primary" id="updateBtn"><i class="fas fa-save"></i> Update</button></div></div>';
        document.body.appendChild(m); m.onclick = function(e) { if (e.target === m) m.remove(); };
        m.querySelector('#updateBtn').onclick = async function() {
            var salesUnit = document.getElementById('editSalesUnit').value.trim();
            var convFactor = parseFloat(document.getElementById('editConvFactor').value) || 1;
            await fetch('/api/products/' + id, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: p.name,
                    brand: document.getElementById('editBrand').value.trim(),
                    variant: document.getElementById('editVariant').value.trim(),
                    price: parseFloat(document.getElementById('editPrice').value),
                    cost: parseFloat(document.getElementById('editCost').value) || 0,
                    stock: parseInt(document.getElementById('editStock').value),
                    unit: p.unit,   // main unit unchanged from original
                    salesUnit: salesUnit,
                    conversionFactor: convFactor
                })
            });
            await ProductService._fetchFromAPI(); m.remove(); AppRouter.render();
        };
    },

    restockProduct: function(id) {
        var q = prompt('Quantity to add:'); if (!q || parseInt(q) <= 0) return;
        fetch('/api/products/' + id + '/stock', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ quantity: parseInt(q) }) }).then(async function() { await ProductService._fetchFromAPI(); AppRouter.render(); });
    },

    deleteProduct: function(id) {
        showConfirm('Delete Product', 'Are you sure you want to delete this product?', function() {
            fetch('/api/products/' + id, { method: 'DELETE' }).then(async function() { await ProductService._fetchFromAPI(); AppRouter.render(); });
        }, 'Delete', 'danger');
    }
};
