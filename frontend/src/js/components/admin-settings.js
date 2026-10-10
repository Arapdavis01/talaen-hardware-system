// ============================================
// ADMIN SETTINGS - With JWT Authentication
// Updated: parallel loads, shared settings fetch, proper escaping,
//          correct reset-password endpoint, UIService-based modals
// ============================================

const AdminSettingsComponent = {
    _activityFilter: 'all',

    // ✅ Cache settings so we don't fetch twice
    _settingsCache: null,
    _settingsFetchedAt: 0,
    _SETTINGS_TTL_MS: 30000,

    // ✅ HTML attribute escape helper (for onclick="..." embedded values)
    _esc(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/\\/g, '\\\\')
            .replace(/'/g, "\\'")
            .replace(/"/g, '&quot;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    },

    // ✅ HTML text escape helper (for cell contents)
    _escHtml(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    },

    // ============================================
    // RENDER
    // ============================================
    render: function() {
        var h = '';

        // Change Admin Password
        h += '<div class="card" style="margin-bottom:1.5rem;"><div class="card-header"><h3 class="card-title"><i class="fas fa-key"></i> Change Admin Password</h3></div><div class="card-body">';
        h += '<p style="color:#666;font-size:0.9rem;margin-bottom:1rem;">Change the password for your own admin account. To reset another user\'s password, use the Manage Users section below.</p>';
        h += '<div style="display:flex;gap:1rem;"><div style="position:relative;flex:1;"><input type="password" id="newAdminPass" class="form-control" placeholder="New admin password" style="padding-right:40px;"><button type="button" onclick="AdminSettingsComponent.toggleAdminPass()" style="position:absolute;right:10px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:#999;" id="adminPassToggle"><i class="fas fa-eye"></i></button></div><button class="btn btn-primary" onclick="AdminSettingsComponent.changeAdminPass()"><i class="fas fa-save"></i> Update</button></div>';
        h += '<div id="adminPassMsg" style="margin-top:0.5rem;"></div></div></div>';

        // Manage All Users
        h += '<div class="card" style="margin-bottom:1.5rem;"><div class="card-header"><h3 class="card-title"><i class="fas fa-users-cog"></i> Manage All Users</h3></div><div class="card-body">';
        h += '<div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr auto;gap:0.5rem;margin-bottom:1rem;align-items:end;">';
        h += '<div><label>Full Name</label><input type="text" id="cashierName" class="form-control" placeholder="John Doe"></div>';
        h += '<div><label>Username</label><input type="text" id="cashierUser" class="form-control" placeholder="john"></div>';
        h += '<div><label>Password</label><div style="position:relative;"><input type="text" id="cashierPass" class="form-control" placeholder="john123" style="padding-right:40px;"><button type="button" onclick="AdminSettingsComponent.toggleAddPass()" style="position:absolute;right:10px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:#999;" id="addPassToggle"><i class="fas fa-eye"></i></button></div></div>';
        h += '<div><label>Role</label><select id="cashierRole" class="form-control"><option value="cashier">Cashier</option><option value="admin">Admin</option></select></div>';
        h += '<button class="btn btn-success" id="addCashierBtn" onclick="AdminSettingsComponent.addUser()" style="height:42px;"><i class="fas fa-plus"></i> Add</button></div>';
        h += '<div id="userMsg" style="margin-bottom:0.5rem;"></div><div id="userList">Loading users...</div></div></div>';

        // Announcement
        h += '<div class="card" style="margin-bottom:1.5rem;"><div class="card-header" style="background:linear-gradient(135deg,#f59e0b,#d97706);color:white;"><h3 class="card-title" style="color:white;"><i class="fas fa-bullhorn"></i> Announcement Banner</h3></div><div class="card-body">';
        h += '<div class="form-group"><label>Message (leave empty to hide from cashiers)</label>';
        h += '<input type="text" id="announcementText" class="form-control" placeholder="Enter announcement message..." style="font-size:1.1rem;">';
        h += '</div>';
        h += '<button class="btn btn-primary" onclick="AdminSettingsComponent.saveAnnouncement()"><i class="fas fa-save"></i> Save Announcement</button>';
        h += '<div id="announcementMsg" style="margin-top:0.5rem;"></div>';
        h += '</div></div>';

        // M-Pesa
        h += '<div class="card" style="margin-bottom:1.5rem;"><div class="card-header" style="background:linear-gradient(135deg,#10b981,#059669);color:white;"><h3 class="card-title" style="color:white;"><i class="fas fa-mobile-alt"></i> M-Pesa API Configuration</h3></div><div class="card-body">';
        h += '<div id="mpesaConfigMsg" style="margin-bottom:0.5rem;"></div>';
        h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">';
        h += '<div class="form-group"><label>Consumer Key</label><input type="text" id="mpesaConsumerKey" class="form-control" placeholder="Enter Consumer Key"></div>';
        h += '<div class="form-group"><label>Consumer Secret</label><input type="text" id="mpesaConsumerSecret" class="form-control" placeholder="Enter Consumer Secret"></div>';
        h += '<div class="form-group"><label>Passkey</label><input type="text" id="mpesaPasskey" class="form-control" placeholder="Enter Passkey"></div>';
        h += '<div class="form-group"><label>Till Number</label><input type="text" id="mpesaTillNumber" class="form-control" placeholder="e.g., 174379"></div>';
        h += '<div class="form-group"><label>Short Code</label><input type="text" id="mpesaShortCode" class="form-control" placeholder="e.g., 174379"></div>';
        h += '<div class="form-group"><label>Environment</label><select id="mpesaEnv" class="form-control"><option value="sandbox">Sandbox (Testing)</option><option value="production">Production (Live)</option></select></div>';
        h += '</div>';
        h += '<button class="btn btn-success" id="saveMpesaBtn" onclick="AdminSettingsComponent.saveMpesaConfig()" style="margin-top:1rem;"><i class="fas fa-save"></i> Save M-Pesa Configuration</button>';
        h += '<div style="margin-top:1rem;padding:0.75rem;background:#f0fdf4;border-radius:0.5rem;display:flex;align-items:center;gap:0.5rem;">';
        h += '<i class="fas fa-info-circle" style="color:#10b981;"></i>';
        h += '<small style="color:#666;">M-Pesa credentials are required for STK Push payments. Get these from the Safaricom Daraja API portal.</small>';
        h += '</div></div></div>';

        // Activity
        h += '<div class="card"><div class="card-header"><h3 class="card-title"><i class="fas fa-history"></i> Recent Activity</h3><div style="display:flex;gap:0.5rem;flex-wrap:wrap;">';
        h += '<button class="btn btn-sm btn-primary activity-filter active" onclick="AdminSettingsComponent.filterActivity(\'all\',this)">All</button>';
        h += '<button class="btn btn-sm btn-outline activity-filter" onclick="AdminSettingsComponent.filterActivity(\'login\',this)"><i class="fas fa-sign-in-alt"></i> Logins</button>';
        h += '<button class="btn btn-sm btn-outline activity-filter" onclick="AdminSettingsComponent.filterActivity(\'sale\',this)"><i class="fas fa-shopping-cart"></i> Sales</button>';
        h += '<button class="btn btn-sm btn-outline activity-filter" onclick="AdminSettingsComponent.filterActivity(\'add_product\',this)"><i class="fas fa-plus-circle"></i> Products/Users</button>';
        h += '<button class="btn btn-sm btn-outline activity-filter" onclick="AdminSettingsComponent.filterActivity(\'update\',this)"><i class="fas fa-edit"></i> Edits</button>';
        h += '<button class="btn btn-sm btn-outline activity-filter" onclick="AdminSettingsComponent.filterActivity(\'password\',this)"><i class="fas fa-key"></i> Passwords</button>';
        h += '<button class="btn btn-sm btn-danger" id="clearActivityBtn" onclick="AdminSettingsComponent.clearActivity()"><i class="fas fa-trash"></i> Clear All</button>';
        h += '</div></div><div class="card-body"><div id="activityLog">Loading activity...</div></div></div>';

        // ✅ Parallel initial load — no more sequential chain via setTimeout
        setTimeout(function() {
            AdminSettingsComponent._loadInitialData();
        }, 100);

        return h;
    },

    // ============================================
    // INITIAL DATA (parallel)
    // ============================================
    async _loadInitialData() {
        // Fire everything at once; each loader renders independently
        await Promise.allSettled([
            this.loadUsers(),
            this.loadActivity(),
            this.loadSettings(),   // ✅ single fetch → feeds announcement + password display
            this.loadMpesaConfig()
        ]);
    },

    // ✅ Shared settings fetch
    async _getSettings(forceFresh) {
        var now = Date.now();
        if (!forceFresh && this._settingsCache && (now - this._settingsFetchedAt) < this._SETTINGS_TTL_MS) {
            return this._settingsCache;
        }
        try {
            var s = await ApiService.get('/settings');
            this._settingsCache = s || {};
            this._settingsFetchedAt = now;
        } catch (e) {
            if (!this._settingsCache) this._settingsCache = {};
        }
        return this._settingsCache;
    },

    async loadSettings() {
        var s = await this._getSettings(true);
        var input = document.getElementById('announcementText');
        if (input) input.value = s.announcement || '';
        // Note: we no longer expose the stored admin password.
        // The value in the DB is a bcrypt hash and not human-readable.
    },

    // ============================================
    // ANNOUNCEMENT
    // ============================================
    saveAnnouncement: function() {
        var text = document.getElementById('announcementText').value.trim();
        var self = this;
        ApiService.put('/settings', { announcement: text })
            .then(function(d) {
                if (d && d.success) {
                    self.showMsg('announcementMsg', 'Announcement saved!', 'success');
                    self._settingsCache = null; // invalidate
                } else {
                    self.showMsg('announcementMsg', 'Failed to save', 'danger');
                }
            })
            .catch(function(e) {
                self.showMsg('announcementMsg', 'Error: ' + e.message, 'danger');
            });
    },

    // ============================================
    // M-PESA
    // ============================================
    loadMpesaConfig: async function() {
        try {
            var config = await ApiService.get('/mpesa/config');
            var ck = document.getElementById('mpesaConsumerKey');
            var cs = document.getElementById('mpesaConsumerSecret');
            var pk = document.getElementById('mpesaPasskey');
            var tn = document.getElementById('mpesaTillNumber');
            var sc = document.getElementById('mpesaShortCode');
            var env = document.getElementById('mpesaEnv');

            // ✅ Blank out sensitive fields so credentials aren't exposed
            if (ck) ck.value = '';
            if (cs) cs.value = '';
            if (pk) pk.value = '';
            if (tn) tn.value = config.tillNumber || '';
            if (sc) sc.value = config.shortCode || '';
            if (env) env.value = config.environment || 'sandbox';
        } catch(e) {
            console.error('Error loading M-Pesa config:', e);
        }
    },

    saveMpesaConfig: async function() {
        var btn = document.getElementById('saveMpesaBtn');
        var originalHtml = btn ? btn.innerHTML : '';
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        }
        try {
            var data = await ApiService.put('/mpesa/config', {
                consumerKey: document.getElementById('mpesaConsumerKey').value.trim(),
                consumerSecret: document.getElementById('mpesaConsumerSecret').value.trim(),
                passkey: document.getElementById('mpesaPasskey').value.trim(),
                tillNumber: document.getElementById('mpesaTillNumber').value.trim(),
                shortCode: document.getElementById('mpesaShortCode').value.trim(),
                environment: document.getElementById('mpesaEnv').value
            });
            if (data && data.success) {
                this.showMsg('mpesaConfigMsg', 'M-Pesa configuration saved!', 'success');
            } else {
                this.showMsg('mpesaConfigMsg', 'Failed to save', 'danger');
            }
        } catch(e) {
            this.showMsg('mpesaConfigMsg', 'Error: ' + e.message, 'danger');
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = originalHtml;
            }
        }
    },

    // ============================================
    // ACTIVITY
    // ============================================
    filterActivity: function(filter, btn) {
        this._activityFilter = filter;
        document.querySelectorAll('.activity-filter').forEach(function(b) {
            b.className = 'btn btn-sm btn-outline activity-filter';
        });
        btn.className = 'btn btn-sm btn-primary activity-filter active';
        var clearBtn = document.getElementById('clearActivityBtn');
        if (clearBtn) {
            var labels = {
                all: 'Clear All',
                login: 'Clear Logins',
                sale: 'Clear Sales',
                add_product: 'Clear Products/Users',
                update: 'Clear Edits',
                password: 'Clear Passwords'
            };
            clearBtn.innerHTML = '<i class="fas fa-trash"></i> ' + (labels[filter] || 'Clear All');
        }
        this.loadActivity();
    },

    showMsg: function(elId, msg, type) {
        var el = document.getElementById(elId);
        if (!el) return;
        var color = type === 'success' ? '#10b981' : '#ef4444';
        el.innerHTML = '<span style="color:' + color + ';font-weight:600;">' + this._escHtml(msg) + '</span>';
        setTimeout(function(){ if (el) el.innerHTML = ''; }, 5000);
    },

    clearActivity: function() {
        var self = this;
        var filter = this._activityFilter || 'all';
        var labels = {
            all: 'all activity logs',
            login: 'all login/logout logs',
            sale: 'all sales logs',
            add_product: 'all product/user logs',
            update: 'all edit logs',
            password: 'all password logs'
        };
        var msg = 'Delete ' + (labels[filter] || 'all activity logs') + '? This cannot be undone!';

        UIService.confirm('Clear Activity', msg, 'Delete', 'danger').then(function(confirmed) {
            if (!confirmed) return;
            ApiService.delete('/activity')
                .then(function() {
                    self.loadActivity();
                    self.showMsg('userMsg', 'Activity cleared!', 'success');
                });
        });
    },

    loadActivity: function() {
        var log = document.getElementById('activityLog');
        if (!log) return;
        var filter = this._activityFilter || 'all';

        // ✅ Bounded fetch
        ApiService.get('/activity?limit=200').then(function(logs) {
            logs = logs || [];
            var filtered = logs;

            // ✅ Filters match the actual backend action names
            if (filter === 'login') {
                filtered = logs.filter(function(l){ return l.action === 'login' || l.action === 'logout'; });
            } else if (filter === 'sale') {
                filtered = logs.filter(function(l){ return l.action === 'sale' || l.action === 'return'; });
            } else if (filter === 'add_product') {
                filtered = logs.filter(function(l){ return l.action === 'add_product' || l.action === 'add_user' || l.action === 'purchase_order'; });
            } else if (filter === 'update') {
                filtered = logs.filter(function(l){ return l.action === 'update_user' || l.action === 'toggle_user' || l.action === 'update_product'; });
            } else if (filter === 'password') {
                filtered = logs.filter(function(l){ return l.action === 'password_change' || l.action === 'password_reset'; });
            }

            var h = '<table class="table"><thead><tr><th>Date</th><th>User</th><th>Action</th><th>Details</th></tr></thead><tbody>';
            if (!filtered.length) {
                h += '<tr><td colspan="4" style="text-align:center;color:#999;padding:2rem;">No activity</td></tr>';
            } else {
                var esc = function(s){ return AdminSettingsComponent._escHtml(s); };
                filtered.forEach(function(l) {
                    var badgeMap = {
                        'login': 'badge-info', 'logout': 'badge-secondary',
                        'sale': 'badge-primary', 'return': 'badge-warning',
                        'add_product': 'badge-success', 'add_user': 'badge-success',
                        'purchase_order': 'badge-primary', 'po_received': 'badge-success',
                        'update_user': 'badge-warning', 'toggle_user': 'badge-warning',
                        'update_product': 'badge-warning',
                        'password_change': 'badge-danger', 'password_reset': 'badge-danger',
                        'delete_payment': 'badge-danger', 'credit_refund': 'badge-danger',
                        'credit_overpayment': 'badge-info', 'credit_applied': 'badge-info'
                    };
                    var cls = badgeMap[l.action] || 'badge-info';
                    var label = (l.action || 'unknown').replace(/_/g, ' ');
                    h += '<tr>';
                    h += '<td><small>' + (l.date ? new Date(l.date).toLocaleString('en-KE') : '-') + '</small></td>';
                    h += '<td><strong>' + esc(l.userName || 'System') + '</strong></td>';
                    h += '<td><span class="badge ' + cls + '">' + esc(label) + '</span></td>';
                    h += '<td>' + esc(l.details || '') + '</td>';
                    h += '</tr>';
                });
            }
            h += '</tbody></table>';
            log.innerHTML = h;
        }).catch(function(e){
            log.innerHTML = '<p style="color:#ef4444;text-align:center;padding:2rem;">Error loading activity: ' + AdminSettingsComponent._escHtml(e.message) + '</p>';
        });
    },

    // ============================================
    // PASSWORDS
    // ============================================
    toggleAdminPass: function() {
        var f = document.getElementById('newAdminPass');
        var b = document.getElementById('adminPassToggle');
        if (!f || !b) return;
        if (f.type === 'password') {
            f.type = 'text';
            b.innerHTML = '<i class="fas fa-eye-slash"></i>';
        } else {
            f.type = 'password';
            b.innerHTML = '<i class="fas fa-eye"></i>';
        }
    },

    toggleAddPass: function() {
        var f = document.getElementById('cashierPass');
        var b = document.getElementById('addPassToggle');
        if (!f || !b) return;
        if (f.type === 'password') {
            f.type = 'text';
            b.innerHTML = '<i class="fas fa-eye-slash"></i>';
        } else {
            f.type = 'password';
            b.innerHTML = '<i class="fas fa-eye"></i>';
        }
    },

    // ✅ Updates the CURRENT admin's own password (was hardcoded to user #1)
    changeAdminPass: function() {
        var p = document.getElementById('newAdminPass').value.trim();
        if (!p || p.length < 6) {
            showStyledAlert('Error', 'Password must be at least 6 characters!', 'times-circle', '#ef4444');
            return;
        }

        var userJson = localStorage.getItem('user');
        var user = null;
        try { user = userJson ? JSON.parse(userJson) : null; } catch (e) {}

        if (!user || !user.id) {
            this.showMsg('adminPassMsg', 'Could not determine current user', 'danger');
            return;
        }

        var self = this;
        ApiService.put('/users/' + user.id, { password: p })
            .then(function(d) {
                if (d && d.success) {
                    self.showMsg('adminPassMsg', 'Your password has been updated!', 'success');
                    document.getElementById('newAdminPass').value = '';
                    self.loadActivity();
                } else {
                    self.showMsg('adminPassMsg', (d && d.message) || 'Failed to update password', 'danger');
                }
            })
            .catch(function(e) {
                self.showMsg('adminPassMsg', 'Error: ' + e.message, 'danger');
            });
    },

    // ============================================
    // USERS
    // ============================================
    loadUsers: function() {
        var list = document.getElementById('userList');
        if (!list) return;

        ApiService.get('/users').then(function(users) {
            users = users || [];
            var esc = function(s){ return AdminSettingsComponent._escHtml(s); };
            var escAttr = function(s){ return AdminSettingsComponent._esc(s); };

            var h = '<table class="table"><thead><tr><th>Name</th><th>Username</th><th>Role</th><th>Password</th><th>Status</th><th>Actions</th></tr></thead><tbody>';
            if (!users.length) {
                h += '<tr><td colspan="6" style="text-align:center;padding:2rem;">No users</td></tr>';
            } else {
                users.forEach(function(c) {
                    var pwId = 'pw_' + c.id;
                    var safePw = escAttr(c.password || '');
                    var safeName = escAttr(c.fullName || '');
                    var safeUser = escAttr(c.username || '');

                    h += '<tr>';
                    h += '<td><strong>' + esc(c.fullName) + '</strong></td>';
                    h += '<td>' + esc(c.username) + '</td>';
                    h += '<td><span class="badge ' + (c.role === 'admin' ? 'badge-success' : 'badge-info') + '">' + esc(c.role) + '</span></td>';
                    h += '<td><div style="display:flex;align-items:center;gap:0.5rem;"><code id="' + pwId + '" data-real="' + safePw + '">....</code>';
                    h += '<button class="btn btn-sm btn-outline" onclick="var e=document.getElementById(\'' + pwId + '\');e.textContent=e.textContent===\'....\'?e.dataset.real:\'....\'"><i class="fas fa-eye"></i></button></div></td>';
                    h += '<td><span class="badge ' + (c.isActive ? 'badge-success' : 'badge-danger') + '">' + (c.isActive ? 'Active' : 'Inactive') + '</span></td>';
                    h += '<td style="white-space:nowrap;">';
                    h += '<button class="btn btn-sm btn-primary" onclick="AdminSettingsComponent.editUser(' + c.id + ',\'' + safeName + '\',\'' + safeUser + '\')" title="Edit"><i class="fas fa-edit"></i></button> ';
                    h += '<button class="btn btn-sm btn-warning" onclick="AdminSettingsComponent.resetPassword(' + c.id + ',\'' + safeName + '\')" title="Reset password"><i class="fas fa-key"></i></button> ';
                    if (c.role !== 'admin') {
                        h += '<button class="btn btn-sm ' + (c.isActive ? 'btn-danger' : 'btn-success') + '" onclick="AdminSettingsComponent.removeUser(' + c.id + ',' + (c.isActive ? 1 : 0) + ',\'' + safeName + '\')" title="' + (c.isActive ? 'Deactivate' : 'Activate') + '">';
                        h += '<i class="fas ' + (c.isActive ? 'fa-user-slash' : 'fa-user-check') + '"></i>';
                        h += '</button>';
                    }
                    h += '</td></tr>';
                });
            }
            h += '</tbody></table>';
            list.innerHTML = h;
        }).catch(function(e) {
            list.innerHTML = '<p style="color:#ef4444;text-align:center;padding:2rem;">Error loading users</p>';
        });
    },

    addUser: function() {
        var n = document.getElementById('cashierName').value.trim();
        var u = document.getElementById('cashierUser').value.trim();
        var p = document.getElementById('cashierPass').value.trim();
        var r = document.getElementById('cashierRole').value;

        if (!n || !u || !p) {
            showStyledAlert('Required', 'All fields required!', 'exclamation-triangle', '#f59e0b');
            return;
        }
        if (p.length < 6) {
            showStyledAlert('Weak Password', 'Password must be at least 6 characters.', 'exclamation-triangle', '#f59e0b');
            return;
        }

        var btn = document.getElementById('addCashierBtn');
        var self = this;
        var originalHtml = btn ? btn.innerHTML : '';
        if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding...'; }

        ApiService.post('/users', {
            username: u,
            password: p,
            role: r,
            fullName: n
        }).then(function(d) {
            if (btn) { btn.disabled = false; btn.innerHTML = originalHtml; }
            if (d && (d.success || d.id)) {
                self.showMsg('userMsg', 'User added!', 'success');
                document.getElementById('cashierName').value = '';
                document.getElementById('cashierUser').value = '';
                document.getElementById('cashierPass').value = '';
                self.loadUsers();
                self.loadActivity();
            } else {
                self.showMsg('userMsg', (d && d.message) || 'Failed', 'danger');
            }
        }).catch(function(e) {
            if (btn) { btn.disabled = false; btn.innerHTML = originalHtml; }
            self.showMsg('userMsg', 'Error: ' + e.message, 'danger');
        });
    },

    editUser: function(id, name, username) {
        var self = this;
        var esc = this._escHtml;
        var modal = UIService.showModal(
            '<i class="fas fa-edit"></i> Edit: ' + esc(name),
            '<div class="form-group"><label>Full Name</label><input type="text" id="editName" class="form-control" value="' + this._esc(name) + '"></div>' +
            '<div class="form-group"><label>Username</label><input type="text" id="editUsername" class="form-control" value="' + this._esc(username) + '"></div>',
            [
                {
                    text: 'Cancel',
                    class: 'btn-outline',
                    onClick: function(m) { m.remove(); }
                },
                {
                    text: 'Save',
                    icon: 'fas fa-save',
                    class: 'btn-primary',
                    onClick: function(m) {
                        var nn = document.getElementById('editName').value.trim();
                        var nu = document.getElementById('editUsername').value.trim();
                        if (!nn || !nu) {
                            showStyledAlert('Required', 'All fields required!', 'exclamation-triangle', '#f59e0b');
                            return;
                        }
                        ApiService.put('/users/' + id, { fullName: nn, username: nu })
                            .then(function(d) {
                                if (d && d.success) {
                                    self.showMsg('userMsg', 'User updated!', 'success');
                                    m.remove();
                                    self.loadUsers();
                                    self.loadActivity();
                                } else {
                                    showStyledAlert('Error', (d && d.message) || 'Update failed', 'times-circle', '#ef4444');
                                }
                            });
                    }
                }
            ]
        );
        return modal;
    },

    resetPassword: function(id, name) {
        var self = this;
        var esc = this._escHtml;
        var modal = UIService.showModal(
            '<i class="fas fa-key"></i> Reset Password: ' + esc(name),
            '<div class="form-group"><label>New Password</label><input type="text" id="resetPass" class="form-control" placeholder="New password (min 6 chars)"></div>',
            [
                {
                    text: 'Cancel',
                    class: 'btn-outline',
                    onClick: function(m) { m.remove(); }
                },
                {
                    text: 'Reset',
                    icon: 'fas fa-save',
                    class: 'btn-warning',
                    onClick: function(m) {
                        var np = document.getElementById('resetPass').value.trim();
                        if (!np || np.length < 6) {
                            showStyledAlert('Error', 'Password must be at least 6 characters!', 'times-circle', '#ef4444');
                            return;
                        }
                        // ✅ Use the dedicated reset-password endpoint
                        ApiService.post('/users/' + id + '/reset-password', { newPassword: np })
                            .then(function(d) {
                                if (d && d.success) {
                                    self.showMsg('userMsg', 'Password reset!', 'success');
                                    m.remove();
                                    self.loadActivity();
                                    self.loadUsers();
                                } else {
                                    showStyledAlert('Error', (d && d.message) || 'Reset failed', 'times-circle', '#ef4444');
                                }
                            });
                    }
                }
            ]
        );
        return modal;
    },

    removeUser: function(id, isActive, name) {
        var self = this;
        var action = isActive ? 'Deactivate' : 'Activate';
        var msg = isActive
            ? 'This will deactivate <strong>' + this._escHtml(name) + '</strong>. They will not be able to login.'
            : 'This will activate <strong>' + this._escHtml(name) + '</strong>. They will be able to login again.';

        UIService.confirm(action + ' User', msg, action, isActive ? 'danger' : 'success').then(function(confirmed) {
            if (!confirmed) return;
            ApiService.put('/users/' + id, { toggle: true })
                .then(function(d) {
                    if (d && d.success) {
                        self.loadUsers();
                        self.loadActivity();
                        self.showMsg('userMsg', 'User ' + action.toLowerCase() + 'd!', 'success');
                    }
                });
        });
    }
};

// Make globally available
window.AdminSettingsComponent = AdminSettingsComponent;
