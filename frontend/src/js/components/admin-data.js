/**
 * Talaen Hardware System - Admin Data Component
 * Data management, backup, and import/export
 * Updated: parallel fetches, cache reuse, batched writes, working activity log
 */

const AdminDataComponent = {
    // ✅ Cached customer count (populated async after render)
    _customerCount: 0,

    // ✅ Concurrency limit for bulk operations
    _BULK_CONCURRENCY: 5,

    render() {
        const userJson = localStorage.getItem('user');
        let user = null;
        try { user = userJson ? JSON.parse(userJson) : null; } catch (e) { user = null; }

        const products = ProductService._cache || [];
        const sales = SaleService._cache || [];
        // ✅ Use cached count; async update fills it in after render
        const customers = this._customerCount;

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
                        <div style="text-align: center; padding: 1.5rem; border: 2px dashed var(--gray-300); border-radius: var(--radius-lg);">
                            <i class="fas fa-download" style="font-size: 3rem; color: var(--primary); margin-bottom: 1rem;"></i>
                            <h4 style="color: var(--primary);">Export Data</h4>
                            <p style="color: var(--gray-500); margin: 0.5rem 0;">Download all your store data as a backup file</p>
                            <button class="btn btn-primary" onclick="AdminDataComponent.exportData()">
                                <i class="fas fa-download"></i> Export Backup
                            </button>
                        </div>

                        <div style="text-align: center; padding: 1.5rem; border: 2px dashed var(--gray-300); border-radius: var(--radius-lg);">
                            <i class="fas fa-upload" style="font-size: 3rem; color: var(--secondary); margin-bottom: 1rem;"></i>
                            <h4 style="color: var(--secondary);">Import Data</h4>
                            <p style="color: var(--gray-500); margin: 0.5rem 0;">Restore your store data from a backup file</p>
                            <button class="btn btn-secondary" onclick="AdminDataComponent.importData()">
                                <i class="fas fa-upload"></i> Import Backup
                            </button>
                        </div>

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
                            <div class="stat-value" id="adminDataCustomerCount">${customers}</div>
                            <div class="stat-sub">Registered customers</div>
                        </div>
                        <div class="stat-card" style="background: linear-gradient(135deg, rgba(59, 130, 246, 0.8), rgba(59, 130, 246, 0.6));">
                            <div class="stat-label">Admin</div>
                            <div class="stat-value">${user ? (user.fullName || user.username) : 'N/A'}</div>
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

    /**
     * Called by the router right after render() puts the HTML in the DOM.
     * Loads activity logs and the customer count asynchronously.
     */
    afterRender() {
        // ✅ Activity logs — always load (this was broken before)
        this.loadActivityLogs();
        // ✅ Customer count — fetch and update the DOM element when ready
        this._refreshCustomerCount();
    },

    // ✅ Fetch and update the customer count element
    async _refreshCustomerCount() {
        try {
            var customers = await ApiService.get('/credit-customers');
            this._customerCount = customers ? customers.length : 0;
            var el = document.getElementById('adminDataCustomerCount');
            if (el) el.textContent = this._customerCount;
        } catch (e) {
            // non-fatal
        }
    },

    // ============================================
    // ACTIVITY LOGS
    // ============================================

    async loadActivityLogs() {
        const container = document.getElementById('activityLogsContainer');
        if (!container) return;

        try {
            // ✅ Bounded fetch — the backend caps at 100 anyway, but be explicit
            const logs = await ApiService.get('/activity?limit=100');

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

            // ✅ Build one string, assign once — faster than concatenating per row
            const rows = logs.slice(0, 50).map(log => {
                const badgeClass =
                    log.action && log.action.includes('login') ? 'badge-info' :
                    log.action && log.action.includes('failed') ? 'badge-danger' :
                    log.action && log.action.includes('delete') ? 'badge-danger' :
                    log.action && log.action.includes('create') ? 'badge-success' :
                    log.action && log.action.includes('update') ? 'badge-warning' :
                    'badge-info';

                return `
                    <tr>
                        <td>${log.date ? new Date(log.date).toLocaleString('en-KE') : '-'}</td>
                        <td>${log.userName || 'System'}</td>
                        <td><span class="badge ${badgeClass}">${log.action || 'Unknown'}</span></td>
                        <td>${log.details || '-'}</td>
                    </tr>
                `;
            }).join('');

            html += rows;
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

    async clearActivityLogs() {
        UIService.confirm(
            'Clear Activity Logs',
            'Are you sure you want to clear all activity logs? This action cannot be undone!',
            'Clear Logs',
            'danger'
        ).then(async confirmed => {
            if (confirmed) {
                try {
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

    // ============================================
    // EXPORT ALL DATA (backup JSON)
    // ✅ Parallel fetches instead of sequential
    // ============================================
    async exportData() {
        try {
            var results = await Promise.all([
                ApiService.get('/products?limit=5000'),
                ApiService.get('/sales?limit=5000'),
                ApiService.get('/credit-customers'),
                ApiService.get('/settings')
            ]);

            const backupData = {
                version: '2.0',
                exportedAt: new Date().toISOString(),
                products: results[0] || [],
                sales: results[1] || [],
                customers: results[2] || [],
                settings: results[3] || {}
            };

            const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `talaen_backup_${Date.now()}.json`;
            a.click();
            URL.revokeObjectURL(url);

            UIService.showAlert(
                `Backup exported: ${backupData.products.length} products, ${backupData.sales.length} sales, ${backupData.customers.length} customers`,
                'success'
            );
        } catch (error) {
            console.error('Export error:', error);
            UIService.showAlert('Error exporting data', 'danger');
        }
    },

    // ============================================
    // IMPORT (batched, with progress)
    // ============================================
    async importData() {
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

                    if (!backupData.products || !backupData.sales) {
                        UIService.showAlert('Invalid backup file format', 'danger');
                        return;
                    }

                    const totalProducts = backupData.products.length;
                    const totalSales = backupData.sales.length;

                    if (totalProducts + totalSales === 0) {
                        UIService.showAlert('Backup file is empty', 'warning');
                        return;
                    }

                    UIService.confirm(
                        'Import Data',
                        `This will import <strong>${totalProducts} products</strong> and <strong>${totalSales} sales</strong>.<br><br>Continue?`,
                        'Start Import',
                        'primary'
                    ).then(async (confirmed) => {
                        if (!confirmed) return;

                        // ✅ Progress modal
                        const progressModal = document.createElement('div');
                        progressModal.className = 'modal-overlay';
                        progressModal.style.zIndex = '10000';
                        progressModal.innerHTML = `
                            <div class="modal" style="max-width:420px;">
                                <div class="modal-header" style="background:linear-gradient(135deg,#1a472a,#c49a2b);color:white;">
                                    <h3 style="color:white;"><i class="fas fa-spinner fa-spin"></i> Importing...</h3>
                                </div>
                                <div class="modal-body">
                                    <div id="importStatus" style="margin-bottom:0.75rem;text-align:center;">Preparing...</div>
                                    <div style="background:#e5e7eb;border-radius:8px;overflow:hidden;height:20px;">
                                        <div id="importProgress" style="height:100%;background:linear-gradient(90deg,#1a472a,#c49a2b);transition:width 0.2s;width:0%;"></div>
                                    </div>
                                    <div id="importPercent" style="text-align:center;margin-top:0.5rem;font-weight:600;">0%</div>
                                </div>
                            </div>
                        `;
                        document.body.appendChild(progressModal);

                        const setProgress = (done, total, label) => {
                            const pct = total > 0 ? Math.round((done / total) * 100) : 0;
                            const bar = document.getElementById('importProgress');
                            const pctEl = document.getElementById('importPercent');
                            const statusEl = document.getElementById('importStatus');
                            if (bar) bar.style.width = pct + '%';
                            if (pctEl) pctEl.textContent = pct + '%';
                            if (statusEl) statusEl.textContent = label;
                        };

                        try {
                            // ✅ Batch import with concurrency limit
                            const total = totalProducts + totalSales;
                            let done = 0;
                            let errors = 0;

                            // Products first
                            await this._runWithConcurrency(
                                backupData.products,
                                this._BULK_CONCURRENCY,
                                async (product) => {
                                    try {
                                        await ApiService.post('/products', product);
                                    } catch (e) {
                                        errors++;
                                    } finally {
                                        done++;
                                        setProgress(done, total, `Importing products (${done}/${total})`);
                                    }
                                }
                            );

                            // Then sales
                            await this._runWithConcurrency(
                                backupData.sales,
                                this._BULK_CONCURRENCY,
                                async (sale) => {
                                    try {
                                        await ApiService.post('/sales', sale);
                                    } catch (e) {
                                        errors++;
                                    } finally {
                                        done++;
                                        setProgress(done, total, `Importing sales (${done}/${total})`);
                                    }
                                }
                            );

                            progressModal.remove();

                            if (errors > 0) {
                                UIService.showAlert(
                                    `Import finished with ${errors} failed record${errors !== 1 ? 's' : ''}. Imported: ${total - errors} / ${total}.`,
                                    'warning'
                                );
                            } else {
                                UIService.showAlert(
                                    `Import complete! ${totalProducts} products, ${totalSales} sales.`,
                                    'success'
                                );
                            }

                            // Refresh caches
                            await Promise.all([
                                ProductService.refresh(),
                                SaleService.getAll(),
                                this._refreshCustomerCount()
                            ]);
                            AppRouter.render();

                        } catch (err) {
                            progressModal.remove();
                            UIService.showAlert('Error during import: ' + err.message, 'danger');
                        }
                    });

                } catch (error) {
                    UIService.showAlert('Error reading backup file: ' + error.message, 'danger');
                }
            };
            reader.readAsText(file);
        };

        input.click();
    },

    /**
     * Run an array of items through an async function with a concurrency cap.
     * Prevents 2,000 simultaneous POSTs (which would crash the browser and backend)
     * while still being much faster than fully sequential.
     */
    async _runWithConcurrency(items, concurrency, fn) {
        const queue = items.slice();
        const workers = [];
        for (let i = 0; i < concurrency; i++) {
            workers.push((async () => {
                while (queue.length > 0) {
                    const item = queue.shift();
                    if (item === undefined) break;
                    await fn(item);
                }
            })());
        }
        await Promise.all(workers);
    },

    // ============================================
    // CLEAR ALL DATA (batched)
    // ============================================
    clearData() {
        UIService.confirm(
            'Clear All Data',
            '⚠️ This will permanently delete ALL products, sales, and settings. This action cannot be undone!',
            'Clear All Data',
            'danger'
        ).then(confirmed => {
            if (!confirmed) return;
            UIService.confirm(
                'Final Warning',
                'Are you absolutely sure? This deletes everything permanently.',
                'I understand, delete everything',
                'danger'
            ).then(async doubleConfirmed => {
                if (!doubleConfirmed) return;

                try {
                    // ✅ Use cache — no need to re-fetch products we already have
                    const products = ProductService._cache && ProductService._cache.length
                        ? ProductService._cache
                        : (await ApiService.get('/products?limit=5000')) || [];

                    if (!products.length) {
                        UIService.showAlert('No products to delete', 'info');
                        return;
                    }

                    // Progress modal
                    const progressModal = document.createElement('div');
                    progressModal.className = 'modal-overlay';
                    progressModal.style.zIndex = '10000';
                    progressModal.innerHTML = `
                        <div class="modal" style="max-width:420px;">
                            <div class="modal-header" style="background:linear-gradient(135deg,#ef4444,#dc2626);color:white;">
                                <h3 style="color:white;"><i class="fas fa-trash"></i> Clearing Data...</h3>
                            </div>
                            <div class="modal-body">
                                <div id="clearStatus" style="margin-bottom:0.75rem;text-align:center;">Starting...</div>
                                <div style="background:#e5e7eb;border-radius:8px;overflow:hidden;height:20px;">
                                    <div id="clearProgress" style="height:100%;background:#ef4444;transition:width 0.2s;width:0%;"></div>
                                </div>
                                <div id="clearPercent" style="text-align:center;margin-top:0.5rem;font-weight:600;">0%</div>
                            </div>
                        </div>
                    `;
                    document.body.appendChild(progressModal);

                    let done = 0;
                    const total = products.length;
                    const errors = [];

                    await this._runWithConcurrency(products, this._BULK_CONCURRENCY, async (product) => {
                        try {
                            await ApiService.delete(`/products/${product.id}`);
                        } catch (e) {
                            errors.push(product.id);
                        } finally {
                            done++;
                            const pct = Math.round((done / total) * 100);
                            const bar = document.getElementById('clearProgress');
                            const pctEl = document.getElementById('clearPercent');
                            const statusEl = document.getElementById('clearStatus');
                            if (bar) bar.style.width = pct + '%';
                            if (pctEl) pctEl.textContent = pct + '%';
                            if (statusEl) statusEl.textContent = `Deleting products (${done}/${total})`;
                        }
                    });

                    progressModal.remove();

                    UIService.showAlert(
                        errors.length === 0
                            ? 'All data has been cleared!'
                            : `Cleared ${total - errors.length} of ${total} products. ${errors.length} failed.`,
                        errors.length === 0 ? 'success' : 'warning'
                    );

                    await Promise.all([
                        ProductService.refresh(),
                        SaleService.getAll(),
                        this._refreshCustomerCount()
                    ]);
                    setTimeout(() => AppRouter.render(), 500);

                } catch (error) {
                    UIService.showAlert('Error clearing data: ' + error.message, 'danger');
                }
            });
        });
    },

    // ============================================
    // EXPORT CSV: PRODUCTS
    // ✅ Uses ProductService cache
    // ============================================
    async exportProductsCSV() {
        try {
            const products = (ProductService._cache && ProductService._cache.length)
                ? ProductService._cache
                : (await ApiService.get('/products?limit=5000')) || [];

            if (!products.length) {
                UIService.showAlert('No products to export', 'warning');
                return;
            }

            let csv = 'ID,SKU,Name,Brand,Variant,Category,Price,Cost,Stock,Unit,Min Stock\n';
            for (const p of products) {
                csv += `${p.id},${p.sku || ''},"${(p.name || '').replace(/"/g, '""')}","${(p.brand || '').replace(/"/g, '""')}","${(p.variant || '').replace(/"/g, '""')}","${(p.category || '').replace(/"/g, '""')}",${p.price},${p.cost || 0},${p.stock},${p.unit || 'pcs'},${p.minStock || 10}\n`;
            }

            this._downloadFile(csv, `products_${Date.now()}.csv`, 'text/csv');
            UIService.showAlert(`Exported ${products.length} products`, 'success');
        } catch (error) {
            UIService.showAlert('Error exporting products', 'danger');
        }
    },

    // ============================================
    // EXPORT CSV: SALES
    // ✅ Uses SaleService cache
    // ============================================
    async exportSalesCSV() {
        try {
            const sales = (SaleService._cache && SaleService._cache.length)
                ? SaleService._cache
                : (await ApiService.get('/sales?limit=5000')) || [];

            if (!sales.length) {
                UIService.showAlert('No sales to export', 'warning');
                return;
            }

            let csv = 'Receipt,Customer,Date,Payment Method,Subtotal,Tax,Discount,Total,Items\n';
            for (const s of sales) {
                const items = s.items ? s.items.map(i => `${i.productName}(${i.quantity}x${i.price})`).join('; ') : '';
                csv += `${s.receiptNo || ''},"${(s.customerName || 'Walk-in').replace(/"/g, '""')}",${s.date || ''},${s.paymentMethod || 'cash'},${s.subtotal || 0},${s.tax || 0},${s.discount || 0},${s.total || 0},"${items.replace(/"/g, '""')}"\n`;
            }

            this._downloadFile(csv, `sales_${Date.now()}.csv`, 'text/csv');
            UIService.showAlert(`Exported ${sales.length} sales`, 'success');
        } catch (error) {
            UIService.showAlert('Error exporting sales', 'danger');
        }
    },

    // ============================================
    // EXPORT INVENTORY REPORT
    // ✅ Uses ProductService cache
    // ============================================
    async exportInventoryReport() {
        try {
            const products = (ProductService._cache && ProductService._cache.length)
                ? ProductService._cache
                : (await ApiService.get('/products?limit=5000')) || [];

            if (!products.length) {
                UIService.showAlert('No products for inventory report', 'warning');
                return;
            }

            let totalItems = 0;
            let totalValue = 0;
            for (const p of products) {
                totalItems += Number(p.stock || 0);
                totalValue += Number(p.price || 0) * Number(p.stock || 0);
            }

            let report = 'TALAEN INVESTMENT HARDWARE - INVENTORY REPORT\n';
            report += `Generated: ${new Date().toLocaleString()}\n`;
            report += '='.repeat(60) + '\n\n';
            report += 'PRODUCT, CATEGORY, STOCK, UNIT, PRICE, VALUE\n';
            report += '-'.repeat(60) + '\n';

            for (const p of products) {
                report += `"${(p.name || '').replace(/"/g, '""')}","${(p.category || 'General').replace(/"/g, '""')}",${p.stock || 0},${p.unit || 'pcs'},${p.price || 0},${(p.price || 0) * (p.stock || 0)}\n`;
            }

            report += '\n' + '='.repeat(60) + '\n';
            report += `TOTAL PRODUCTS: ${products.length}\n`;
            report += `TOTAL ITEMS: ${totalItems}\n`;
            report += `TOTAL VALUE: KES ${totalValue.toLocaleString()}\n`;

            this._downloadFile(report, `inventory_report_${Date.now()}.txt`, 'text/plain');
            UIService.showAlert('Inventory report generated!', 'success');
        } catch (error) {
            UIService.showAlert('Error generating inventory report', 'danger');
        }
    },

    // ✅ Small helper for consistent downloads
    _downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },

    // ============================================
    // PRINT BARCODES
    // ✅ Uses cache, adds filter + select-all
    // ============================================
    async printBarcodes() {
        try {
            const products = (ProductService._cache && ProductService._cache.length)
                ? ProductService._cache
                : (await ApiService.get('/products?limit=5000')) || [];

            if (!products.length) {
                UIService.showAlert('No products to print barcodes', 'warning');
                return;
            }

            UIService.showModal(
                'Print Barcodes',
                `
                    <div style="display:flex;gap:0.5rem;align-items:center;margin-bottom:0.75rem;">
                        <input type="text" id="barcodeSearch" class="form-control" placeholder="🔍 Filter products..." oninput="AdminDataComponent._filterBarcodeList()" style="flex:1;">
                        <button class="btn btn-sm btn-outline" onclick="AdminDataComponent._barcodeSelectAll(true)">Select All</button>
                        <button class="btn btn-sm btn-outline" onclick="AdminDataComponent._barcodeSelectAll(false)">Clear</button>
                    </div>
                    <div id="barcodeList" style="max-height: 400px; overflow-y: auto; border: 1px solid #ddd; border-radius: 8px; padding: 0.5rem;">
                        ${products.map(p => `
                            <div class="barcode-item-row" data-search="${((p.name || '') + ' ' + (p.sku || '') + ' ' + (p.brand || '')).toLowerCase()}" style="display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem; border-bottom: 1px solid var(--gray-200);">
                                <input type="checkbox" class="barcode-check" id="barcode_${p.id}" data-id="${p.id}" checked>
                                <label for="barcode_${p.id}" style="flex:1;cursor:pointer;">
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
                            // ✅ Read selection from DOM checkboxes (they reflect filter state)
                            const selectedIds = new Set(
                                Array.from(document.querySelectorAll('.barcode-check:checked'))
                                    .map(cb => cb.dataset.id)
                            );
                            const selected = products.filter(p => selectedIds.has(String(p.id)));

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

            // ✅ Small delay so the modal is in the DOM before attaching listeners
            setTimeout(() => {
                const search = document.getElementById('barcodeSearch');
                if (search) search.focus();
            }, 100);

        } catch (error) {
            UIService.showAlert('Error loading products', 'danger');
        }
    },

    // ✅ Filter the barcode list by name / SKU / brand
    _filterBarcodeList() {
        const q = (document.getElementById('barcodeSearch')?.value || '').toLowerCase();
        document.querySelectorAll('.barcode-item-row').forEach(row => {
            const text = row.dataset.search || '';
            row.style.display = (!q || text.indexOf(q) > -1) ? '' : 'none';
        });
    },

    // ✅ Select or clear all visible checkboxes
    _barcodeSelectAll(checked) {
        document.querySelectorAll('.barcode-item-row').forEach(row => {
            if (row.style.display !== 'none') {
                const cb = row.querySelector('.barcode-check');
                if (cb) cb.checked = checked;
            }
        });
    }
};

// Make globally available
window.AdminDataComponent = AdminDataComponent;
