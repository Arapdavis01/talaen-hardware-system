// ============================================
// CASHIER SETTINGS - With JWT Authentication
// Updated: correct endpoint (/users/profile), no login-hack, min length 6,
//          SPA-safe redirects, escaping
// ============================================

const CashierSettingsComponent = {
    _getCurrentUser() {
        const userJson = localStorage.getItem('user');
        try {
            return userJson ? JSON.parse(userJson) : null;
        } catch (e) {
            return null;
        }
    },

    _escHtml(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    },

    // ============================================
    // RENDER
    // ============================================
    render() {
        var user = this._getCurrentUser();
        var esc = this._escHtml;
        var safeName = esc(user && user.fullName || '');
        var safeUser = esc(user && user.username || '');

        return '<div class="card" style="margin-bottom:1.5rem;"><div class="card-header"><h3 class="card-title"><i class="fas fa-key"></i> Change My Password</h3></div><div class="card-body">' +
            '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:1rem;">' +
            '<div class="form-group"><label class="form-label">Current Password</label><div style="position:relative;"><input type="password" id="currentPass" class="form-control" placeholder="Current password" style="padding-right:40px;" autocomplete="current-password"><button type="button" onclick="CashierSettingsComponent.togglePass(\'currentPass\',this)" style="position:absolute;right:10px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:#999;"><i class="fas fa-eye"></i></button></div></div>' +
            '<div class="form-group"><label class="form-label">New Password</label><div style="position:relative;"><input type="password" id="newPass" class="form-control" placeholder="Min 6 characters" style="padding-right:40px;" oninput="CashierSettingsComponent.checkStrength()" autocomplete="new-password"><button type="button" onclick="CashierSettingsComponent.togglePass(\'newPass\',this)" style="position:absolute;right:10px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:#999;"><i class="fas fa-eye"></i></button></div><div id="strengthBar" style="margin-top:5px;"></div></div>' +
            '<div class="form-group"><label class="form-label">Confirm Password</label><div style="position:relative;"><input type="password" id="confirmPass" class="form-control" placeholder="Confirm new password" style="padding-right:40px;" oninput="CashierSettingsComponent.checkMatch()" autocomplete="new-password"><button type="button" onclick="CashierSettingsComponent.togglePass(\'confirmPass\',this)" style="position:absolute;right:10px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:#999;"><i class="fas fa-eye"></i></button></div><div id="matchIndicator" style="margin-top:5px;font-size:0.8rem;"></div></div>' +
            '</div>' +
            '<button class="btn btn-primary" onclick="CashierSettingsComponent.changePassword()"><i class="fas fa-save"></i> Update Password</button>' +
            '<div id="passMsg" style="margin-top:0.5rem;"></div>' +
            '</div></div>' +

            '<div class="card" style="margin-bottom:1.5rem;"><div class="card-header"><h3 class="card-title"><i class="fas fa-user-edit"></i> Edit My Profile</h3></div><div class="card-body">' +
            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">' +
            '<div class="form-group"><label class="form-label">Full Name</label><input type="text" id="editFullName" class="form-control" value="' + safeName + '"></div>' +
            '<div class="form-group"><label class="form-label">Username <small style="color:#999;font-weight:400;">(contact admin to change)</small></label><input type="text" id="editUsername" class="form-control" value="' + safeUser + '" disabled></div>' +
            '</div>' +
            '<button class="btn btn-success" onclick="CashierSettingsComponent.updateProfile()"><i class="fas fa-save"></i> Update Profile</button>' +
            '<div id="profileMsg" style="margin-top:0.5rem;"></div>' +
            '</div></div>' +

            '<div class="card"><div class="card-header"><h3 class="card-title"><i class="fas fa-info-circle"></i> My Account Info</h3></div><div class="card-body">' +
            '<table class="table"><tr><td><strong>Name:</strong></td><td>' + (safeName || 'Cashier') + '</td></tr>' +
            '<tr><td><strong>Username:</strong></td><td>' + (safeUser || 'N/A') + '</td></tr>' +
            '<tr><td><strong>Role:</strong></td><td><span class="badge badge-info">Cashier</span> <small style="color:#999;">(cannot be changed)</small></td></tr></table>' +
            '</div></div>';
    },

    // ============================================
    // HELPERS
    // ============================================
    showMsg(elId, msg, type) {
        var el = document.getElementById(elId);
        if (!el) return;
        var color = type === 'success' ? '#10b981' : '#ef4444';
        var icon = type === 'success' ? '✅ ' : '❌ ';
        el.innerHTML = '<span style="color:' + color + ';font-weight:600;">' + icon + this._escHtml(msg) + '</span>';
        setTimeout(function() { if (el) el.innerHTML = ''; }, 5000);
    },

    togglePass(fieldId, btn) {
        var field = document.getElementById(fieldId);
        if (!field) return;
        if (field.type === 'password') {
            field.type = 'text';
            btn.innerHTML = '<i class="fas fa-eye-slash"></i>';
        } else {
            field.type = 'password';
            btn.innerHTML = '<i class="fas fa-eye"></i>';
        }
    },

    // ✅ Strength meter now aligns with backend requirement (min 6 chars)
    checkStrength() {
        var pass = (document.getElementById('newPass') || {}).value || '';
        var bar = document.getElementById('strengthBar');
        if (!bar) return;
        if (!pass) { bar.innerHTML = ''; return; }

        var strength = 0;
        if (pass.length >= 6) strength++;
        if (pass.length >= 10) strength++;
        if (/[A-Z]/.test(pass)) strength++;
        if (/[0-9]/.test(pass)) strength++;
        if (/[^A-Za-z0-9]/.test(pass)) strength++;

        var color, label;
        if (pass.length < 6) { color = '#ef4444'; label = 'Too short (min 6)'; }
        else if (strength <= 2) { color = '#ef4444'; label = 'Weak'; }
        else if (strength === 3) { color = '#f59e0b'; label = 'Medium'; }
        else if (strength === 4) { color = '#3b82f6'; label = 'Strong'; }
        else { color = '#10b981'; label = 'Very Strong'; }

        bar.innerHTML = '<div style="height:4px;background:#e5e7eb;border-radius:2px;"><div style="width:' + (strength * 20) + '%;height:100%;background:' + color + ';border-radius:2px;transition:width 0.2s;"></div></div><small style="color:' + color + ';">' + label + '</small>';
    },

    checkMatch() {
        var np = (document.getElementById('newPass') || {}).value || '';
        var cp = (document.getElementById('confirmPass') || {}).value || '';
        var ind = document.getElementById('matchIndicator');
        if (!ind) return;
        if (!cp) { ind.innerHTML = ''; return; }
        ind.innerHTML = np === cp
            ? '<span style="color:#10b981;">✓ Passwords match</span>'
            : '<span style="color:#ef4444;">✗ Passwords do not match</span>';
    },

    // ============================================
    // CHANGE PASSWORD
    // ✅ Uses the correct self-service endpoint: PUT /users/profile
    //    (the old code called PUT /users/:id which is admin-only)
    // ============================================
    async changePassword() {
        var current = document.getElementById('currentPass').value;
        var newPass = document.getElementById('newPass').value;
        var confirm = document.getElementById('confirmPass').value;

        if (!current || !newPass || !confirm) {
            this.showMsg('passMsg', 'All fields required!', 'danger');
            return;
        }
        if (newPass !== confirm) {
            this.showMsg('passMsg', 'Passwords do not match!', 'danger');
            return;
        }
        if (newPass.length < 6) {
            this.showMsg('passMsg', 'Password must be at least 6 characters!', 'danger');
            return;
        }
        if (current === newPass) {
            this.showMsg('passMsg', 'New password must be different from current.', 'danger');
            return;
        }

        var btn = event && event.target ? event.target.closest('button') : null;
        var originalHtml = btn ? btn.innerHTML : '';
        if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...'; }

        try {
            // ✅ Correct endpoint for a user updating their OWN password.
            //    The backend verifies `currentPassword` against the bcrypt hash
            //    and returns { success: false, message: 'Current password is incorrect' }
            //    if it doesn't match.
            var result = await ApiService.put('/users/profile', {
                currentPassword: current,
                newPassword: newPass
            });

            if (!result || !result.success) {
                this.showMsg('passMsg', (result && result.message) || 'Failed to update password', 'danger');
                return;
            }

            this.showMsg('passMsg', 'Password changed! Logging out...', 'success');
            var self = this;
            setTimeout(function() {
                // ✅ Clear session and redirect to SPA root
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                if (typeof ApiService !== 'undefined' && ApiService.clearCache) ApiService.clearCache();
                window.location.href = '/';
            }, 1500);

        } catch (e) {
            this.showMsg('passMsg', 'Error: ' + e.message, 'danger');
        } finally {
            if (btn) { btn.disabled = false; btn.innerHTML = originalHtml; }
        }
    },

    // ============================================
    // UPDATE PROFILE
    // ✅ Full name only — username changes are admin-only by design
    //    No password confirmation needed (backend doesn't require one)
    // ============================================
    async updateProfile() {
        var fullName = (document.getElementById('editFullName') || {}).value.trim ? document.getElementById('editFullName').value.trim() : '';
        var user = this._getCurrentUser();

        if (!user) {
            this.showMsg('profileMsg', 'You must be logged in.', 'danger');
            return;
        }
        if (!fullName) {
            this.showMsg('profileMsg', 'Full name is required.', 'danger');
            return;
        }
        if (fullName === (user.fullName || '')) {
            this.showMsg('profileMsg', 'No changes to save.', 'danger');
            return;
        }

        var btn = event && event.target ? event.target.closest('button') : null;
        var originalHtml = btn ? btn.innerHTML : '';
        if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...'; }

        try {
            var result = await ApiService.put('/users/profile', { fullName: fullName });

            if (!result || !result.success) {
                this.showMsg('profileMsg', (result && result.message) || 'Failed to update profile', 'danger');
                return;
            }

            // ✅ Update stored user so navbar/profile reflect the change immediately
            if (result.user) {
                localStorage.setItem('user', JSON.stringify(result.user));
            } else {
                // Fallback: refresh from server
                var fresh = await ApiService.get('/users/profile', { fresh: true });
                if (fresh) localStorage.setItem('user', JSON.stringify(fresh));
            }

            this.showMsg('profileMsg', 'Profile updated!', 'success');

            // ✅ Re-render so the "My Account Info" table shows the new name
            setTimeout(function() {
                if (typeof AppRouter !== 'undefined' && AppRouter.render) AppRouter.render();
            }, 800);

        } catch (e) {
            this.showMsg('profileMsg', 'Error: ' + e.message, 'danger');
        } finally {
            if (btn) { btn.disabled = false; btn.innerHTML = originalHtml; }
        }
    }
};

// Make globally available
window.CashierSettingsComponent = CashierSettingsComponent;
