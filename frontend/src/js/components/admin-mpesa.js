// ============================================
// ADMIN MPESA - With JWT Authentication
// Updated: routes through ApiService, removed dead STK test, parallel loads
// ============================================

const AdminMpesaComponent = {
    // ============================================
    // RENDER
    // ============================================
    render() {
        var h = '';
        h += '<div class="card" style="margin-bottom:1.5rem;"><div class="card-header"><h3 class="card-title"><i class="fas fa-mobile-alt"></i> M-Pesa API Configuration</h3></div><div class="card-body">';
        h += '<div id="mpesaConfigForm"><div id="mpesaStatus" style="margin-bottom:1rem;"></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">';
        h += '<div class="form-group"><label>Environment</label><select id="mpesaEnv" class="form-control"><option value="sandbox">Sandbox (Testing)</option><option value="production">Production (Live)</option></select></div>';
        h += '<div class="form-group"><label>Till Number</label><input type="text" id="mpesaTillNumber" class="form-control" placeholder="e.g., 1234567"></div>';
        h += '<div class="form-group"><label>Short Code</label><input type="text" id="mpesaShortCode" class="form-control" placeholder="e.g., 174379"></div>';
        h += '<div class="form-group"><label>Passkey</label><div style="position:relative;"><input type="password" id="mpesaPasskey" class="form-control" placeholder="Your API Passkey" style="padding-right:40px;"><button type="button" onclick="AdminMpesaComponent.togglePasskey()" style="position:absolute;right:10px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:#999;" id="passkeyToggle"><i class="fas fa-eye"></i></button></div></div>';
        h += '<div class="form-group"><label>Consumer Key</label><input type="text" id="mpesaConsumerKey" class="form-control" placeholder="Your Consumer Key"></div>';
        h += '<div class="form-group"><label>Consumer Secret</label><div style="position:relative;"><input type="password" id="mpesaConsumerSecret" class="form-control" placeholder="Your Consumer Secret" style="padding-right:40px;"><button type="button" onclick="AdminMpesaComponent.toggleSecret()" style="position:absolute;right:10px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:#999;" id="secretToggle"><i class="fas fa-eye"></i></button></div></div>';
        h += '</div>';
        h += '<button class="btn btn-primary" id="saveMpesaConfigBtn" onclick="AdminMpesaComponent.saveConfig()" style="margin-top:1rem;"><i class="fas fa-save"></i> Save Configuration</button>';
        h += '<button class="btn btn-outline" onclick="AdminMpesaComponent.showStkTestInfo()" style="margin-top:1rem;margin-left:0.5rem;"><i class="fas fa-vial"></i> Test Connection</button>';
        h += '<div id="mpesaTestResult" style="margin-top:1rem;"></div>';
        h += '</div></div></div>';

        h += '<div class="card"><div class="card-header"><h3 class="card-title"><i class="fas fa-history"></i> M-Pesa Transactions</h3></div><div class="card-body"><div id="mpesaTransactions">Loading...</div></div></div>';

        // ✅ Parallel loads — both fire at once
        setTimeout(function() {
            AdminMpesaComponent.loadConfig();
            AdminMpesaComponent.loadTransactions();
        }, 200);

        return h;
    },

    // ============================================
    // PASSWORD TOGGLES
    // ============================================
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

    // ============================================
    // LOAD CONFIG (via ApiService — includes JWT)
    // ============================================
    async loadConfig() {
        try {
            var config = await ApiService.get('/mpesa/config');

            var envEl = document.getElementById('mpesaEnv');
            var tillEl = document.getElementById('mpesaTillNumber');
            var scEl = document.getElementById('mpesaShortCode');
            var statusEl = document.getElementById('mpesaStatus');

            if (envEl) envEl.value = config.environment || 'sandbox';
            if (tillEl) tillEl.value = config.tillNumber || '';
            if (scEl) scEl.value = config.shortCode || '';

            // Sensitive fields are intentionally left blank so stored credentials aren't exposed
            // (backend returns them blanked out too)

            if (statusEl) {
                statusEl.innerHTML = config.configured
                    ? '<span style="color:#10b981;"><i class="fas fa-check-circle"></i> <strong>Configured</strong> - Ready to use</span>'
                    : '<span style="color:#ef4444;"><i class="fas fa-times-circle"></i> <strong>Not configured</strong> - Please enter your credentials</span>';
            }
        } catch (e) {
            console.error('Error loading M-Pesa config:', e);
            var statusEl2 = document.getElementById('mpesaStatus');
            if (statusEl2) {
                statusEl2.innerHTML = '<span style="color:#ef4444;"><i class="fas fa-times-circle"></i> Error loading configuration</span>';
            }
        }
    },

    // ============================================
    // SAVE CONFIG (via ApiService — includes JWT)
    // ============================================
    async saveConfig() {
        var btn = document.getElementById('saveMpesaConfigBtn');
        var originalHtml = btn ? btn.innerHTML : '';
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        }

        try {
            var data = {
                environment: (document.getElementById('mpesaEnv') || {}).value || 'sandbox',
                tillNumber: (document.getElementById('mpesaTillNumber') || {}).value || '',
                shortCode: (document.getElementById('mpesaShortCode') || {}).value || '',
                passkey: (document.getElementById('mpesaPasskey') || {}).value || '',
                consumerKey: (document.getElementById('mpesaConsumerKey') || {}).value || '',
                consumerSecret: (document.getElementById('mpesaConsumerSecret') || {}).value || ''
            };

            var result = await ApiService.put('/mpesa/config', data);

            if (result && result.success) {
                showStyledAlert('Success', 'M-Pesa configuration saved successfully!', 'check-circle', '#10b981');
                // Clear sensitive fields after save
                ['mpesaPasskey', 'mpesaConsumerKey', 'mpesaConsumerSecret'].forEach(function(id) {
                    var el = document.getElementById(id);
                    if (el) el.value = '';
                });
                this.loadConfig();
            } else {
                showStyledAlert('Error', (result && result.message) || 'Save failed', 'times-circle', '#ef4444');
            }
        } catch (e) {
            showStyledAlert('Error', 'Save failed: ' + e.message, 'times-circle', '#ef4444');
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = originalHtml;
            }
        }
    },

    // ============================================
    // TEST CONNECTION
    // ============================================
    /**
     * Note: The current backend does NOT expose an STK Push endpoint.
     * The available M-Pesa endpoints are:
     *   - GET  /api/mpesa/config
     *   - PUT  /api/mpesa/config
     *   - POST /api/mpesa/till-payment       (records an already-completed till payment)
     *   - GET  /api/mpesa/transactions
     *   - GET  /api/mpesa/transaction/:id
     *
     * A real STK Push "Test Connection" button would require a new
     * POST /api/mpesa/stk-push endpoint on the backend. Until then, this
     * button explains what's available instead of failing silently.
     */
    showStkTestInfo() {
        var resultEl = document.getElementById('mpesaTestResult');
        if (!resultEl) return;

        var hasConsumerKey = (document.getElementById('mpesaConsumerKey') || {}).value;
        var hasPasskey = (document.getElementById('mpesaPasskey') || {}).value;

        if (!hasConsumerKey || !hasPasskey) {
            resultEl.innerHTML = '<div style="color:#f59e0b;padding:1rem;background:#fffbeb;border-radius:0.5rem;border:1px solid #f59e0b;">'
                + '<i class="fas fa-exclamation-triangle"></i> Enter your <strong>Consumer Key</strong> and <strong>Passkey</strong> first, save the config, then come back.'
                + '</div>';
            return;
        }

        resultEl.innerHTML = '<div style="color:#3b82f6;padding:1rem;background:#eff6ff;border-radius:0.5rem;border:1px solid #3b82f6;">'
            + '<i class="fas fa-info-circle"></i> <strong>Live STK Push test is not enabled on this server.</strong><br>'
            + '<small style="color:#666;">The backend currently supports recording completed till payments and checking existing transaction statuses. To send a real STK Push request during testing, ask your developer to add an <code>/api/mpesa/stk-push</code> endpoint that calls the Safaricom Daraja API.</small>'
            + '</div>';
    },

    // ============================================
    // LOAD TRANSACTIONS (via ApiService — includes JWT)
    // ============================================
    async loadTransactions() {
        var container = document.getElementById('mpesaTransactions');
        if (!container) return;

        try {
            // ✅ Bounded fetch — backend default is 100
            var transactions = await ApiService.get('/mpesa/transactions?limit=100');
            transactions = transactions || [];

            var esc = function(s) {
                return String(s == null ? '' : s)
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/"/g, '&quot;');
            };

            var h = '<table class="table"><thead><tr><th>Date</th><th>Type</th><th>Phone</th><th>Amount</th><th>Reference</th><th>M-Pesa Ref</th><th>Status</th></tr></thead><tbody>';

            if (!transactions.length) {
                h += '<tr><td colspan="7" style="text-align:center;color:#999;padding:2rem;">No M-Pesa transactions yet</td></tr>';
            } else {
                transactions.forEach(function(t) {
                    var status = (t.status || 'pending').toLowerCase();
                    var statusColor = status === 'completed' ? '#10b981' : status === 'failed' ? '#ef4444' : '#f59e0b';
                    var statusIcon = status === 'completed' ? '✅' : status === 'failed' ? '❌' : '⏳';
                    var typeLabel = t.transactionType === 'stk_push'
                        ? '📱 STK Push'
                        : t.transactionType === 'till_payment'
                            ? '🏪 Till Payment'
                            : esc(t.transactionType || '-');

                    h += '<tr>';
                    h += '<td><small>' + (t.date ? new Date(t.date).toLocaleString('en-KE') : '-') + '</small></td>';
                    h += '<td>' + typeLabel + '</td>';
                    h += '<td>' + esc(t.phoneNumber || '-') + '</td>';
                    h += '<td><strong>KES ' + Number(t.amount || 0).toLocaleString() + '</strong></td>';
                    h += '<td>' + esc(t.accountReference || '-') + '</td>';
                    h += '<td><strong style="font-family:monospace;">' + esc(t.mpesaReceiptNumber || '-') + '</strong></td>';
                    h += '<td><span style="color:' + statusColor + ';font-weight:700;">' + statusIcon + ' ' + status.toUpperCase() + '</span></td>';
                    h += '</tr>';
                });
            }
            h += '</tbody></table>';
            container.innerHTML = h;
        } catch (e) {
            console.error('Error loading transactions:', e);
            container.innerHTML = '<p style="color:#999;text-align:center;padding:2rem;">Error loading transactions</p>';
        }
    }
};

// Make globally available
window.AdminMpesaComponent = AdminMpesaComponent;
