const NavbarComponent = {
    render: function(activeView) {
        var isAdmin = AuthService.isAdmin();
        var isCashier = AuthService.isCashier();
        
        var h = '<nav class="navbar"><div class="navbar-content">';
        h += '<div class="logo" onclick="AppRouter.navigate(\'dashboard\')" style="cursor:pointer;">';
        h += '<img src="../assets/talaen02.jpg" alt="Talaen" style="width:45px;height:45px;border-radius:10px;object-fit:cover;">';
        h += '<div>';
        h += '<div class="logo-text" style="font-size:1.1rem;">TALAEN INVESTMENT HARDWARE</div>';
        h += '<div style="font-size:0.65rem;color:var(--gray-500);">P.O BOX 345, NANDI HILLS</div>';
        h += '<div class="logo-sub" style="color:#111;font-weight:800;">Quality Hardware & Building Materials</div>';
        h += '</div></div>';
        h += '<div class="nav-links">';
        
        if (isCashier) {
            // 1. Dashboard - Overview
            h += '<button class="nav-link' + (activeView==='cashier-dashboard'?' active':'') + '" onclick="AppRouter.navigate(\'cashier-dashboard\')"><i class="fas fa-chart-line"></i> Dashboard</button>';
            // 2. POS - Make sales
            h += '<button class="nav-link' + (activeView==='pos'?' active':'') + '" onclick="AppRouter.navigate(\'pos\')"><i class="fas fa-shopping-cart"></i> POS</button>';
            // 3. My Sales - Sales history
            h += '<button class="nav-link' + (activeView==='cashier-sales'?' active':'') + '" onclick="AppRouter.navigate(\'cashier-sales\')"><i class="fas fa-receipt"></i> Sales</button>';
            // 4. Returns & Exchanges
            h += '<button class="nav-link' + (activeView==='cashier-returns'?' active':'') + '" onclick="AppRouter.navigate(\'cashier-returns\')"><i class="fas fa-exchange-alt"></i> Returns</button>';
            // 5. Credit Customers
            h += '<button class="nav-link' + (activeView==='cashier-credit'?' active':'') + '" onclick="AppRouter.navigate(\'cashier-credit\')"><i class="fas fa-credit-card"></i> Credit</button>';
            // 6. Reports
            h += '<button class="nav-link' + (activeView==='cashier-reports'?' active':'') + '" onclick="AppRouter.navigate(\'cashier-reports\')"><i class="fas fa-chart-bar"></i> Reports</button>';
            
            // Separator
            h += '<span style="border-left:1px solid #ddd;margin:0 0.25rem;height:25px;display:inline-block;"></span>';
            
            // 7. Calculator - Quick calculations
            h += '<button class="nav-link" onclick="AppRouter._showCalculator()" title="Calculator"><i class="fas fa-calculator"></i></button>';
            // 8. Settings
            h += '<button class="nav-link' + (activeView==='cashier-settings'?' active':'') + '" onclick="AppRouter.navigate(\'cashier-settings\')" title="Settings"><i class="fas fa-cog"></i></button>';
            
            // User badge & Logout
            h += '<span class="badge badge-info" style="margin:0 0.5rem;"><i class="fas fa-user"></i> ' + (AuthService.getCurrentUser()?.fullName || 'Cashier') + '</span>';
            h += '<button class="nav-link" onclick="AppRouter.logout()"><i class="fas fa-sign-out-alt"></i> Logout</button>';
        } else if (isAdmin) {
            // 1. Dashboard
            h += '<button class="nav-link' + (activeView==='admin-dashboard'?' active':'') + '" onclick="AppRouter.navigate(\'admin-dashboard\')"><i class="fas fa-chart-line"></i> Dashboard</button>';
            // 2. Inventory (POS)
            h += '<button class="nav-link' + (activeView==='pos'?' active':'') + '" onclick="AppRouter.navigate(\'pos\')"><i class="fas fa-clipboard-list"></i> Inventory</button>';
            // 3. Sales
            h += '<button class="nav-link' + (activeView==='admin-sales'?' active':'') + '" onclick="AppRouter.navigate(\'admin-sales\')"><i class="fas fa-receipt"></i> Sales</button>';
            // 4. Credit
            h += '<button class="nav-link' + (activeView==='admin-credit'?' active':'') + '" onclick="AppRouter.navigate(\'admin-credit\')"><i class="fas fa-credit-card"></i> Credit</button>';
            // 5. Returns
            h += '<button class="nav-link' + (activeView==='admin-returns'?' active':'') + '" onclick="AppRouter.navigate(\'admin-returns\')"><i class="fas fa-exchange-alt"></i> Returns</button>';
            // 6. Purchases
            h += '<button class="nav-link' + (activeView==='admin-purchases'?' active':'') + '" onclick="AppRouter.navigate(\'admin-purchases\')"><i class="fas fa-truck"></i> Purchases</button>';
            // 7. Products
            h += '<button class="nav-link' + (activeView==='admin-products'?' active':'') + '" onclick="AppRouter.navigate(\'admin-products\')"><i class="fas fa-boxes"></i> Products</button>';
            // 8. Reports
            h += '<button class="nav-link' + (activeView==='admin-reports'?' active':'') + '" onclick="AppRouter.navigate(\'admin-reports\')"><i class="fas fa-chart-bar"></i> Reports</button>';
            
            // Separator
            h += '<span style="border-left:1px solid #ddd;margin:0 0.25rem;height:25px;display:inline-block;"></span>';
            
            // 9. Calculator
            h += '<button class="nav-link" onclick="AppRouter._showCalculator()" title="Calculator"><i class="fas fa-calculator"></i></button>';
            // 10. Settings
            h += '<button class="nav-link' + (activeView==='admin-settings'?' active':'') + '" onclick="AppRouter.navigate(\'admin-settings\')" title="Settings"><i class="fas fa-cog"></i></button>';
            
            h += '<span class="badge badge-success"><i class="fas fa-user-shield"></i> Admin</span>';
            h += '<button class="nav-link" onclick="AppRouter.logout()"><i class="fas fa-sign-out-alt"></i> Logout</button>';
        } else {
            h += '<button class="nav-link" onclick="AppRouter.navigate(\'dashboard\')">Dashboard</button>';
            h += '<button class="nav-link" onclick="AppRouter.navigate(\'pos\')">POS</button>';
            h += '<button class="nav-link" onclick="AppRouter.navigate(\'admin\')">System Login</button>';
        }
        
        h += '</div></div></nav>';
        return h;
    }
};