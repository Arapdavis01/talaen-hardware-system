/**
 * Talaen Hardware System - UI Service
 * Handles modals, alerts, notifications, and UI interactions
 */

const UIService = {
    /**
     * Show toast notification
     * @param {string} message - Notification message
     * @param {string} type - success, danger, warning, info
     * @param {number} duration - Duration in ms
     */
    showAlert(message, type = 'success', duration = 3000) {
        const icons = {
            success: '<i class="fas fa-check-circle"></i>',
            danger: '<i class="fas fa-times-circle"></i>',
            warning: '<i class="fas fa-exclamation-triangle"></i>',
            info: '<i class="fas fa-info-circle"></i>'
        };

        const alert = document.createElement('div');
        alert.className = `alert alert-${type}`;
        alert.innerHTML = `
            <span>${icons[type] || icons.info}</span>
            <span>${message}</span>
            <span style="cursor:pointer; margin-left: auto; opacity: 0.7;" 
                  onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </span>
        `;

        document.body.appendChild(alert);

        // Auto remove
        setTimeout(() => {
            if (alert.parentElement) {
                alert.style.opacity = '0';
                alert.style.transform = 'translateX(100%)';
                alert.style.transition = 'all 0.3s ease';
                setTimeout(() => alert.remove(), 300);
            }
        }, duration);
    },

    /**
     * Show confirmation dialog
     * @param {string} title - Dialog title
     * @param {string} message - Dialog message
     * @param {string} confirmText - Confirm button text
     * @param {string} type - danger, warning, info
     * @returns {Promise} Resolves with true/false
     */
    confirm(title, message, confirmText = 'Confirm', type = 'warning') {
        return new Promise((resolve) => {
            const modal = this.showModal(title, `
                <div style="text-align: center;">
                    <i class="fas fa-${type === 'danger' ? 'exclamation-triangle' : 'question-circle'}" 
                       style="font-size: 3rem; color: var(--${type}); margin-bottom: 1rem;"></i>
                    <p>${message}</p>
                </div>
            `, [
                {
                    text: 'Cancel',
                    class: 'btn-outline',
                    onClick: () => {
                        modal.remove();
                        resolve(false);
                    }
                },
                {
                    text: confirmText,
                    class: type === 'danger' ? 'btn-danger' : 'btn-primary',
                    onClick: () => {
                        modal.remove();
                        resolve(true);
                    }
                }
            ]);
        });
    },

    /**
     * Show modal dialog
     * @param {string} title - Modal title
     * @param {string} content - HTML content
     * @param {array} buttons - Array of button configs
     * @returns {HTMLElement} Modal element
     */
    showModal(title, content, buttons = []) {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        
        const buttonsHTML = buttons.map(btn => `
            <button class="btn ${btn.class || 'btn-primary'}" id="${btn.id || ''}">
                ${btn.icon ? `<i class="${btn.icon}"></i> ` : ''}${btn.text}
            </button>
        `).join('');

        overlay.innerHTML = `
            <div class="modal">
                <div class="modal-header">
                    <h3 style="font-weight: 700; background: linear-gradient(135deg, var(--primary), var(--secondary));
                        -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
                        ${title}
                    </h3>
                    <button class="btn btn-sm close-modal">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    ${content}
                </div>
                ${buttons.length > 0 ? `
                <div class="modal-footer">
                    ${buttonsHTML}
                </div>
                ` : ''}
            </div>
        `;

        document.body.appendChild(overlay);

        // Close handlers
        const closeBtn = overlay.querySelector('.close-modal');
        if (closeBtn) {
            closeBtn.onclick = () => overlay.remove();
        }

        overlay.onclick = (e) => {
            if (e.target === overlay) overlay.remove();
        };

        // Button handlers
        buttons.forEach(btn => {
            if (btn.onClick && btn.id) {
                const btnElement = overlay.querySelector(`#${btn.id}`);
                if (btnElement) {
                    btnElement.onclick = btn.onClick;
                }
            }
        });

        // ESC key to close
        const escHandler = (e) => {
            if (e.key === 'Escape') {
                overlay.remove();
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);

        return overlay;
    },

    /**
     * Show receipt modal
     * @param {object} sale - Sale object
     */
    showReceipt(sale) {
        const receiptHTML = SaleService.generateReceiptHTML(sale);
        
        const modal = this.showModal(
            `<i class="fas fa-receipt"></i> Sales Receipt`,
            receiptHTML,
            [
                {
                    text: 'Print',
                    icon: 'fas fa-print',
                    class: 'btn-secondary',
                    onClick: () => {
                        this.printReceipt(sale);
                        modal.remove();
                    }
                },
                {
                    text: 'Close',
                    class: 'btn-outline',
                    onClick: () => modal.remove()
                }
            ]
        );
    },

    /**
     * Print receipt
     * @param {object} sale - Sale object
     */
    printReceipt(sale) {
        const receiptHTML = SaleService.generateReceiptHTML(sale);
        
        const printWindow = window.open('', '_blank', 'width=400,height=600');
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Receipt - ${sale.receiptNo}</title>
                <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
                <style>
                    @media print {
                        body { margin: 0; padding: 10px; }
                        .no-print { display: none; }
                    }
                    body { font-family: 'Inter', sans-serif; }
                </style>
            </head>
            <body>
                ${receiptHTML}
                <div style="text-align: center; margin-top: 20px;" class="no-print">
                    <button onclick="window.print(); setTimeout(() => window.close(), 500);" 
                            style="padding: 10px 20px; background: #1a472a; color: white; border: none; border-radius: 8px; cursor: pointer;">
                        🖨️ Print Receipt
                    </button>
                </div>
            </body>
            </html>
        `);
        printWindow.document.close();
    },

    /**
     * Show loading indicator
     * @param {string} message - Loading message
     * @returns {HTMLElement} Loading element
     */
    showLoading(message = 'Loading...') {
        const loading = document.createElement('div');
        loading.className = 'loading-overlay';
        loading.innerHTML = `
            <div class="loading-card">
                <div class="loading-spinner"></div>
                <p style="margin-top: 1rem; color: var(--gray-700);">${message}</p>
            </div>
        `;
        document.body.appendChild(loading);
        return loading;
    },

    /**
     * Hide loading indicator
     * @param {HTMLElement} loadingElement - Loading element to remove
     */
    hideLoading(loadingElement) {
        if (loadingElement && loadingElement.parentElement) {
            loadingElement.remove();
        }
    },

    /**
     * Format input as currency
     * @param {HTMLInputElement} input - Input element
     */
    formatCurrencyInput(input) {
        let value = input.value.replace(/[^0-9.]/g, '');
        if (value) {
            const number = parseFloat(value);
            if (!isNaN(number)) {
                input.value = Helpers.formatCurrency(number);
            }
        }
    },

    /**
     * Enable tooltips
     */
    initTooltips() {
        document.addEventListener('mouseover', (e) => {
            const tooltip = e.target.closest('[data-tooltip]');
            if (tooltip) {
                this.showTooltip(tooltip, tooltip.dataset.tooltip);
            }
        });

        document.addEventListener('mouseout', (e) => {
            const tooltip = e.target.closest('[data-tooltip]');
            if (tooltip) {
                this.hideTooltip();
            }
        });
    },

    /**
     * Show tooltip
     * @param {HTMLElement} element - Target element
     * @param {string} text - Tooltip text
     */
    showTooltip(element, text) {
        this.hideTooltip();
        
        const tooltip = document.createElement('div');
        tooltip.className = 'tooltip';
        tooltip.textContent = text;
        tooltip.id = 'active-tooltip';
        
        const rect = element.getBoundingClientRect();
        tooltip.style.left = rect.left + (rect.width / 2) + 'px';
        tooltip.style.top = rect.top - 10 + 'px';
        tooltip.style.transform = 'translate(-50%, -100%)';
        
        document.body.appendChild(tooltip);
    },

    /**
     * Hide tooltip
     */
    hideTooltip() {
        const tooltip = document.getElementById('active-tooltip');
        if (tooltip) tooltip.remove();
    }
};