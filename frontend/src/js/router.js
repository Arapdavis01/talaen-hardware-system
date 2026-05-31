const AppRouter = {
    _currentView: 'dashboard',

    async init() {
        if (AuthService.isLoggedIn()) {
            this._currentView = AuthService.isAdmin() ? 'admin-dashboard' : 'cashier-dashboard';
        }
        await ProductService._fetchFromAPI();
        await SaleService.getAll();
        await this.render();
    },

    async navigate(view) {
        if (view === 'admin') { this._showAdminLogin(); return; }
        this._currentView = view;
        await ProductService._fetchFromAPI();
        await SaleService.getAll();
        await this.render();
        window.scrollTo(0, 0);
    },

    async logout() {
        AuthService.logout();
        this._currentView = 'dashboard';
        await ProductService._fetchFromAPI();
        await SaleService.getAll();
        await this.render();
    },

    async render() {
        var app = document.getElementById('app');
        if (!app) return;
        var html = NavbarComponent.render(this._currentView);
        html += '<div class="container" style="margin-top:2rem;" id="mainContent">';
        if (AuthService.isCashier()) { var c = this._getCashierContent(); if (c instanceof Promise) c = await c; html += c; }
        else if (AuthService.isAdmin()) { var c = await this._getAdminContent(); html += c; }
        else { html += this._getPublicContent(); }
        html += '</div>'; app.innerHTML = html;
        if (typeof ParticlesComponent !== 'undefined') ParticlesComponent.init();
        
        if (this._currentView === 'admin-returns') {
            setTimeout(function() { AdminDashboardComponent.showReturnsManagement(); }, 100);
        }
        
        if (this._currentView === 'cashier-sales') {
            setTimeout(function() { CashierDashboardComponent._switchTab('sales'); }, 100);
        }
        if (this._currentView === 'cashier-returns') {
            setTimeout(function() { CashierDashboardComponent._switchTab('returns'); }, 100);
        }
        if (this._currentView === 'cashier-credit') {
            setTimeout(function() { CashierDashboardComponent._switchTab('credit'); }, 100);
        }
        if (this._currentView === 'cashier-reports') {
            setTimeout(function() { CashierDashboardComponent._switchTab('reports'); }, 100);
        }
    },

    _getPublicContent() { return PublicDashboardComponent.render(); },
    
    _getCashierContent() {
        if (this._currentView === 'cashier-dashboard') {
            CashierDashboardComponent._currentView = 'overview';
            return CashierDashboardComponent.render();
        }
        if (this._currentView === 'pos') { var r = POSComponent.render(); return r instanceof Promise ? r : r; }
        if (this._currentView === 'cashier-sales') {
            CashierDashboardComponent._currentView = 'sales';
            return CashierDashboardComponent.render();
        }
        if (this._currentView === 'cashier-returns') {
            CashierDashboardComponent._currentView = 'returns';
            return CashierDashboardComponent.render();
        }
        if (this._currentView === 'cashier-credit') {
            CashierDashboardComponent._currentView = 'credit';
            return CashierDashboardComponent.render();
        }
        if (this._currentView === 'cashier-reports') {
            CashierDashboardComponent._currentView = 'reports';
            return CashierDashboardComponent.render();
        }
        if (this._currentView === 'cashier-settings') return CashierSettingsComponent.render();
        CashierDashboardComponent._currentView = 'overview';
        return CashierDashboardComponent.render();
    },
    
    async _getAdminContent() {
        if (this._currentView === 'pos' || this._currentView === 'inventory') { var r = AdminPOSComponent.render(); return r instanceof Promise ? await r : r; }
        if (this._currentView === 'admin-dashboard') return AdminDashboardComponent.render();
        if (this._currentView === 'admin-sales') return AdminSalesComponent.render();
        if (this._currentView === 'admin-reports') return AdminReportsComponent.render();
        if (this._currentView === 'admin-purchases') return AdminPurchasesComponent.render();
        if (this._currentView === 'admin-products') return AdminProductsComponent.render();
        if (this._currentView === 'admin-credit') return AdminCreditComponent.render();
        if (this._currentView === 'admin-returns') return '<div style="text-align:center;padding:3rem;"><i class="fas fa-spinner fa-spin"></i> Loading returns...</div>';
        if (this._currentView === 'admin-settings') return AdminSettingsComponent.render();
        if (this._currentView === 'admin-mpesa') return AdminMpesaComponent.render();
        return AdminDashboardComponent.render();
    },

    toggleLoginPass() {
        var f = document.getElementById('adminPasswordInput');
        var b = document.getElementById('loginPassToggle');
        if (f && b) {
            if (f.type === 'password') { f.type = 'text'; b.innerHTML = '<i class="fas fa-eye-slash"></i>'; }
            else { f.type = 'password'; b.innerHTML = '<i class="fas fa-eye"></i>'; }
        }
    },

    // ============ ENHANCED CALCULATOR ============
    _showCalculator() {
        var self = this;
        var savedExpression = localStorage.getItem('talaen_calc_expression') || '';
        var savedHistory = JSON.parse(localStorage.getItem('talaen_calc_history') || '[]');
        
        var m = document.createElement('div'); m.className = 'modal-overlay';
        m.innerHTML = '<div class="modal" style="max-width:420px;"><div class="modal-header" style="background:linear-gradient(135deg,#1a472a,#0d2818);color:white;padding:1rem 1.5rem;"><h3 style="color:white;margin:0;"><i class="fas fa-calculator"></i> Calculator</h3><button class="btn btn-sm" style="color:white;" onclick="this.closest(\'.modal-overlay\').remove()">X</button></div><div class="modal-body" style="text-align:center;padding:1.25rem;">' +
            '<div id="calcDisplay" style="background:#1a1a2e;color:#10b981;padding:1rem 1.25rem;border-radius:1rem;font-size:1.8rem;font-weight:700;text-align:right;min-height:3.5rem;margin-bottom:0.5rem;word-break:break-all;font-family:\'Courier New\',monospace;box-shadow:inset 0 2px 10px rgba(0,0,0,0.3);">' + (savedExpression || '0') + '</div>' +
            '<div id="calcHistory" style="max-height:80px;overflow-y:auto;margin-bottom:0.75rem;text-align:right;font-size:0.85rem;color:#666;">' + 
                (savedHistory.length > 0 ? savedHistory.slice(-3).map(function(h){return '<div style="padding:2px 0;">'+h.expression+' = <strong>'+h.result+'</strong></div>';}).join('') : '') +
            '</div>' +
            '<div style="display:grid;grid-template-columns:repeat(5,1fr);gap:6px;margin-bottom:8px;">' +
            '<button class="calc-btn calc-mem" onclick="AppRouter._calcMemory(\'MC\')">MC</button>' +
            '<button class="calc-btn calc-mem" onclick="AppRouter._calcMemory(\'MR\')">MR</button>' +
            '<button class="calc-btn calc-mem" onclick="AppRouter._calcMemory(\'M+\')">M+</button>' +
            '<button class="calc-btn calc-mem" onclick="AppRouter._calcMemory(\'M-\')">M-</button>' +
            '<button class="calc-btn" onclick="AppRouter._calcInput(\'Back\')" style="background:#f59e0b;color:white;">⌫</button></div>' +
            '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;">' +
            '<button class="calc-btn calc-clear" onclick="AppRouter._calcInput(\'C\')">C</button>' +
            '<button class="calc-btn" onclick="AppRouter._calcInput(\'(\')">(</button>' +
            '<button class="calc-btn" onclick="AppRouter._calcInput(\')\')">)</button>' +
            '<button class="calc-btn calc-op" onclick="AppRouter._calcInput(\'/\')">÷</button>' +
            '<button class="calc-btn calc-num" onclick="AppRouter._calcInput(\'7\')">7</button>' +
            '<button class="calc-btn calc-num" onclick="AppRouter._calcInput(\'8\')">8</button>' +
            '<button class="calc-btn calc-num" onclick="AppRouter._calcInput(\'9\')">9</button>' +
            '<button class="calc-btn calc-op" onclick="AppRouter._calcInput(\'*\')">×</button>' +
            '<button class="calc-btn calc-num" onclick="AppRouter._calcInput(\'4\')">4</button>' +
            '<button class="calc-btn calc-num" onclick="AppRouter._calcInput(\'5\')">5</button>' +
            '<button class="calc-btn calc-num" onclick="AppRouter._calcInput(\'6\')">6</button>' +
            '<button class="calc-btn calc-op" onclick="AppRouter._calcInput(\'-\')">−</button>' +
            '<button class="calc-btn calc-num" onclick="AppRouter._calcInput(\'1\')">1</button>' +
            '<button class="calc-btn calc-num" onclick="AppRouter._calcInput(\'2\')">2</button>' +
            '<button class="calc-btn calc-num" onclick="AppRouter._calcInput(\'3\')">3</button>' +
            '<button class="calc-btn calc-op" onclick="AppRouter._calcInput(\'+\')">+</button>' +
            '<button class="calc-btn calc-num" onclick="AppRouter._calcInput(\'0\')" style="grid-column:span 2;">0</button>' +
            '<button class="calc-btn calc-num" onclick="AppRouter._calcInput(\'.\')">.</button>' +
            '<button class="calc-btn calc-equals" onclick="AppRouter._calcCalculate()">=</button></div>' +
            '<div style="text-align:center;margin-top:0.5rem;font-size:0.75rem;color:#999;">💡 Tip: You can use your keyboard to type</div>' +
            '</div><div class="modal-footer" style="justify-content:center;gap:0.5rem;">' +
            '<button class="btn btn-sm btn-outline" onclick="AppRouter._calcClearHistory()"><i class="fas fa-trash"></i> Clear History</button>' +
            '<button class="btn btn-sm btn-primary" onclick="this.closest(\'.modal-overlay\').remove()">Close</button></div></div>';
        document.body.appendChild(m);
        m.onclick = function(e) { if (e.target === m) { self._saveCalcState(); m.remove(); } };
        m._calcExpression = savedExpression;
        m._calcMemory = parseFloat(localStorage.getItem('talaen_calc_memory') || '0');
        
        // Keyboard support
        m._keyHandler = function(e) {
            var key = e.key;
            if (key >= '0' && key <= '9') AppRouter._calcInput(key);
            else if (key === '.') AppRouter._calcInput('.');
            else if (key === '+') AppRouter._calcInput('+');
            else if (key === '-') AppRouter._calcInput('-');
            else if (key === '*') AppRouter._calcInput('*');
            else if (key === '/') { e.preventDefault(); AppRouter._calcInput('/'); }
            else if (key === '(') AppRouter._calcInput('(');
            else if (key === ')') AppRouter._calcInput(')');
            else if (key === 'Enter' || key === '=') { e.preventDefault(); AppRouter._calcCalculate(); }
            else if (key === 'Backspace') AppRouter._calcInput('Back');
            else if (key === 'Escape') AppRouter._calcInput('C');
        };
        document.addEventListener('keydown', m._keyHandler);
        var origRemove = m.remove;
        m.remove = function() { document.removeEventListener('keydown', m._keyHandler); self._saveCalcState(); origRemove.call(m); };
        
        if (!document.getElementById('calcStyles')) {
            var style = document.createElement('style'); style.id = 'calcStyles';
            style.textContent = '.calc-btn{padding:14px 8px;border:none;border-radius:10px;cursor:pointer;font-size:1.1rem;font-weight:600;background:#f0f0f0;color:#333;transition:all 0.15s;}.calc-btn:hover{background:#d4d4d4;transform:scale(0.96);}.calc-btn:active{transform:scale(0.92);}.calc-num{background:white;border:1px solid #e0e0e0;}.calc-num:hover{background:#e8e8e8;}.calc-op{background:var(--secondary);color:white;}.calc-op:hover{background:#b0891a;}.calc-clear{background:#ef4444;color:white;}.calc-clear:hover{background:#dc2626;}.calc-equals{background:linear-gradient(135deg,#10b981,#059669);color:white;font-size:1.3rem;}.calc-equals:hover{background:linear-gradient(135deg,#059669,#047857);}.calc-mem{background:#6b7280;color:white;font-size:0.8rem;padding:8px 4px;}.calc-mem:hover{background:#4b5563;}';
            document.head.appendChild(style);
        }
    },

    _calcInput(val) {
        var display = document.getElementById('calcDisplay');
        if (!display) return;
        var modal = display.closest('.modal-overlay');
        if (!modal) return;
        
        if (val === 'C') {
            modal._calcExpression = '';
            display.textContent = '0';
        } else if (val === 'Back') {
            if (modal._calcExpression.length > 0) {
                modal._calcExpression = modal._calcExpression.slice(0, -1);
                display.textContent = modal._calcExpression.replace(/\*/g, '×').replace(/\//g, '÷') || '0';
            }
        } else {
            if (modal._calcExpression === '' || modal._calcExpression === '0') {
                if (val === '.') { modal._calcExpression = '0.'; }
                else if (['+','-','*','/'].includes(val)) { modal._calcExpression = '0' + val; }
                else { modal._calcExpression = val; }
            } else {
                modal._calcExpression += val;
            }
            display.textContent = modal._calcExpression.replace(/\*/g, '×').replace(/\//g, '÷');
        }
        this._saveCalcState();
    },

    _calcCalculate() {
        var display = document.getElementById('calcDisplay');
        if (!display) return;
        var modal = display.closest('.modal-overlay');
        if (!modal) return;
        
        try {
            var expression = modal._calcExpression;
            if (!expression) return;
            var result = eval(expression);
            var formattedResult = Number(result).toLocaleString('en-KE', {maximumFractionDigits: 4});
            display.textContent = formattedResult;
            
            var storageKey = modal._calcStorageKey || this._getCalcStorageKey();
            var history = JSON.parse(localStorage.getItem(storageKey + '_history') || '[]');
            history.push({expression: expression.replace(/\*/g,'×').replace(/\//g,'÷'), result: formattedResult});
            if (history.length > 20) history.shift();
            localStorage.setItem(storageKey + '_history', JSON.stringify(history));
            
            var historyDiv = document.getElementById('calcHistory');
            if (historyDiv) {
                historyDiv.innerHTML = history.slice(-3).map(function(h){return '<div style="padding:2px 0;">'+h.expression+' = <strong>'+h.result+'</strong></div>';}).join('');
            }
            
            modal._calcExpression = result.toString();
            this._saveCalcState();
        } catch(e) {
            display.textContent = 'Error';
            setTimeout(function() {
                display.textContent = modal._calcExpression.replace(/\*/g, '×').replace(/\//g, '÷') || '0';
            }, 800);
        }
    },

    _calcMemory(action) {
        var display = document.getElementById('calcDisplay');
        if (!display) return;
        var modal = display.closest('.modal-overlay');
        if (!modal) return;
        
        var currentValue = parseFloat(modal._calcExpression) || 0;
        var storageKey = modal._calcStorageKey || this._getCalcStorageKey();
        
        switch(action) {
            case 'MC':
                modal._calcMemory = 0;
                localStorage.setItem(storageKey + '_memory', '0');
                break;
            case 'MR':
                modal._calcExpression = modal._calcMemory.toString();
                display.textContent = modal._calcMemory.toLocaleString('en-KE');
                this._saveCalcState();
                break;
            case 'M+':
                modal._calcMemory += currentValue;
                localStorage.setItem(storageKey + '_memory', modal._calcMemory.toString());
                break;
            case 'M-':
                modal._calcMemory -= currentValue;
                localStorage.setItem(storageKey + '_memory', modal._calcMemory.toString());
                break;
        }
    },

    _getCalcStorageKey() {
        var user = AuthService.getCurrentUser();
        return user ? 'talaen_calc_' + user.username : 'talaen_calc_default';
    },

    _calcClearHistory() {
        var display = document.getElementById('calcDisplay');
        var modal = display ? display.closest('.modal-overlay') : null;
        var storageKey = modal ? modal._calcStorageKey : this._getCalcStorageKey();
        
        localStorage.setItem(storageKey + '_history', '[]');
        localStorage.removeItem(storageKey + '_expression');
        localStorage.removeItem(storageKey + '_memory');
        
        var historyDiv = document.getElementById('calcHistory');
        if (historyDiv) historyDiv.innerHTML = '';
        
        if (modal) {
            modal._calcExpression = '';
            modal._calcMemory = 0;
            if (display) display.textContent = '0';
        }
    },

    _saveCalcState() {
        var display = document.getElementById('calcDisplay');
        if (!display) return;
        var modal = display.closest('.modal-overlay');
        if (!modal) return;
        var storageKey = modal._calcStorageKey || this._getCalcStorageKey();
        if (modal._calcExpression !== undefined) {
            localStorage.setItem(storageKey + '_expression', modal._calcExpression);
        }
        if (modal._calcMemory !== undefined) {
            localStorage.setItem(storageKey + '_memory', modal._calcMemory.toString());
        }
    },

    _showAdminLogin() {
        var modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = '<div class="modal"><div class="modal-header"><h3><i class="fas fa-user-shield"></i> System Login</h3><button class="btn btn-sm" onclick="this.closest(\'.modal-overlay\').remove()">X</button></div><div class="modal-body"><div class="form-group"><label>Username</label><input type="text" id="loginUsername" class="form-control" value="admin"></div><div class="form-group"><label>Password</label><div style="position:relative;"><input type="password" id="adminPasswordInput" class="form-control" placeholder="Enter password" style="padding-right:40px;"><button type="button" onclick="AppRouter.toggleLoginPass()" style="position:absolute;right:10px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:#999;" id="loginPassToggle"><i class="fas fa-eye"></i></button></div></div><div id="loginError" style="display:none;color:red;"></div><div style="background:#f5f5f5;padding:1rem;margin-top:1rem;border-radius:0.5rem;"><small>Admin: admin/admin123 | Cashier: cashier/cashier123</small></div></div><div class="modal-footer"><button class="btn btn-outline" onclick="this.closest(\'.modal-overlay\').remove()">Cancel</button><button class="btn btn-primary" id="loginSubmitBtn">Login</button></div></div>';
        document.body.appendChild(modal);
        modal.onclick = function(e) { if (e.target === modal) modal.remove(); };
        var self = this;
        document.getElementById('loginSubmitBtn').onclick = async function() {
            var u = document.getElementById('loginUsername').value.trim();
            var p = document.getElementById('adminPasswordInput').value;
            var result = await AuthService.login(u, p);
            if (result.success) { modal.remove(); self._currentView = result.user.role === 'cashier' ? 'cashier-dashboard' : 'admin-dashboard'; await self.render(); }
            else { document.getElementById('loginError').style.display = 'block'; document.getElementById('loginError').textContent = result.message; }
        };
    }
};