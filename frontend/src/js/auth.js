// ============================================
// AUTH.JS - Universal Authentication Helper
// ============================================

// ✅ Get stored token
function getToken() {
    return localStorage.getItem('token');
}

// ✅ Get stored user
function getUser() {
    const userJson = localStorage.getItem('user');
    return userJson ? JSON.parse(userJson) : null;
}

// ✅ Check if logged in
function isLoggedIn() {
    return getToken() !== null;
}

// ✅ Check if admin
function isAdmin() {
    const user = getUser();
    return user && user.role === 'admin';
}

// ✅ Universal fetch with automatic token
async function apiFetch(url, options = {}) {
    const token = getToken();
    
    // If no token and not login page, redirect
    if (!token && !url.includes('/api/auth/login')) {
        window.location.href = '/login.html';
        return null;
    }
    
    try {
        const response = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                ...options.headers
            }
        });
        
        // If token expired or invalid
        if (response.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login.html';
            return null;
        }
        
        return response;
    } catch (error) {
        console.error('API fetch error:', error);
        return null;
    }
}

// ✅ Protected page check
function protectPage() {
    if (!isLoggedIn()) {
        window.location.href = '/login.html';
        return false;
    }
    return true;
}

// ✅ Admin-only page check
function protectAdmin() {
    if (!protectPage()) return false;
    if (!isAdmin()) {
        alert('Access denied. Admin only.');
        window.location.href = '/cashier-dashboard.html';
        return false;
    }
    return true;
}

// ✅ Logout
function logout() {
    // Call logout endpoint
    const token = getToken();
    if (token) {
        fetch('/api/auth/logout', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        }).catch(() => {});
    }
    
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login.html';
}

// ✅ Show user info in navbar
function updateNavbarUser() {
    const user = getUser();
    if (user) {
        document.querySelectorAll('.user-name').forEach(el => {
            el.textContent = user.fullName || user.username;
        });
        document.querySelectorAll('.user-role').forEach(el => {
            el.textContent = user.role;
        });
    }
}

// Make globally available
window.getToken = getToken;
window.getUser = getUser;
window.isLoggedIn = isLoggedIn;
window.isAdmin = isAdmin;
window.apiFetch = apiFetch;
window.protectPage = protectPage;
window.protectAdmin = protectAdmin;
window.logout = logout;
window.updateNavbarUser = updateNavbarUser;
