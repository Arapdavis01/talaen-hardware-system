const express = require('express');
const path = require('path');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const app = express();
const PORT = process.env.PORT || 8080;

// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '24h';
const MAX_LOGIN_ATTEMPTS = 5;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'frontend', 'public')));
app.use('/src', express.static(path.join(__dirname, 'frontend', 'src')));

// Rate limiting for login
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { success: false, message: 'Too many login attempts. Please try again in 15 minutes.' },
    standardHeaders: true,
    legacyHeaders: false,
    skip: function(req) {
        return false;
    },
    keyGenerator: function(req) {
        return req.ip || req.connection.remoteAddress;
    }
});

// ============================================
// POSTGRESQL CONNECTION (Supabase)
// ============================================

const pool = new Pool({
    host: process.env.PGHOST || 'aws-0-eu-west-1.pooler.supabase.com',
    port: parseInt(process.env.PGPORT) || 6543,
    user: process.env.PGUSER || 'postgres.rpgmehnxtztpnmsjtiyc',
    password: process.env.PGPASSWORD || 'Arapdavis@1954',
    database: process.env.PGDATABASE || 'postgres',
    ssl: { rejectUnauthorized: false },
    family: 4,
    connectionTimeoutMillis: 10000,
    keepAlive: true
});

pool.connect((err, client, release) => {
    if (err) {
        console.error('Error connecting to Supabase:', err.stack);
    } else {
        console.log('Connected to Supabase PostgreSQL');
        release();
    }
});

// ============================================
// INIT DATABASE - PostgreSQL Version
// ============================================

async function initDB() {
    const queries = [
        `CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            username VARCHAR(255) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            plain_password VARCHAR(255),
            role VARCHAR(50) DEFAULT 'cashier',
            fullName VARCHAR(255) DEFAULT '',
            isActive INT DEFAULT 1
        )`,
        `CREATE TABLE IF NOT EXISTS products (
            id SERIAL PRIMARY KEY,
            sku VARCHAR(50),
            name VARCHAR(255) NOT NULL,
            brand VARCHAR(255) DEFAULT '',
            variant VARCHAR(255) DEFAULT '',
            category VARCHAR(255) DEFAULT 'General',
            price DECIMAL(10,2) NOT NULL,
            cost DECIMAL(10,2) DEFAULT 0,
            stock INT DEFAULT 0,
            unit VARCHAR(50) DEFAULT 'pcs',
            minStock INT DEFAULT 10,
            isActive INT DEFAULT 1
        )`,
        `CREATE TABLE IF NOT EXISTS sales (
            id SERIAL PRIMARY KEY,
            receiptNo VARCHAR(50) NOT NULL,
            customerName VARCHAR(255) DEFAULT 'Walk-in',
            paymentMethod VARCHAR(50) DEFAULT 'cash',
            subtotal DECIMAL(10,2),
            tax DECIMAL(10,2),
            discount DECIMAL(10,2) DEFAULT 0,
            total DECIMAL(10,2),
            transportCost DECIMAL(10,2) DEFAULT 0,
            cashierId INT,
            cashierName VARCHAR(255),
            mpesaRef VARCHAR(100),
            isCredit INT DEFAULT 0,
            customerId INT,
            debtPaid DECIMAL(10,2) DEFAULT 0,
            date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            isVoid INT DEFAULT 0,
            is_returned INT DEFAULT 0,
            return_type VARCHAR(20),
            return_date TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS sale_items (
            id SERIAL PRIMARY KEY,
            saleId INT REFERENCES sales(id),
            productId INT,
            productName VARCHAR(255),
            quantity INT,
            price DECIMAL(10,2),
            total DECIMAL(10,2)
        )`,
        `CREATE TABLE IF NOT EXISTS settings (
            id SERIAL PRIMARY KEY,
            adminPassword VARCHAR(255),
            taxRate DECIMAL(10,2) DEFAULT 16,
            announcement TEXT
        )`,
        `CREATE TABLE IF NOT EXISTS activity_log (
            id SERIAL PRIMARY KEY,
            userId INT,
            userName VARCHAR(255),
            action VARCHAR(100),
            details TEXT,
            date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS suppliers (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255),
            contact VARCHAR(255),
            email VARCHAR(255),
            phone VARCHAR(50),
            address TEXT
        )`,
        `CREATE TABLE IF NOT EXISTS purchase_orders (
            id SERIAL PRIMARY KEY,
            poNumber VARCHAR(50),
            supplierName VARCHAR(255),
            supplierId INT,
            status VARCHAR(50) DEFAULT 'pending',
            notes TEXT,
            total DECIMAL(10,2) DEFAULT 0,
            createdBy VARCHAR(255),
            date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            receivedDate TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS po_items (
            id SERIAL PRIMARY KEY,
            poId INT REFERENCES purchase_orders(id),
            productName VARCHAR(255),
            brand VARCHAR(255),
            variant VARCHAR(255),
            quantity INT,
            unitPrice DECIMAL(10,2),
            sellingPrice DECIMAL(10,2) DEFAULT 0,
            lastPrice DECIMAL(10,2) DEFAULT 0,
            currentStock INT DEFAULT 0,
            discount DECIMAL(10,2) DEFAULT 0,
            total DECIMAL(10,2)
        )`,
        `CREATE TABLE IF NOT EXISTS credit_customers (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255),
            phone VARCHAR(50),
            idNumber VARCHAR(50),
            address TEXT,
            debtLimit DECIMAL(10,2) DEFAULT 5000,
            totalDebt DECIMAL(10,2) DEFAULT 0,
            registeredBy VARCHAR(255),
            registeredById INT,
            dateRegistered TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            isActive INT DEFAULT 1
        )`,
        `CREATE TABLE IF NOT EXISTS debt_payments (
            id SERIAL PRIMARY KEY,
            customerId INT REFERENCES credit_customers(id),
            customerName VARCHAR(255),
            amount DECIMAL(10,2),
            paymentMethod VARCHAR(50) DEFAULT 'cash',
            saleId INT,
            receivedBy VARCHAR(255),
            receivedById INT,
            date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS credit_sales (
            id SERIAL PRIMARY KEY,
            saleId INT REFERENCES sales(id),
            customerId INT REFERENCES credit_customers(id),
            customerName VARCHAR(255),
            amount DECIMAL(10,2),
            debtBefore DECIMAL(10,2),
            debtAfter DECIMAL(10,2),
            cashierId INT,
            cashierName VARCHAR(255),
            date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS returns_table (
            id SERIAL PRIMARY KEY,
            originalSaleId INT REFERENCES sales(id),
            originalReceiptNo VARCHAR(50),
            customerName VARCHAR(255),
            returnType VARCHAR(50) DEFAULT 'return',
            productId INT,
            productName VARCHAR(255),
            quantity INT,
            returnAmount DECIMAL(10,2),
            exchangeProductId INT,
            exchangeProductName VARCHAR(255),
            exchangeAmount DECIMAL(10,2),
            refundAmount DECIMAL(10,2),
            reason TEXT,
            cashierName VARCHAR(255),
            date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS sessions (
            id SERIAL PRIMARY KEY,
            user_id INT REFERENCES users(id),
            token VARCHAR(500),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            expires_at TIMESTAMP,
            ip_address VARCHAR(45),
            user_agent TEXT
        )`,
        `CREATE TABLE IF NOT EXISTS login_attempts (
            id SERIAL PRIMARY KEY,
            username VARCHAR(255),
            ip_address VARCHAR(45),
            attempt_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            success INT DEFAULT 0
        )`
    ];

    for (const query of queries) {
        try {
            await pool.query(query);
        } catch (e) {
            console.error('Error creating table:', e.message);
        }
    }

    try {
        const usersResult = await pool.query("SELECT COUNT(*) as c FROM users");
        const userCount = parseInt(usersResult.rows[0].c);
        
        if (userCount === 0) {
            const hashedAdmin = await bcrypt.hash('admin123', 10);
            const hashedCashier = await bcrypt.hash('cashier123', 10);
            
            await pool.query(
                "INSERT INTO users (id, username, password, plain_password, role, fullName, isActive) VALUES ($1, $2, $3, $4, $5, $6, $7)",
                [1, 'admin', hashedAdmin, 'admin123', 'admin', 'Administrator', 1]
            );
            await pool.query(
                "INSERT INTO users (id, username, password, plain_password, role, fullName, isActive) VALUES ($1, $2, $3, $4, $5, $6, $7)",
                [2, 'cashier', hashedCashier, 'cashier123', 'cashier', 'Cashier User', 1]
            );
            
            const hashedSettingsAdmin = await bcrypt.hash('admin123', 10);
            await pool.query(
                "INSERT INTO settings (id, adminPassword, taxRate) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING",
                [1, hashedSettingsAdmin, 16]
            );
        }
    } catch (error) {
        console.error('Error checking/creating users:', error.message);
    }

    console.log('Database initialized (PostgreSQL/Supabase)');
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function logActivity(userId, userName, action, details) {
    pool.query(
        "INSERT INTO activity_log (userId, userName, action, details, date) VALUES ($1, $2, $3, $4, NOW())",
        [userId || null, userName || 'System', action, details]
    );
}

async function logLoginAttempt(username, ipAddress, success) {
    try {
        await pool.query(
            "INSERT INTO login_attempts (username, ip_address, success, attempt_time) VALUES ($1, $2, $3, NOW())",
            [username, ipAddress, success ? 1 : 0]
        );
    } catch (error) {
        console.error('Error logging login attempt:', error);
    }
}

function verifyToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ success: false, message: 'Session expired. Please login again.' });
        }
        return res.status(403).json({ success: false, message: 'Invalid token.' });
    }
}

