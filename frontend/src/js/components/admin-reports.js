// ============================================
// ADMIN REPORTS – Auto‑refresh, Date‑aware generation
// ============================================

const AdminReportsComponent = {
    _allReports: [],

    render() {
        var h = '';
        h += '<div class="card" style="margin-bottom:1.5rem;"><div class="card-header"><h3 class="card-title"><i class="fas fa-calendar-day"></i> Today Summary</h3><div><button class="btn btn-sm btn-primary" onclick="AdminReportsComponent.generateReport()"><i class="fas fa-sync-alt"></i> Refresh</button> <button class="btn btn-sm btn-secondary" onclick="AdminReportsComponent.printToday()"><i class="fas fa-print"></i> Print</button></div></div><div class="card-body"><div id="todayReport">Loading...</div></div></div>';
        h += '<div class="card"><div class="card-header"><h3 class="card-title"><i class="fas fa-history"></i> Daily Reports History</h3><div style="display:flex;gap:0.5rem;align-items:center;flex-wrap:wrap;"><input type="date" id="reportDateFilter" class="form-control" style="width:180px;" onchange="AdminReportsComponent.filterByDate()"><input type="text" id="reportSearch" class="form-control" placeholder="Search by date..." style="width:180px;" oninput="AdminReportsComponent.filterByDate()"><button class="btn btn-sm btn-outline" onclick="AdminReportsComponent.resetFilter()"><i class="fas fa-times"></i> Clear</button><button class="btn btn-sm btn-warning" onclick="AdminReportsComponent.regenerateSelected()"><i class="fas fa-redo"></i> Regenerate Selected</button><button class="btn btn-sm btn-secondary" onclick="AdminReportsComponent.printHistory()"><i class="fas fa-print"></i> Print All</button></div></div><div class="card-body"><div id="reportsHistory">Loading...</div></div></div>';
        
        // Auto‑refresh today's report on page load
        setTimeout(function(){
            AdminReportsComponent.generateReport(); // creates/updates today's report
            AdminReportsComponent.loadToday();
            AdminReportsComponent.loadHistory();
        }, 200);
        return h;
    },

    // Generate report for a specific date, default today
    generateReport(date) {
        var data = {};
        if (date) data.date = date; // send date in request body
        ApiService.post('/daily-reports/generate', data)
            .then(function(){
                AdminReportsComponent.loadToday();
                AdminReportsComponent.loadHistory();
            });
    },

    // Regenerate report for the date currently selected in the date filter
    regenerateSelected() {
        var dateVal = document.getElementById('reportDateFilter')?.value;
        if (!dateVal) {
            showStyledAlert('Info', 'Select a date first!', 'info-circle', '#3b82f6');
            return;
        }
        this.generateReport(dateVal);
        showStyledAlert('Success', 'Report for ' + dateVal + ' regenerated!', 'check-circle', '#10b981');
    },

    loadToday() {
        ApiService.get('/daily-reports/today')
            .then(function(report){
                var h = '<div class="stats-grid">';
                h += '<div class="stat-card"><div class="stat-icon"><i class="fas fa-chart-line"></i></div><div class="stat-label">Today Sales</div><div class="stat-value">KES ' + Number(report?.totalSales||0).toLocaleString() + '</div><div class="stat-sub">' + (report?.transactionCount||0) + ' transactions</div></div>';
                h += '<div class="stat-card"><div class="stat-icon"><i class="fas fa-shopping-cart"></i></div><div class="stat-label">Items Sold</div><div class="stat-value">' + Number(report?.totalItemsSold||0) + '</div><div class="stat-sub">Units sold today</div></div>';
                h += '<div class="stat-card"><div class="stat-icon"><i class="fas fa-boxes"></i></div><div class="stat-label">Stock Added</div><div class="stat-value">' + Number(report?.stockAdded||0) + '</div><div class="stat-sub">From POs received</div></div>';
                h += '<div class="stat-card"><div class="stat-icon"><i class="fas fa-cubes"></i></div><div class="stat-label">Current Stock</div><div class="stat-value">' + Number(report?.closingStock||0) + '</div><div class="stat-sub">' + Number(report?.productsCount||0) + ' products</div></div>';
                h += '</div>';
                document.getElementById('todayReport').innerHTML = h;
            });
    },

    loadHistory() {
        var self = this;
        ApiService.get('/daily-reports')
            .then(function(reports){
                self._allReports = reports || [];
                self._displayReports(reports || []);
            });
    },

    _displayReports(reports) {
        var h = '<table class="table"><thead><tr><th>Date</th><th>Sales</th><th>Transactions</th><th>Items Sold</th><th>Stock Added</th><th>Closing Stock</th></tr></thead><tbody>';
        if(!reports || !reports.length){h+='<tr><td colspan="6">No reports found.</td></tr>';}
        else{
            reports.forEach(function(r){
                var dateStr = r.reportDate ? new Date(r.reportDate).toLocaleDateString('en-KE') : '';
                var isoDate = r.reportDate ? new Date(r.reportDate).toISOString().split('T')[0] : '';
                h += '<tr style="cursor:pointer;" onclick="AdminReportsComponent.showDayDetail(\'' + isoDate + '\')">';
                h += '<td><strong>' + dateStr + ' <i class="fas fa-external-link-alt" style="font-size:0.7rem;color:var(--secondary);"></i></strong></td>';
                h += '<td>KES '+Number(r.totalSales||0).toLocaleString()+'</td>';
                h += '<td>'+Number(r.transactionCount||0)+'</td>';
                h += '<td>'+Number(r.totalItemsSold||0)+'</td>';
                h += '<td>'+Number(r.stockAdded||0)+'</td>';
                h += '<td>'+Number(r.closingStock||0)+'</td></tr>';
            });
        }
        h+='</tbody></table>';
        document.getElementById('reportsHistory').innerHTML = h;
    },

    filterByDate() {
        var dateVal = document.getElementById('reportDateFilter')?.value || '';
        var searchVal = (document.getElementById('reportSearch')?.value || '').toLowerCase();
        var reports = this._allReports || [];
        var filtered = reports.filter(function(r) {
            var rDate = r.reportDate ? new Date(r.reportDate).toISOString().split('T')[0] : '';
            if (dateVal && rDate !== dateVal) return false;
            if (searchVal && !rDate.includes(searchVal)) return false;
            return true;
        });
        this._displayReports(filtered);
    },

    resetFilter() {
        document.getElementById('reportDateFilter').value = '';
        document.getElementById('reportSearch').value = '';
        this._displayReports(this._allReports || []);
    },

    showDayDetail(reportDate) {
        var displayDate = new Date(reportDate + 'T00:00:00').toLocaleDateString('en-KE', {weekday:'long',year:'numeric',month:'long',day:'numeric'});
        
        ApiService.get('/sales')
            .then(function(sales){
                var daySales = sales.filter(function(s) {
                    if (!s.date) return false;
                    return new Date(s.date).toISOString().split('T')[0] === reportDate;
                });
                var totalSales = daySales.reduce(function(sum, s) { return Number(sum) + Number(s.total||0); }, 0);
                var totalItems = 0;
                daySales.forEach(function(s) { if (s.items) { s.items.forEach(function(i) { totalItems += Number(i.quantity||0); }); } });
                var payments = {};
                var cashiers = {};
                daySales.forEach(function(s) {
                    var pm = s.paymentMethod || 'cash';
                    if (!payments[pm]) payments[pm] = { count: 0, total: 0 };
                    payments[pm].count++;
                    payments[pm].total += Number(s.total || 0);
                    var cn = s.cashierName || 'Unknown';
                    if (!cashiers[cn]) cashiers[cn] = { count: 0, total: 0 };
                    cashiers[cn].count++;
                    cashiers[cn].total += Number(s.total || 0);
                });
                
                var h = '<div style="padding:0.5rem;">';
                h += '<div class="stats-grid" style="margin-bottom:1rem;">';
                h += '<div class="stat-card"><div class="stat-icon"><i class="fas fa-chart-line"></i></div><div class="stat-label">Total Sales</div><div class="stat-value">KES '+Number(totalSales).toLocaleString()+'</div><div class="stat-sub">'+daySales.length+' transactions</div></div>';
                h += '<div class="stat-card"><div class="stat-icon"><i class="fas fa-shopping-cart"></i></div><div class="stat-label">Items Sold</div><div class="stat-value">'+totalItems+'</div><div class="stat-sub">Units</div></div>';
                h += '<div class="stat-card"><div class="stat-icon"><i class="fas fa-calculator"></i></div><div class="stat-label">Avg. Sale</div><div class="stat-value">KES '+(daySales.length>0?Number(totalSales/daySales.length):0).toLocaleString()+'</div><div class="stat-sub">Per transaction</div></div></div>';
                
                h += '<h5 style="color:var(--primary);"><i class="fas fa-credit-card"></i> Payment Methods</h5><table class="table"><thead><tr><th>Method</th><th>Count</th><th>Total</th></tr></thead><tbody>';
                var icons={cash:'<i class="fas fa-money-bill"></i>',mpesa:'<i class="fas fa-mobile-alt"></i>',card:'<i class="fas fa-credit-card"></i>',credit:'<i class="fas fa-file-invoice"></i>'};
                for(var pm in payments){h+='<tr><td>'+(icons[pm]||'')+' '+pm.toUpperCase()+'</td><td>'+payments[pm].count+'</td><td>KES '+Number(payments[pm].total).toLocaleString()+'</td></tr>';}
                h+='</tbody></table>';
                
                h += '<h5 style="color:var(--primary);margin-top:1rem;"><i class="fas fa-users"></i> Cashier Performance</h5><table class="table"><thead><tr><th>Cashier</th><th>Sales</th><th>Total</th></tr></thead><tbody>';
                for(var cn in cashiers){h+='<tr><td><strong>'+cn+'</strong></td><td>'+cashiers[cn].count+'</td><td>KES '+Number(cashiers[cn].total).toLocaleString()+'</td></tr>';}
                h+='</tbody></table>';
                
                h += '<h5 style="color:var(--primary);margin-top:1rem;"><i class="fas fa-receipt"></i> All Transactions</h5><table class="table"><thead><tr><th>Receipt</th><th>Time</th><th>Customer</th><th>Items</th><th>Total</th><th>Payment</th></tr></thead><tbody>';
                daySales.forEach(function(s){
                    var d=new Date(s.date);
                    h+='<tr><td><strong>'+(s.receiptNo||'')+'</strong></td><td>'+d.toLocaleTimeString('en-KE',{hour:'2-digit',minute:'2-digit'})+'</td><td>'+(s.customerName||'Walk-in')+'</td><td>'+(s.items?s.items.length:0)+'</td><td>KES '+Number(s.total||0).toLocaleString()+'</td><td>'+(s.paymentMethod||'cash').toUpperCase()+'</td></tr>';
                });
                h+='</tbody></table></div>';
                
                var m=document.createElement('div');m.className='modal-overlay';
                m.innerHTML='<div class="modal modal-lg"><div class="modal-header" style="background:linear-gradient(135deg,#1a472a,#c49a2b);color:white;"><h3 style="color:white;"><i class="fas fa-calendar-check"></i> Day Report: '+displayDate+'</h3><button class="btn btn-sm" style="color:white;" onclick="this.closest(\'.modal-overlay\').remove()">X</button></div><div class="modal-body" style="max-height:70vh;overflow-y:auto;">'+h+'</div><div class="modal-footer"><button class="btn btn-primary" onclick="AdminReportsComponent.printDayDetail(\''+displayDate+'\')"><i class="fas fa-print"></i> Print</button><button class="btn btn-outline" onclick="this.closest(\'.modal-overlay\').remove()">Close</button></div></div>';
                document.body.appendChild(m);m.onclick=function(e){if(e.target===m)m.remove();};
            });
    },

    printDayDetail(reportDate) {
        var content = document.querySelector('.modal-body')?.innerHTML || '';
        var w = window.open('', '_blank', 'width=800,height=600');
        w.document.write('<!DOCTYPE html><html><head><title>Day Report - '+reportDate+'</title><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet"><style>body{font-family:Inter;padding:20px;}h2{color:#1a472a;}table{width:100%;border-collapse:collapse;margin:10px 0;}th{background:#1a472a;color:white;padding:8px;}td{padding:8px;border-bottom:1px solid #ddd;}.stat-card{display:inline-block;width:30%;padding:1rem;margin:0.5rem;background:linear-gradient(135deg,#1a472a,#c49a2b);color:white;border-radius:1rem;text-align:center;}.stat-value{font-size:1.5rem;font-weight:700;}@media print{body{padding:0;}button{display:none;}}</style></head><body><h2>Talaen Investment Hardware</h2><h3>Daily Report: '+reportDate+'</h3>'+content+'<br><button onclick="window.print()">Print</button></body></html>');
        w.document.close();
    },

    printToday() {
        var content = document.getElementById('todayReport')?.innerHTML || '';
        var w = window.open('', '_blank', 'width=800,height=600');
        w.document.write('<!DOCTYPE html><html><head><title>Daily Report</title><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet"><style>body{font-family:Inter,sans-serif;padding:20px;}h2{color:#1a472a;}.stat-card{display:inline-block;width:45%;padding:1rem;margin:0.5rem;background:linear-gradient(135deg,#1a472a,#c49a2b);color:white;border-radius:1rem;}.stat-value{font-size:2rem;font-weight:700;}table{width:100%;border-collapse:collapse;}th,td{padding:10px;border-bottom:1px solid #ddd;}@media print{body{padding:0;}button{display:none;}}</style></head><body><h2>Talaen Investment Hardware</h2><h3>Daily Report - '+new Date().toLocaleDateString('en-KE')+'</h3>'+content+'<br><button onclick="window.print()">Print</button></body></html>');
        w.document.close();
    },

    printHistory() {
        var content = document.getElementById('reportsHistory')?.innerHTML || '';
        var w = window.open('', '_blank', 'width=800,height=600');
        w.document.write('<!DOCTYPE html><html><head><title>Reports History</title><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet"><style>body{font-family:Inter,sans-serif;padding:20px;}h2{color:#1a472a;}table{width:100%;border-collapse:collapse;}th{background:#1a472a;color:white;padding:10px;}td{padding:10px;border-bottom:1px solid #ddd;}@media print{body{padding:0;}button{display:none;}}</style></head><body><h2>Talaen Investment Hardware</h2><h3>Daily Reports History</h3>'+content+'<br><button onclick="window.print()">Print</button></body></html>');
        w.document.close();
    }
};

window.AdminReportsComponent = AdminReportsComponent;
