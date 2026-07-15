// ============================================
// CASHIER SETTINGS - With JWT Authentication
// ============================================

const CashierSettingsComponent = {
    // ✅ Helper to get current user from JWT
    _getCurrentUser() {
        const userJson = localStorage.getItem('user');
        try {
            return userJson ? JSON.parse(userJson) : null;
        } catch (e) {
            return null;
        }
    },

    render() {
        var user = this._getCurrentUser();
        
        return '<div class="card" style="margin-bottom:1.5rem;"><div class="card-header"><h3 class="card-title"><i class="fas fa-key"></i> Change My Password</h3></div><div class="card-body">' +
            '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:1rem;">' +
            '<div class="form-group"><label class="form-label">Current Password</label><div style="position:relative;"><input type="password" id="currentPass" class="form-control" placeholder="Current password" style="padding-right:40px;"><button type="button" onclick="CashierSettingsComponent.togglePass(\'currentPass\',this)" style="position:absolute;right:10px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:#999;"><i class="fas fa-eye"></i></button></div></div>' +
            '<div class="form-group"><label class="form-label">New Password</label><div style="position:relative;"><input type="password" id="newPass" class="form-control" placeholder="New password" style="padding-right:40px;" oninput="CashierSettingsComponent.checkStrength()"><button type="button" onclick="CashierSettingsComponent.togglePass(\'newPass\',this)" style="position:absolute;right:10px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:#999;"><i class="fas fa-eye"></i></button></div><div id="strengthBar" style="margin-top:5px;"></div></div>' +
            '<div class="form-group"><label class="form-label">Confirm Password</label><div style="position:relative;"><input type="password" id="confirmPass" class="form-control" placeholder="Confirm new password" style="padding-right:40px;" oninput="CashierSettingsComponent.checkMatch()"><button type="button" onclick="CashierSettingsComponent.togglePass(\'confirmPass\',this)" style="position:absolute;right:10px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:#999;"><i class="fas fa-eye"></i></button></div><div id="matchIndicator" style="margin-top:5px;font-size:0.8rem;"></div></div>' +
            '</div>' +
            '<button class="btn btn-primary" onclick="CashierSettingsComponent.changePassword()"><i class="fas fa-save"></i> Update Password</button>' +
            '<div id="passMsg" style="margin-top:0.5rem;"></div>' +
            '</div></div>' +
            
            '<div class="card" style="margin-bottom:1.5rem;"><div class="card-header"><h3 class="card-title"><i class="fas fa-user-edit"></i> Edit My Profile</h3></div><div class="card-body">' +
            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">' +
            '<div class="form-group"><label class="form-label">Full Name</label><input type="text" id="editFullName" class="form-control" value="' + (user?.fullName || '') + '"></div>' +
            '<div class="form-group"><label class="form-label">Username</label><input type="text" id="editUsername" class="form-control" value="' + (user?.username || '') + '"></div>' +
            '</div>' +
            '<div class="form-group"><label class="form-label">Password (to confirm changes)</label><input type="password" id="profilePass" class="form-control" placeholder="Enter your password to save changes"></div>' +
            '<button class="btn btn-success" onclick="CashierSettingsComponent.updateProfile()"><i class="fas fa-save"></i> Update Profile</button>' +
            '<div id="profileMsg" style="margin-top:0.5rem;"></div>' +
            '</div></div>' +
            
            '<div class="card"><div class="card-header"><h3 class="card-title"><i class="fas fa-info-circle"></i> My Account Info</h3></div><div class="card-body">' +
            '<table class="table"><tr><td><strong>Name:</strong></td><td>' + (user?.fullName || 'Cashier') + '</td></tr>' +
            '<tr><td><strong>Username:</strong></td><td>' + (user?.username || 'N/A') + '</td></tr>' +
            '<tr><td><strong>Role:</strong></td><td><span class="badge badge-info">Cashier</span> <small style="color:#999;">(cannot be changed)</small></td></tr></table>' +
            '</div></div>';
    },

    showMsg(elId, msg, type) {
        var el = document.getElementById(elId); if (!el) return;
        el.innerHTML = '<span style="color:' + (type==='success'?'#10b981':'#ef4444') + ';font-weight:600;">' + (type==='success'?'✅ ':'❌ ') + msg + '</span>';
        setTimeout(function(){ el.innerHTML = ''; }, 5000);
    },

    togglePass(fieldId, btn) {
        var field = document.getElementById(fieldId);
        if (field.type === 'password') { 
            field.type = 'text'; 
            btn.innerHTML = '<i class="fas fa-eye-slash"></i>'; 
        } else { 
            field.type = 'password'; 
            btn.innerHTML = '<i class="fas fa-eye"></i>'; 
        }
    },

    checkStrength() {
        var pass = document.getElementById('newPass').value, bar = document.getElementById('strengthBar');
        if (!bar) return;
        var strength = 0;
        if (pass.length >= 4) strength++; 
        if (pass.length >= 6) strength++; 
        if (pass.length >= 8) strength++;
        if (/[A-Z]/.test(pass)) strength++; 
        if (/[0-9]/.test(pass)) strength++;
        var color = strength <= 2 ? '#ef4444' : strength <= 3 ? '#f59e0b' : strength <= 4 ? '#3b82f6' : '#10b981';
        var label = strength <= 2 ? 'Weak' : strength <= 3 ? 'Medium' : strength <= 4 ? 'Strong' : 'Very Strong';
        bar.innerHTML = '<div style="height:4px;background:#e5e7eb;border-radius:2px;"><div style="width:' + (strength*20) + '%;height:100%;background:' + color + ';border-radius:2px;"></div></div><small style="color:' + color + ';">' + label + '</small>';
    },

    checkMatch() {
        var np = document.getElementById('newPass').value, cp = document.getElementById('confirmPass').value, ind = document.getElementById('matchIndicator');
        if (!ind) return;
        if (!cp) { ind.innerHTML = ''; return; }
        ind.innerHTML = np === cp ? '<span style="color:#10b981;">Passwords match</span>' : '<span style="color:#ef4444;">Passwords do not match</span>';
    },

    // ============================================
    // ✅ UPDATED: Using ApiService with JWT
    // ============================================

    async changePassword() {
        var current = document.getElementById('currentPass').value, 
            newPass = document.getElementById('newPass').value, 
            confirm = document.getElementById('confirmPass').value;
        var user = this._getCurrentUser();
        
        if (!current || !newPass || !confirm) { 
            this.showMsg('passMsg', 'All fields required!', 'danger'); 
            return; 
        }
        if (newPass !== confirm) { 
            this.showMsg('passMsg', 'Passwords do not match!', 'danger'); 
            return; 
        }
        if (newPass.length < 4) { 
            this.showMsg('passMsg', 'Min 4 characters!', 'danger'); 
            return; 
        }
        
        try {
            // ✅ REPLACED: fetch with ApiService - verify current password via login
            const loginResult = await ApiService.post('/auth/login', {
                username: user.username,
                password: current
            });
            
            if (!loginResult.success) { 
                this.showMsg('passMsg', 'Current password incorrect!', 'danger'); 
                return; 
            }
            
            // ✅ REPLACED: fetch with ApiService - update password
            await ApiService.put('/users/' + user.id, { password: newPass });
            
            this.showMsg('passMsg', 'Password changed! Please login again.', 'success');
            setTimeout(function(){ 
                // Clear token and redirect to login
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = '/login.html';
            }, 2000);
        } catch(e) { 
            this.showMsg('passMsg', 'Error: ' + e.message, 'danger'); 
        }
    },

    async updateProfile() {
        var fullName = document.getElementById('editFullName').value.trim(), 
            username = document.getElementById('editUsername').value.trim(), 
            password = document.getElementById('profilePass').value;
        var user = this._getCurrentUser();
        
        if (!fullName || !username) { 
            this.showMsg('profileMsg', 'Name and username required!', 'danger'); 
            return; 
        }
        if (!password) { 
            this.showMsg('profileMsg', 'Enter password to confirm!', 'danger'); 
            return; 
        }
        
        try {
            // ✅ REPLACED: fetch with ApiService - verify password via login
            const loginResult = await ApiService.post('/auth/login', {
                username: user.username,
                password: password
            });
            
            if (!loginResult.success) { 
                this.showMsg('profileMsg', 'Password incorrect!', 'danger'); 
                return; 
            }
            
            // ✅ REPLACED: fetch with ApiService - update profile
            await ApiService.put('/users/' + user.id, { 
                fullName: fullName, 
                username: username 
            });
            
            // ✅ Update stored user info
            const updatedUser = await ApiService.get('/users/' + user.id);
            if (updatedUser) {
                localStorage.setItem('user', JSON.stringify(updatedUser));
            }
            
            this.showMsg('profileMsg', 'Profile updated! Please login again.', 'success');
            setTimeout(function(){ 
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = '/login.html';
            }, 2000);
        } catch(e) { 
            this.showMsg('profileMsg', 'Error: ' + e.message, 'danger'); 
        }
    }
};

// Make globally available
window.CashierSettingsComponent = CashierSettingsComponent;