function authorize(...roles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ success: false, message: 'Unauthorized. Please login.' });
        }
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ success: false, message: 'Insufficient permissions.' });
        }
        next();
    };
}

// ============================================
// AUTH LOGIN - FIXED for pg library
// ============================================

app.post('/api/auth/login', loginLimiter, async (req, res) => {
    const { username, password } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;
    
    if (!username || !password) {
        return res.json({ success: false, message: 'Username and password are required' });
    }

    try {
        const lockCheckResult = await pool.query(
            "SELECT COUNT(*) as failed_count FROM login_attempts WHERE username = $1 AND success = 0 AND attempt_time > NOW() - INTERVAL '15 minutes'",
            [username]
        );
        const failedCount = parseInt(lockCheckResult.rows[0].failed_count);
        
        if (failedCount >= MAX_LOGIN_ATTEMPTS) {
            return res.json({
                success: false,
                message: 'Account temporarily locked. Too many failed attempts. Please try again later.'
            });
        }

        const userResult = await pool.query("SELECT * FROM users WHERE username = $1", [username]);
        const user = userResult.rows;

        if (user.length === 0) {
            await logLoginAttempt(username, ipAddress, false);
            return res.json({ success: false, message: 'Invalid credentials' });
        }

        if (user[0].isactive !== 1) {
            await logLoginAttempt(username, ipAddress, false);
            return res.json({ success: false, message: 'Account is deactivated. Contact administrator.' });
        }

        const isMatch = await bcrypt.compare(password, user[0].password);
        
        if (!isMatch) {
            await logLoginAttempt(username, ipAddress, false);
            const attemptCountResult = await pool.query(
                "SELECT COUNT(*) as count FROM login_attempts WHERE username = $1 AND success = 0 AND attempt_time > NOW() - INTERVAL '15 minutes'",
                [username]
            );
            const remainingAttempts = MAX_LOGIN_ATTEMPTS - parseInt(attemptCountResult.rows[0].count);
            return res.json({ 
                success: false, 
                message: 'Invalid credentials. ' + remainingAttempts + ' attempts remaining before lockout.'
            });
        }

        await logLoginAttempt(username, ipAddress, true);

        const token = jwt.sign(
            { 
                id: user[0].id, 
                username: user[0].username, 
                role: user[0].role,
                fullName: user[0].fullname
            },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRY }
        );

        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24);
        
        await pool.query(
            "INSERT INTO sessions (user_id, token, expires_at) VALUES ($1, $2, $3)",
            [user[0].id, token, expiresAt]
        );

        await pool.query("DELETE FROM login_attempts WHERE username = $1", [username]);
        logActivity(user[0].id, user[0].fullname, 'login', 'Logged in successfully');

        return res.json({
            success: true,
            message: 'Login successful!',
            token: token,
            expiresIn: JWT_EXPIRY,
            user: {
                id: user[0].id,
                username: user[0].username,
                role: user[0].role,
                fullName: user[0].fullname
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, message: 'An error occurred during login.' });
    }
});

app.post('/api/auth/logout', verifyToken, async (req, res) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
        await pool.query("DELETE FROM sessions WHERE token = $1", [token]);
        logActivity(req.user.id, req.user.fullName, 'logout', 'Logged out');
        res.json({ success: true, message: 'Logged out successfully' });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ success: false, message: 'Error during logout' });
    }
});

app.get('/api/auth/verify', verifyToken, async (req, res) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
        const sessionResult = await pool.query(
            "SELECT * FROM sessions WHERE token = $1 AND expires_at > NOW()",
            [token]
        );
        const session = sessionResult.rows;
        if (session.length === 0) {
            return res.status(401).json({ success: false, message: 'Session invalid or expired' });
        }
        res.json({ success: true, user: req.user });
    } catch (error) {
        console.error('Verify error:', error);
        res.status(500).json({ success: false, message: 'Error verifying session' });
    }
});

// ============================================
// USER ENDPOINTS - FIXED for PostgreSQL
// ============================================

// GET ALL USERS - Admin only
app.get('/api/users', verifyToken, authorize('admin'), async (req, res) => {
    try {
        const r = await pool.query(
            "SELECT id, username, plain_password as password, role, fullName, isActive FROM users ORDER BY id"
        );
        // Map to camelCase for frontend
        const users = r.rows.map(user => ({
            id: user.id,
            username: user.username,
            password: user.password,
            role: user.role,
            fullName: user.fullname,
            isActive: user.isactive
        }));
        res.json(users);
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ success: false, message: 'Error fetching users' });
    }
});

// GET USER PROFILE - Self
app.get('/api/users/profile', verifyToken, async (req, res) => {
    try {
        const userResult = await pool.query(
            "SELECT id, username, plain_password as password, role, fullName, isActive FROM users WHERE id = $1",
            [req.user.id]
        );
        const user = userResult.rows[0];
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        res.json({
            id: user.id,
            username: user.username,
            password: user.password,
            role: user.role,
            fullName: user.fullname,
            isActive: user.isactive
        });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ success: false, message: 'Error fetching profile' });
    }
});

// GET SINGLE USER - Admin only
app.get('/api/users/:id', verifyToken, authorize('admin'), async (req, res) => {
    try {
        const userResult = await pool.query(
            "SELECT id, username, plain_password as password, role, fullName, isActive FROM users WHERE id = $1",
            [req.params.id]
        );
        const user = userResult.rows[0];
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        res.json({
            id: user.id,
            username: user.username,
            password: user.password,
            role: user.role,
            fullName: user.fullname,
            isActive: user.isactive
        });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ success: false, message: 'Error fetching user' });
    }
});

