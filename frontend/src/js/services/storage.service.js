/**
 * Talaen Hardware System - Storage Service
 * Handles all localStorage operations with error handling and data validation
 */

const StorageService = {
    /**
     * Storage keys configuration
     */
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

    /**
     * Get data from storage
     * @param {string} key - Storage key
     * @param {*} defaultValue - Default value if key doesn't exist
     * @returns {*} Parsed data or default value
     */
    get(key, defaultValue = null) {
        try {
            const data = localStorage.getItem(key);
            if (data === null) {
                return defaultValue;
            }
            return JSON.parse(data);
        } catch (error) {
            console.error(`Error reading from storage (${key}):`, error);
            return defaultValue;
        }
    },

    /**
     * Set data to storage
     * @param {string} key - Storage key
     * @param {*} value - Value to store
     * @returns {boolean} Success status
     */
    set(key, value) {
        try {
            const serialized = JSON.stringify(value);
            localStorage.setItem(key, serialized);
            return true;
        } catch (error) {
            console.error(`Error writing to storage (${key}):`, error);
            if (error.name === 'QuotaExceededError') {
                this.handleStorageFull();
            }
            return false;
        }
    },

    /**
     * Remove data from storage
     * @param {string} key - Storage key
     */
    remove(key) {
        try {
            localStorage.removeItem(key);
        } catch (error) {
            console.error(`Error removing from storage (${key}):`, error);
        }
    },

    /**
     * Check if key exists
     * @param {string} key - Storage key
     * @returns {boolean} Exists status
     */
    has(key) {
        return localStorage.getItem(key) !== null;
    },

    /**
     * Clear all Talaen data
     */
    clearAll() {
        try {
            Object.values(this.KEYS).forEach(key => {
                localStorage.removeItem(key);
            });
            return true;
        } catch (error) {
            console.error('Error clearing storage:', error);
            return false;
        }
    },

    /**
     * Get storage size
     * @returns {number} Size in bytes
     */
    getSize() {
        let total = 0;
        for (let key in localStorage) {
            if (localStorage.hasOwnProperty(key) && key.startsWith('talaen_')) {
                total += localStorage[key].length * 2; // UTF-16
            }
        }
        return total;
    },

    /**
     * Get storage info
     * @returns {object} Storage statistics
     */
    getInfo() {
        return {
            size: this.getSize(),
            sizeInKB: (this.getSize() / 1024).toFixed(2),
            sizeInMB: (this.getSize() / (1024 * 1024)).toFixed(2),
            keys: Object.keys(localStorage).filter(k => k.startsWith('talaen_')),
            productCount: this.get(this.KEYS.PRODUCTS, []).length,
            saleCount: this.get(this.KEYS.SALES, []).length,
            customerCount: this.get(this.KEYS.CUSTOMERS, []).length
        };
    },

    /**
     * Handle storage full error
     */
    handleStorageFull() {
        console.warn('Storage is full! Attempting cleanup...');
        // Could implement auto-cleanup of old data here
        alert('Storage is full! Please export your data and clear some space.');
    },

    /**
     * Create backup
     * @returns {object} Backup data
     */
    createBackup() {
        const backup = {
            version: '1.0',
            timestamp: new Date().toISOString(),
            data: {}
        };

        Object.entries(this.KEYS).forEach(([name, key]) => {
            backup.data[name.toLowerCase()] = this.get(key, []);
        });

        return backup;
    },

    /**
     * Restore from backup
     * @param {object} backup - Backup data
     * @returns {boolean} Success status
     */
    restoreBackup(backup) {
        try {
            if (!backup.data || !backup.version) {
                throw new Error('Invalid backup file');
            }

            const keyMap = {
                products: this.KEYS.PRODUCTS,
                sales: this.KEYS.SALES,
                customers: this.KEYS.CUSTOMERS,
                suppliers: this.KEYS.SUPPLIERS,
                settings: this.KEYS.SETTINGS
            };

            Object.entries(backup.data).forEach(([name, data]) => {
                if (keyMap[name]) {
                    this.set(keyMap[name], data);
                }
            });

            return true;
        } catch (error) {
            console.error('Error restoring backup:', error);
            return false;
        }
    },

    /**
     * Export backup to file
     */
    exportBackupToFile() {
        const backup = this.createBackup();
        const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `talaen_backup_${Date.now()}.json`;
        link.click();
        URL.revokeObjectURL(url);
    },

    /**
     * Import backup from file
     * @returns {Promise} Promise with result
     */
    importBackupFromFile() {
        return new Promise((resolve, reject) => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            
            input.onchange = (e) => {
                const file = e.target.files[0];
                const reader = new FileReader();
                
                reader.onload = (event) => {
                    try {
                        const backup = JSON.parse(event.target.result);
                        const success = this.restoreBackup(backup);
                        if (success) {
                            resolve(backup);
                        } else {
                            reject(new Error('Failed to restore backup'));
                        }
                    } catch (error) {
                        reject(new Error('Invalid backup file'));
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