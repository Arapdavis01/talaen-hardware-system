const AdminMpesaComponent = {
    render() {
        var h = '';
        h += '<div class="card" style="margin-bottom:1.5rem;"><div class="card-header"><h3 class="card-title"><i class="fas fa-mobile-alt"></i> M-Pesa API Configuration</h3></div><div class="card-body">';
        h += '<div id="mpesaConfigForm"><div id="mpesaStatus" style="margin-bottom:1rem;"></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">';
        h += '<div class="form-group"><label>Environment</label><select id="mpesaEnv" class="form-control"><option value="sandbox">Sandbox (Testing)</option><option value="production">Production (Live)</option></select></div>';
        h += '<div class="form-group"><label>Till Number</label><input type="text" id="mpesaTillNumber" class="form-control" placeholder="e.g., 1234567"></div>';
        h += '<div class="form-group"><label>Short Code</label><input type="text" id="mpesaShortCode" class="form-control" placeholder="e.g., 174379"></div>';
        // Passkey with eye toggle
        h += '<div class="form-group"><label>Passkey</label><div style="position:relative;"><input type="password" id="mpesaPasskey" class="form-control" placeholder="Your API Passkey" style="padding-right:40px;"><button type="button" onclick="AdminMpesaComponent.togglePasskey()" style="position:absolute;right:10px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:#999;" id="passkeyToggle"><i class="fas fa-eye"></i></button></div></div>';
        h += '<div class="form-group"><label>Consumer Key</label><input type="text" id="mpesaConsumerKey" class="form-control" placeholder="Your Consumer Key"></div>';
        // Consumer Secret with eye toggle
        h += '<div class="form-group"><label>Consumer Secret</label><div style="position:relative;"><input type="password" id="mpesaConsumerSecret" class="form-control" placeholder="Your Consumer Secret" style="padding-right:40px;"><button type="button" onclick="AdminMpesaComponent.toggleSecret()" style="position:absolute;right:10px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:#999;" id="secretToggle"><i class="fas fa-eye"></i></button></div></div>';
        h += '</div>';
        h += '<button class="btn btn-primary" onclick="AdminMpesaComponent.saveConfig()" style="margin-top:1rem;"><i class="fas fa-save"></i> Save Configuration</button>';
        h += '<button class="btn btn-outline" onclick="AdminMpesaComponent.testConfig()" style="margin-top:1rem;margin-left:0.5rem;"><i class="fas fa-vial"></i> Test Connection</button>';
        h += '<div id="mpesaTestResult" style="margin-top:1rem;"></div>';
        h += '</div></div></div>';
        
        h += '<div class="card"><div class="card-header"><h3 class="card-title"><i class="fas fa-history"></i> M-Pesa Transactions</h3></div><div class="card-body"><div id="mpesaTransactions">Loading...</div></div></div>';
        
        setTimeout(function(){ AdminMpesaComponent.loadConfig(); AdminMpesaComponent.loadTransactions(); }, 200);
        return h;
    },

    togglePasskey() {
        var f = document.getElementById('mpesaPasskey');
        var b = document.getElementById('passkeyToggle');
        if (f && b) {
            if (f.type === 'password') { f.type = 'text'; b.innerHTML = '<i class="fas fa-eye-slash"></i>'; }
            else { f.type = 'password'; b.innerHTML = '<i class="fas fa-eye"></i>'; }
        }
    },

    toggleSecret() {
        var f = document.getElementById('mpesaConsumerSecret');
        var b = document.getElementById('secretToggle');
        if (f && b) {
            if (f.type === 'password') { f.type = 'text'; b.innerHTML = '<i class="fas fa-eye-slash"></i>'; }
            else { f.type = 'password'; b.innerHTML = '<i class="fas fa-eye"></i>'; }
        }
    },

    loadConfig() {
        fetch('/api/mpesa/config')
            .then(function(r){return r.json();})
            .then(function(config){
                document.getElementById('mpesaEnv').value = config.environment || 'sandbox';
                document.getElementById('mpesaTillNumber').value = config.tillNumber || '';
                document.getElementById('mpesaShortCode').value = config.shortCode || '';
                // Don't populate sensitive fields for security
                var statusHtml = config.configured ? 
                    '<span style="color:#10b981;"><i class="fas fa-check-circle"></i> <strong>Configured</strong> - Ready to use</span>' : 
                    '<span style="color:#ef4444;"><i class="fas fa-times-circle"></i> <strong>Not configured</strong> - Please enter your credentials</span>';
                document.getElementById('mpesaStatus').innerHTML = statusHtml;
            });
    },

    saveConfig() {
        var data = {
            environment: document.getElementById('mpesaEnv').value,
            tillNumber: document.getElementById('mpesaTillNumber').value,
            shortCode: document.getElementById('mpesaShortCode').value,
            passkey: document.getElementById('mpesaPasskey').value,
            consumerKey: document.getElementById('mpesaConsumerKey').value,
            consumerSecret: document.getElementById('mpesaConsumerSecret').value
        };
        
        fetch('/api/mpesa/config', {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(data)
        })
        .then(function(r){return r.json();})
        .then(function(d){
            if(d.success) {
                showStyledAlert('Success', 'M-Pesa configuration saved successfully!', 'check-circle', '#10b981');
                AdminMpesaComponent.loadConfig();
            }
        });
    },

    testConfig() {
        var shortCode = document.getElementById('mpesaShortCode').value;
        var passkey = document.getElementById('mpesaPasskey').value;
        var consumerKey = document.getElementById('mpesaConsumerKey').value;
        
        if (!shortCode || !passkey || !consumerKey) {
            document.getElementById('mpesaTestResult').innerHTML = '<div style="color:#ef4444;padding:1rem;background:#fef2f2;border-radius:0.5rem;"><i class="fas fa-times-circle"></i> Please fill in Short Code, Passkey, and Consumer Key first.</div>';
            return;
        }
        
        document.getElementById('mpesaTestResult').innerHTML = '<div style="color:#3b82f6;padding:1rem;background:#eff6ff;border-radius:0.5rem;"><i class="fas fa-spinner fa-spin"></i> Testing connection to M-Pesa...</div>';
        
        var phoneNumber = prompt('Enter test phone number (e.g., 254708374149):', '254708374149');
        if (!phoneNumber) return;
        
        fetch('/api/mpesa/stk-push', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                phoneNumber: phoneNumber,
                amount: 1,
                accountReference: 'TEST-' + Date.now().toString(36).toUpperCase()
            })
        })
        .then(function(r){return r.json();})
        .then(function(d){
            if(d.success) {
                document.getElementById('mpesaTestResult').innerHTML = '<div style="color:#10b981;padding:1rem;background:#f0fdf4;border-radius:0.5rem;"><i class="fas fa-check-circle"></i> <strong>Success!</strong> STK Push sent! Check your phone.<br><small>CheckoutRequestID: ' + d.checkoutRequestID + '</small></div>';
            } else {
                document.getElementById('mpesaTestResult').innerHTML = '<div style="color:#ef4444;padding:1rem;background:#fef2f2;border-radius:0.5rem;"><i class="fas fa-times-circle"></i> <strong>Failed:</strong> ' + (d.message || 'Unknown error') + '</div>';
            }
        })
        .catch(function(e){
            document.getElementById('mpesaTestResult').innerHTML = '<div style="color:#ef4444;padding:1rem;background:#fef2f2;border-radius:0.5rem;"><i class="fas fa-times-circle"></i> <strong>Network error:</strong> ' + e.message + '</div>';
        });
    },

    loadTransactions() {
        fetch('/api/mpesa/transactions')
            .then(function(r){return r.json();})
            .then(function(transactions){
                var h = '<table class="table"><thead><tr><th>Date</th><th>Type</th><th>Phone</th><th>Amount</th><th>Reference</th><th>M-Pesa Ref</th><th>Status</th></tr></thead><tbody>';
                if(!transactions.length){
                    h += '<tr><td colspan="7" style="text-align:center;color:#999;">No M-Pesa transactions yet</td></tr>';
                } else {
                    transactions.forEach(function(t){
                        var statusColor = t.status === 'completed' ? '#10b981' : t.status === 'failed' ? '#ef4444' : '#f59e0b';
                        var statusIcon = t.status === 'completed' ? '✅' : t.status === 'failed' ? '❌' : '⏳';
                        h += '<tr>';
                        h += '<td>' + (t.date ? new Date(t.date).toLocaleString('en-KE') : '-') + '</td>';
                        h += '<td>' + (t.transactionType === 'stk_push' ? '📱 STK Push' : '🏪 Till Payment') + '</td>';
                        h += '<td>' + (t.phoneNumber || '-') + '</td>';
                        h += '<td>KES ' + (t.amount || 0).toLocaleString() + '</td>';
                        h += '<td>' + (t.accountReference || '-') + '</td>';
                        h += '<td><strong>' + (t.mpesaReceiptNumber || '-') + '</strong></td>';
                        h += '<td><span style="color:' + statusColor + ';font-weight:700;">' + statusIcon + ' ' + t.status.toUpperCase() + '</span></td>';
                        h += '</tr>';
                    });
                }
                h += '</tbody></table>';
                document.getElementById('mpesaTransactions').innerHTML = h;
            })
            .catch(function(e){
                document.getElementById('mpesaTransactions').innerHTML = '<p style="color:#999;text-align:center;">Error loading transactions</p>';
            });
    }
};