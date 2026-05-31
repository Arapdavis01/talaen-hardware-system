const SaleService = {
    _cache: [],

    async getAll() {
        try { const res = await fetch('/api/sales'); if (res.ok) { this._cache = await res.json(); return this._cache; } } catch(e) {}
        return this._cache;
    },

    async create(saleData) {
        const subtotal = saleData.items.reduce((s, i) => s + (i.price * i.quantity), 0);
        const tax = subtotal * 0.16;
        const total = subtotal + (saleData.transportCost || 0) - (saleData.discount || 0);
        const receiptNo = 'TIH-' + Date.now().toString(36).toUpperCase();
        const user = AuthService.getCurrentUser();
        
        try {
            const res = await fetch('/api/sales', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    customerName: saleData.customerName || 'Walk-in Customer',
                    items: saleData.items,
                    paymentMethod: saleData.paymentMethod || 'cash',
                    subtotal, tax, discount: saleData.discount || 0, total,
                    cashierId: user?.id, cashierName: user?.fullName,
                    mpesaRef: saleData.mpesaRef || null,
                    isCredit: saleData.isCredit || 0,
                    customerId: saleData.customerId || null,
                    transportCost: saleData.transportCost || 0
                })
            });
            const data = await res.json();
            await this.getAll();
            return { 
                saleId: data.saleId, 
                receiptNo: data.receiptNo || receiptNo, 
                customerName: saleData.customerName, 
                items: saleData.items, 
                subtotal, tax, total, 
                transportCost: saleData.transportCost || 0,
                paymentMethod: saleData.paymentMethod, 
                isCredit: saleData.isCredit || 0,
                mpesaRef: saleData.mpesaRef || null,
                cashierName: user?.fullName || 'N/A',
                date: new Date().toISOString() 
            };
        } catch(e) { console.error('SaleService.create error:', e); }
        
        return { receiptNo, customerName: saleData.customerName, items: saleData.items, subtotal, tax, total, transportCost: saleData.transportCost || 0, paymentMethod: saleData.paymentMethod, date: new Date().toISOString() };
    },

    async getCashierSales(cashierId) {
        try { const res = await fetch('/api/sales/cashier/' + cashierId); return await res.json(); } catch(e) {}
        return { all: [], today: [], totalAll: 0, totalToday: 0 };
    },

    async getCashiersSummary() {
        try { const res = await fetch('/api/sales/cashiers-summary'); return await res.json(); } catch(e) {}
        return [];
    },

    getTodaySales() { 
        const t = new Date().toISOString().split('T')[0]; 
        return this._cache.filter(function(s) { return s.date && String(s.date).startsWith(t); }); 
    },
    
    getStatistics() {
        const all = this._cache;
        const today = this.getTodaySales();
        return { 
            total: { 
                count: all.length, 
                revenue: all.reduce(function(s, sale) { return Number(s) + Number(sale.total||0); }, 0) 
            }, 
            today: { 
                count: today.length, 
                revenue: today.reduce(function(s, sale) { return Number(s) + Number(sale.total||0); }, 0) 
            } 
        };
    },

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
    h += '<tr><td><strong>Time:</strong></td><td>' + d.toLocaleTimeString('en-KE',{hour:'2-digit',minute:'2-digit',second:'2-digit'}) + '</td></tr>';
    h += '<tr><td><strong>Customer:</strong></td><td>' + (sale.customerName || 'Walk-in') + '</td></tr>';
    h += '<tr><td><strong>Payment:</strong></td><td>' + (sale.paymentMethod || 'cash').toUpperCase() + (sale.isCredit ? ' (CREDIT)' : '') + '</td></tr>';
    if (sale.mpesaRef) h += '<tr><td><strong>M-Pesa Ref:</strong></td><td style="color:#10b981;">' + sale.mpesaRef + '</td></tr>';
    h += '<tr><td><strong>Cashier:</strong></td><td>' + (sale.cashierName || 'N/A') + '</td></tr>';
    h += '</table>';
    h += '<table style="width:100%;border-collapse:collapse;margin:15px 0;">';
    h += '<tr style="border-bottom:2px solid #333;"><th style="text-align:left;">Item</th><th>Qty</th><th style="text-align:right;">Price</th><th style="text-align:right;">Total</th></tr>';
    if (sale.items && sale.items.length > 0) {
        sale.items.forEach(function(i) {
            h += '<tr><td>' + (i.productName || '') + '</td><td style="text-align:center;">' + (i.quantity || 0) + '</td><td style="text-align:right;">' + Number(i.price || 0).toLocaleString() + '</td><td style="text-align:right;">' + (Number(i.price||0)*Number(i.quantity||0)).toLocaleString() + '</td></tr>';
        });
    }
    h += '</table>';
    h += '<div style="border-top:2px solid #333;padding-top:10px;">';
    h += '<p><strong>Subtotal:</strong> KES ' + Number(sale.subtotal || 0).toLocaleString() + '</p>';
    h += '<p><strong>VAT (16%):</strong> KES ' + Number(sale.tax || 0).toLocaleString() + '</p>';
    if (Number(sale.transportCost) > 0) {
        h += '<p><strong>🚚 Transport:</strong> KES ' + Number(sale.transportCost || 0).toLocaleString() + '</p>';
    }
    h += '<p style="font-size:1.2em;font-weight:bold;">TOTAL: KES ' + Number(sale.total || 0).toLocaleString() + '</p></div>';
    h += '<div style="text-align:center;margin-top:20px;border-top:1px dashed #ccc;padding-top:15px;">';
    h += '<p style="color:#666;margin:0;">Thank you for shopping at</p>';
    h += '<p style="font-weight:700;color:var(--primary);margin:5px 0;font-size:1.1em;">TALAEN INVESTMENT</p>';
    h += '<p style="color:#666;margin:0;">Welcome again!</p></div></div>';
    return h;
}
};
