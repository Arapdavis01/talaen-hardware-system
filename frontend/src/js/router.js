// ============================================
// APP ROUTER - With JWT Authentication
// ============================================

const AppRouter = {
    _currentView: 'dashboard',
    _isInitialized: false,

    init: async function() {
        if (this._isInitialized) return;
        
        // Check if user is logged in via JWT
        var token = localStorage.getItem('token');
        var userJson = localStorage.getItem('user');
        var user = null;
        try {
            user = userJson ? JSON.parse(userJson) : null;
        } catch (e) {
            user = null;
        }
        
        if (token && user) {
            this._currentView = user.role === 'admin' ? 'admin-dashboard' : 'cashier-dashboard';
        } else {
            this._currentView = 'dashboard';
        }
        
        // Load initial data with JWT
        await this._loadInitialData();
        await this.render();
        this._isInitialized = true;
    },

    _loadInitialData: async function() {
        try {
            await ProductService.getAll();
            await SaleService.getAll();
        } catch (error) {
            console.error('Error loading initial data:', error);
            if (error.message && error.message.includes('401')) {
                this.logout();
            }
        }
    },

    navigate: async function(view) {
        var token = localStorage.getItem('token');
        var userJson = localStorage.getItem('user');
        var user = null;
        try {
            user = userJson ? JSON.parse(userJson) : null;
        } catch (e) {
            user = null;
        }
        
        // Protect admin routes
        if (view.startsWith('admin-') && (!user || user.role !== 'admin')) {
            alert('Access denied. Admin privileges required.');
            return;
        }
        
        // Protect cashier routes
        if (view.startsWith('cashier-') && !user) {
            alert('Please login to access this page.');
            this.navigate('dashboard');
            return;
        }
        
        // Special case for 'admin' - show login modal
        if (view === 'admin') {
            this._showLoginModal();
            return;
        }
        
        this._currentView = view;
        
        // Refresh data with JWT token
        await ProductService.getAll();
        await SaleService.getAll();
        
        await this.render();
        window.scrollTo(0, 0);
    },

    logout: async function() {
        var token = localStorage.getItem('token');
        if (token) {
            try {
                await ApiService.post('/auth/logout');
            } catch (e) {
                // Ignore errors on logout
            }
        }
        
        // Clear all session data
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        sessionStorage.clear();
        
        // Reset cache
        ProductService.clearCache();
        
        this._currentView = 'dashboard';
        await this.render();
        window.location.href = '/login.html';
    },

    render: async function() {
        var app = document.getElementById('app');
        if (!app) return;
        
        var token = localStorage.getItem('token');
        var userJson = localStorage.getItem('user');
        var user = null;
        try {
            user = userJson ? JSON.parse(userJson) : null;
        } catch (e) {
            user = null;
        }
        var isLoggedIn = token && user;
        
        var html = NavbarComponent.render(this._currentView);
        html += '<div class="container" style="margin-top:2rem;" id="mainContent">';
        
        if (isLoggedIn) {
            if (user.role === 'cashier') {
                var content = this._getCashierContent();
                html += content instanceof Promise ? await content : content;
            } else if (user.role === 'admin') {
                var content = await this._getAdminContent();
                html += content;
            } else {
                html += this._getPublicContent();
            }
        } else {
            html += this._getPublicContent();
        }
        
        html += '</div>';
        app.innerHTML = html;
        
        if (typeof ParticlesComponent !== 'undefined') {
            ParticlesComponent.init();
        }
        
        this._handleTabInitialization();
    },

    _handleTabInitialization: function() {
        var self = this;
        var tabMap = {
            'admin-returns': function() {
                setTimeout(function() {
                    if (typeof AdminDashboardComponent !== 'undefined') {
                        AdminDashboardComponent.showReturnsManagement();
                    }
                }, 100);
            },
            'cashier-sales': function() {
                setTimeout(function() {
                    if (typeof CashierDashboardComponent !== 'undefined') {
                        CashierDashboardComponent._switchTab('sales');
                    }
                }, 100);
            },
            'cashier-returns': function() {
                setTimeout(function() {
                    if (typeof CashierDashboardComponent !== 'undefined') {
                        CashierDashboardComponent._switchTab('returns');
                    }
                }, 100);
            },
            'cashier-credit': function() {
                setTimeout(function() {
                    if (typeof CashierDashboardComponent !== 'undefined') {
                        CashierDashboardComponent._switchTab('credit');
                    }
                }, 100);
            },
            'cashier-reports': function() {
                setTimeout(function() {
                    if (typeof CashierDashboardComponent !== 'undefined') {
                        CashierDashboardComponent._switchTab('reports');
                    }
                }, 100);
            }
        };
        
        if (tabMap[this._currentView]) {
            tabMap[this._currentView]();
        }
    },

    _getPublicContent: function() {
        if (typeof PublicDashboardComponent !== 'undefined') {
            return PublicDashboardComponent.render();
        }
        return '<div class="text-center"><h2>Welcome to Talaen Hardware</h2><p>Please login to access the system.</p></div>';
    },

    _getCashierContent: function() {
        var viewMap = {
            'cashier-dashboard': function() {
                if (typeof CashierDashboardComponent !== 'undefined') {
                    CashierDashboardComponent._currentView = 'overview';
                    return CashierDashboardComponent.render();
                }
                return '<div>Cashier Dashboard</div>';
            },
            'pos': function() {
                if (typeof POSComponent !== 'undefined') {
                    var r = POSComponent.render();
                    return r instanceof Promise ? r : r;
                }
                return '<div>POS System</div>';
            },
            'cashier-sales': function() {
                if (typeof CashierDashboardComponent !== 'undefined') {
                    CashierDashboardComponent._currentView = 'sales';
                    return CashierDashboardComponent.render();
                }
                return '<div>Sales</div>';
            },
            'cashier-returns': function() {
                if (typeof CashierDashboardComponent !== 'undefined') {
                    CashierDashboardComponent._currentView = 'returns';
                    return CashierDashboardComponent.render();
                }
                return '<div>Returns</div>';
            },
            'cashier-credit': function() {
                if (typeof CashierDashboardComponent !== 'undefined') {
                    CashierDashboardComponent._currentView = 'credit';
                    return CashierDashboardComponent.render();
                }
                return '<div>Credit</div>';
            },
            'cashier-reports': function() {
                if (typeof CashierDashboardComponent !== 'undefined') {
                    CashierDashboardComponent._currentView = 'reports';
                    return CashierDashboardComponent.render();
                }
                return '<div>Reports</div>';
            },
            'cashier-settings': function() {
                if (typeof CashierSettingsComponent !== 'undefined') {
                    return CashierSettingsComponent.render();
                }
                return '<div>Settings</div>';
            }
        };
        
        var view = viewMap[this._currentView];
        if (view) {
            var result = view();
            return result;
        }
        
        if (typeof CashierDashboardComponent !== 'undefined') {
            CashierDashboardComponent._currentView = 'overview';
            return CashierDashboardComponent.render();
        }
        return '<div>Cashier Dashboard</div>';
    },

    _getAdminContent: async function() {
        var viewMap = {
            'pos': async function() {
                if (typeof AdminPOSComponent !== 'undefined') {
                    var r = AdminPOSComponent.render();
                    return r instanceof Promise ? await r : r;
                }
                return '<div>Admin POS</div>';
            },
            'inventory': async function() {
                if (typeof AdminPOSComponent !== 'undefined') {
                    var r = AdminPOSComponent.render();
                    return r instanceof Promise ? await r : r;
                }
                return '<div>Inventory Management</div>';
            },
            'admin-dashboard': function() {
                if (typeof AdminDashboardComponent !== 'undefined') {
                    return AdminDashboardComponent.render();
                }
                return '<div>Admin Dashboard</div>';
            },
            'admin-sales': function() {
                if (typeof AdminSalesComponent !== 'undefined') {
                    return AdminSalesComponent.render();
                }
                return '<div>Sales Management</div>';
            },
            'admin-reports': function() {
                if (typeof AdminReportsComponent !== 'undefined') {
                    return AdminReportsComponent.render();
                }
                return '<div>Reports</div>';
            },
            'admin-purchases': function() {
                if (typeof AdminPurchasesComponent !== 'undefined') {
                    return AdminPurchasesComponent.render();
                }
                return '<div>Purchase Orders</div>';
            },
            'admin-products': function() {
                if (typeof AdminProductsComponent !== 'undefined') {
                    return AdminProductsComponent.render();
                }
                return '<div>Product Management</div>';
            },
            'admin-credit': function() {
                if (typeof AdminCreditComponent !== 'undefined') {
                    return AdminCreditComponent.render();
                }
                return '<div>Credit Management</div>';
            },
            'admin-returns': function() {
                return '<div style="text-align:center;padding:3rem;"><i class="fas fa-spinner fa-spin"></i> Loading returns...</div>';
            },
            'admin-settings': function() {
                if (typeof AdminSettingsComponent !== 'undefined') {
                    return AdminSettingsComponent.render();
                }
                return '<div>Settings</div>';
            },
            'admin-mpesa': function() {
                if (typeof AdminMpesaComponent !== 'undefined') {
                    return AdminMpesaComponent.render();
                }
                return '<div>M-Pesa Configuration</div>';
            }
        };
        
        var view = viewMap[this._currentView];
        if (view) {
            var result = view();
            return result instanceof Promise ? await result : result;
        }
        
        if (typeof AdminDashboardComponent !== 'undefined') {
            return AdminDashboardComponent.render();
        }
        return '<div>Admin Dashboard</div>';
    },

    toggleLoginPass: function() {
        var f = document.getElementById('adminPasswordInput');
        var b = document.getElementById('loginPassToggle');
        if (f && b) {
            if (f.type === 'password') {
                f.type = 'text';
                b.innerHTML = '<i class="fas fa-eye-slash"></i>';
            } else {
                f.type = 'password';
                b.innerHTML = '<i class="fas fa-eye"></i>';
            }
        }
    },

    // ============================================
    // SHOW LOGIN MODAL - FIXED
    // ============================================

    _showLoginModal: function() {
        var self = this;
        var modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = '' +
            '<div class="modal" style="max-width:400px;">' +
                '<div class="modal-header">' +
                    '<h3><i class="fas fa-user-shield"></i> System Login</h3>' +
                    '<button class="btn btn-sm" onclick="this.closest(\'.modal-overlay\').remove()">X</button>' +
                '</div>' +
                '<div class="modal-body">' +
                    '<div class="form-group">' +
                        '<label>Username</label>' +
                        // FIXED: Removed value="admin", added placeholder and autofocus
                        '<input type="text" id="loginUsername" class="form-control" placeholder="Enter username" autofocus>' +
                    '</div>' +
                    '<div class="form-group">' +
                        '<label>Password</label>' +
                        '<div style="position:relative;">' +
                            '<input type="password" id="adminPasswordInput" class="form-control" placeholder="Enter password" style="padding-right:40px;">' +
                            '<button type="button" onclick="AppRouter.toggleLoginPass()" style="position:absolute;right:10px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:#999;" id="loginPassToggle">' +
                                '<i class="fas fa-eye"></i>' +
                            '</button>' +
                        '</div>' +
                    '</div>' +
                    '<div id="loginError" style="display:none;color:red;margin-top:0.5rem;"></div>' +
                    '<div style="background:#f5f5f5;padding:0.75rem;margin-top:0.75rem;border-radius:0.5rem;font-size:0.8rem;">' +
                        '<small>Admin: admin/admin123 | Cashier: cashier/cashier123</small>' +
                    '</div>' +
                '</div>' +
                '<div class="modal-footer">' +
                    '<button class="btn btn-outline" onclick="this.closest(\'.modal-overlay\').remove()">Cancel</button>' +
                    '<button class="btn btn-primary" id="loginSubmitBtn">Login</button>' +
                '</div>' +
            '</div>';
        document.body.appendChild(modal);
        
        // Close modal on overlay click
        modal.onclick = function(e) {
            if (e.target === modal) modal.remove();
        };
        
        // Handle login button click - Using ApiService
        document.getElementById('loginSubmitBtn').onclick = async function() {
            var username = document.getElementById('loginUsername').value.trim();
            var password = document.getElementById('adminPasswordInput').value;
            var errorDiv = document.getElementById('loginError');
            
            // Validate username
            if (!username) {
                errorDiv.style.display = 'block';
                errorDiv.textContent = 'Please enter username';
                return;
            }
            
            try {
                // Using ApiService instead of direct fetch
                var data = await ApiService.post('/auth/login', {
                    username: username,
                    password: password
                });
                
                if (data.success) {
                    // Store JWT token and user
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('user', JSON.stringify(data.user));
                    
                    modal.remove();
                    self._currentView = data.user.role === 'cashier' ? 'cashier-dashboard' : 'admin-dashboard';
                    await self.render();
                } else {
                    errorDiv.style.display = 'block';
                    errorDiv.textContent = data.message || 'Invalid username or password';
                }
            } catch (error) {
                errorDiv.style.display = 'block';
                errorDiv.textContent = 'Network error. Please try again.';
            }
        };
        
        // Enter key support
        document.getElementById('adminPasswordInput').addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                document.getElementById('loginSubmitBtn').click();
            }
        });
        
        // Also support Enter key on username field
        document.getElementById('loginUsername').addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                document.getElementById('adminPasswordInput').focus();
            }
        });
    },

    // ============================================
    // CALCULATOR METHODS
    // ============================================
    
    _showCalculator: function() {
        var userJson = localStorage.getItem('user');
        var user = null;
        try {
            user = userJson ? JSON.parse(userJson) : null;
        } catch (e) {}
        
        var savedExpression = localStorage.getItem('talaen_calc_expression') || '';
        var savedHistory = JSON.parse(localStorage.getItem('talaen_calc_history') || '[]');
        
        // ... rest of calculator code
        // (Keep the existing calculator implementation)
    },

    _calcInput: function(val) {
        // ... (existing calculator code)
    },

    _calcCalculate: function() {
        // ... (existing calculator code)
    },

    _calcMemory: function(action) {
        // ... (existing calculator code)
    },

    _getCalcStorageKey: function() {
        var userJson = localStorage.getItem('user');
        var user = null;
        try {
            user = userJson ? JSON.parse(userJson) : null;
        } catch (e) {}
        return user ? 'talaen_calc_' + user.username : 'talaen_calc_default';
    },

    _calcClearHistory: function() {
        // ... (existing calculator code)
    },

    _saveCalcState: function() {
        // ... (existing calculator code)
    }
};

// Initialize router when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    AppRouter.init();
});

// Make globally available
window.AppRouter = AppRouter;
