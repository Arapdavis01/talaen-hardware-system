/**
 * Talaen Hardware System - Public Products Component
 * Product browsing view for non-admin users
 */

const PublicProductsComponent = {
    render() {
        const products = ProductService.getAll();
        const categories = ProductService.getCategories();
        
        var html = '';
        html += '<div class="card">';
        html += '<div class="card-header">';
        html += '<h3 class="card-title">';
        html += '<i class="fas fa-boxes"></i> Products Catalog';
        html += '</h3>';
        html += '<div style="display: flex; gap: 0.5rem;">';
        html += '<input type="text" id="productSearch" class="form-control" placeholder="Search products..." style="width: 250px;">';
        html += '<select id="categoryFilter" class="form-control" style="width: 180px;">';
        html += '<option value="">All Categories</option>';
        categories.forEach(function(cat) {
            html += '<option value="' + cat + '">' + cat + '</option>';
        });
        html += '</select>';
        html += '</div></div>';
        html += '<div class="card-body">';
        html += '<div class="table-container">';
        html += '<table class="table" id="productsTable">';
        html += '<thead><tr><th>Product Name</th><th>Category</th><th>Price</th><th>Stock</th><th>Status</th></tr></thead>';
        html += '<tbody>';
        
        if (products.length > 0) {
            for (var i = 0; i < products.length; i++) {
                var p = products[i];
                var threshold = ProductService.getStockAlertThreshold(p.id);
                var statusBadge;
                if (p.stock === 0) {
                    statusBadge = '<span class="badge badge-danger">Out of Stock</span>';
                } else if (p.stock <= threshold) {
                    statusBadge = '<span class="badge badge-warning">Low Stock</span>';
                } else {
                    statusBadge = '<span class="badge badge-success">In Stock</span>';
                }
                
                html += '<tr data-category="' + (p.category || '') + '" data-name="' + (p.name || '').toLowerCase() + '">';
                html += '<td><strong>' + (p.name || '') + '</strong></td>';
                html += '<td>' + (p.category || '-') + '</td>';
                html += '<td>KES ' + Number(p.price || 0).toLocaleString() + '</td>';
                html += '<td>' + (p.stock || 0) + ' ' + (p.unit || 'pcs') + '</td>';
                html += '<td>' + statusBadge + '</td>';
                html += '</tr>';
            }
        } else {
            html += '<tr><td colspan="5" style="text-align: center; padding: 2rem;">';
            html += '<i class="fas fa-box-open" style="font-size: 3rem; color: var(--gray-400);"></i>';
            html += '<p style="margin-top: 1rem; color: var(--gray-500);">No products available</p>';
            html += '</td></tr>';
        }
        
        html += '</tbody></table></div></div></div>';
        return html;
    }
};

// Initialize search and filter after render
document.addEventListener('DOMContentLoaded', function() {
    document.addEventListener('input', function(e) {
        if (e.target.id === 'productSearch') {
            var search = e.target.value.toLowerCase();
            var category = document.getElementById('categoryFilter')?.value || '';
            
            var rows = document.querySelectorAll('#productsTable tbody tr');
            for (var i = 0; i < rows.length; i++) {
                var row = rows[i];
                var name = row.dataset.name || '';
                var rowCategory = row.dataset.category || '';
                var matchesSearch = name.indexOf(search) > -1;
                var matchesCategory = !category || rowCategory === category;
                row.style.display = matchesSearch && matchesCategory ? '' : 'none';
            }
        }
    });
    
    document.addEventListener('change', function(e) {
        if (e.target.id === 'categoryFilter') {
            var category = e.target.value;
            var search = document.getElementById('productSearch')?.value.toLowerCase() || '';
            
            var rows = document.querySelectorAll('#productsTable tbody tr');
            for (var i = 0; i < rows.length; i++) {
                var row = rows[i];
                var name = row.dataset.name || '';
                var rowCategory = row.dataset.category || '';
                var matchesSearch = name.indexOf(search) > -1;
                var matchesCategory = !category || rowCategory === category;
                row.style.display = matchesSearch && matchesCategory ? '' : 'none';
            }
        }
    });
});

// Make globally available
window.PublicProductsComponent = PublicProductsComponent;
