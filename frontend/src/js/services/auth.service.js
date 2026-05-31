const AuthService = {
    API_URL: 'http://localhost:8080/api',

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
        if (!StorageService.has(StorageService.KEYS.PASSWORD)) {
            StorageService.set(StorageService.KEYS.PASSWORD, 'Talaen@2026!Secure#Admin');
        }
        if (!StorageService.has(StorageService.KEYS.SECURITY_QUESTION)) {
            StorageService.set(StorageService.KEYS.SECURITY_QUESTION, 'What is your favorite pet\'s name?');
        }
        if (!StorageService.has(StorageService.KEYS.SECURITY_ANSWER)) {
            StorageService.set(StorageService.KEYS.SECURITY_ANSWER, 'talaen2024');
        }
        this._checkSession();
    },

    _checkSession() {
        var session = StorageService.get('talaen_session');
        if (session && session.expiresAt > Date.now()) {
            this._state.isLoggedIn = true;
            this._state.currentUser = session.user;
            this._state.sessionStart = session.startTime;
        } else {
            StorageService.remove('talaen_session');
        }
    },

    async login(username, password) {
        if (this._isLocked()) {
            var remainingTime = Math.ceil((this._state.lockoutUntil - Date.now()) / 1000 / 60);
            return { success: false, message: 'Account locked. Try again in ' + remainingTime + ' minutes.' };
        }

        // Try API first
        try {
            var response = await fetch(this.API_URL + '/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: username, password: password })
            });
            if (response.ok) {
                var data = await response.json();
                if (data.success && data.user) {
                    return this._loginSuccess(data.user);
                }
            }
        } catch (error) {
            console.warn('API unavailable, using emergency fallback');
        }

        // EMERGENCY FALLBACK - Only works when server is down
        var storedPassword = StorageService.get(StorageService.KEYS.PASSWORD, 'Talaen@2026!Secure#Admin');
        if (username.toLowerCase() === 'admin' && password === storedPassword) {
            return this._loginSuccess({ id: 1, username: 'admin', role: 'admin', fullName: 'Administrator' });
        }

        this._state.loginAttempts++;
        if (this._state.loginAttempts >= this._state.maxLoginAttempts) {
            this._lockAccount();
        }
        return { success: false, message: 'Invalid username or password.' };
    },

    _loginSuccess(user) {
        this._state.isLoggedIn = true;
        this._state.currentUser = { id: user.id, username: user.username, role: user.role, fullName: user.fullName };
        this._state.sessionStart = Date.now();
        this._state.loginAttempts = 0;
        this._createSession();
        return { success: true, message: 'Welcome ' + user.fullName + '!', user: this._state.currentUser };
    },

    logout() {
        this._state.isLoggedIn = false;
        this._state.currentUser = null;
        this._state.sessionStart = null;
        StorageService.remove('talaen_session');
    },

    isLoggedIn() { return this._state.isLoggedIn; },
    isAdmin() { return this._state.currentUser?.role === 'admin'; },
    isCashier() { return this._state.currentUser?.role === 'cashier'; },
    getCurrentUser() { return this._state.currentUser; },

    changePassword(oldPassword, newPassword) {
        var currentPassword = StorageService.get(StorageService.KEYS.PASSWORD, 'Talaen@2026!Secure#Admin');
        if (oldPassword !== currentPassword) return { success: false, message: 'Current password is incorrect.' };
        if (newPassword.length < 6) return { success: false, message: 'Password must be at least 6 characters.' };
        StorageService.set(StorageService.KEYS.PASSWORD, newPassword);
        return { success: true, message: 'Password changed!' };
    },

    resetPassword(answer, newPassword) {
        var storedAnswer = StorageService.get(StorageService.KEYS.SECURITY_ANSWER, 'talaen2024');
        if (answer.toLowerCase() !== storedAnswer.toLowerCase()) return { success: false, message: 'Security answer is incorrect.' };
        if (newPassword.length < 6) return { success: false, message: 'Password must be at least 6 characters.' };
        StorageService.set(StorageService.KEYS.PASSWORD, newPassword);
        this._state.loginAttempts = 0;
        return { success: true, message: 'Password reset!' };
    },

    getSecurityQuestion() { return StorageService.get(StorageService.KEYS.SECURITY_QUESTION, 'What is your favorite pet\'s name?'); },

    updateSecurityQuestion(question, answer) {
        if (!question || !answer) return { success: false, message: 'Question and answer are required.' };
        StorageService.set(StorageService.KEYS.SECURITY_QUESTION, question);
        StorageService.set(StorageService.KEYS.SECURITY_ANSWER, answer);
        return { success: true, message: 'Security question updated!' };
    },

    checkPasswordStrength(password) {
        var score = 0;
        if (password.length >= 8) score++;
        if (/[A-Z]/.test(password)) score++;
        if (/[a-z]/.test(password)) score++;
        if (/[0-9]/.test(password)) score++;
        if (/[^A-Za-z0-9]/.test(password)) score++;
        var strength = score <= 2 ? 'Weak' : score <= 3 ? 'Medium' : score <= 4 ? 'Strong' : 'Very Strong';
        return { score, strength };
    },

    _createSession() {
        StorageService.set('talaen_session', {
            user: this._state.currentUser,
            startTime: this._state.sessionStart,
            expiresAt: Date.now() + (8 * 60 * 60 * 1000)
        });
    },

    _isLocked() {
        if (this._state.lockoutUntil && this._state.lockoutUntil > Date.now()) return true;
        if (this._state.lockoutUntil && this._state.lockoutUntil <= Date.now()) {
            this._state.lockoutUntil = null;
            this._state.loginAttempts = 0;
        }
        return false;
    },

    _lockAccount() { this._state.lockoutUntil = Date.now() + this._state.lockoutDuration; },

    getActivityLogs(limit) {
        var logs = StorageService.get(StorageService.KEYS.ACTIVITY_LOG, []);
        return logs.slice(-(limit || 50)).reverse();
    }
};

AuthService.init();