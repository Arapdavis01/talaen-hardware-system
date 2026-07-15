// ============================================
// AUTH SERVICE - With JWT Authentication
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

    init() {
        // ✅ Check for existing JWT session
        this._checkSession();
    },

    _checkSession() {
        // ✅ Check if token exists and is valid
        const token = localStorage.getItem('token');
        const userJson = localStorage.getItem('user');
        
        if (token && userJson) {
            try {
                const user = JSON.parse(userJson);
                this._state.isLoggedIn = true;
                this._state.currentUser = user;
                this._state.sessionStart = Date.now();
                
                // ✅ Verify token with server (optional)
                this._verifyToken();
            } catch (e) {
                this._clearSession();
            }
        } else {
            this._clearSession();
        }
    },

    async _verifyToken() {
        try {
            const response = await fetch('/api/auth/verify', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (!response.ok) {
                this._clearSession();
            }
        } catch (error) {
            console.warn('Token verification failed:', error);
        }
    },

    _clearSession() {
        this._state.isLoggedIn = false;
        this._state.currentUser = null;
        this._state.sessionStart = null;
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    },

    // ✅ LOGIN - Uses JWT from server
    async login(username, password) {
        // Check if account is locked
        if (this._isLocked()) {
            var remainingTime = Math.ceil((this._state.lockoutUntil - Date.now()) / 1000 / 60);
            return { success: false, message: 'Account locked. Try again in ' + remainingTime + ' minutes.' };
        }

        try {
            const response = await fetch(this.API_URL + '/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (data.success) {
                // ✅ Store JWT token from server
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                
                this._state.isLoggedIn = true;
                this._state.currentUser = data.user;
                this._state.sessionStart = Date.now();
                this._state.loginAttempts = 0;
                this._state.lockoutUntil = null;

                return { 
                    success: true, 
                    message: 'Welcome ' + (data.user.fullName || data.user.username) + '!', 
                    user: data.user,
                    token: data.token
                };
            } else {
                // ✅ Handle failed login
                this._state.loginAttempts++;
                if (this._state.loginAttempts >= this._state.maxLoginAttempts) {
                    this._lockAccount();
                    return { 
                        success: false, 
                        message: 'Account locked due to too many failed attempts. Try again in 15 minutes.' 
                    };
                }
                return { 
                    success: false, 
                    message: data.message || 'Invalid username or password.' 
                };
            }
        } catch (error) {
            console.error('Login error:', error);
            return { 
                success: false, 
                message: 'Network error. Please check your connection and try again.' 
            };
        }
    },

    // ✅ LOGOUT - Clear JWT session
    async logout() {
        const token = localStorage.getItem('token');
        if (token) {
            try {
                await fetch('/api/auth/logout', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
            } catch (e) {
                // Ignore errors on logout
            }
        }
        
        this._clearSession();
        window.location.href = '/login.html';
    },

    // ✅ Get current user from JWT
    getCurrentUser() {
        if (this._state.currentUser) {
            return this._state.currentUser;
        }
        
        // Try to get from localStorage
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

    // ✅ Get JWT token
    getToken() {
        return localStorage.getItem('token');
    },

    // ✅ Check if logged in
    isLoggedIn() {
        if (this._state.isLoggedIn) return true;
        
        // Check localStorage
        const token = localStorage.getItem('token');
        const user = localStorage.getItem('user');
        if (token && user) {
            try {
                JSON.parse(user);
                this._state.isLoggedIn = true;
                return true;
            } catch (e) {}
        }
        return false;
    },

    // ✅ Check if admin
    isAdmin() {
        const user = this.getCurrentUser();
        return user && user.role === 'admin';
    },

    // ✅ Check if cashier
    isCashier() {
        const user = this.getCurrentUser();
        return user && user.role === 'cashier';
    },

    // ✅ Check if user has specific role
    hasRole(role) {
        const user = this.getCurrentUser();
        return user && user.role === role;
    },

    // ✅ Change own password (requires current password)
    async changePassword(currentPassword, newPassword) {
        try {
            const token = this.getToken();
            if (!token) {
                return { success: false, message: 'You must be logged in to change password.' };
            }

            if (!newPassword || newPassword.length < 6) {
                return { success: false, message: 'New password must be at least 6 characters.' };
            }

            const response = await fetch('/api/users/profile/password', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ currentPassword, newPassword })
            });

            const data = await response.json();
            
            if (data.success) {
                // ✅ User info might have changed (fullName), update it
                const userResponse = await fetch('/api/users/profile', {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                
                if (userResponse.ok) {
                    const userData = await userResponse.json();
                    localStorage.setItem('user', JSON.stringify(userData));
                    this._state.currentUser = userData;
                }
            }
            
            return data;
        } catch (error) {
            console.error('Password change error:', error);
            return { success: false, message: 'Network error. Please try again.' };
        }
    },

    // ✅ Admin resets user password
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

            const response = await fetch(`/api/users/${userId}/reset-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ newPassword })
            });

            return await response.json();
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

            const response = await fetch('/api/users/profile', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ fullName })
            });

            const data = await response.json();
            
            if (data.success && data.user) {
                // ✅ Update stored user info
                localStorage.setItem('user', JSON.stringify(data.user));
                this._state.currentUser = data.user;
            }
            
            return data;
        } catch (error) {
            console.error('Profile update error:', error);
            return { success: false, message: 'Network error. Please try again.' };
        }
    },

    // ✅ Verify if token is valid
    async verifyToken() {
        try {
            const token = this.getToken();
            if (!token) return false;

            const response = await fetch('/api/auth/verify', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                return data.success === true;
            }
            return false;
        } catch (error) {
            return false;
        }
    },

    // ============================================
    // LEGACY METHODS (For backwards compatibility)
    // ============================================

    // ✅ Get security question (legacy, may not be needed with JWT)
    getSecurityQuestion() {
        return StorageService.get(StorageService.KEYS.SECURITY_QUESTION, 'What is your favorite pet\'s name?');
    },

    // ✅ Reset password via security question (legacy fallback)
    resetPassword(answer, newPassword) {
        var storedAnswer = StorageService.get(StorageService.KEYS.SECURITY_ANSWER, 'talaen2024');
        if (answer.toLowerCase() !== storedAnswer.toLowerCase()) {
            return { success: false, message: 'Security answer is incorrect.' };
        }
        if (newPassword.length < 6) {
            return { success: false, message: 'Password must be at least 6 characters.' };
        }
        
        // ✅ In JWT system, we would need to update via API
        // This is a local fallback only
        StorageService.set(StorageService.KEYS.PASSWORD, newPassword);
        this._state.loginAttempts = 0;
        return { success: true, message: 'Password reset!' };
    },

    // ✅ Activity logs (legacy)
    getActivityLogs(limit) {
        var logs = StorageService.get(StorageService.KEYS.ACTIVITY_LOG, []);
        return logs.slice(-(limit || 50)).reverse();
    },

    // ✅ Lock account
    _lockAccount() {
        this._state.lockoutUntil = Date.now() + this._state.lockoutDuration;
    },

    // ✅ Check if account is locked
    _isLocked() {
        if (this._state.lockoutUntil && this._state.lockoutUntil > Date.now()) return true;
        if (this._state.lockoutUntil && this._state.lockoutUntil <= Date.now()) {
            this._state.lockoutUntil = null;
            this._state.loginAttempts = 0;
        }
        return false;
    },

    // ✅ Check password strength
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

// ✅ Initialize
AuthService.init();

// Make globally available
window.AuthService = AuthService;
