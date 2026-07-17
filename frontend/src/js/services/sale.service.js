// ============================================
// SALE SERVICE - With JWT Authentication & Dual-Unit Support
// ============================================

const SaleService = {
    _cache: [],

    // ✅ Helper to get current user
    _getCurrentUser() {
        try {
            const userJson = localStorage.getItem('user');
            return userJson ? JSON.parse(userJson) : null;
        } catch (e) {
            return null;
        }
    },

    // ✅ Get all sales (with caching)
    async getAll() {
        try {
            // ✅ Use ApiService which automatically adds JWT token
            const data = await ApiService.get('/sales');
            if (data && Array.isArray(data)) {
                this._cache = data;
                console.log(`✅ Loaded ${data.length} sales`);
                return this._cache;
            }
            return this._cache;
        } catch (error) {
            console.error('SaleService.getAll error:', error);
            return this._cache;
        }
    },

    // ✅ Create a new sale (with dual-unit support)
    async create(saleData) {
        try {
            const user = this._getCurrentUser();

            // Map items to include dual-unit fields
            const mappedItems = saleData.items.map(function(item) {
                const mappedItem = {
                    productId: item.productId,
                    productName: item.productName,
                    quantity: item.quantity,
                    price: item.price,
                    total: item.total || (item.price * item.quantity),
                    soldInUnit: item.soldInUnit || null,
                    conversionFactor: item.conversionFactor || 0
                };
                
                // If selling in sales unit, the total should reflect the quantity in that unit
                // Price is always per base unit from the server
                if (item.soldInUnit && item.conversionFactor > 0) {
                    // Total = quantity sold × price per base unit
                    // Example: 2 tonnes × KES 200/wheelbarrow = KES 400 (not KES 9,600)
                    // Actually, if selling by tonne, the frontend should send the correct price
                    // Let the frontend calculate and send the total
                    mappedItem.total = item.total || (item.quantity * item.price);
                }
                
                return mappedItem;
            });

            // Calculate subtotal from items
            const subtotal = mappedItems.reduce((s, i) => s + (i.total || (i.price * i.quantity)), 0);
            const tax = saleData.tax || (subtotal * 0.16);
            const total = subtotal + (saleData.transportCost || 0) - (saleData.discount || 0);

            // ✅ Use ApiService with JWT token
            const result = await ApiService.post('/sales', {
                customerName: saleData.customerName || 'Walk-in Customer',
                items: mappedItems,
                paymentMethod: saleData.paymentMethod || 'cash',
                subtotal: subtotal,
                tax: tax,
                discount: saleData.discount || 0,
                total: total,
                cashierId: user?.id || null,
                cashierName: user?.fullName || 'Unknown',
                mpesaRef: saleData.mpesaRef || null,
                isCredit: saleData.isCredit || 0,
                customerId: saleData.customerId || null,
                debtPaid: saleData.debtPaid || 0,
                transportCost: saleData.transportCost || 0
            });

            // ✅ Refresh cache after successful sale
            await this.getAll();

            return {
                success: true,
                saleId: result.saleId,
                receiptNo: result.receiptNo || ('TIH-' + Date.now().toString(36).toUpperCase()),
                customerName: saleData.customerName || 'Walk-in Customer',
                items: mappedItems,
                subtotal,
                tax,
                total,
                transportCost: saleData.transportCost || 0,
                paymentMethod: saleData.paymentMethod || 'cash',
                isCredit: saleData.isCredit || 0,
                mpesaRef: saleData.mpesaRef || null,
                cashierName: user?.fullName || 'N/A',
                date: new Date().toISOString()
            };

        } catch (error) {
            console.error('SaleService.create error:', error);
            return {
                success: false,
                message: error.message || 'Failed to create sale'
            };
        }
    },

    // ✅ Get cashier sales (with JWT)
    async getCashierSales(cashierId) {
        try {
            const data = await ApiService.get(`/sales/cashier/${cashierId}`);
            return data || { all: [], today: [], totalAll: 0, totalToday: 0 };
        } catch (error) {
            console.error('SaleService.getCashierSales error:', error);
            return { all: [], today: [], totalAll: 0, totalToday: 0 };
        }
    },

    // ✅ Get cashiers summary (with JWT)
    async getCashiersSummary() {
        try {
            const data = await ApiService.get('/sales/cashiers-summary');
            return data || [];
        } catch (error) {
            console.error('SaleService.getCashiersSummary error:', error);
            return [];
        }
    },

    // ✅ Get today's sales
    getTodaySales() {
        const today = new Date().toISOString().split('T')[0];
        return this._cache.filter(function(s) {
            return s.date && String(s.date).startsWith(today);
        });
    },

    // ✅ Get sales statistics
    getStatistics() {
        const all = this._cache;
        const today = this.getTodaySales();
        return {
            total: {
                count: all.length,
                revenue: all.reduce(function(s, sale) {
                    return Number(s) + Number(sale.total || 0);
                }, 0)
            },
            today: {
                count: today.length,
                revenue: today.reduce(function(s, sale) {
                    return Number(s) + Number(sale.total || 0);
                }, 0)
            }
        };
    },

    // ✅ Get sale by receipt number (with JWT)
    async getByReceipt(receiptNo) {
        try {
            const data = await ApiService.get(`/sales/search/${receiptNo}`);
            return data;
        } catch (error) {
            console.error('SaleService.getByReceipt error:', error);
            return null;
        }
    },

    // ✅ Void a sale (with JWT)
    async voidSale(saleId, reason) {
        try {
            const result = await ApiService.put(`/sales/${saleId}/void`, { reason });
            await this.getAll();
            return result;
        } catch (error) {
            console.error('SaleService.voidSale error:', error);
            return { success: false, message: error.message };
        }
    },

    // ✅ Get sales by date range
    getSalesByDateRange(startDate, endDate) {
        return this._cache.filter(function(s) {
            if (!s.date) return false;
            const saleDate = s.date.split('T')[0];
            return saleDate >= startDate && saleDate <= endDate;
        });
    },

    // ✅ Get sales by customer
    getSalesByCustomer(customerName) {
        if (!customerName) return [];
        const search = customerName.toLowerCase();
        return this._cache.filter(function(s) {
            return s.customerName && s.customerName.toLowerCase().includes(search);
        });
    },

    // ✅ Get sales by payment method
    getSalesByPaymentMethod(method) {
        return this._cache.filter(function(s) {
            return s.paymentMethod && s.paymentMethod.toLowerCase() === method.toLowerCase();
        });
    },

    // ✅ Get daily sales summary
    getDailySummary() {
        const summary = {};
        this._cache.forEach(function(s) {
            if (!s.date) return;
            const date = s.date.split('T')[0];
            if (!summary[date]) {
                summary[date] = { count: 0, total: 0 };
            }
            summary[date].count++;
            summary[date].total += Number(s.total || 0);
        });
        return summary;
    },

    // ✅ Format sale item for display (handles dual-unit)
    formatSaleItemDisplay(item) {
        const productName = item.productName || '';
        const quantity = item.quantity || 0;
        const price = Number(item.price || 0);
        const total = Number(item.total || (price * quantity));
        
        // Check if sold in alternative unit
        if (item.soldInUnit && item.conversionFactor > 0) {
            // Receipt shows the unit used for sale
            return `${productName} - ${quantity} ${item.soldInUnit} @ KES ${price.toLocaleString()} = KES ${total.toLocaleString()}`;
        }
        
        // Regular sale (no alternative unit)
        return `${productName} - ${quantity} @ KES ${price.toLocaleString()} = KES ${total.toLocaleString()}`;
    },

    // ✅ Get unit label for display
    getUnitLabel(item) {
        if (item.soldInUnit && item.conversionFactor > 0) {
            return item.soldInUnit;
        }
        return item.unit || '';
    },

    // ✅ Generate receipt HTML (updated for dual-unit display)
    generateReceiptHTML(sale) {
        var d = new Date(sale.date || new Date());
        var h = '<div style="max-width:400px;margin:0 auto;font-family:Inter;font-size:14px;">';
        h += '<div style="text-align:center;border-bottom:2px dashed #ccc;padding-bottom:10px;margin-bottom:10px;">';
        h += '<img src="../assets/talaen02.jpg" style="width:50px;height:50px;border-radius:10px;object-fit:cover;margin-bottom:5px;"><br>';
        h += '<strong style="font-size:1.1em;">TALAEN INVESTMENT HARDWARE</strong><br>';
        h += '<small style="font-size:10px;">P.O BOX 345, NANDI HILLS</small><br>';
        h += '<small style="font-size:9px;">Tel: 0717149902, 0724985188</small><br>';
        h += '<small>Quality Hardware & Building Materials</small><br>';
        h += '<div style="border-top:1px dashed #ccc;border-bottom:1px dashed #ccc;padding:4px 0;margin:8px 0;"><strong style="font-size:1em;letter-spacing:1px;">SALES RECEIPT</strong></div>';
        h += '<strong>' + (sale.receiptNo || '') + '</strong></div>';
        h += '<table style="width:100%;">';
        h += '<tr><td><strong>Date:</strong></td><td>' + d.toLocaleDateString('en-KE') + '</td></tr>';
        h += '<tr><td><strong>Time:</strong></td><td>' + d.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + '</td></tr>';
        h += '<tr><td><strong>Customer:</strong></td><td>' + (sale.customerName || 'Walk-in') + '</td></tr>';
        h += '<tr><td><strong>Payment:</strong></td><td>' + (sale.paymentMethod || 'cash').toUpperCase() + (sale.isCredit ? ' (CREDIT)' : '') + '</td></tr>';
        if (sale.mpesaRef) h += '<tr><td><strong>M-Pesa Ref:</strong></td><td style="color:#10b981;">' + sale.mpesaRef + '</td></tr>';
        h += '<tr><td><strong>Cashier:</strong></td><td>' + (sale.cashierName || 'N/A') + '</td></tr>';
        h += '</table>';
        h += '<table style="width:100%;border-collapse:collapse;margin:15px 0;">';
        h += '<tr style="border-bottom:2px solid #333;"><th style="text-align:left;">Item</th><th>Qty</th><th style="text-align:right;">Price</th><th style="text-align:right;">Total</th></tr>';
        
        if (sale.items && sale.items.length > 0) {
            sale.items.forEach(function(i) {
                // Determine unit to display on receipt
                var unitLabel = '';
                if (i.soldInUnit && i.conversionFactor > 0) {
                    // Sold in alternative unit - show that unit
                    unitLabel = '/' + i.soldInUnit;
                } else if (i.unit) {
                    unitLabel = '/' + i.unit;
                }
                
                h += '<tr>';
                h += '<td>' + (i.productName || '') + '</td>';
                h += '<td style="text-align:center;">' + (i.quantity || 0) + '</td>';
                h += '<td style="text-align:right;">' + Number(i.price || 0).toLocaleString() + unitLabel + '</td>';
                h += '<td style="text-align:right;">' + (Number(i.total || (i.price * i.quantity)) || 0).toLocaleString() + '</td>';
                h += '</tr>';
            });
        }
        
        h += '</table>';
        h += '<div style="border-top:2px solid #333;padding-top:10px;">';
        h += '<p><strong>Subtotal:</strong> KES ' + Number(sale.subtotal || 0).toLocaleString() + '</p>';
        h += '<p><strong>VAT (16%):</strong> KES ' + Number(sale.tax || 0).toLocaleString() + '</p>';
        if (Number(sale.transportCost) > 0) {
            h += '<p><strong>🚚 Transport:</strong> KES ' + Number(sale.transportCost || 0).toLocaleString() + '</p>';
        }
        if (Number(sale.discount) > 0) {
            h += '<p><strong>💳 Discount:</strong> KES ' + Number(sale.discount || 0).toLocaleString() + '</p>';
        }
        h += '<p style="font-size:1.2em;font-weight:bold;">TOTAL: KES ' + Number(sale.total || 0).toLocaleString() + '</p></div>';
        h += '<div style="text-align:center;margin-top:20px;border-top:1px dashed #ccc;padding-top:15px;">';
        h += '<p style="color:#666;margin:0;">Thank you for shopping at</p>';
        h += '<p style="font-weight:700;color:var(--primary);margin:5px 0;font-size:1.1em;">TALAEN INVESTMENT</p>';
        h += '<p style="color:#666;margin:0;">Welcome again!</p></div></div>';
        return h;
    },

    // ✅ Print receipt
    printReceipt(sale) {
        const html = this.generateReceiptHTML(sale);
        const win = window.open('', '_blank', 'width=400,height=600');
        if (win) {
            win.document.write('<html><head><title>Receipt</title>');
            win.document.write('<style>body{font-family:Arial;padding:20px;margin:0;}@media print{button{display:none;}}</style>');
            win.document.write('</head><body>');
            win.document.write(html);
            win.document.write('<div style="text-align:center;margin-top:20px;">');
            win.document.write('<button onclick="window.print()" style="padding:10px 20px;background:#2563eb;color:white;border:none;border-radius:5px;cursor:pointer;">🖨️ Print Receipt</button>');
            win.document.write('</div>');
            win.document.write('</body></html>');
            win.document.close();
        } else {
            alert('Please allow popups to print the receipt.');
        }
    },

    // ============================================
    // 🔥 DUAL-UNIT SUPPORT METHODS
    // ============================================

    /**
     * Check if a sale item was sold in an alternative unit
     * @param {Object} item - Sale item object
     * @returns {boolean}
     */
    isDualUnitItem(item) {
        return !!(item.soldInUnit && item.conversionFactor > 0);
    },

    /**
     * Get the display unit for a sale item
     * @param {Object} item - Sale item object
     * @returns {string} Unit name used for this sale
     */
    getItemDisplayUnit(item) {
        if (this.isDualUnitItem(item)) {
            return item.soldInUnit;
        }
        return item.unit || 'pcs';
    },

    /**
     * Get the base quantity for a sale item (in smallest unit)
     * @param {Object} item - Sale item object
     * @returns {number} Base quantity
     */
    getBaseQuantity(item) {
        if (this.isDualUnitItem(item)) {
            return item.baseQuantity || (item.quantity * item.conversionFactor);
        }
        return item.quantity || 0;
    },

    /**
     * Format item quantity with appropriate unit for receipt
     * @param {Object} item - Sale item object
     * @returns {string} Formatted string like "5 tonnes" or "10 wheelbarrows"
     */
    formatItemQuantity(item) {
        const qty = item.quantity || 0;
        const unit = this.getItemDisplayUnit(item);
        return `${qty} ${unit}`;
    },

    /**
     * Calculate total for a dual-unit item
     * @param {Object} item - Sale item with soldInUnit and conversionFactor
     * @returns {number} Total price
     */
    calculateDualUnitTotal(item) {
        if (this.isDualUnitItem(item)) {
            // Quantity is in sales unit, price is per base unit
            return item.quantity * (item.price || 0);
        }
        return (item.quantity || 0) * (item.price || 0);
    }
};

// Make globally available
window.SaleService = SaleService;
