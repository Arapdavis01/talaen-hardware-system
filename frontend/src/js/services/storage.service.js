/**
 * Talaen Hardware System - Storage Service
 * localStorage wrapper with error handling and data validation
 *
 * NOTE: In the current app, most data lives on the server. This service is
 * primarily used by legacy helpers in auth.service.js and as a local cache
 * fallback.
 */

const StorageService = {
    KEYS: {
        PRODUCTS: 'talaen_products',
        SALES: 'talaen_sales',
        CUSTOMERS: 'talaen_customers',
        SUPPLIERS: 'talaen_suppliers',
        SETTINGS: 'talaen_settings',
        PASSWORD: 'talaen_password',
        SECURITY_QUESTION: 'talaen_security_question',
        SECURITY_ANSWER: 'talaen_security_answer',
        STOCK_ALERTS: 'talaen_stock_alerts',
        USER_PREFERENCES: 'talaen_user_prefs',
        ACTIVITY_LOG: 'talaen_activity_log',
        APP_VERSION: 'talaen_version'
    },

    // ✅ Keys that should NEVER be written to an exported backup file
    _SENSITIVE_KEYS: new Set([
        'talaen_password',
        'talaen_security_answer'
    ]),

    // ✅ Reject import files larger than 25 MB (sanity check)
    _MAX_IMPORT_BYTES: 25 * 1024 * 1024,

    // ============================================
    // CORE GET / SET / REMOVE
    // ============================================

    get(key, defaultValue = null) {
        try {
            const data = localStorage.getItem(key);
            if (data === null) return defaultValue;
            return JSON.parse(data);
        } catch (error) {
            console.error(`Error reading from storage (${key}):`, error);
            return defaultValue;
        }
    },

    set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error(`Error writing to storage (${key}):`, error);
            if (error.name === 'QuotaExceededError' || error.code === 22) {
                this.handleStorageFull();
            }
            return false;
        }
    },

    remove(key) {
        try {
            localStorage.removeItem(key);
        } catch (error) {
            console.error(`Error removing from storage (${key}):`, error);
        }
    },

    has(key) {
        return localStorage.getItem(key) !== null;
    },

    clearAll() {
        try {
            Object.values(this.KEYS).forEach(key => {
                try { localStorage.removeItem(key); } catch (_) {}
            });
            return true;
        } catch (error) {
            console.error('Error clearing storage:', error);
            return false;
        }
    },

    // ============================================
    // SIZE / INFO
    // ============================================

    /**
     * Calculate total size of all Talaen-prefixed keys.
     * Uses one pass — no repeated iteration.
     */
    getSize() {
        let total = 0;
        const keys = Object.keys(localStorage);
        for (let i = 0; i < keys.length; i++) {
            const key = keys[i];
            if (key.indexOf('talaen_') === 0) {
                const val = localStorage.getItem(key);
                if (val) total += val.length * 2; // UTF-16 approx bytes
            }
        }
        return total;
    },

    getInfo() {
        // ✅ Compute size once
        const size = this.getSize();
        const keys = Object.keys(localStorage).filter(k => k.indexOf('talaen_') === 0);
        return {
            size,
            sizeInKB: (size / 1024).toFixed(2),
            sizeInMB: (size / (1024 * 1024)).toFixed(2),
            keys,
            productCount: this.get(this.KEYS.PRODUCTS, []).length || 0,
            saleCount:    this.get(this.KEYS.SALES, []).length || 0,
            customerCount: this.get(this.KEYS.CUSTOMERS, []).length || 0
        };
    },

    handleStorageFull() {
        console.warn('Storage is full!');
        // ✅ Non-blocking toast instead of alert()
        if (typeof UIService !== 'undefined' && UIService.showAlert) {
            UIService.showAlert(
                'Storage is full. Please export your data and clear some space.',
                'warning',
                6000
            );
        } else {
            // Fallback for very early startup when UIService isn't loaded yet
            console.error('Storage full — export and clear data before continuing.');
        }
    },

    // ============================================
    // BACKUP / RESTORE
    // ============================================

    createBackup() {
        const backup = {
            version: '1.0',
            timestamp: new Date().toISOString(),
            data: {}
        };

        Object.entries(this.KEYS).forEach(([name, key]) => {
            // ✅ Skip sensitive keys
            if (this._SENSITIVE_KEYS.has(key)) return;
            const value = this.get(key, null);
            // ✅ Skip keys that were never set
            if (value === null) return;
            backup.data[name.toLowerCase()] = value;
        });

        return backup;
    },

    /**
     * Restore from a backup object.
     * Validates shape before writing anything.
     */
    restoreBackup(backup) {
        try {
            if (!backup || !backup.data || !backup.version) {
                throw new Error('Invalid backup file');
            }

            const keyMap = {
                products:    this.KEYS.PRODUCTS,
                sales:       this.KEYS.SALES,
                customers:   this.KEYS.CUSTOMERS,
                suppliers:   this.KEYS.SUPPLIERS,
                settings:    this.KEYS.SETTINGS,
                stock_alerts: this.KEYS.STOCK_ALERTS,
                user_preferences: this.KEYS.USER_PREFERENCES,
                activity_log: this.KEYS.ACTIVITY_LOG,
                app_version: this.KEYS.APP_VERSION
            };

            // ✅ Validate the value type before writing
            const validArrayKeys = new Set(['products', 'sales', 'customers', 'suppliers', 'stock_alerts', 'activity_log']);
            let written = 0;

            Object.entries(backup.data).forEach(([name, data]) => {
                if (!keyMap[name]) return;
                // Reject shape mismatch
                if (validArrayKeys.has(name) && !Array.isArray(data)) {
                    console.warn(`Skipping backup.${name}: expected array, got ${typeof data}`);
                    return;
                }
                if (this.set(keyMap[name], data)) {
                    written++;
                }
            });

            if (written === 0) {
                throw new Error('Nothing to restore — no valid keys in backup');
            }

            return true;
        } catch (error) {
            console.error('Error restoring backup:', error);
            return false;
        }
    },

    exportBackupToFile() {
        const backup = this.createBackup();
        const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `talaen_backup_${Date.now()}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    },

    /**
     * Import a backup from a file.
     * Handles: file size check, reader errors, and re-selecting the same file.
     */
    importBackupFromFile() {
        return new Promise((resolve, reject) => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json,application/json';

            input.onchange = (e) => {
                const file = e.target.files && e.target.files[0];
                // ✅ Reset the input so the same file can be picked again later
                e.target.value = '';

                if (!file) {
                    reject(new Error('No file selected'));
                    return;
                }

                // ✅ Size guard
                if (file.size > this._MAX_IMPORT_BYTES) {
                    reject(new Error(
                        `File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum: ${(this._MAX_IMPORT_BYTES / 1024 / 1024).toFixed(0)} MB.`
                    ));
                    return;
                }

                const reader = new FileReader();

                // ✅ Handle read errors — previously this would hang forever
                reader.onerror = () => {
                    reject(new Error('Could not read the file'));
                };

                reader.onload = (event) => {
                    try {
                        const backup = JSON.parse(event.target.result);
                        const success = this.restoreBackup(backup);
                        if (success) resolve(backup);
                        else reject(new Error('Failed to restore backup'));
                    } catch (error) {
                        reject(new Error('Invalid backup file: ' + error.message));
                    }
                };

                reader.readAsText(file);
            };

            input.click();
        });
    }
};

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StorageService;
}
