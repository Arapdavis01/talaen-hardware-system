// ============================================
// AUTH SERVICE - With JWT Authentication
// Updated: routes through ApiService, fixed SPA redirect + changePassword endpoint
// ============================================

const AuthService = {
    API_URL: '/api',

    _state: {
        isLoggedIn: false,
        currentUser: null,
        sessionStart: null,
        loginAttempts: 0,
        maxLoginAttempts: 5,
        lockoutDuration: 15 * 60 * 1000,
        lockoutUntil: null
    },

    // ✅ Guard so we only verify once per page load
    _verifyInFlight: null,
    _lastVerifyAt: 0,
    _VERIFY_CACHE_MS: 60000,

    init() {
        this._checkSession();
    },

    // ============================================
    // SESSION MANAGEMENT
    // ============================================
    _checkSession() {
        const token = localStorage.getItem('token');
        const userJson = localStorage.getItem('user');

        if (token && userJson) {
            try {
                const user = JSON.parse(userJson);
                this._state.isLoggedIn = true;
                this._state.currentUser = user;
                this._state.sessionStart = Date.now();
                // ✅ Defer the network verify — don't block the page for it
                setTimeout(() => { this._verifyToken().catch(() => {}); }, 500);
            } catch (e) {
                this._clearSession();
            }
        } else {
            this._clearSession();
        }
    },

    // ✅ Merged verify logic — routes through ApiService with cache
    async _verifyToken() {
        const token = this.getToken();
        if (!token) return false;

        // Reuse the in-flight promise if one exists
        if (this._verifyInFlight) return this._verifyInFlight;

        // Skip if we verified recently
        const now = Date.now();
        if (now - this._lastVerifyAt < this._VERIFY_CACHE_MS) {
            return true;
        }

        this._verifyInFlight = (async () => {
            try {
                const response = await ApiService.get('/auth/verify', { fresh: true });
                if (response && response.success === true) {
                    this._lastVerifyAt = Date.now();
                    return true;
                }
                // Invalid or expired session — clear and bail
                if (response && response.success === false) {
                    this._clearSession();
                }
                return false;
            } catch (error) {
                // Network error — don't log the user out for a temporary blip
                console.warn('Token verification failed (network):', error.message);
                return this._state.isLoggedIn;
            } finally {
                this._verifyInFlight = null;
            }
        })();

        return this._verifyInFlight;
    },

    _clearSession() {
        this._state.isLoggedIn = false;
        this._state.currentUser = null;
        this._state.sessionStart = null;
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        // ✅ Also clear any ApiService caches tied to the old session
        if (typeof ApiService !== 'undefined' && ApiService.clearCache) {
            ApiService.clearCache();
        }
    },

    // ============================================
    // LOGIN
    // ============================================
    async login(username, password) {
        // ✅ Client-side lockout is a UX shortcut only — the server is authoritative.
        //    We show the message but always let the server decide.
        if (this._isLocked()) {
            var remainingTime = Math.ceil((this._state.lockoutUntil - Date.now()) / 1000 / 60);
            return { success: false, message: 'Account locked. Try again in ' + remainingTime + ' minutes.' };
        }

        try {
            const data = await ApiService.post('/auth/login', { username, password });

            if (data && data.success) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));

                this._state.isLoggedIn = true;
                this._state.currentUser = data.user;
                this._state.sessionStart = Date.now();
                this._state.loginAttempts = 0;
                this._state.lockoutUntil = null;
                this._lastVerifyAt = Date.now(); // trust the fresh login

                return {
                    success: true,
                    message: 'Welcome ' + (data.user.fullName || data.user.username) + '!',
                    user: data.user,
                    token: data.token
                };
            }

            // Server said no
            this._state.loginAttempts++;
            if (this._state.loginAttempts >= this._state.maxLoginAttempts) {
                this._lockAccount();
            }
            return {
                success: false,
                message: (data && data.message) || 'Invalid username or password.'
            };

        } catch (error) {
            console.error('Login error:', error);
            return {
                success: false,
                message: 'Network error. Please check your connection and try again.'
            };
        }
    },

    // ============================================
    // LOGOUT
    // ============================================
    async logout() {
        const token = this.getToken();
        if (token) {
            try {
                await ApiService.post('/auth/logout');
            } catch (e) {
                // Ignore errors on logout
            }
        }

        this._clearSession();
        // ✅ SPA-safe redirect — server serves index.html for all routes
        window.location.href = '/';
    },

    // ============================================
    // GETTERS
    // ============================================
    getCurrentUser() {
        if (this._state.currentUser) return this._state.currentUser;

        const userJson = localStorage.getItem('user');
        if (userJson) {
            try {
                const user = JSON.parse(userJson);
                this._state.currentUser = user;
                this._state.isLoggedIn = true;
                return user;
            } catch (e) {
                return null;
            }
        }
        return null;
    },

    getToken() {
        return localStorage.getItem('token');
    },

    isLoggedIn() {
        if (this._state.isLoggedIn) return true;

        const token = localStorage.getItem('token');
        const user = localStorage.getItem('user');
        if (token && user) {
            try {
                JSON.parse(user);
                this._state.isLoggedIn = true;
                return true;
            } catch (e) { /* fall through */ }
        }
        return false;
    },

    isAdmin() {
        const user = this.getCurrentUser();
        return user && user.role === 'admin';
    },

    isCashier() {
        const user = this.getCurrentUser();
        return user && user.role === 'cashier';
    },

    hasRole(role) {
        const user = this.getCurrentUser();
        return user && user.role === role;
    },

    // ============================================
    // PASSWORD / PROFILE
    // ============================================

    // ✅ Change own password — fixed endpoint (was hitting /users/profile/password which doesn't exist)
    async changePassword(currentPassword, newPassword) {
        try {
            const token = this.getToken();
            if (!token) {
                return { success: false, message: 'You must be logged in to change password.' };
            }
            if (!newPassword || newPassword.length < 6) {
                return { success: false, message: 'New password must be at least 6 characters.' };
            }

            // Backend route is PUT /api/users/profile — it handles both name and password
            const data = await ApiService.put('/users/profile', {
                currentPassword,
                newPassword
            });

            if (data && data.success) {
                // Refresh the stored user (fullName may have changed)
                const userData = await ApiService.get('/users/profile', { fresh: true });
                if (userData) {
                    localStorage.setItem('user', JSON.stringify(userData));
                    this._state.currentUser = userData;
                }
            }

            return data || { success: false, message: 'Unknown error' };
        } catch (error) {
            console.error('Password change error:', error);
            return { success: false, message: 'Network error. Please try again.' };
        }
    },

    // ✅ Admin resets another user's password
    async resetUserPassword(userId, newPassword) {
        try {
            const token = this.getToken();
            if (!token) {
                return { success: false, message: 'You must be logged in.' };
            }
            if (!this.isAdmin()) {
                return { success: false, message: 'Only admins can reset passwords.' };
            }
            if (!newPassword || newPassword.length < 6) {
                return { success: false, message: 'New password must be at least 6 characters.' };
            }

            return await ApiService.post(`/users/${userId}/reset-password`, { newPassword });
        } catch (error) {
            console.error('Reset password error:', error);
            return { success: false, message: 'Network error. Please try again.' };
        }
    },

    // ✅ Update own profile
    async updateProfile(fullName) {
        try {
            const token = this.getToken();
            if (!token) {
                return { success: false, message: 'You must be logged in.' };
            }

            const data = await ApiService.put('/users/profile', { fullName });

            if (data && data.success && data.user) {
                localStorage.setItem('user', JSON.stringify(data.user));
                this._state.currentUser = data.user;
            }

            return data || { success: false, message: 'Unknown error' };
        } catch (error) {
            console.error('Profile update error:', error);
            return { success: false, message: 'Network error. Please try again.' };
        }
    },

    // ✅ Public verify — now shares the same code path as _verifyToken
    async verifyToken() {
        return this._verifyToken();
    },

    // ============================================
    // LEGACY (kept for backward compatibility)
    // ============================================
    getSecurityQuestion() {
        return StorageService.get(StorageService.KEYS.SECURITY_QUESTION, 'What is your favorite pet\'s name?');
    },

    resetPassword(answer, newPassword) {
        var storedAnswer = StorageService.get(StorageService.KEYS.SECURITY_ANSWER, 'talaen2024');
        if (answer.toLowerCase() !== storedAnswer.toLowerCase()) {
            return { success: false, message: 'Security answer is incorrect.' };
        }
        if (newPassword.length < 6) {
            return { success: false, message: 'Password must be at least 6 characters.' };
        }

        StorageService.set(StorageService.KEYS.PASSWORD, newPassword);
        this._state.loginAttempts = 0;
        return { success: true, message: 'Password reset!' };
    },

    getActivityLogs(limit) {
        var logs = StorageService.get(StorageService.KEYS.ACTIVITY_LOG, []);
        return logs.slice(-(limit || 50)).reverse();
    },

    // ============================================
    // LOCKOUT (client-side UX shortcut)
    // ============================================
    _lockAccount() {
        this._state.lockoutUntil = Date.now() + this._state.lockoutDuration;
    },

    _isLocked() {
        if (this._state.lockoutUntil && this._state.lockoutUntil > Date.now()) return true;
        if (this._state.lockoutUntil && this._state.lockoutUntil <= Date.now()) {
            this._state.lockoutUntil = null;
            this._state.loginAttempts = 0;
        }
        return false;
    },

    // ============================================
    // PASSWORD STRENGTH
    // ============================================
    checkPasswordStrength(password) {
        var score = 0;
        if (password.length >= 8) score++;
        if (/[A-Z]/.test(password)) score++;
        if (/[a-z]/.test(password)) score++;
        if (/[0-9]/.test(password)) score++;
        if (/[^A-Za-z0-9]/.test(password)) score++;
        var strength = score <= 2 ? 'Weak' : score <= 3 ? 'Medium' : score <= 4 ? 'Strong' : 'Very Strong';
        return { score, strength };
    }
};

// ✅ Defer initialization until DOM is ready so dependencies are loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { AuthService.init(); });
} else {
    AuthService.init();
}

window.AuthService = AuthService;