// CREATE USER - Admin only
app.post('/api/users', verifyToken, authorize('admin'), async (req, res) => {
    const { username, password, role, fullName } = req.body;
    try {
        if (!username || !password || password.length < 6) {
            return res.json({ success: false, message: 'Username and password (min 6 chars) required' });
        }
        
        // Check if username exists
        const existingUser = await pool.query("SELECT id FROM users WHERE username = $1", [username]);
        if (existingUser.rows.length > 0) {
            return res.json({ success: false, message: 'Username already exists' });
        }
        
        const hashedPassword = await bcrypt.hash(password, 10);
        const r = await pool.query(
            "INSERT INTO users (username, password, plain_password, role, fullName, isActive) VALUES ($1, $2, $3, $4, $5, 1) RETURNING id",
            [username, hashedPassword, password, role || 'cashier', fullName || username]
        );
        
        logActivity(req.user.id, req.user.fullName, 'add_user', 'Added: ' + (fullName || username));
        
        const newUserResult = await pool.query(
            "SELECT id, username, plain_password as password, role, fullName, isActive FROM users WHERE id = $1",
            [r.rows[0].id]
        );
        const newUser = newUserResult.rows[0];
        
        res.json({ 
            success: true, 
            message: 'User created successfully',
            user: {
                id: newUser.id,
                username: newUser.username,
                password: newUser.password,
                role: newUser.role,
                fullName: newUser.fullname,
                isActive: newUser.isactive
            }
        });
    } catch(e) {
        console.error('Create user error:', e);
        if (e.code === '23505') {
            res.json({ success: false, message: 'Username already exists' });
        } else {
            res.json({ success: false, message: 'Error creating user: ' + e.message });
        }
    }
});

// UPDATE USER - Admin only
app.put('/api/users/:id', verifyToken, authorize('admin'), async (req, res) => {
    const userId = req.params.id;
    const { isActive, fullName, username, role } = req.body;
    try {
        const userResult = await pool.query("SELECT * FROM users WHERE id = $1", [userId]);
        const user = userResult.rows;
        if (!user.length) {
            return res.json({ success: false, message: 'User not found' });
        }
        
        // Prevent admin from deactivating themselves
        if (isActive === 0 && parseInt(userId) === req.user.id) {
            return res.json({ success: false, message: 'You cannot deactivate your own account' });
        }
        
        // Prevent changing admin role
        if (role && user[0].role === 'admin' && role !== 'admin') {
            return res.json({ success: false, message: 'Cannot change admin role' });
        }
        
        const updates = [];
        const values = [];
        let paramCount = 1;
        
        if (fullName !== undefined && fullName !== '') {
            updates.push('fullName = $' + paramCount++);
            values.push(fullName);
        }
        if (username !== undefined && username !== '') {
            // Check if username is taken by another user
            const existingUser = await pool.query("SELECT id FROM users WHERE username = $1 AND id != $2", [username, userId]);
            if (existingUser.rows.length > 0) {
                return res.json({ success: false, message: 'Username already exists' });
            }
            updates.push('username = $' + paramCount++);
            values.push(username);
        }
        if (isActive !== undefined) {
            updates.push('isActive = $' + paramCount++);
            values.push(isActive);
        }
        if (role !== undefined && user[0].role !== 'admin') {
            updates.push('role = $' + paramCount++);
            values.push(role);
        }
        
        if (updates.length === 0) {
            return res.json({ success: false, message: 'No updates provided' });
        }
        
        values.push(userId);
        await pool.query('UPDATE users SET ' + updates.join(', ') + ' WHERE id = $' + paramCount, values);
        
        const updatedUserResult = await pool.query(
            "SELECT id, username, plain_password as password, role, fullName, isActive FROM users WHERE id = $1",
            [userId]
        );
        const updatedUser = updatedUserResult.rows[0];
        
        logActivity(req.user.id, req.user.fullName, 'update_user', 'Updated: ' + (updatedUser.fullname || updatedUser.username));
        
        res.json({ 
            success: true, 
            message: 'User updated successfully',
            user: {
                id: updatedUser.id,
                username: updatedUser.username,
                password: updatedUser.password,
                role: updatedUser.role,
                fullName: updatedUser.fullname,
                isActive: updatedUser.isactive
            }
        });
    } catch(e) {
        console.error('Update user error:', e);
        if (e.code === '23505') {
            res.json({ success: false, message: 'Username already exists' });
        } else {
            res.json({ success: false, message: 'Error updating user: ' + e.message });
        }
    }
});

// RESET USER PASSWORD - Admin only
app.post('/api/users/:id/reset-password', verifyToken, authorize('admin'), async (req, res) => {
    const userId = req.params.id;
    const { newPassword } = req.body;
    try {
        if (!newPassword || newPassword.length < 6) {
            return res.json({ success: false, message: 'New password must be at least 6 characters' });
        }
        const userResult = await pool.query("SELECT * FROM users WHERE id = $1", [userId]);
        const user = userResult.rows;
        if (!user.length) {
            return res.json({ success: false, message: 'User not found' });
        }
        if (userId == req.user.id) {
            return res.json({ success: false, message: 'Use profile update to change your own password' });
        }
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await pool.query(
            "UPDATE users SET password = $1, plain_password = $2 WHERE id = $3",
            [hashedPassword, newPassword, userId]
        );
        logActivity(req.user.id, req.user.fullName, 'password_reset', 'Reset password for: ' + (user[0].fullName || user[0].username));
        res.json({ success: true, message: 'Password reset successfully for ' + (user[0].fullName || user[0].username) });
    } catch (error) {
        console.error('Password reset error:', error);
        res.status(500).json({ success: false, message: 'Error resetting password' });
    }
});

// CHANGE OWN PASSWORD - Self
app.put('/api/users/profile', verifyToken, async (req, res) => {
    const userId = req.user.id;
    const { fullName, currentPassword, newPassword } = req.body;
    try {
        const userResult = await pool.query("SELECT * FROM users WHERE id = $1", [userId]);
        const user = userResult.rows;
        if (!user.length) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        if (newPassword) {
            if (!currentPassword) {
                return res.json({ success: false, message: 'Current password is required' });
            }
            const isMatch = await bcrypt.compare(currentPassword, user[0].password);
            if (!isMatch) {
                return res.json({ success: false, message: 'Current password is incorrect' });
            }
            if (newPassword.length < 6) {
                return res.json({ success: false, message: 'New password must be at least 6 characters' });
            }
            const hashedPassword = await bcrypt.hash(newPassword, 10);
            await pool.query(
                "UPDATE users SET password = $1, plain_password = $2 WHERE id = $3",
                [hashedPassword, newPassword, userId]
            );
            logActivity(userId, req.user.fullName, 'password_change', 'User changed their own password');
        }
        if (fullName !== undefined && fullName !== '') {
            await pool.query("UPDATE users SET fullName = $1 WHERE id = $2", [fullName, userId]);
            req.user.fullName = fullName;
        }
        const updatedUserResult = await pool.query(
            "SELECT id, username, plain_password as password, role, fullName, isActive FROM users WHERE id = $1",
            [userId]
        );
        const updatedUser = updatedUserResult.rows[0];
        res.json({ 
            success: true, 
            message: 'Profile updated successfully',
            user: {
                id: updatedUser.id,
                username: updatedUser.username,
                password: updatedUser.password,
                role: updatedUser.role,
                fullName: updatedUser.fullname,
                isActive: updatedUser.isactive
            }
        });
    } catch (error) {
        console.error('Profile update error:', error);
        res.status(500).json({ success: false, message: 'Error updating profile' });
    }
});

