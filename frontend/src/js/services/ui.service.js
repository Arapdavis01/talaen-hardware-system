/**
 * Talaen Hardware System - UI Service
 * Handles modals, alerts, notifications, and UI interactions
 * Updated: fixed button handlers, popup null-check, ESC cleanup, alert dedup
 */

const UIService = {
    // ✅ Track active alerts so we can cap stacking
    _activeAlerts: 0,
    _MAX_ALERTS: 4,

    // ============================================
    // TOAST ALERTS
    // ============================================
    showAlert(message, type = 'success', duration = 3000) {
        const icons = {
            success: '<i class="fas fa-check-circle"></i>',
            danger: '<i class="fas fa-times-circle"></i>',
            warning: '<i class="fas fa-exclamation-triangle"></i>',
            info: '<i class="fas fa-info-circle"></i>'
        };

        // ✅ Drop oldest alerts if too many stack up
        const existing = document.querySelectorAll('.alert');
        if (existing.length >= this._MAX_ALERTS) {
            existing[0].remove();
        }

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

        setTimeout(() => {
            if (alert.parentElement) {
                alert.style.opacity = '0';
                alert.style.transform = 'translateX(100%)';
                alert.style.transition = 'all 0.3s ease';
                setTimeout(() => alert.remove(), 300);
            }
        }, duration);
    },

    // ============================================
    // CONFIRMATION DIALOG
    // ============================================
    confirm(title, message, confirmText = 'Confirm', type = 'warning') {
        return new Promise((resolve) => {
            let resolved = false;
            const safeResolve = (val) => {
                if (!resolved) {
                    resolved = true;
                    resolve(val);
                }
            };

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
                    onClick: (modalEl) => {
                        modalEl.remove();
                        safeResolve(false);
                    }
                },
                {
                    text: confirmText,
                    class: type === 'danger' ? 'btn-danger' : 'btn-primary',
                    onClick: (modalEl) => {
                        modalEl.remove();
                        safeResolve(true);
                    }
                }
            ]);

            // ✅ If user closes via X, overlay, or ESC, treat as cancel
            const observer = new MutationObserver(() => {
                if (!document.body.contains(modal)) {
                    observer.disconnect();
                    safeResolve(false);
                }
            });
            observer.observe(document.body, { childList: true, subtree: true });
        });
    },

    // ============================================
    // MODAL
    // ============================================
    showModal(title, content, buttons = []) {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';

        // Each button gets a data-index attribute for reliable handler lookup
        const buttonsHTML = buttons.map((btn, index) => `
            <button class="btn ${btn.class || 'btn-primary'}" 
                    data-btn-index="${index}"
                    ${btn.id ? `id="${btn.id}"` : ''}>
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

        // ✅ ESC handler stored on overlay so it can clean itself up
        const escHandler = (e) => {
            if (!document.body.contains(overlay)) {
                document.removeEventListener('keydown', escHandler);
                return;
            }
            if (e.key === 'Escape') {
                overlay.remove();
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);

        // ✅ Override remove() to also clean up the ESC handler
        const originalRemove = overlay.remove.bind(overlay);
        overlay.remove = function () {
            document.removeEventListener('keydown', escHandler);
            originalRemove();
        };

        // Close button
        const closeBtn = overlay.querySelector('.close-modal');
        if (closeBtn) {
            closeBtn.onclick = () => overlay.remove();
        }

        // Click outside to close
        overlay.onclick = (e) => {
            if (e.target === overlay) overlay.remove();
        };

        // ✅ Attach button handlers by data-index — works with or without an id
        buttons.forEach((btn, index) => {
            if (typeof btn.onClick !== 'function') return;
            const btnElement = overlay.querySelector(`[data-btn-index="${index}"]`);
            if (!btnElement) return;
            btnElement.onclick = function (e) {
                btn.onClick(overlay, e);
            };
        });

        return overlay;
    },

    // ============================================
    // RECEIPT MODAL
    // ============================================
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
                    onClick: (modalEl) => {
                        this.printReceipt(sale);
                        modalEl.remove();
                    }
                },
                {
                    text: 'Close',
                    class: 'btn-outline',
                    onClick: (modalEl) => modalEl.remove()
                }
            ]
        );

        return modal;
    },

    // ============================================
    // PRINT RECEIPT
    // ============================================
    printReceipt(sale) {
        const receiptHTML = SaleService.generateReceiptHTML(sale);

        const printWindow = window.open('', '_blank', 'width=400,height=600');
        // ✅ Null check — popup blocker may have blocked this
        if (!printWindow) {
            this.showAlert('Please allow popups to print receipts.', 'warning', 4000);
            return;
        }

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Receipt - ${sale.receiptNo || ''}</title>
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

    // ============================================
    // LOADING INDICATOR
    // ============================================
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

    hideLoading(loadingElement) {
        if (loadingElement && loadingElement.parentElement) {
            loadingElement.remove();
        }
    },

    // ============================================
    // INPUT HELPERS
    // ============================================
    formatCurrencyInput(input) {
        let value = input.value.replace(/[^0-9.]/g, '');
        if (value) {
            const number = parseFloat(value);
            if (!isNaN(number) && typeof Helpers !== 'undefined' && Helpers.formatCurrency) {
                input.value = Helpers.formatCurrency(number);
            }
        }
    },

    // ============================================
    // TOOLTIPS
    // ============================================
    initTooltips() {
        // ✅ mouseenter/mouseleave with pointer-events handles nested elements cleanly
        document.addEventListener('mouseover', (e) => {
            const tooltip = e.target.closest('[data-tooltip]');
            if (tooltip && !tooltip._tooltipShown) {
                tooltip._tooltipShown = true;
                this.showTooltip(tooltip, tooltip.dataset.tooltip);
            }
        });

        document.addEventListener('mouseout', (e) => {
            const tooltip = e.target.closest('[data-tooltip]');
            if (tooltip) {
                tooltip._tooltipShown = false;
                this.hideTooltip();
            }
        });
    },

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

    hideTooltip() {
        const tooltip = document.getElementById('active-tooltip');
        if (tooltip) tooltip.remove();
    }
};

// Make globally available
window.UIService = UIService;
