const AdminSettingsComponent = {
    _activityFilter: 'all',

    render() {
        var h = '';
        
        // Change Admin Password
        h += '<div class="card" style="margin-bottom:1.5rem;"><div class="card-header"><h3 class="card-title"><i class="fas fa-key"></i> Change Admin Password</h3></div><div class="card-body">';
        h += '<div id="currentPasswordDisplay" style="background:#f5f5f5;padding:0.75rem 1rem;border-radius:0.5rem;margin-bottom:1rem;display:flex;justify-content:space-between;align-items:center;">';
        h += '<span><strong>Current Password:</strong> <code id="currentPassDisplay">Loading...</code></span>';
        h += '<button class="btn btn-sm btn-outline" onclick="AdminSettingsComponent.toggleShowCurrent()" id="showCurrentBtn"><i class="fas fa-eye"></i> Show</button></div>';
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
        
        // M-Pesa API Configuration
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
        
        // Recent Activity
        h += '<div class="card"><div class="card-header"><h3 class="card-title"><i class="fas fa-history"></i> Recent Activity</h3><div style="display:flex;gap:0.5rem;flex-wrap:wrap;">';
        h += '<button class="btn btn-sm btn-primary activity-filter active" onclick="AdminSettingsComponent.filterActivity(\'all\',this)">All</button>';
        h += '<button class="btn btn-sm btn-outline activity-filter" onclick="AdminSettingsComponent.filterActivity(\'login\',this)"><i class="fas fa-sign-in-alt"></i> Logins</button>';
        h += '<button class="btn btn-sm btn-outline activity-filter" onclick="AdminSettingsComponent.filterActivity(\'sale\',this)"><i class="fas fa-shopping-cart"></i> Sales</button>';
        h += '<button class="btn btn-sm btn-outline activity-filter" onclick="AdminSettingsComponent.filterActivity(\'add_product\',this)"><i class="fas fa-plus-circle"></i> Products/Users</button>';
        h += '<button class="btn btn-sm btn-outline activity-filter" onclick="AdminSettingsComponent.filterActivity(\'profile_update\',this)"><i class="fas fa-edit"></i> Edits</button>';
        h += '<button class="btn btn-sm btn-outline activity-filter" onclick="AdminSettingsComponent.filterActivity(\'password\',this)"><i class="fas fa-key"></i> Passwords</button>';
        h += '<button class="btn btn-sm btn-danger" id="clearActivityBtn" onclick="AdminSettingsComponent.clearActivity()"><i class="fas fa-trash"></i> Clear All</button>';
        h += '</div></div><div class="card-body"><div id="activityLog">Loading activity...</div></div></div>';
        
        setTimeout(function(){ 
            AdminSettingsComponent.loadUsers(); 
            AdminSettingsComponent.loadActivity(); 
            AdminSettingsComponent.loadCurrentPassword(); 
            AdminSettingsComponent.loadMpesaConfig();
        }, 300);
        
        return h;
    },

    // ========== M-PESA CONFIG ==========
    async loadMpesaConfig() {
        try {
            var res = await fetch('/api/mpesa/config');
            var config = await res.json();
            var ck = document.getElementById('mpesaConsumerKey');
            var cs = document.getElementById('mpesaConsumerSecret');
            var pk = document.getElementById('mpesaPasskey');
            var tn = document.getElementById('mpesaTillNumber');
            var sc = document.getElementById('mpesaShortCode');
            var env = document.getElementById('mpesaEnv');
            if (ck) ck.value = '';
            if (cs) cs.value = '';
            if (pk) pk.value = '';
            if (tn) tn.value = config.tillNumber || '';
            if (sc) sc.value = config.shortCode || '';
            if (env) env.value = config.environment || 'sandbox';
        } catch(e) {}
    },

    async saveMpesaConfig() {
        var btn = document.getElementById('saveMpesaBtn');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        try {
            var res = await fetch('/api/mpesa/config', {
                method: 'PUT',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    consumerKey: document.getElementById('mpesaConsumerKey').value.trim(),
                    consumerSecret: document.getElementById('mpesaConsumerSecret').value.trim(),
                    passkey: document.getElementById('mpesaPasskey').value.trim(),
                    tillNumber: document.getElementById('mpesaTillNumber').value.trim(),
                    shortCode: document.getElementById('mpesaShortCode').value.trim(),
                    environment: document.getElementById('mpesaEnv').value
                })
            });
            var data = await res.json();
            if (data.success) {
                this.showMsg('mpesaConfigMsg', 'M-Pesa configuration saved!', 'success');
            } else {
                this.showMsg('mpesaConfigMsg', 'Failed to save', 'danger');
            }
        } catch(e) {
            this.showMsg('mpesaConfigMsg', 'Error: ' + e.message, 'danger');
        }
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-save"></i> Save M-Pesa Configuration';
    },

    // ========== EXISTING FUNCTIONS ==========
    filterActivity(filter, btn) {
        this._activityFilter = filter;
        document.querySelectorAll('.activity-filter').forEach(function(b) { b.className = 'btn btn-sm btn-outline activity-filter'; });
        btn.className = 'btn btn-sm btn-primary activity-filter active';
        var clearBtn = document.getElementById('clearActivityBtn');
        if (clearBtn) {
            var labels = { all: 'Clear All', login: 'Clear Logins', sale: 'Clear Sales', add_product: 'Clear Products/Users', profile_update: 'Clear Edits', password: 'Clear Passwords' };
            clearBtn.innerHTML = '<i class="fas fa-trash"></i> ' + (labels[filter] || 'Clear All');
        }
        this.loadActivity();
    },

    showMsg(elId, msg, type) {
        var el = document.getElementById(elId); if (!el) return;
        el.innerHTML = '<span style="color:' + (type==='success'?'#10b981':'#ef4444') + ';font-weight:600;">' + (type==='success'?'✅ ':'❌ ') + msg + '</span>';
        setTimeout(function(){ el.innerHTML = ''; }, 5000);
    },

    loadCurrentPassword() {
        fetch('/api/settings').then(function(r){return r.json();}).then(function(s){
            if (s && s.adminPassword) { document.getElementById('currentPassDisplay').textContent = '........'; document.getElementById('currentPassDisplay').dataset.realPass = s.adminPassword; }
        });
    },

    toggleShowCurrent() {
        var el = document.getElementById('currentPassDisplay'), btn = document.getElementById('showCurrentBtn');
        if (el.textContent === '........') { el.textContent = el.dataset.realPass || 'N/A'; btn.innerHTML = '<i class="fas fa-eye-slash"></i> Hide'; }
        else { el.textContent = '........'; btn.innerHTML = '<i class="fas fa-eye"></i> Show'; }
    },

    toggleAdminPass() { var f=document.getElementById('newAdminPass'),b=document.getElementById('adminPassToggle'); if(f.type==='password'){f.type='text';b.innerHTML='<i class="fas fa-eye-slash"></i>';}else{f.type='password';b.innerHTML='<i class="fas fa-eye"></i>';} },
    toggleAddPass() { var f=document.getElementById('cashierPass'),b=document.getElementById('addPassToggle'); if(f.type==='password'){f.type='text';b.innerHTML='<i class="fas fa-eye-slash"></i>';}else{f.type='password';b.innerHTML='<i class="fas fa-eye"></i>';} },

    changeAdminPass() {
        var p = document.getElementById('newAdminPass').value.trim(); if (!p || p.length < 4) { showStyledAlert('Error', 'Password must be at least 4 characters!', 'times-circle', '#ef4444'); return; }
        var self = this;
        Promise.all([fetch('/api/settings',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({adminPassword:p})}),fetch('/api/users/1',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:p})})]).then(function(){self.showMsg('adminPassMsg','Password updated!','success');document.getElementById('newAdminPass').value='';self.loadActivity();}).catch(function(e){self.showMsg('adminPassMsg','Error: '+e.message,'danger');});
    },

    addUser() {
        var n=document.getElementById('cashierName').value.trim(),u=document.getElementById('cashierUser').value.trim(),p=document.getElementById('cashierPass').value.trim(),r=document.getElementById('cashierRole').value;
        if(!n||!u||!p){showStyledAlert('Required', 'All fields required!', 'exclamation-triangle', '#f59e0b');return;}
        var btn=document.getElementById('addCashierBtn'),self=this;btn.disabled=true;btn.innerHTML='Adding...';
        fetch('/api/users',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:u,password:p,role:r,fullName:n,adminName:'Admin'})}).then(function(r){return r.json();}).then(function(d){btn.disabled=false;btn.innerHTML='<i class="fas fa-plus"></i> Add';if(d.success||d.id){self.showMsg('userMsg','User added!','success');document.getElementById('cashierName').value='';document.getElementById('cashierUser').value='';document.getElementById('cashierPass').value='';self.loadUsers();self.loadActivity();}else{self.showMsg('userMsg',d.message||'Failed','danger');}}).catch(function(e){btn.disabled=false;btn.innerHTML='<i class="fas fa-plus"></i> Add';self.showMsg('userMsg','Error: '+e.message,'danger');});
    },

    loadUsers() {
        var list=document.getElementById('userList');if(!list)return;
        fetch('/api/users').then(function(r){return r.json();}).then(function(users){
            var h='<table class="table"><thead><tr><th>Name</th><th>Username</th><th>Role</th><th>Password</th><th>Status</th><th>Actions</th></tr></thead><tbody>';
            if(!users.length){h+='<tr><td colspan="6">No users</td></tr>';}
            else{users.forEach(function(c){var pwId='pw_'+c.id;
                h+='<tr><td><strong>'+c.fullName+'</strong></td><td>'+c.username+'</td><td><span class="badge '+(c.role==='admin'?'badge-success':'badge-info')+'">'+c.role+'</span></td>';
                h+='<td><div style="display:flex;align-items:center;gap:0.5rem;"><code id="'+pwId+'" data-real="'+c.password+'">....</code><button class="btn btn-sm btn-outline" onclick="var e=document.getElementById(\''+pwId+'\');e.textContent=e.textContent===\'....\'?e.dataset.real:\'....\'"><i class="fas fa-eye"></i></button></div></td>';
                h+='<td><span class="badge '+(c.isActive?'badge-success':'badge-danger')+'">'+(c.isActive?'Active':'Inactive')+'</span></td>';
                h+='<td>';
                h+='<button class="btn btn-sm btn-primary" onclick="AdminSettingsComponent.editUser('+c.id+',\''+c.fullName+'\',\''+c.username+'\')"><i class="fas fa-edit"></i></button> ';
                h+='<button class="btn btn-sm btn-warning" onclick="AdminSettingsComponent.resetPassword('+c.id+',\''+c.fullName+'\',\''+(c.password||'')+'\')"><i class="fas fa-key"></i></button> ';
                if (c.role !== 'admin') {
                    h+='<button class="btn btn-sm '+(c.isActive?'btn-danger':'btn-success')+'" onclick="AdminSettingsComponent.removeUser('+c.id+','+c.isActive+',\''+c.fullName+'\')"><i class="fas '+(c.isActive?'fa-user-slash':'fa-user-check')+'"></i> '+(c.isActive?'Deactivate':'Activate')+'</button>';
                }
                h+='</td></tr>';
            });}h+='</tbody></table>';list.innerHTML=h;
        });
    },

    editUser(id, name, username) {
        var m=document.createElement('div');m.className='modal-overlay';
        m.innerHTML='<div class="modal"><div class="modal-header"><h3><i class="fas fa-edit"></i> Edit: '+name+'</h3><button class="btn btn-sm" onclick="this.closest(\'.modal-overlay\').remove()">X</button></div><div class="modal-body"><div class="form-group"><label>Full Name</label><input type="text" id="editName" class="form-control" value="'+name+'"></div><div class="form-group"><label>Username</label><input type="text" id="editUsername" class="form-control" value="'+username+'"></div></div><div class="modal-footer"><button class="btn btn-outline" onclick="this.closest(\'.modal-overlay\').remove()">Cancel</button><button class="btn btn-primary" id="saveEditBtn"><i class="fas fa-save"></i> Save</button></div></div>';
        document.body.appendChild(m);m.onclick=function(e){if(e.target===m)m.remove();};var self=this;
        m.querySelector('#saveEditBtn').onclick=function(){var nn=document.getElementById('editName').value.trim(),nu=document.getElementById('editUsername').value.trim();if(!nn||!nu){showStyledAlert('Required', 'All fields required!', 'exclamation-triangle', '#f59e0b');return;}fetch('/api/users/'+id,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({fullName:nn,username:nu})}).then(function(){self.showMsg('userMsg','Updated!','success');m.remove();self.loadUsers();self.loadActivity();});};
    },

    resetPassword(id, name, currentPass) {
        var self = this;
        var m = document.createElement('div'); m.className = 'modal-overlay';
        m.innerHTML = '<div class="modal"><div class="modal-header" style="background:linear-gradient(135deg,#f59e0b,#d97706);color:white;"><h3 style="color:white;"><i class="fas fa-key"></i> Reset: ' + name + '</h3><button class="btn btn-sm" style="color:white;" onclick="this.closest(\'.modal-overlay\').remove()">X</button></div><div class="modal-body"><div style="background:#f5f5f5;padding:0.75rem;border-radius:0.5rem;margin-bottom:1rem;"><strong>Current:</strong> <code id="oldPassDisplay">....</code> <button class="btn btn-sm btn-outline" id="showOldPassBtn">Show</button></div><div class="form-group"><label>New Password</label><input type="text" id="resetPass" class="form-control" placeholder="New password"></div></div><div class="modal-footer"><button class="btn btn-outline" id="cancelReset">Cancel</button><button class="btn btn-warning" id="confirmReset"><i class="fas fa-save"></i> Reset</button></div></div>';
        document.body.appendChild(m);
        m.onclick = function(e) { if (e.target === m) m.remove(); };
        m.querySelector('#oldPassDisplay').dataset.real = currentPass || '';
        m.querySelector('#showOldPassBtn').onclick = function() { var e=document.getElementById('oldPassDisplay'); if(e.textContent==='....'){e.textContent=e.dataset.real||'';this.textContent='Hide';}else{e.textContent='....';this.textContent='Show';} };
        m.querySelector('#cancelReset').onclick = function() { m.remove(); };
        m.querySelector('#confirmReset').onclick = function() {
            var np = document.getElementById('resetPass').value.trim(); if (!np || np.length < 4) { showStyledAlert('Error', 'Password must be at least 4 characters!', 'times-circle', '#ef4444'); return; }
            fetch('/api/users/'+id,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:np})}).then(function(){ self.showMsg('userMsg', 'Password reset!', 'success'); m.remove(); self.loadActivity(); self.loadUsers(); });
        };
    },

    removeUser(id, isActive, name) {
        var self = this;
        var action = isActive ? 'Deactivate' : 'Activate';
        var icon = isActive ? '🔒' : '🔓';
        var msg = isActive ? 'This will deactivate the user. They will not be able to login.' : 'This will activate the user. They will be able to login again.';
        
        var m = document.createElement('div'); m.className = 'modal-overlay';
        m.innerHTML = '<div class="modal"><div class="modal-header" style="background:linear-gradient(135deg,'+(isActive?'#ef4444,#dc2626':'#10b981,#059669')+');color:white;"><h3 style="color:white;"><i class="fas '+(isActive?'fa-user-slash':'fa-user-check')+'"></i> ' + action + ' User: ' + name + '</h3><button class="btn btn-sm" style="color:white;" onclick="this.closest(\'.modal-overlay\').remove()">X</button></div><div class="modal-body" style="text-align:center;"><div style="font-size:3rem;margin-bottom:1rem;">' + icon + '</div><h3>' + action + ' User</h3><p style="color:#999;">' + msg + '</p></div><div class="modal-footer" style="justify-content:center;"><button class="btn btn-outline" id="cancelRemove">Cancel</button><button class="btn '+(isActive?'btn-danger':'btn-success')+'" id="confirmRemove"><i class="fas '+(isActive?'fa-user-slash':'fa-user-check')+'"></i> ' + action + '</button></div></div>';
        document.body.appendChild(m);
        m.onclick = function(e) { if (e.target === m) m.remove(); };
        m.querySelector('#cancelRemove').onclick = function() { m.remove(); };
        m.querySelector('#confirmRemove').onclick = function() {
            m.querySelector('#confirmRemove').disabled = true;
            m.querySelector('#confirmRemove').innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
            fetch('/api/users/'+id,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({toggle:true})})
            .then(function(){ m.remove(); self.loadUsers(); self.loadActivity(); self.showMsg('userMsg', 'User status toggled!', 'success'); });
        };
    },

    clearActivity() {
        var self = this; var filter = this._activityFilter || 'all';
        var labels = { all: 'all activity logs', login: 'all login logs', sale: 'all sales logs', add_product: 'all product/user logs', profile_update: 'all edit logs', password: 'all password logs' };
        var msg = 'Delete ' + (labels[filter] || 'all activity logs') + '?';
        var m = document.createElement('div'); m.className = 'modal-overlay';
        m.innerHTML = '<div class="modal"><div class="modal-header"><h3><i class="fas fa-trash"></i> Clear Activity</h3><button class="btn btn-sm" onclick="this.closest(\'.modal-overlay\').remove()">X</button></div><div class="modal-body"><p style="text-align:center;font-size:1.1rem;">' + msg + '</p><p style="text-align:center;color:var(--danger);">This cannot be undone!</p></div><div class="modal-footer"><button class="btn btn-outline" id="cancelClear">Cancel</button><button class="btn btn-danger" id="confirmClear"><i class="fas fa-trash"></i> Delete</button></div></div>';
        document.body.appendChild(m); m.onclick = function(e) { if (e.target === m) m.remove(); };
        m.querySelector('#cancelClear').onclick = function() { m.remove(); };
        m.querySelector('#confirmClear').onclick = function() { m.remove(); fetch('/api/activity',{method:'DELETE'}).then(function() { self.loadActivity(); self.showMsg('userMsg', 'Activity cleared!', 'success'); }); };
    },

    loadActivity() {
        var log=document.getElementById('activityLog');if(!log)return;var filter=this._activityFilter||'all';
        fetch('/api/activity').then(function(r){return r.json();}).then(function(logs){
            var filtered=logs;
            if(filter==='login')filtered=logs.filter(function(l){return l.action==='login';});
            else if(filter==='sale')filtered=logs.filter(function(l){return l.action==='sale';});
            else if(filter==='add_product')filtered=logs.filter(function(l){return l.action==='add_product'||l.action==='add_cashier';});
            else if(filter==='profile_update')filtered=logs.filter(function(l){return l.action==='profile_update';});
            else if(filter==='password')filtered=logs.filter(function(l){return l.action==='password_change';});
            var h='<table class="table"><thead><tr><th>Date</th><th>User</th><th>Action</th><th>Details</th></tr></thead><tbody>';
            if(!filtered.length){h+='<tr><td colspan="4">No activity</td></tr>';}
            else{filtered.forEach(function(l){var b='<span class="badge badge-info">'+l.action+'</span>';if(l.action==='login')b='<span class="badge badge-info">Login</span>';else if(l.action==='sale')b='<span class="badge badge-primary">Sale</span>';else if(l.action==='add_product')b='<span class="badge badge-success">Add Product</span>';else if(l.action==='add_cashier')b='<span class="badge badge-success">Add User</span>';else if(l.action==='profile_update')b='<span class="badge badge-warning">Edit</span>';else if(l.action==='password_change')b='<span class="badge badge-danger">Password</span>';h+='<tr><td><small>'+new Date(l.date).toLocaleString('en-KE')+'</small></td><td><strong>'+l.userName+'</strong></td><td>'+b+'</td><td>'+l.details+'</td></tr>';});}
            h+='</tbody></table>';log.innerHTML=h;
        });
    }
};