// ============================================
// PRODUCTS ENDPOINTS
// ============================================

app.get('/api/products', verifyToken, async (req, res) => {
    try {
        const r = await pool.query("SELECT * FROM products WHERE isActive=1 ORDER BY name, brand");
        res.json(r.rows);
    } catch (error) {
        console.error('Get products error:', error);
        res.status(500).json({ success: false, message: 'Error fetching products' });
    }
});

app.get('/api/products/paginated', verifyToken, async (req, res) => {
    try {
        var page = parseInt(req.query.page) || 1;
        var limit = parseInt(req.query.limit) || 25;
        var search = req.query.search || '';
        var category = req.query.category || '';
        var stockFilter = req.query.stock || '';
        var offset = (page - 1) * limit;
        var whereClause = 'WHERE isActive = 1';
        var params = [];
        var paramCount = 1;
        if (search) {
            whereClause += ' AND (name ILIKE $' + paramCount + ' OR brand ILIKE $' + (paramCount + 1) + ' OR variant ILIKE $' + (paramCount + 2) + ' OR category ILIKE $' + (paramCount + 3) + ')';
            var q = '%' + search + '%';
            params.push(q, q, q, q);
            paramCount += 4;
        }
        if (category) {
            whereClause += ' AND category = $' + paramCount;
            params.push(category);
            paramCount++;
        }
        if (stockFilter === 'out') {
            whereClause += ' AND stock = 0';
        } else if (stockFilter === 'low') {
            whereClause += ' AND stock > 0 AND stock <= minStock';
        } else if (stockFilter === 'ok') {
            whereClause += ' AND stock > minStock';
        }
        var countResult = await pool.query('SELECT COUNT(*) as total FROM products ' + whereClause, params);
        var total = parseInt(countResult.rows[0].total);
        params.push(limit, offset);
        var productsResult = await pool.query('SELECT * FROM products ' + whereClause + ' ORDER BY name, brand LIMIT $' + params.length + ' OFFSET $' + (params.length + 1), params);
        res.json({ products: productsResult.rows, pagination: { page: page, limit: limit, total: total, totalPages: Math.ceil(total / limit), hasNext: offset + limit < total, hasPrev: page > 1 } });
    } catch(e) {
        console.error('Paginated products error:', e);
        res.json({ products: [], pagination: { page: 1, limit: 25, total: 0, totalPages: 0, hasNext: false, hasPrev: false } });
    }
});

app.get('/api/products/categories', verifyToken, async (req, res) => {
    try {
        var categoriesResult = await pool.query("SELECT DISTINCT category FROM products WHERE isActive = 1 AND category != '' ORDER BY category");
        res.json(categoriesResult.rows.map(function(c) { return c.category; }));
    } catch(e) {
        res.json([]);
    }
});

app.get('/api/products/with-prices', verifyToken, async (req, res) => {
    try {
        const productsResult = await pool.query("SELECT * FROM products WHERE isActive=1 ORDER BY name,brand");
        const products = productsResult.rows;
        for (let p of products) {
            const lastPOResult = await pool.query(
                "SELECT pi.unitPrice, pi.sellingPrice FROM po_items pi JOIN purchase_orders po ON pi.poId=po.id WHERE pi.productName=$1 AND pi.brand=$2 AND pi.variant=$3 ORDER BY po.date DESC LIMIT 1",
                [p.name, p.brand, p.variant]
            );
            p.lastPrice = lastPOResult.rows.length ? lastPOResult.rows[0].unitprice : p.cost;
        }
        res.json(products);
    } catch(e) {
        console.error('Products with prices error:', e);
        res.status(500).json({ success: false, message: 'Error fetching products' });
    }
});

app.post('/api/products', verifyToken, authorize('admin'), async (req, res) => {
    const { name, brand, variant, category, price, cost, stock, unit } = req.body;
    const sku = Date.now().toString(36).toUpperCase();
    try {
        const r = await pool.query(
            "INSERT INTO products (sku, name, brand, variant, category, price, cost, stock, unit) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id",
            [sku, name, brand, variant, category, price, cost || 0, stock || 0, unit || 'pcs']
        );
        logActivity(req.user.id, req.user.fullName, 'add_product', 'Added: ' + (brand || '') + ' ' + name);
        res.json({ success: true, id: r.rows[0].id });
    } catch (error) {
        console.error('Add product error:', error);
        res.status(500).json({ success: false, message: 'Error adding product' });
    }
});

app.put('/api/products/:id', verifyToken, authorize('admin'), async (req, res) => {
    const { name, brand, variant, price, cost, stock, unit } = req.body;
    try {
        await pool.query(
            "UPDATE products SET name=$1, brand=$2, variant=$3, price=$4, cost=$5, stock=$6, unit=$7 WHERE id=$8",
            [name, brand, variant, price, cost, stock, unit, req.params.id]
        );
        res.json({ success: true });
    } catch (error) {
        console.error('Update product error:', error);
        res.status(500).json({ success: false, message: 'Error updating product' });
    }
});

app.delete('/api/products/:id', verifyToken, authorize('admin'), async (req, res) => {
    try {
        await pool.query("UPDATE products SET isActive=0 WHERE id=$1", [req.params.id]);
        res.json({ success: true });
    } catch (error) {
        console.error('Delete product error:', error);
        res.status(500).json({ success: false, message: 'Error deleting product' });
    }
});

app.put('/api/products/:id/stock', verifyToken, authorize('admin'), async (req, res) => {
    try {
        await pool.query("UPDATE products SET stock = stock + $1 WHERE id = $2", [req.body.quantity, req.params.id]);
        res.json({ success: true });
    } catch (error) {
        console.error('Update stock error:', error);
        res.status(500).json({ success: false, message: 'Error updating stock' });
    }
});

app.get('/api/products/search', verifyToken, async (req, res) => {
    const q = '%' + (req.query.q || '') + '%';
    try {
        const productsResult = await pool.query(
            "SELECT id, name, brand, variant, price, stock, unit FROM products WHERE isActive=1 AND (name ILIKE $1 OR brand ILIKE $2 OR variant ILIKE $3) AND stock > 0 ORDER BY name LIMIT 20",
            [q, q, q]
        );
        res.json(productsResult.rows);
    } catch (error) {
        console.error('Search products error:', error);
        res.status(500).json({ success: false, message: 'Error searching products' });
    }
});

// ============================================
// SALES ENDPOINTS
// ============================================

app.get('/api/sales', verifyToken, async (req, res) => {
    try {
        const salesResult = await pool.query("SELECT * FROM sales ORDER BY date DESC");
        const sales = salesResult.rows;
        for (let s of sales) {
            const itemsResult = await pool.query("SELECT * FROM sale_items WHERE saleId = $1", [s.id]);
            s.items = itemsResult.rows;
        }
        res.json(sales);
    } catch (error) {
        console.error('Get sales error:', error);
        res.status(500).json({ success: false, message: 'Error fetching sales' });
    }
});

