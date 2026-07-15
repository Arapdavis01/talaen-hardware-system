// ============================================
// NAVBAR - With JWT Authentication
// ============================================

const NavbarComponent = {
    render: function(activeView) {
        // ✅ Get user from localStorage (JWT token)
        const userJson = localStorage.getItem('user');
        let user = null;
        try {
            user = userJson ? JSON.parse(userJson) : null;
        } catch (e) {
            user = null;
        }
        
        const isAdmin = user && user.role === 'admin';
        const isCashier = user && user.role === 'cashier';
        const isLoggedIn = user !== null && localStorage.getItem('token') !== null;
        
        var h = '<nav class="navbar"><div class="navbar-content">';
        h += '<div class="logo" onclick="AppRouter.navigate(\'dashboard\')" style="cursor:pointer;">';
        h += '<img src="../assets/talaen02.jpg" alt="Talaen" style="width:45px;height:45px;border-radius:10px;object-fit:cover;">';
        h += '<div>';
        h += '<div class="logo-text" style="font-size:1.1rem;">TALAEN INVESTMENT HARDWARE</div>';
        h += '<div style="font-size:0.65rem;color:var(--gray-500);">P.O BOX 345, NANDI HILLS</div>';
        h += '<div class="logo-sub" style="color:#111;font-weight:800;">Quality Hardware & Building Materials</div>';
        h += '</div></div>';
        h += '<div class="nav-links">';
        
        if (!isLoggedIn) {
            // 🔥 Not logged in - Show login button only
            h += '<button class="nav-link" onclick="window.location.href=\'/login.html\'"><i class="fas fa-sign-in-alt"></i> Login</button>';
        } else if (isCashier) {
            // 🔥 CASHIER NAVIGATION
            h += '<button class="nav-link' + (activeView==='cashier-dashboard'?' active':'') + '" onclick="AppRouter.navigate(\'cashier-dashboard\')"><i class="fas fa-chart-line"></i> Dashboard</button>';
            h += '<button class="nav-link' + (activeView==='pos'?' active':'') + '" onclick="AppRouter.navigate(\'pos\')"><i class="fas fa-shopping-cart"></i> POS</button>';
            h += '<button class="nav-link' + (activeView==='cashier-sales'?' active':'') + '" onclick="AppRouter.navigate(\'cashier-sales\')"><i class="fas fa-receipt"></i> Sales</button>';
            h += '<button class="nav-link' + (activeView==='cashier-returns'?' active':'') + '" onclick="AppRouter.navigate(\'cashier-returns\')"><i class="fas fa-exchange-alt"></i> Returns</button>';
            h += '<button class="nav-link' + (activeView==='cashier-credit'?' active':'') + '" onclick="AppRouter.navigate(\'cashier-credit\')"><i class="fas fa-credit-card"></i> Credit</button>';
            h += '<button class="nav-link' + (activeView==='cashier-reports'?' active':'') + '" onclick="AppRouter.navigate(\'cashier-reports\')"><i class="fas fa-chart-bar"></i> Reports</button>';
            
            h += '<span style="border-left:1px solid #ddd;margin:0 0.25rem;height:25px;display:inline-block;"></span>';
            
            h += '<button class="nav-link" onclick="AppRouter._showCalculator()" title="Calculator"><i class="fas fa-calculator"></i></button>';
            h += '<button class="nav-link' + (activeView==='cashier-settings'?' active':'') + '" onclick="AppRouter.navigate(\'cashier-settings\')" title="Settings"><i class="fas fa-cog"></i></button>';
            
            // ✅ Show cashier name
            h += '<span class="badge badge-info" style="margin:0 0.5rem;"><i class="fas fa-user"></i> ' + (user?.fullName || user?.username || 'Cashier') + '</span>';
            h += '<button class="nav-link" onclick="AppRouter.logout()"><i class="fas fa-sign-out-alt"></i> Logout</button>';
            
        } else if (isAdmin) {
            // 🔥 ADMIN NAVIGATION
            h += '<button class="nav-link' + (activeView==='admin-dashboard'?' active':'') + '" onclick="AppRouter.navigate(\'admin-dashboard\')"><i class="fas fa-chart-line"></i> Dashboard</button>';
            h += '<button class="nav-link' + (activeView==='pos'?' active':'') + '" onclick="AppRouter.navigate(\'pos\')"><i class="fas fa-clipboard-list"></i> Inventory</button>';
            h += '<button class="nav-link' + (activeView==='admin-sales'?' active':'') + '" onclick="AppRouter.navigate(\'admin-sales\')"><i class="fas fa-receipt"></i> Sales</button>';
            h += '<button class="nav-link' + (activeView==='admin-credit'?' active':'') + '" onclick="AppRouter.navigate(\'admin-credit\')"><i class="fas fa-credit-card"></i> Credit</button>';
            h += '<button class="nav-link' + (activeView==='admin-returns'?' active':'') + '" onclick="AppRouter.navigate(\'admin-returns\')"><i class="fas fa-exchange-alt"></i> Returns</button>';
            h += '<button class="nav-link' + (activeView==='admin-purchases'?' active':'') + '" onclick="AppRouter.navigate(\'admin-purchases\')"><i class="fas fa-truck"></i> Purchases</button>';
            h += '<button class="nav-link' + (activeView==='admin-products'?' active':'') + '" onclick="AppRouter.navigate(\'admin-products\')"><i class="fas fa-boxes"></i> Products</button>';
            h += '<button class="nav-link' + (activeView==='admin-reports'?' active':'') + '" onclick="AppRouter.navigate(\'admin-reports\')"><i class="fas fa-chart-bar"></i> Reports</button>';
            
            h += '<span style="border-left:1px solid #ddd;margin:0 0.25rem;height:25px;display:inline-block;"></span>';
            
            h += '<button class="nav-link" onclick="AppRouter._showCalculator()" title="Calculator"><i class="fas fa-calculator"></i></button>';
            h += '<button class="nav-link' + (activeView==='admin-settings'?' active':'') + '" onclick="AppRouter.navigate(\'admin-settings\')" title="Settings"><i class="fas fa-cog"></i></button>';
            
            // ✅ Show admin badge
            h += '<span class="badge badge-success" style="margin:0 0.5rem;"><i class="fas fa-user-shield"></i> ' + (user?.fullName || user?.username || 'Admin') + '</span>';
            h += '<button class="nav-link" onclick="AppRouter.logout()"><i class="fas fa-sign-out-alt"></i> Logout</button>';
        }
        
        h += '</div></div></nav>';
        return h;
    }
};

// ============================================
// ✅ GLOBAL LOGOUT FUNCTION (for navbar)
// ============================================
window.logoutUser = function() {
    const token = localStorage.getItem('token');
    if (token) {
        fetch('/api/auth/logout', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        }).catch(() => {});
    }
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login.html';
};

// ============================================
// ✅ OVERRIDE AppRouter.logout if it exists
// ============================================
if (window.AppRouter) {
    AppRouter.logout = window.logoutUser;
}
