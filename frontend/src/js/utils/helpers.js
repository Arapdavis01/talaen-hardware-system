/**
 * Talaen Hardware System - Utility Helpers
 * Core utility functions used throughout the application
 */

// Global styled alert replacement (replaces browser alert())
function showStyledAlert(title, message, icon, color, callback) {
    var m = document.createElement('div'); m.className = 'modal-overlay';
    m.innerHTML = '<div class="modal"><div class="modal-header" style="background:linear-gradient(135deg,' + (color || '#3b82f6') + ',' + (color || '#2563eb') + ');color:white;"><h3 style="color:white;"><i class="fas fa-' + (icon || 'info-circle') + '"></i> ' + title + '</h3><button class="btn btn-sm" style="color:white;" onclick="this.closest(\'.modal-overlay\').remove()">X</button></div><div class="modal-body" style="text-align:center;"><div style="font-size:3rem;color:' + (color || '#3b82f6') + ';margin-bottom:1rem;"><i class="fas fa-' + (icon || 'info-circle') + '"></i></div><p style="font-size:1.1rem;">' + message + '</p></div><div class="modal-footer" style="justify-content:center;"><button class="btn btn-primary" id="alertOkBtn">OK</button></div></div>';
    document.body.appendChild(m); m.onclick = function(e){if(e.target===m)m.remove();};
    m.querySelector('#alertOkBtn').onclick = function(){ m.remove(); if(callback) callback(); };
}

// Global confirm dialog
function showConfirm(title, message, onConfirm, btnText, btnType) {
    var m = document.createElement('div'); m.className = 'modal-overlay';
    m.innerHTML = '<div class="modal"><div class="modal-header"><h3>' + title + '</h3><button class="btn btn-sm" onclick="this.closest(\'.modal-overlay\').remove()">X</button></div><div class="modal-body">' + message + '</div><div class="modal-footer"><button class="btn btn-outline" id="modalCancel">Cancel</button><button class="btn btn-' + (btnType||'danger') + '" id="modalConfirm">' + (btnText||'Confirm') + '</button></div></div>';
    document.body.appendChild(m);
    m.onclick = function(e) { if (e.target === m) m.remove(); };
    m.querySelector('#modalCancel').onclick = function() { m.remove(); };
    m.querySelector('#modalConfirm').onclick = function() { m.remove(); if (onConfirm) onConfirm(); };
}

const Helpers = {
    /**
     * Format currency to Kenyan Shillings
     * @param {number} amount - The amount to format
     * @returns {string} Formatted currency string
     */
    formatCurrency(amount) {
        return new Intl.NumberFormat('en-KE', {
            style: 'currency',
            currency: 'KES',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount).replace('KES', 'KES ');
    },

    /**
     * Format date to locale string
     * @param {string|Date} date - Date to format
     * @param {object} options - Intl.DateTimeFormat options
     * @returns {string} Formatted date string
     */
    formatDate(date, options = {}) {
        const defaultOptions = {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        };
        return new Date(date).toLocaleDateString('en-KE', { ...defaultOptions, ...options });
    },

    /**
     * Generate unique ID
     * @returns {string} Unique identifier
     */
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    },

    /**
     * Generate receipt number
     * @returns {string} Receipt number
     */
    generateReceiptNo() {
        const date = new Date();
        const year = date.getFullYear().toString().substr(-2);
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const random = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
        return `TIH-${year}${month}${day}-${random}`;
    },

    /**
     * Calculate tax (VAT)
     * @param {number} amount - Subtotal amount
     * @param {number} rate - Tax rate (default 16%)
     * @returns {number} Tax amount
     */
    calculateTax(amount, rate = 16) {
        return amount * (rate / 100);
    },

    /**
     * Calculate total with tax
     * @param {number} subtotal - Subtotal amount
     * @param {number} discount - Discount amount
     * @param {number} taxRate - Tax rate
     * @returns {object} { subtotal, tax, discount, total }
     */
    calculateTotal(subtotal, discount = 0, taxRate = 16) {
        const tax = this.calculateTax(subtotal, taxRate);
        const total = subtotal + tax - discount;
        return {
            subtotal,
            tax,
            discount,
            total
        };
    },

    /**
     * Debounce function
     * @param {function} func - Function to debounce
     * @param {number} wait - Wait time in milliseconds
     * @returns {function} Debounced function
     */
    debounce(func, wait = 300) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    /**
     * Validate email
     * @param {string} email - Email to validate
     * @returns {boolean} Is valid email
     */
    isValidEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    },

    /**
     * Validate phone number (Kenyan)
     * @param {string} phone - Phone number to validate
     * @returns {boolean} Is valid phone
     */
    isValidPhone(phone) {
        const re = /^(\+254|0)[17]\d{8}$/;
        return re.test(phone);
    },

    /**
     * Truncate text
     * @param {string} text - Text to truncate
     * @param {number} length - Max length
     * @returns {string} Truncated text
     */
    truncate(text, length = 50) {
        if (text.length <= length) return text;
        return text.substr(0, length) + '...';
    },

    /**
     * Get today's date range
     * @returns {object} { start, end }
     */
    getTodayRange() {
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        const end = new Date();
        end.setHours(23, 59, 59, 999);
        return { start, end };
    },

    /**
     * Filter by date range
     * @param {array} items - Array of items with date property
     * @param {Date} start - Start date
     * @param {Date} end - End date
     * @returns {array} Filtered items
     */
    filterByDateRange(items, start, end) {
        return items.filter(item => {
            const date = new Date(item.date || item.createdAt);
            return date >= start && date <= end;
        });
    },

    /**
     * Group by property
     * @param {array} array - Array to group
     * @param {string} key - Property to group by
     * @returns {object} Grouped object
     */
    groupBy(array, key) {
        return array.reduce((result, item) => {
            const groupKey = item[key];
            if (!result[groupKey]) {
                result[groupKey] = [];
            }
            result[groupKey].push(item);
            return result;
        }, {});
    },

    /**
     * Sum array of numbers
     * @param {array} array - Array of numbers
     * @param {string} key - Optional key for array of objects
     * @returns {number} Sum
     */
    sum(array, key = null) {
        if (key) {
            return array.reduce((sum, item) => sum + (item[key] || 0), 0);
        }
        return array.reduce((sum, num) => sum + num, 0);
    },

    /**
     * Export data to CSV
     * @param {array} data - Array of objects
     * @param {string} filename - Filename
     */
    exportToCSV(data, filename = 'export.csv') {
        if (data.length === 0) return;
        
        const headers = Object.keys(data[0]);
        const csvContent = [
            headers.join(','),
            ...data.map(row => headers.map(header => {
                let cell = row[header] || '';
                if (typeof cell === 'string' && cell.includes(',')) {
                    cell = `"${cell}"`;
                }
                return cell;
            }).join(','))
        ].join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        link.click();
        URL.revokeObjectURL(link.href);
    },

    /**
     * Print element
     * @param {string} elementId - Element ID to print
     */
    printElement(elementId) {
        const element = document.getElementById(elementId);
        if (!element) return;
        
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
                <head>
                    <title>Print - Talaen Hardware</title>
                    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
                    <style>
                        body { font-family: 'Inter', sans-serif; padding: 20px; }
                        @media print { body { padding: 0; } }
                    </style>
                </head>
                <body>${element.outerHTML}</body>
            </html>
        `);
        printWindow.document.close();
        printWindow.print();
        printWindow.close();
    }
};

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Helpers;
}