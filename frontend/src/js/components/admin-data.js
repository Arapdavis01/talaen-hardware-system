/**
 * Talaen Hardware System - Admin Data Component
 * Data management, backup, and import/export
 */

const AdminDataComponent = {
    render() {
        const storageInfo = StorageService.getInfo();
        const activityLogs = AuthService.getActivityLogs(20);
        
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
                            <div class="stat-label">Database Size</div>
                            <div class="stat-value">${storageInfo.sizeInKB} KB</div>
                            <div class="stat-sub">Local storage used</div>
                        </div>
                        <div class="stat-card" style="background: linear-gradient(135deg, rgba(196, 154, 43, 0.8), rgba(196, 154, 43, 0.6));">
                            <div class="stat-label">Products</div>
                            <div class="stat-value">${storageInfo.productCount}</div>
                            <div class="stat-sub">Total products</div>
                        </div>
                        <div class="stat-card" style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.8), rgba(16, 185, 129, 0.6));">
                            <div class="stat-label">Sales</div>
                            <div class="stat-value">${storageInfo.saleCount}</div>
                            <div class="stat-sub">Total transactions</div>
                        </div>
                        <div class="stat-card" style="background: linear-gradient(135deg, rgba(59, 130, 246, 0.8), rgba(59, 130, 246, 0.6));">
                            <div class="stat-label">Customers</div>
                            <div class="stat-value">${storageInfo.customerCount}</div>
                            <div class="stat-sub">Registered customers</div>
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
                </div>
                <div class="card-body">
                    <div class="table-container">
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
                                ${activityLogs.length > 0 ? activityLogs.map(log => `
                                    <tr>
                                        <td>${Helpers.formatDate(log.timestamp)}</td>
                                        <td>${log.user}</td>
                                        <td>
                                            <span class="badge ${
                                                log.action.includes('login') ? 'badge-info' :
                                                log.action.includes('failed') ? 'badge-danger' :
                                                log.action.includes('delete') ? 'badge-danger' :
                                                log.action.includes('create') ? 'badge-success' :
                                                log.action.includes('update') ? 'badge-warning' :
                                                'badge-info'
                                            }">${log.action}</span>
                                        </td>
                                        <td>${log.details}</td>
                                    </tr>
                                `).join('') : `
                                    <tr>
                                        <td colspan="4" style="text-align: center; padding: 2rem;">
                                            <p style="color: var(--gray-500);">No activity recorded yet</p>
                                        </td>
                                    </tr>
                                `}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Export all data
     */
    exportData() {
        StorageService.exportBackupToFile();
        UIService.showAlert('Data exported successfully!', 'success');
    },

    /**
     * Import data
     */
    async importData() {
        try {
            const backup = await StorageService.importBackupFromFile();
            UIService.showAlert(
                `Data imported successfully! Products: ${backup.data.products?.length || 0}, Sales: ${backup.data.sales?.length || 0}`,
                'success'
            );
            AppRouter.render();
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
                // Double confirm
                UIService.confirm(
                    'Final Warning',
                    'Are you absolutely sure? Type "DELETE" to confirm.',
                    'I understand, delete everything',
                    'danger'
                ).then(doubleConfirmed => {
                    if (doubleConfirmed) {
                        StorageService.clearAll();
                        UIService.showAlert('All data has been cleared!', 'success');
                        setTimeout(() => AppRouter.render(), 500);
                    }
                });
            }
        });
    },

    /**
     * Export products CSV
     */
    exportProductsCSV() {
        const csv = ProductService.exportToCSV();
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `products_${Date.now()}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        UIService.showAlert('Products exported!', 'success');
    },

    /**
     * Export sales CSV
     */
    exportSalesCSV() {
        const csv = SaleService.exportToCSV();
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sales_${Date.now()}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        UIService.showAlert('Sales exported!', 'success');
    },

    /**
     * Export inventory report
     */
    exportInventoryReport() {
        const products = ProductService.getAll();
        const inventory = ProductService.getInventoryValue();
        
        let report = 'TALAEN INVESTMENT HARDWARE - INVENTORY REPORT\n';
        report += `Generated: ${new Date().toLocaleString()}\n`;
        report += '='.repeat(60) + '\n\n';
        report += 'PRODUCT, CATEGORY, STOCK, UNIT, PRICE, VALUE\n';
        report += '-'.repeat(60) + '\n';
        
        products.forEach(p => {
            report += `"${p.name}","${p.category}",${p.stock},${p.unit},${p.price},${p.price * p.stock}\n`;
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
    },

    /**
     * Print barcodes
     */
    printBarcodes() {
        const products = ProductService.getAll();
        UIService.showModal(
            'Print Barcodes',
            `
                <p>Select products to print barcodes:</p>
                <div style="max-height: 400px; overflow-y: auto;">
                    ${products.map(p => `
                        <div style="display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem; border-bottom: 1px solid var(--gray-200);">
                            <input type="checkbox" id="barcode_${p.id}" checked>
                            <label for="barcode_${p.id}">
                                <strong>${p.name}</strong> - SKU: ${p.sku || 'N/A'}
                            </label>
                        </div>
                    `).join('')}
                </div>
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
                    id: 'printBarcodes',
                    onClick: (modal) => {
                        const selected = products.filter(p => 
                            document.getElementById(`barcode_${p.id}`)?.checked
                        );
                        
                        if (selected.length === 0) {
                            UIService.showAlert('Select at least one product', 'warning');
                            return;
                        }
                        
                        const printWindow = window.open('', '_blank');
                        printWindow.document.write(`
                            <html>
                            <head>
                                <title>Barcodes</title>
                                <style>
                                    body { font-family: 'Courier New', monospace; padding: 20px; }
                                    .barcode-item { 
                                        display: inline-block; 
                                        margin: 10px; 
                                        padding: 15px; 
                                        text-align: center;
                                        border: 1px solid #ddd;
                                        page-break-inside: avoid;
                                    }
                                    .barcode { font-size: 24px; font-weight: bold; }
                                    @media print {
                                        .no-print { display: none; }
                                    }
                                </style>
                            </head>
                            <body>
                                <h2 class="no-print">Barcodes - ${selected.length} products</h2>
                                ${selected.map(p => `
                                    <div class="barcode-item">
                                        <div class="barcode">${p.sku || p.id}</div>
                                        <div style="margin-top: 5px;">${p.name}</div>
                                        <div>KES ${p.price}</div>
                                    </div>
                                `).join('')}
                                <div class="no-print" style="text-align: center; margin-top: 20px;">
                                    <button onclick="window.print()" style="padding: 10px 20px; cursor: pointer;">
                                        🖨️ Print
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
    }
};