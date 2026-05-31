/**
 * Talaen Hardware System - Public Products Component
 * Product browsing view for non-admin users
 */

const PublicProductsComponent = {
    render() {
        const products = ProductService.getAll();
        const categories = ProductService.getCategories();
        
        return `
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">
                        <i class="fas fa-boxes"></i> Products Catalog
                    </h3>
                    <div style="display: flex; gap: 0.5rem;">
                        <input type="text" id="productSearch" class="form-control" 
                               placeholder="Search products..." style="width: 250px;">
                        <select id="categoryFilter" class="form-control" style="width: 180px;">
                            <option value="">All Categories</option>
                            ${categories.map(cat => `<option value="${cat}">${cat}</option>`).join('')}
                        </select>
                    </div>
                </div>
                <div class="card-body">
                    <div class="table-container">
                        <table class="table" id="productsTable">
                            <thead>
                                <tr>
                                    <th>Product Name</th>
                                    <th>Category</th>
                                    <th>Price</th>
                                    <th>Stock</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${products.length > 0 ? products.map(p => {
                                    const threshold = ProductService.getStockAlertThreshold(p.id);
                                    let statusBadge;
                                    if (p.stock === 0) {
                                        statusBadge = '<span class="badge badge-danger">Out of Stock</span>';
                                    } else if (p.stock <= threshold) {
                                        statusBadge = '<span class="badge badge-warning">Low Stock</span>';
                                    } else {
                                        statusBadge = '<span class="badge badge-success">In Stock</span>';
                                    }
                                    
                                    return `
                                        <tr data-category="${p.category}" data-name="${p.name.toLowerCase()}">
                                            <td><strong>${p.name}</strong></td>
                                            <td>${p.category || '-'}</td>
                                            <td>${Helpers.formatCurrency(p.price)}</td>
                                            <td>${p.stock} ${p.unit}</td>
                                            <td>${statusBadge}</td>
                                        </tr>
                                    `;
                                }).join('') : `
                                    <tr>
                                        <td colspan="5" style="text-align: center; padding: 2rem;">
                                            <i class="fas fa-box-open" style="font-size: 3rem; color: var(--gray-400);"></i>
                                            <p style="margin-top: 1rem; color: var(--gray-500);">No products available</p>
                                        </td>
                                    </tr>
                                `}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    }
};

// Initialize search and filter after render
document.addEventListener('DOMContentLoaded', () => {
    document.addEventListener('input', (e) => {
        if (e.target.id === 'productSearch') {
            const search = e.target.value.toLowerCase();
            const category = document.getElementById('categoryFilter')?.value || '';
            
            document.querySelectorAll('#productsTable tbody tr').forEach(row => {
                const name = row.dataset.name || '';
                const rowCategory = row.dataset.category || '';
                const matchesSearch = name.includes(search);
                const matchesCategory = !category || rowCategory === category;
                
                row.style.display = matchesSearch && matchesCategory ? '' : 'none';
            });
        }
    });
    
    document.addEventListener('change', (e) => {
        if (e.target.id === 'categoryFilter') {
            const category = e.target.value;
            const search = document.getElementById('productSearch')?.value.toLowerCase() || '';
            
            document.querySelectorAll('#productsTable tbody tr').forEach(row => {
                const name = row.dataset.name || '';
                const rowCategory = row.dataset.category || '';
                const matchesSearch = name.includes(search);
                const matchesCategory = !category || rowCategory === category;
                
                row.style.display = matchesSearch && matchesCategory ? '' : 'none';
            });
        }
    });
});