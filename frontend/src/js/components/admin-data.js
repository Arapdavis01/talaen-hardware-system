/**
 * Talaen Hardware System - Admin Data Component
 * Data management, backup, and import/export
 * Updated with JWT Authentication
 */

const AdminDataComponent = {
    render() {
        // ✅ Get user info from JWT
        const userJson = localStorage.getItem('user');
        let user = null;
        try {
            user = userJson ? JSON.parse(userJson) : null;
        } catch (e) {
            user = null;
        }
        
        // ✅ Get data with JWT token
        const products = ProductService._cache || [];
        const sales = SaleService._cache || [];
        const customers = this._getCustomerCount();
        
        return `
            <!-- Data Management -->
            <div class="card" style="margin-bottom: 1.5rem;">
                <div class="card-header">
                    <h3 class="card-title">
                        <i class="fas fa-database"></i> Data Management
                    </h3>
                </div>
                <div class="card-body">
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1.5rem;">
                        <!-- Export -->
                        <div style="text-align: center; padding: 1.5rem; border: 2px dashed var(--gray-300); border-radius: var(--radius-lg);">
                            <i class="fas fa-download" style="font-size: 3rem; color: var(--primary); margin-bottom: 1rem;"></i>
                            <h4 style="color: var(--primary);">Export Data</h4>
                            <p style="color: var(--gray-500); margin: 0.5rem 0;">Download all your store data as a backup file</p>
                            <button class="btn btn-primary" onclick="AdminDataComponent.exportData()">
                                <i class="fas fa-download"></i> Export Backup
                            </button>
                        </div>
                        
                        <!-- Import -->
                        <div style="text-align: center; padding: 1.5rem; border: 2px dashed var(--gray-300); border-radius: var(--radius-lg);">
                            <i class="fas fa-upload" style="font-size: 3rem; color: var(--secondary); margin-bottom: 1rem;"></i>
                            <h4 style="color: var(--secondary);">Import Data</h4>
                            <p style="color: var(--gray-500); margin: 0.5rem 0;">Restore your store data from a backup file</p>
                            <button class="btn btn-secondary" onclick="AdminDataComponent.importData()">
                                <i class="fas fa-upload"></i> Import Backup
                            </button>
                        </div>
                        
                        <!-- Clear Data -->
                        <div style="text-align: center; padding: 1.5rem; border: 2px dashed var(--gray-300); border-radius: var(--radius-lg);">
                            <i class="fas fa-trash-alt" style="font-size: 3rem; color: var(--danger); margin-bottom: 1rem;"></i>
                            <h4 style="color: var(--danger);">Clear All Data</h4>
                            <p style="color: var(--gray-500); margin: 0.5rem 0;">Remove all store data. This cannot be undone!</p>
                            <button class="btn btn-danger" onclick="AdminDataComponent.clearData()">
                                <i class="fas fa-exclamation-triangle"></i> Clear Data
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Export Options -->
            <div class="card" style="margin-bottom: 1.5rem;">
                <div class="card-header">
                    <h3 class="card-title">
                        <i class="fas fa-file-export"></i> Export Reports
                    </h3>
                </div>
                <div class="card-body">
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
                        <button class="btn btn-outline" onclick="AdminDataComponent.exportProductsCSV()">
                            <i class="fas fa-boxes"></i> Products CSV
                        </button>
                        <button class="btn btn-outline" onclick="AdminDataComponent.exportSalesCSV()">
                            <i class="fas fa-receipt"></i> Sales CSV
                        </button>
                        <button class="btn btn-outline" onclick="AdminDataComponent.exportInventoryReport()">
                            <i class="fas fa-clipboard-list"></i> Inventory Report
                        </button>
                        <button class="btn btn-outline" onclick="AdminDataComponent.printBarcodes()">
                            <i class="fas fa-barcode"></i> Print Barcodes
                        </button>
                    </div>
                </div>
            </div>
            
            <!-- Storage Info -->
            <div class="card" style="margin-bottom: 1.5rem;">
                <div class="card-header">
                    <h3 class="card-title">
                        <i class="fas fa-hdd"></i> Storage Information
                    </h3>
                </div>
                <div class="card-body">
                    <div class="stats-grid">
                        <div class="stat-card" style="background: linear-gradient(135deg, rgba(26, 71, 42, 0.8), rgba(26, 71, 42, 0.6));">
                            <div class="stat-label">Products</div>
                            <div class="stat-value">${products.length}</div>
                            <div class="stat-sub">Total products</div>
                        </div>
                        <div class="stat-card" style="background: linear-gradient(135deg, rgba(196, 154, 43, 0.8), rgba(196, 154, 43, 0.6));">
                            <div class="stat-label">Sales</div>
                            <div class="stat-value">${sales.length}</div>
                            <div class="stat-sub">Total transactions</div>
                        </div>
                        <div class="stat-card" style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.8), rgba(16, 185, 129, 0.6));">
                            <div class="stat-label">Customers</div>
                            <div class="stat-value">${customers}</div>
                            <div class="stat-sub">Registered customers</div>
                        </div>
                        <div class="stat-card" style="background: linear-gradient(135deg, rgba(59, 130, 246, 0.8), rgba(59, 130, 246, 0.6));">
                            <div class="stat-label">Admin</div>
                            <div class="stat-value">${user ? user.fullName || user.username : 'N/A'}</div>
                            <div class="stat-sub">Logged in as</div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Activity Logs -->
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">
                        <i class="fas fa-history"></i> Recent Activity
                    </h3>
                    <button class="btn btn-sm btn-danger" onclick="AdminDataComponent.clearActivityLogs()" style="float: right;">
                        <i class="fas fa-trash"></i> Clear Logs
                    </button>
                </div>
                <div class="card-body">
                    <div class="table-container" id="activityLogsContainer">
                        <div style="text-align:center;padding:2rem;">
                            <i class="fas fa-spinner fa-spin"></i> Loading activity logs...
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    // ✅ Get customer count from API with JWT
    async _getCustomerCount() {
        try {
            const customers = await ApiService.get('/credit-customers');
            return customers ? customers.length : 0;
        } catch (e) {
            return 0;
        }
    },

    // ============================================
    // ACTIVITY LOGS - Using JWT
    // ============================================
    
    async loadActivityLogs() {
        const container = document.getElementById('activityLogsContainer');
        if (!container) return;
        
        try {
            // ✅ REPLACED: fetch with ApiService
            const logs = await ApiService.get('/activity');
            
            if (!logs || logs.length === 0) {
                container.innerHTML = `
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Time</th>
                                <th>User</th>
                                <th>Action</th>
                                <th>Details</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td colspan="4" style="text-align: center; padding: 2rem;">
                                    <p style="color: var(--gray-500);">No activity recorded yet</p>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                `;
                return;
            }
            
            let html = `<table class="table">
                <thead>
                    <tr>
                        <th>Time</th>
                        <th>User</th>
                        <th>Action</th>
                        <th>Details</th>
                    </tr>
                </thead>
                <tbody>`;
            
            logs.slice(0, 50).forEach(log => {
                const badgeClass = 
                    log.action && log.action.includes('login') ? 'badge-info' :
                    log.action && log.action.includes('failed') ? 'badge-danger' :
                    log.action && log.action.includes('delete') ? 'badge-danger' :
                    log.action && log.action.includes('create') ? 'badge-success' :
                    log.action && log.action.includes('update') ? 'badge-warning' :
                    'badge-info';
                
                html += `
                    <tr>
                        <td>${log.date ? new Date(log.date).toLocaleString('en-KE') : '-'}</td>
                        <td>${log.userName || 'System'}</td>
                        <td><span class="badge ${badgeClass}">${log.action || 'Unknown'}</span></td>
                        <td>${log.details || '-'}</td>
                    </tr>
                `;
            });
            
            html += `</tbody></table>`;
            html += `<div style="text-align:center;margin-top:1rem;font-size:0.85rem;color:#999;">
                Showing last ${Math.min(logs.length, 50)} of ${logs.length} entries
            </div>`;
            
            container.innerHTML = html;
            
        } catch (error) {
            console.error('Error loading activity logs:', error);
            container.innerHTML = `
                <div style="text-align:center;padding:2rem;color:#ef4444;">
                    <i class="fas fa-exclamation-circle"></i> Error loading activity logs
                </div>
            `;
        }
    },

    // ✅ Clear activity logs with JWT
    async clearActivityLogs() {
        UIService.confirm(
            'Clear Activity Logs',
            'Are you sure you want to clear all activity logs? This action cannot be undone!',
            'Clear Logs',
            'danger'
        ).then(async confirmed => {
            if (confirmed) {
                try {
                    // ✅ REPLACED: fetch with ApiService
                    const result = await ApiService.delete('/activity');
                    if (result.success) {
                        UIService.showAlert('Activity logs cleared!', 'success');
                        this.loadActivityLogs();
                    } else {
                        UIService.showAlert('Failed to clear logs', 'danger');
                    }
                } catch (error) {
                    UIService.showAlert('Error clearing logs', 'danger');
                }
            }
        });
    },

    /**
     * Export all data
     */
    async exportData() {
        try {
            // ✅ Fetch all data with JWT
            const products = await ApiService.get('/products');
            const sales = await ApiService.get('/sales');
            const customers = await ApiService.get('/credit-customers');
            const settings = await ApiService.get('/settings');
            
            const backupData = {
                version: '2.0',
                exportedAt: new Date().toISOString(),
                products: products || [],
                sales: sales || [],
                customers: customers || [],
                settings: settings || {}
            };
            
            const blob = new Blob([JSON.stringify(backupData, null, 2)], { 
                type: 'application/json' 
            });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `talaen_backup_${Date.now()}.json`;
            a.click();
            URL.revokeObjectURL(url);
            
            UIService.showAlert('Data exported successfully!', 'success');
        } catch (error) {
            console.error('Export error:', error);
            UIService.showAlert('Error exporting data', 'danger');
        }
    },

    /**
     * Import data
     */
    async importData() {
        try {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            
            input.onchange = async (e) => {
                const file = e.target.files[0];
                if (!file) return;
                
                const reader = new FileReader();
                reader.onload = async (event) => {
                    try {
                        const backupData = JSON.parse(event.target.result);
                        
                        // ✅ Validate backup data
                        if (!backupData.products || !backupData.sales) {
                            UIService.showAlert('Invalid backup file format', 'danger');
                            return;
                        }
                        
                        // ✅ Import products with JWT
                        for (const product of backupData.products) {
                            await ApiService.post('/products', product);
                        }
                        
                        // ✅ Import sales with JWT
                        for (const sale of backupData.sales) {
                            await ApiService.post('/sales', sale);
                        }
                        
                        UIService.showAlert(
                            `Data imported successfully! Products: ${backupData.products.length}, Sales: ${backupData.sales.length}`,
                            'success'
                        );
                        
                        // Refresh data
                        await ProductService.refresh();
                        await SaleService.getAll();
                        AppRouter.render();
                        
                    } catch (error) {
                        UIService.showAlert('Error importing data: ' + error.message, 'danger');
                    }
                };
                reader.readAsText(file);
            };
            
            input.click();
            
        } catch (error) {
            UIService.showAlert(error.message || 'Import failed', 'danger');
        }
    },

    /**
     * Clear all data
     */
    clearData() {
        UIService.confirm(
            'Clear All Data',
            '⚠️ This will permanently delete ALL products, sales, and settings. This action cannot be undone!',
            'Clear All Data',
            'danger'
        ).then(confirmed => {
            if (confirmed) {
                UIService.confirm(
                    'Final Warning',
                    'Are you absolutely sure? Type "DELETE" to confirm.',
                    'I understand, delete everything',
                    'danger'
                ).then(async doubleConfirmed => {
                    if (doubleConfirmed) {
                        try {
                            // ✅ Delete all products with JWT
                            const products = await ApiService.get('/products');
                            if (products) {
                                for (const product of products) {
                                    await ApiService.delete(`/products/${product.id}`);
                                }
                            }
                            
                            UIService.showAlert('All data has been cleared!', 'success');
                            await ProductService.refresh();
                            await SaleService.getAll();
                            setTimeout(() => AppRouter.render(), 500);
                        } catch (error) {
                            UIService.showAlert('Error clearing data', 'danger');
                        }
                    }
                });
            }
        });
    },

    /**
     * Export products CSV
     */
    async exportProductsCSV() {
        try {
            // ✅ Fetch products with JWT
            const products = await ApiService.get('/products');
            
            if (!products || products.length === 0) {
                UIService.showAlert('No products to export', 'warning');
                return;
            }
            
            let csv = 'ID,SKU,Name,Brand,Variant,Category,Price,Cost,Stock,Unit,Min Stock\n';
            products.forEach(p => {
                csv += `${p.id},${p.sku || ''},"${p.name}","${p.brand || ''}","${p.variant || ''}","${p.category || ''}",${p.price},${p.cost||0},${p.stock},${p.unit||'pcs'},${p.minStock||10}\n`;
            });
            
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `products_${Date.now()}.csv`;
            a.click();
            URL.revokeObjectURL(url);
            UIService.showAlert('Products exported!', 'success');
        } catch (error) {
            UIService.showAlert('Error exporting products', 'danger');
        }
    },

    /**
     * Export sales CSV
     */
    async exportSalesCSV() {
        try {
            // ✅ Fetch sales with JWT
            const sales = await ApiService.get('/sales');
            
            if (!sales || sales.length === 0) {
                UIService.showAlert('No sales to export', 'warning');
                return;
            }
            
            let csv = 'Receipt,Customer,Date,Payment Method,Subtotal,Tax,Discount,Total,Items\n';
            sales.forEach(s => {
                const items = s.items ? s.items.map(i => `${i.productName}(${i.quantity}x${i.price})`).join('; ') : '';
                csv += `${s.receiptNo || ''},"${s.customerName || 'Walk-in'}",${s.date || ''},${s.paymentMethod || 'cash'},${s.subtotal||0},${s.tax||0},${s.discount||0},${s.total||0},"${items}"\n`;
            });
            
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `sales_${Date.now()}.csv`;
            a.click();
            URL.revokeObjectURL(url);
            UIService.showAlert('Sales exported!', 'success');
        } catch (error) {
            UIService.showAlert('Error exporting sales', 'danger');
        }
    },

    /**
     * Export inventory report
     */
    async exportInventoryReport() {
        try {
            // ✅ Fetch products with JWT
            const products = await ApiService.get('/products');
            
            if (!products || products.length === 0) {
                UIService.showAlert('No products for inventory report', 'warning');
                return;
            }
            
            const inventory = products.reduce((s, p) => ({
                totalItems: s.totalItems + (p.stock || 0),
                totalValue: s.totalValue + ((p.price || 0) * (p.stock || 0))
            }), { totalItems: 0, totalValue: 0 });
            
            let report = 'TALAEN INVESTMENT HARDWARE - INVENTORY REPORT\n';
            report += `Generated: ${new Date().toLocaleString()}\n`;
            report += '='.repeat(60) + '\n\n';
            report += 'PRODUCT, CATEGORY, STOCK, UNIT, PRICE, VALUE\n';
            report += '-'.repeat(60) + '\n';
            
            products.forEach(p => {
                report += `"${p.name}","${p.category || 'General'}",${p.stock||0},${p.unit||'pcs'},${p.price||0},${(p.price||0) * (p.stock||0)}\n`;
            });
            
            report += '\n' + '='.repeat(60) + '\n';
            report += `TOTAL PRODUCTS: ${products.length}\n`;
            report += `TOTAL ITEMS: ${inventory.totalItems}\n`;
            report += `TOTAL VALUE: KES ${inventory.totalValue.toLocaleString()}\n`;
            
            const blob = new Blob([report], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `inventory_report_${Date.now()}.txt`;
            a.click();
            URL.revokeObjectURL(url);
            UIService.showAlert('Inventory report generated!', 'success');
        } catch (error) {
            UIService.showAlert('Error generating inventory report', 'danger');
        }
    },

    /**
     * Print barcodes
     */
    async printBarcodes() {
        try {
            // ✅ Fetch products with JWT
            const products = await ApiService.get('/products');
            
            if (!products || products.length === 0) {
                UIService.showAlert('No products to print barcodes', 'warning');
                return;
            }
            
            UIService.showModal(
                'Print Barcodes',
                `
                    <p>Select products to print barcodes:</p>
                    <div style="max-height: 400px; overflow-y: auto; border: 1px solid #ddd; border-radius: 8px; padding: 0.5rem;">
                        ${products.map(p => `
                            <div style="display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem; border-bottom: 1px solid var(--gray-200);">
                                <input type="checkbox" id="barcode_${p.id}" checked>
                                <label for="barcode_${p.id}" style="flex:1;">
                                    <strong>${p.name}</strong> 
                                    <span style="color:#999;font-size:0.8rem;">SKU: ${p.sku || 'N/A'} | KES ${p.price}</span>
                                </label>
                            </div>
                        `).join('')}
                    </div>
                    <p style="margin-top:0.5rem;font-size:0.8rem;color:#999;">Select all products you want barcodes for.</p>
                `,
                [
                    {
                        text: 'Cancel',
                        class: 'btn-outline',
                        onClick: (modal) => modal.remove()
                    },
                    {
                        text: 'Print Barcodes',
                        class: 'btn-primary',
                        icon: 'fas fa-print',
                        onClick: (modal) => {
                            const selected = products.filter(p => 
                                document.getElementById(`barcode_${p.id}`)?.checked
                            );
                            
                            if (selected.length === 0) {
                                UIService.showAlert('Select at least one product', 'warning');
                                return;
                            }
                            
                            const printWindow = window.open('', '_blank');
                            if (!printWindow) {
                                UIService.showAlert('Please allow popups to print barcodes', 'warning');
                                return;
                            }
                            
                            printWindow.document.write(`
                                <html>
                                <head>
                                    <title>Barcodes - ${selected.length} products</title>
                                    <style>
                                        body { font-family: 'Courier New', monospace; padding: 20px; }
                                        .barcode-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
                                        .barcode-item { 
                                            display: inline-block; 
                                            padding: 15px; 
                                            text-align: center;
                                            border: 1px solid #ddd;
                                            border-radius: 8px;
                                            page-break-inside: avoid;
                                        }
                                        .barcode-sku { font-size: 28px; font-weight: bold; letter-spacing: 2px; }
                                        .barcode-name { margin-top: 5px; font-size: 12px; font-weight: bold; }
                                        .barcode-price { font-size: 14px; color: #10b981; }
                                        @media print {
                                            .no-print { display: none; }
                                        }
                                    </style>
                                </head>
                                <body>
                                    <h2 class="no-print">Barcodes - ${selected.length} products</h2>
                                    <div class="barcode-grid">
                                        ${selected.map(p => `
                                            <div class="barcode-item">
                                                <div class="barcode-sku">${p.sku || p.id}</div>
                                                <div class="barcode-name">${p.name}</div>
                                                <div class="barcode-price">KES ${p.price}</div>
                                            </div>
                                        `).join('')}
                                    </div>
                                    <div class="no-print" style="text-align: center; margin-top: 20px;">
                                        <button onclick="window.print()" style="padding: 10px 20px; cursor: pointer; background: #2563eb; color: white; border: none; border-radius: 5px;">
                                            🖨️ Print
                                        </button>
                                        <button onclick="window.close()" style="padding: 10px 20px; cursor: pointer; background: #6b7280; color: white; border: none; border-radius: 5px;">
                                            Close
                                        </button>
                                    </div>
                                </body>
                                </html>
                            `);
                            printWindow.document.close();
                            modal.remove();
                        }
                    }
                ]
            );
        } catch (error) {
            UIService.showAlert('Error loading products', 'danger');
        }
    }
};

// ✅ Load activity logs when component is rendered
if (document.querySelector('[data-component="admin-data"]')) {
    setTimeout(() => AdminDataComponent.loadActivityLogs(), 300);
}

// Make globally available
window.AdminDataComponent = AdminDataComponent;