app.get('/api/sales/cashiers-summary', verifyToken, authorize('admin'), async (req, res) => {
    try {
        const cashiersResult = await pool.query("SELECT id, fullName, username FROM users WHERE role='cashier' AND isActive=1");
        const cashiers = cashiersResult.rows;
        const today = new Date().toISOString().split('T')[0];
        const result = [];
        for (let c of cashiers) {
            const salesResult = await pool.query("SELECT * FROM sales WHERE cashierId=$1 AND isVoid=0", [c.id]);
            const sales = salesResult.rows;
            const todaySales = sales.filter(function(s) { return s.date && s.date.startsWith(today); });
            result.push({
                id: c.id,
                name: c.fullname,
                username: c.username,
                totalAll: sales.reduce(function(s, sale) { return s + Number(sale.total); }, 0),
                totalToday: todaySales.reduce(function(s, sale) { return s + Number(sale.total); }, 0),
                countAll: sales.length,
                countToday: todaySales.length
            });
        }
        res.json(result);
    } catch (error) {
        console.error('Cashiers summary error:', error);
        res.status(500).json({ success: false, message: 'Error fetching cashiers summary' });
    }
});

app.get('/api/sales/cashier/:id', verifyToken, async (req, res) => {
    try {
        const salesResult = await pool.query("SELECT * FROM sales WHERE cashierId=$1 AND isVoid=0 ORDER BY date DESC", [req.params.id]);
        const sales = salesResult.rows;
        const today = new Date().toISOString().split('T')[0];
        const todaySales = sales.filter(function(s) { return s.date && s.date.startsWith(today); });
        res.json({
            all: sales,
            today: todaySales,
            totalAll: sales.reduce(function(s, sale) { return s + Number(sale.total); }, 0),
            totalToday: todaySales.reduce(function(s, sale) { return s + Number(sale.total); }, 0),
            countAll: sales.length,
            countToday: todaySales.length
        });
    } catch (error) {
        console.error('Get cashier sales error:', error);
        res.status(500).json({ success: false, message: 'Error fetching cashier sales' });
    }
});

app.post('/api/sales', verifyToken, async (req, res) => {
    const { customerName, items, paymentMethod, subtotal, tax, discount, total, cashierId, cashierName, mpesaRef, isCredit, customerId, debtPaid, transportCost } = req.body;
    const rn = 'TIH-' + Date.now().toString(36).toUpperCase();
    try {
        const s = await pool.query(
            "INSERT INTO sales (receiptNo, customerName, paymentMethod, subtotal, tax, discount, total, transportCost, cashierId, cashierName, mpesaRef, isCredit, customerId, debtPaid, date) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW()) RETURNING id",
            [rn, customerName, paymentMethod, subtotal, tax, discount || 0, total, transportCost || 0, cashierId || null, cashierName || null, mpesaRef || null, isCredit || 0, customerId || null, debtPaid || 0]
        );
        const saleId = s.rows[0].id;
        for (let i of items) {
            await pool.query(
                "INSERT INTO sale_items (saleId, productId, productName, quantity, price, total) VALUES ($1, $2, $3, $4, $5, $6)",
                [saleId, i.productId, i.productName, i.quantity, i.price, i.quantity * i.price]
            );
            await pool.query("UPDATE products SET stock = stock - $1 WHERE id = $2", [i.quantity, i.productId]);
        }
        logActivity(cashierId, cashierName, 'sale', 'Sale: ' + rn + ' - KES ' + (total || 0).toLocaleString());
        res.json({ success: true, receiptNo: rn, saleId: saleId });
    } catch (error) {
        console.error('Create sale error:', error);
        res.status(500).json({ success: false, message: 'Error creating sale' });
    }
});

// ============================================
// RETURN ENDPOINTS
// ============================================

