// ============================================
// NAVBAR - With JWT Authentication
// Updated: SPA-safe redirects, unified logout with router cleanup
// Fixed: badge computation no longer crashes when user is null
// ============================================

const NavbarComponent = {
    // ✅ Cache the parsed user for this render cycle
    _getUser() {
        const userJson = localStorage.getItem('user');
        if (!userJson) return null;
        try {
            return JSON.parse(userJson);
        } catch (e) {
            return null;
        }
    },

    render: function(activeView) {
        const user = this._getUser();
        const hasToken = localStorage.getItem('token') !== null;

        const isLoggedIn = !!(user && hasToken);
        const isAdmin = isLoggedIn && user.role === 'admin';
        const isCashier = isLoggedIn && user.role === 'cashier';

        // ✅ Only compute the badge when logged in — safe against null user
        const userBadge = isLoggedIn
            ? (isAdmin
                ? '<span class="badge badge-success" style="margin:0 0.5rem;"><i class="fas fa-user-shield"></i> ' + (user.fullName || user.username || 'Admin') + '</span>'
                : '<span class="badge badge-info" style="margin:0 0.5rem;"><i class="fas fa-user"></i> ' + (user.fullName || user.username || 'Cashier') + '</span>')
            : '';

        // ✅ Reusable active-view helper
        const active = (view) => activeView === view ? ' active' : '';

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
            // ✅ SPA-safe login — opens the login modal instead of navigating to a dead URL
            h += '<button class="nav-link" onclick="AppRouter._showLoginModal()"><i class="fas fa-sign-in-alt"></i> Login</button>';
        } else if (isCashier) {
            h += '<button class="nav-link' + active('cashier-dashboard') + '" onclick="AppRouter.navigate(\'cashier-dashboard\')"><i class="fas fa-chart-line"></i> Dashboard</button>';
            h += '<button class="nav-link' + active('pos') + '" onclick="AppRouter.navigate(\'pos\')"><i class="fas fa-shopping-cart"></i> POS</button>';
            h += '<button class="nav-link' + active('cashier-sales') + '" onclick="AppRouter.navigate(\'cashier-sales\')"><i class="fas fa-receipt"></i> Sales</button>';
            h += '<button class="nav-link' + active('cashier-returns') + '" onclick="AppRouter.navigate(\'cashier-returns\')"><i class="fas fa-exchange-alt"></i> Returns</button>';
            h += '<button class="nav-link' + active('cashier-credit') + '" onclick="AppRouter.navigate(\'cashier-credit\')"><i class="fas fa-credit-card"></i> Credit</button>';
            h += '<button class="nav-link' + active('cashier-reports') + '" onclick="AppRouter.navigate(\'cashier-reports\')"><i class="fas fa-chart-bar"></i> Reports</button>';

            h += '<span style="border-left:1px solid #ddd;margin:0 0.25rem;height:25px;display:inline-block;"></span>';

            h += '<button class="nav-link" onclick="AppRouter._showCalculator()" title="Calculator"><i class="fas fa-calculator"></i></button>';
            h += '<button class="nav-link' + active('cashier-settings') + '" onclick="AppRouter.navigate(\'cashier-settings\')" title="Settings"><i class="fas fa-cog"></i></button>';

            h += userBadge;
            h += '<button class="nav-link" onclick="handleLogout()"><i class="fas fa-sign-out-alt"></i> Logout</button>';

        } else if (isAdmin) {
            h += '<button class="nav-link' + active('admin-dashboard') + '" onclick="AppRouter.navigate(\'admin-dashboard\')"><i class="fas fa-chart-line"></i> Dashboard</button>';
            h += '<button class="nav-link' + active('pos') + '" onclick="AppRouter.navigate(\'pos\')"><i class="fas fa-clipboard-list"></i> Inventory</button>';
            h += '<button class="nav-link' + active('admin-sales') + '" onclick="AppRouter.navigate(\'admin-sales\')"><i class="fas fa-receipt"></i> Sales</button>';
            h += '<button class="nav-link' + active('admin-credit') + '" onclick="AppRouter.navigate(\'admin-credit\')"><i class="fas fa-credit-card"></i> Credit</button>';
            h += '<button class="nav-link' + active('admin-returns') + '" onclick="AppRouter.navigate(\'admin-returns\')"><i class="fas fa-exchange-alt"></i> Returns</button>';
            h += '<button class="nav-link' + active('admin-purchases') + '" onclick="AppRouter.navigate(\'admin-purchases\')"><i class="fas fa-truck"></i> Purchases</button>';
            h += '<button class="nav-link' + active('admin-products') + '" onclick="AppRouter.navigate(\'admin-products\')"><i class="fas fa-boxes"></i> Products</button>';
            h += '<button class="nav-link' + active('admin-reports') + '" onclick="AppRouter.navigate(\'admin-reports\')"><i class="fas fa-chart-bar"></i> Reports</button>';

            h += '<span style="border-left:1px solid #ddd;margin:0 0.25rem;height:25px;display:inline-block;"></span>';

            h += '<button class="nav-link" onclick="AppRouter._showCalculator()" title="Calculator"><i class="fas fa-calculator"></i></button>';
            h += '<button class="nav-link' + active('admin-settings') + '" onclick="AppRouter.navigate(\'admin-settings\')" title="Settings"><i class="fas fa-cog"></i></button>';

            h += userBadge;
            h += '<button class="nav-link" onclick="handleLogout()"><i class="fas fa-sign-out-alt"></i> Logout</button>';
        }

        h += '</div></div></nav>';
        return h;
    }
};

// ============================================
// ✅ GLOBAL LOGOUT FUNCTION
// Delegates to AppRouter.logout() so all cleanup
// (intervals, caches, session) happens in one place.
// ============================================
function handleLogout() {
    // ✅ Prefer the router's logout — it stops intervals, clears ApiService caches,
    //    and redirects to the SPA root.
    if (window.AppRouter && typeof AppRouter.logout === 'function') {
        return AppRouter.logout();
    }

    // ---- Fallback (router not loaded for some reason) ----
    const token = localStorage.getItem('token');
    const userJson = localStorage.getItem('user');
    let user = null;
    try { user = userJson ? JSON.parse(userJson) : null; } catch (e) { user = null; }

    // Fire-and-forget server-side session invalidation
    if (token) {
        try {
            ApiService.post('/auth/logout', {
                userId: user ? user.id : null,
                userName: user ? (user.fullName || user.username) : null
            }).catch(() => {});
        } catch (e) { /* ignore */ }
    }

    // Clear session and caches
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    try { sessionStorage.clear(); } catch (e) {}
    if (window.ApiService && ApiService.clearCache) {
        try { ApiService.clearCache(); } catch (e) {}
    }
    if (window.ProductService && ProductService.clearCache) {
        try { ProductService.clearCache(); } catch (e) {}
    }

    // SPA-safe redirect
    window.location.href = '/';
}

// ✅ Make logout globally available
window.logoutUser = handleLogout;
window.handleLogout = handleLogout;