app.post('/api/returns', verifyToken, async (req, res) => {
    const { originalSaleId, originalReceiptNo, customerName, returnType, productId, productName, quantity, returnAmount, exchangeProductId, exchangeProductName, exchangeAmount, refundAmount, reason, cashierName } = req.body;
    try {
        await pool.query(
            "INSERT INTO returns_table (originalSaleId, originalReceiptNo, customerName, returnType, productId, productName, quantity, returnAmount, exchangeProductId, exchangeProductName, exchangeAmount, refundAmount, reason, cashierName, date) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW())",
            [originalSaleId, originalReceiptNo, customerName, returnType, productId, productName, quantity, returnAmount, exchangeProductId || null, exchangeProductName || null, exchangeAmount || 0, refundAmount || 0, reason, cashierName]
        );
        await pool.query("UPDATE products SET stock = stock + $1 WHERE id = $2", [quantity, productId]);
        if (exchangeProductId) {
            await pool.query("UPDATE products SET stock = stock - 1 WHERE id = $1 AND stock > 0", [exchangeProductId]);
        }
        const originalSaleResult = await pool.query("SELECT * FROM sales WHERE id = $1", [originalSaleId]);
        const originalSale = originalSaleResult.rows;
        if (originalSale.length && originalSale[0].iscredit == 1 && originalSale[0].customerid) {
            await pool.query("UPDATE credit_customers SET totalDebt = GREATEST(0, totalDebt - $1) WHERE id = $2", [returnAmount, originalSale[0].customerid]);
        }
        await pool.query("UPDATE sales SET is_returned = 1, return_type = $1, return_date = NOW() WHERE id = $2", [returnType, originalSaleId]);
        logActivity(null, cashierName, 'return', 'Return: ' + originalReceiptNo + ' - ' + productName);
        res.json({ success: true });
    } catch (error) {
        console.error('Create return error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/returns', verifyToken, async (req, res) => {
    try {
        const r = await pool.query("SELECT * FROM returns_table ORDER BY date DESC LIMIT 100");
        res.json(r.rows);
    } catch (error) {
        console.error('Get returns error:', error);
        res.status(500).json({ success: false, message: 'Error fetching returns' });
    }
});

app.get('/api/returns/receipt/:receiptNo', verifyToken, async (req, res) => {
    try {
        const returnsResult = await pool.query("SELECT productId, quantity, returnType, date FROM returns_table WHERE originalReceiptNo = $1 ORDER BY date DESC", [req.params.receiptNo]);
        res.json(returnsResult.rows);
    } catch (error) {
        console.error('Get returns by receipt error:', error);
        res.status(500).json({ success: false, message: 'Error fetching returns' });
    }
});

app.get('/api/returns/summary', verifyToken, async (req, res) => {
    try {
        var totalReturnsResult = await pool.query("SELECT COUNT(*) as count FROM returns_table WHERE returnType='return'");
        var totalExchangesResult = await pool.query("SELECT COUNT(*) as count FROM returns_table WHERE returnType='exchange'");
        var totalRefundedResult = await pool.query("SELECT SUM(refundAmount) as total FROM returns_table");
        var today = new Date().toISOString().split('T')[0] + '%';
        var todayReturnsResult = await pool.query("SELECT COUNT(*) as count FROM returns_table WHERE date::text LIKE $1", [today]);
        res.json({
            totalReturns: parseInt(totalReturnsResult.rows[0].count) || 0,
            totalExchanges: parseInt(totalExchangesResult.rows[0].count) || 0,
            totalRefunded: parseFloat(totalRefundedResult.rows[0].total) || 0,
            todayReturns: parseInt(todayReturnsResult.rows[0].count) || 0
        });
    } catch(e) {
        console.error('Returns summary error:', e);
        res.json({ totalReturns: 0, totalExchanges: 0, totalRefunded: 0, todayReturns: 0 });
    }
});

app.get('/api/sales/search/:receiptNo', verifyToken, async (req, res) => {
    try {
        const saleResult = await pool.query("SELECT * FROM sales WHERE receiptNo = $1", [req.params.receiptNo]);
        const sale = saleResult.rows;
        if (sale.length) {
            const itemsResult = await pool.query("SELECT * FROM sale_items WHERE saleId = $1", [sale[0].id]);
            sale[0].items = itemsResult.rows;
            res.json(sale[0]);
        } else {
            res.json({ error: 'Sale not found' });
        }
    } catch (error) {
        console.error('Search sale error:', error);
        res.status(500).json({ error: 'Error searching sale' });
    }
});

// ============================================
// PURCHASE ORDERS
// ============================================

app.get('/api/purchase-orders', verifyToken, authorize('admin'), async (req, res) => {
    try {
        const posResult = await pool.query("SELECT * FROM purchase_orders ORDER BY date DESC");
        const pos = posResult.rows;
        for (let po of pos) {
            const itemsResult = await pool.query("SELECT * FROM po_items WHERE poId = $1", [po.id]);
            po.items = itemsResult.rows;
        }
        res.json(pos);
    } catch (error) {
        console.error('Get purchase orders error:', error);
        res.status(500).json({ success: false, message: 'Error fetching purchase orders' });
    }
});

app.post('/api/purchase-orders', verifyToken, authorize('admin'), async (req, res) => {
    try {
        const d = req.body;
        const poNumber = 'PO-' + Date.now().toString(36).toUpperCase();
        const po = await pool.query(
            "INSERT INTO purchase_orders (poNumber, supplierName, supplierId, notes, total, createdBy, date) VALUES ($1, $2, $3, $4, $5, $6, NOW()) RETURNING id",
            [poNumber, d.supplierName, d.supplierId || null, d.notes, d.total, d.createdBy]
        );
        const poId = po.rows[0].id;
        if (d.items) {
            for (let i of d.items) {
                await pool.query(
                    "INSERT INTO po_items (poId, productName, brand, variant, quantity, unitPrice, sellingPrice, lastPrice, currentStock, discount, total) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)",
                    [poId, i.productName, i.brand || '', i.variant || '', i.quantity, i.unitPrice, i.sellingPrice || 0, i.lastPrice || 0, i.currentStock || 0, i.discount || 0, i.total]
                );
            }
        }
        logActivity(null, 'Admin', 'purchase_order', 'PO: ' + poNumber);
        res.json({ success: true, poNumber: poNumber });
    } catch(e) {
        console.error('Create purchase order error:', e);
        res.json({ success: false, message: e.message });
    }
});

app.put('/api/purchase-orders/:id/receive', verifyToken, authorize('admin'), async (req, res) => {
    try {
        const poResult = await pool.query("SELECT * FROM purchase_orders WHERE id = $1", [req.params.id]);
        const po = poResult.rows;
        if (!po.length) return res.json({ success: false });
        const itemsResult = await pool.query("SELECT * FROM po_items WHERE poId = $1", [req.params.id]);
        const items = itemsResult.rows;
        for (let i of items) {
            const pResult = await pool.query("SELECT * FROM products WHERE name=$1 AND brand=$2 AND variant=$3 AND isActive=1", [i.productname, i.brand, i.variant]);
            const p = pResult.rows;
            if (p.length) {
                await pool.query("UPDATE products SET stock = stock + $1, cost = $2 WHERE id = $3", [i.quantity, i.unitprice, p[0].id]);
            }
        }
        await pool.query("UPDATE purchase_orders SET status = 'received', receivedDate = NOW() WHERE id = $1", [req.params.id]);
        logActivity(null, 'Admin', 'po_received', 'PO received: ' + po[0].ponumber);
        res.json({ success: true });
    } catch (error) {
        console.error('Receive PO error:', error);
        res.status(500).json({ success: false, message: 'Error receiving purchase order' });
    }
});

// ============================================
// SUPPLIERS
// ============================================

app.get('/api/suppliers', verifyToken, authorize('admin'), async (req, res) => {
    try {
        const r = await pool.query("SELECT * FROM suppliers ORDER BY name");
        res.json(r.rows);
    } catch (error) {
        console.error('Get suppliers error:', error);
        res.status(500).json({ success: false, message: 'Error fetching suppliers' });
    }
});

app.post('/api/suppliers', verifyToken, authorize('admin'), async (req, res) => {
    const { name, phone, email, address } = req.body;
    try {
        const r = await pool.query("INSERT INTO suppliers (name, phone, email, address) VALUES ($1, $2, $3, $4) RETURNING id", [name, phone, email, address]);
        res.json({ success: true, id: r.rows[0].id });
    } catch (error) {
        console.error('Create supplier error:', error);
        res.status(500).json({ success: false, message: 'Error creating supplier' });
    }
});

// ============================================
// CREDIT CUSTOMERS
// ============================================

app.get('/api/credit-customers', verifyToken, async (req, res) => {
    try {
        const r = await pool.query("SELECT * FROM credit_customers WHERE isActive=1 ORDER BY name");
        res.json(r.rows);
    } catch (error) {
        console.error('Get credit customers error:', error);
        res.status(500).json({ success: false, message: 'Error fetching credit customers' });
    }
});

app.get('/api/credit-customers/:id', verifyToken, async (req, res) => {
    try {
        const cResult = await pool.query("SELECT * FROM credit_customers WHERE id = $1", [req.params.id]);
        const c = cResult.rows;
        if (c.length) {
            const salesResult = await pool.query("SELECT * FROM credit_sales WHERE customerId = $1 ORDER BY date DESC LIMIT 10", [req.params.id]);
            const paymentsResult = await pool.query("SELECT * FROM debt_payments WHERE customerId = $1 ORDER BY date DESC LIMIT 10", [req.params.id]);
            c[0].recentSales = salesResult.rows;
            c[0].payments = paymentsResult.rows;
        }
        res.json(c[0] || {});
    } catch (error) {
        console.error('Get credit customer error:', error);
        res.status(500).json({ success: false, message: 'Error fetching credit customer' });
    }
});

app.post('/api/credit-customers', verifyToken, async (req, res) => {
    const { name, phone, idNumber, address, debtLimit, cashierId, cashierName } = req.body;
    try {
        const r = await pool.query(
            "INSERT INTO credit_customers (name, phone, idNumber, address, debtLimit, registeredBy, registeredById, dateRegistered) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW()) RETURNING id",
            [name, phone, idNumber, address, debtLimit || 5000, cashierName || 'Admin', cashierId || null]
        );
        res.json({ success: true, id: r.rows[0].id });
    } catch (error) {
        console.error('Create credit customer error:', error);
        res.status(500).json({ success: false, message: 'Error creating credit customer' });
    }
});

app.put('/api/credit-customers/:id', verifyToken, async (req, res) => {
    const { name, phone, idNumber, address, debtLimit, isActive } = req.body;
    try {
        await pool.query(
            "UPDATE credit_customers SET name=$1, phone=$2, idNumber=$3, address=$4, debtLimit=$5 WHERE id=$6",
            [name, phone, idNumber, address, debtLimit, req.params.id]
        );
        if (isActive !== undefined) {
            await pool.query("UPDATE credit_customers SET isActive=$1 WHERE id=$2", [isActive, req.params.id]);
        }
        res.json({ success: true });
    } catch (error) {
        console.error('Update credit customer error:', error);
        res.status(500).json({ success: false, message: 'Error updating credit customer' });
    }
});

app.get('/api/credit-customers/search/:query', verifyToken, async (req, res) => {
    const q = '%' + req.params.query + '%';
    try {
        const r = await pool.query("SELECT * FROM credit_customers WHERE isActive=1 AND (name ILIKE $1 OR phone ILIKE $2 OR idNumber ILIKE $3) LIMIT 10", [q, q, q]);
        res.json(r.rows);
    } catch (error) {
        console.error('Search credit customers error:', error);
        res.status(500).json({ success: false, message: 'Error searching credit customers' });
    }
});

// ============================================
// DEBT PAYMENTS
// ============================================

app.post('/api/debt-payments', verifyToken, async (req, res) => {
    const { customerId, customerName, amount, paymentMethod, receivedBy, receivedById } = req.body;
    try {
        await pool.query(
            "INSERT INTO debt_payments (customerId, customerName, amount, paymentMethod, receivedBy, receivedById, date) VALUES ($1, $2, $3, $4, $5, $6, NOW())",
            [customerId, customerName, amount, paymentMethod || 'cash', receivedBy, receivedById]
        );
        await pool.query("UPDATE credit_customers SET totalDebt = GREATEST(0, totalDebt - $1) WHERE id = $2", [amount, customerId]);
        res.json({ success: true });
    } catch (error) {
        console.error('Create debt payment error:', error);
        res.status(500).json({ success: false, message: 'Error creating debt payment' });
    }
});

app.get('/api/debt-payments/:customerId', verifyToken, async (req, res) => {
    try {
        const r = await pool.query("SELECT * FROM debt_payments WHERE customerId = $1 ORDER BY date DESC", [req.params.customerId]);
        res.json(r.rows);
    } catch (error) {
        console.error('Get debt payments error:', error);
        res.status(500).json({ success: false, message: 'Error fetching debt payments' });
    }
});

app.delete('/api/debt-payments/:id', verifyToken, authorize('admin'), async (req, res) => {
    try {
        const paymentResult = await pool.query("SELECT * FROM debt_payments WHERE id = $1", [req.params.id]);
        const payment = paymentResult.rows;
        if (!payment.length) return res.json({ success: false });
        await pool.query("UPDATE credit_customers SET totalDebt = totalDebt + $1 WHERE id = $2", [payment[0].amount, payment[0].customerid]);
        await pool.query("DELETE FROM debt_payments WHERE id = $1", [req.params.id]);
        logActivity(null, 'Admin', 'delete_payment', 'Deleted payment: ' + payment[0].customername + ' - KES ' + Number(payment[0].amount).toLocaleString());
        res.json({ success: true });
    } catch(e) {
        console.error('Delete debt payment error:', e);
        res.json({ success: false, message: e.message });
    }
});

// ============================================
// CREDIT SALES
// ============================================

app.post('/api/credit-sales', verifyToken, async (req, res) => {
    const { saleId, customerId, customerName, amount, cashierId, cashierName } = req.body;
    try {
        const cResult = await pool.query("SELECT * FROM credit_customers WHERE id = $1", [customerId]);
        const c = cResult.rows;
        if (!c.length) return res.json({ success: false });
        const debtBefore = Number(c[0].totaldebt);
        const debtAfter = debtBefore + amount;
        if (debtAfter > c[0].debtlimit) return res.json({ success: false, message: 'Debt limit exceeded!' });
        await pool.query(
            "INSERT INTO credit_sales (saleId, customerId, customerName, amount, debtBefore, debtAfter, cashierId, cashierName, date) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())",
            [saleId, customerId, customerName, amount, debtBefore, debtAfter, cashierId, cashierName]
        );
        await pool.query("UPDATE credit_customers SET totalDebt = totalDebt + $1 WHERE id = $2", [amount, customerId]);
        await pool.query("UPDATE sales SET isCredit=1, customerId=$1 WHERE id=$2", [customerId, saleId]);
        res.json({ success: true, debtBefore, debtAfter });
    } catch (error) {
        console.error('Create credit sale error:', error);
        res.status(500).json({ success: false, message: 'Error creating credit sale' });
    }
});

app.get('/api/credit-sales', verifyToken, async (req, res) => {
    try {
        const r = await pool.query("SELECT * FROM credit_sales ORDER BY date DESC LIMIT 100");
        res.json(r.rows);
    } catch (error) {
        console.error('Get credit sales error:', error);
        res.status(500).json({ success: false, message: 'Error fetching credit sales' });
    }
});

app.get('/api/credit-summary', verifyToken, async (req, res) => {
    try {
        const tdResult = await pool.query("SELECT SUM(totalDebt) as total FROM credit_customers WHERE isActive=1");
        const acResult = await pool.query("SELECT COUNT(*) as count FROM credit_customers WHERE isActive=1 AND totalDebt > 0");
        const today = new Date().toISOString().split('T')[0] + '%';
        const tsResult = await pool.query("SELECT SUM(amount) as total FROM credit_sales WHERE date::text LIKE $1", [today]);
        const tpResult = await pool.query("SELECT SUM(amount) as total FROM debt_payments WHERE date::text LIKE $1", [today]);
        res.json({
            totalDebt: Number(tdResult.rows[0].total || 0),
            activeCustomers: parseInt(acResult.rows[0].count || 0),
            todayCreditSales: Number(tsResult.rows[0].total || 0),
            todayPayments: Number(tpResult.rows[0].total || 0)
        });
    } catch (error) {
        console.error('Credit summary error:', error);
        res.status(500).json({ success: false, message: 'Error fetching credit summary' });
    }
});

// ============================================
// SETTINGS
// ============================================

app.get('/api/settings', verifyToken, async (req, res) => {
    try {
        const r = await pool.query("SELECT * FROM settings WHERE id=1");
        res.json(r.rows[0] || { adminPassword: 'admin123' });
    } catch (error) {
        console.error('Get settings error:', error);
        res.status(500).json({ success: false, message: 'Error fetching settings' });
    }
});

app.put('/api/settings', verifyToken, authorize('admin'), async (req, res) => {
    try {
        if (req.body.adminPassword) {
            const hashedPassword = await bcrypt.hash(req.body.adminPassword, 10);
            await pool.query("UPDATE settings SET adminPassword=$1 WHERE id=1", [hashedPassword]);
        }
        if (req.body.announcement !== undefined) {
            await pool.query("UPDATE settings SET announcement=$1 WHERE id=1", [req.body.announcement]);
        }
        res.json({ success: true });
    } catch (error) {
        console.error('Update settings error:', error);
        res.status(500).json({ success: false, message: 'Error updating settings' });
    }
});

// ============================================
// ACTIVITY LOG
// ============================================

app.get('/api/activity', verifyToken, authorize('admin'), async (req, res) => {
    try {
        const r = await pool.query("SELECT * FROM activity_log ORDER BY date DESC LIMIT 100");
        res.json(r.rows);
    } catch (error) {
        console.error('Get activity log error:', error);
        res.status(500).json({ success: false, message: 'Error fetching activity log' });
    }
});

app.delete('/api/activity', verifyToken, authorize('admin'), async (req, res) => {
    try {
        await pool.query("DELETE FROM activity_log");
        res.json({ success: true });
    } catch (error) {
        console.error('Clear activity log error:', error);
        res.status(500).json({ success: false, message: 'Error clearing activity log' });
    }
});

// ============================================
// M-PESA ENDPOINTS
// ============================================

app.get('/api/mpesa/config', verifyToken, authorize('admin'), async (req, res) => {
    try {
        const cResult = await pool.query("SELECT * FROM mpesa_config WHERE id=1");
        const config = cResult.rows[0] || {};
        res.json({
            tillNumber: config.tillnumber || '',
            shortCode: config.shortcode || '',
            environment: config.environment || 'sandbox',
            configured: !!(config.consumerkey && config.consumersecret && config.passkey)
        });
    } catch (error) {
        console.error('Get M-Pesa config error:', error);
        res.status(500).json({ success: false, message: 'Error fetching M-Pesa config' });
    }
});

app.put('/api/mpesa/config', verifyToken, authorize('admin'), async (req, res) => {
    const { consumerKey, consumerSecret, passkey, tillNumber, shortCode, environment } = req.body;
    try {
        await pool.query(
            "UPDATE mpesa_config SET consumerKey=$1, consumerSecret=$2, passkey=$3, tillNumber=$4, shortCode=$5, environment=$6 WHERE id=1",
            [consumerKey, consumerSecret, passkey, tillNumber, shortCode, environment || 'sandbox']
        );
        res.json({ success: true });
    } catch (error) {
        console.error('Update M-Pesa config error:', error);
        res.status(500).json({ success: false, message: 'Error updating M-Pesa config' });
    }
});

app.post('/api/mpesa/till-payment', verifyToken, async (req, res) => {
    const { saleId, mpesaReceiptNumber, phoneNumber, amount } = req.body;
    try {
        await pool.query(
            "INSERT INTO mpesa_transactions (transactionType, saleId, phoneNumber, amount, mpesaReceiptNumber, status, date) VALUES ('till_payment', $1, $2, $3, $4, 'completed', NOW())",
            [saleId, phoneNumber, amount, mpesaReceiptNumber]
        );
        if (saleId) {
            await pool.query("UPDATE sales SET paymentMethod='M-Pesa', mpesaRef=$1 WHERE id=$2", [mpesaReceiptNumber, saleId]);
        }
        res.json({ success: true });
    } catch (error) {
        console.error('Till payment error:', error);
        res.status(500).json({ success: false, message: 'Error processing till payment' });
    }
});

app.get('/api/mpesa/transactions', verifyToken, authorize('admin'), async (req, res) => {
    try {
        const r = await pool.query("SELECT * FROM mpesa_transactions ORDER BY date DESC LIMIT 100");
        res.json(r.rows);
    } catch (error) {
        console.error('Get M-Pesa transactions error:', error);
        res.status(500).json({ success: false, message: 'Error fetching M-Pesa transactions' });
    }
});

app.get('/api/mpesa/transaction/:checkoutRequestID', verifyToken, async (req, res) => {
    try {
        const r = await pool.query("SELECT * FROM mpesa_transactions WHERE checkoutRequestID=$1", [req.params.checkoutRequestID]);
        res.json(r.rows[0] || { status: 'not_found' });
    } catch (error) {
        console.error('Get M-Pesa transaction error:', error);
        res.status(500).json({ success: false, message: 'Error fetching M-Pesa transaction' });
    }
});

// ============================================
// DAILY REPORTS
// ============================================

app.get('/api/daily-reports', verifyToken, async (req, res) => {
    try {
        const r = await pool.query("SELECT * FROM daily_reports ORDER BY reportDate DESC LIMIT 30");
        res.json(r.rows);
    } catch (error) {
        console.error('Get daily reports error:', error);
        res.status(500).json({ success: false, message: 'Error fetching daily reports' });
    }
});

app.get('/api/daily-reports/today', verifyToken, async (req, res) => {
    try {
        var today = new Date().toISOString().split('T')[0];
        var reportResult = await pool.query("SELECT * FROM daily_reports WHERE reportDate = $1", [today]);
        var report = reportResult.rows;
        if (!report.length) {
            var salesResult = await pool.query("SELECT * FROM sales WHERE date::text LIKE $1 AND isVoid=0", [today + '%']);
            var sales = salesResult.rows;
            var itemsSoldResult = await pool.query("SELECT SUM(si.quantity) as total FROM sale_items si JOIN sales s ON si.saleId=s.id WHERE s.date::text LIKE $1 AND s.isVoid=0", [today + '%']);
            var stockAddedResult = await pool.query("SELECT SUM(pi.quantity) as total FROM po_items pi JOIN purchase_orders po ON pi.poId=po.id WHERE po.receivedDate::text LIKE $1", [today + '%']);
            var stockSoldResult = await pool.query("SELECT SUM(si.quantity) as total FROM sale_items si JOIN sales s ON si.saleId=s.id WHERE s.date::text LIKE $1 AND s.isVoid=0", [today + '%']);
            var productsResult = await pool.query("SELECT COUNT(*) as count, SUM(stock) as totalStock FROM products WHERE isActive=1");
            var totalSales = sales.reduce(function(s, sale) { return Number(s) + Number(sale.total || 0); }, 0);
            await pool.query(
                "INSERT INTO daily_reports (reportDate, totalSales, transactionCount, totalItemsSold, closingStock, stockAdded, stockSold, productsCount) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
                [today, totalSales, sales.length, itemsSoldResult.rows[0]?.total || 0, productsResult.rows[0]?.totalstock || 0, stockAddedResult.rows[0]?.total || 0, stockSoldResult.rows[0]?.total || 0, productsResult.rows[0]?.count || 0]
            );
            var newReportResult = await pool.query("SELECT * FROM daily_reports WHERE reportDate = $1", [today]);
            report = newReportResult.rows;
        }
        res.json(report[0] || {});
    } catch (error) {
        console.error('Get today report error:', error);
        res.status(500).json({ success: false, message: 'Error fetching today report' });
    }
});

app.post('/api/daily-reports/generate', verifyToken, authorize('admin'), async (req, res) => {
    try {
        var today = new Date().toISOString().split('T')[0];
        var salesResult = await pool.query("SELECT * FROM sales WHERE date::text LIKE $1 AND isVoid=0", [today + '%']);
        var sales = salesResult.rows;
        var itemsSoldResult = await pool.query("SELECT SUM(si.quantity) as total FROM sale_items si JOIN sales s ON si.saleId=s.id WHERE s.date::text LIKE $1 AND s.isVoid=0", [today + '%']);
        var stockAddedResult = await pool.query("SELECT SUM(pi.quantity) as total FROM po_items pi JOIN purchase_orders po ON pi.poId=po.id WHERE po.receivedDate::text LIKE $1", [today + '%']);
        var stockSoldResult = await pool.query("SELECT SUM(si.quantity) as total FROM sale_items si JOIN sales s ON si.saleId=s.id WHERE s.date::text LIKE $1 AND s.isVoid=0", [today + '%']);
        var productsResult = await pool.query("SELECT COUNT(*) as count, SUM(stock) as totalStock FROM products WHERE isActive=1");
        var totalSales = sales.reduce(function(s, sale) { return Number(s) + Number(sale.total || 0); }, 0);
        await pool.query(
            "INSERT INTO daily_reports (reportDate, totalSales, transactionCount, totalItemsSold, closingStock, stockAdded, stockSold, productsCount) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT (reportDate) DO UPDATE SET totalSales=$2, transactionCount=$3, totalItemsSold=$4, closingStock=$5, stockAdded=$6, stockSold=$7, productsCount=$8",
            [today, totalSales, sales.length, itemsSoldResult.rows[0]?.total || 0, productsResult.rows[0]?.totalstock || 0, stockAddedResult.rows[0]?.total || 0, stockSoldResult.rows[0]?.total || 0, productsResult.rows[0]?.count || 0]
        );
        res.json({ success: true });
    } catch (error) {
        console.error('Generate daily report error:', error);
        res.status(500).json({ success: false, message: 'Error generating daily report' });
    }
});

// ============================================
// FRONTEND ROUTE - FIXED FOR Express v5
// ============================================

// ✅ Fixed: Using '/*splat' for Express v5 compatibility
app.all('/*splat', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'public', 'index.html'));
});

// ============================================
// START SERVER
// ============================================

initDB().then(() => {
    app.listen(PORT, '0.0.0.0', () => {
        console.log('========================================');
        console.log('  TALAEN HARDWARE SYSTEM');
        console.log('  Server: http://localhost:' + PORT);
        console.log('  Database: Supabase PostgreSQL');
        console.log('========================================');
    });
}).catch(err => {
    console.error('DB init error:', err);
});
