const express = require('express');
const path = require('path');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const fs = require('fs');
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
});

// SSL Configuration for Aiven
let sslConfig = false;
if (process.env.MYSQL_SSL === 'true') {
    let caCert = null;
    try {
        if (fs.existsSync('./ca.pem')) {
            caCert = fs.readFileSync('./ca.pem', 'utf8');
            console.log('✅ CA certificate loaded from ca.pem file');
        }
    } catch(e) {}

    if (!caCert && process.env.MYSQL_CA_CERT) {
        caCert = process.env.MYSQL_CA_CERT;
        console.log('✅ CA certificate loaded from MYSQL_CA_CERT environment variable');
    }

    if (!caCert) {
        caCert = `-----BEGIN CERTIFICATE-----
MIIERDCCAqygAwIBAgIUIKeTwDKnCJLjmrBkW4TiIkUqfqowDQYJKoZIhvcNAQEM
BQAwOjE4MDYGA1UEAwwvZWZlNjM4MzctNDliMS00YzAwLTljODctZDNlMWJiNjZk
YjBkIFByb2plY3QgQ0EwHhcNMjYwNzE1MDYzNjMzWhcNMzYwNzEyMDYzNjMzWjA6
MTgwNgYDVQQDDC9lZmU2MzgzNy00OWIxLTRjMDAtOWM4Ny1kM2UxYmI2NmRiMGQg
UHJvamVjdCBDQTCCAaIwDQYJKoZIhvcNAQEBBQADggGPADCCAYoCggGBAM2f7Xhz
qdApd7QksyvTeHju1EmhKr1llwwg3xLitsMdLCI33DeqmujfVw1Vc0MNkIp7wMTL
zxkm+LHbeSYZAPrFv+yinhSJr8EpXgNnBRjjVSqirBpiWa9aWBe9AHGTv0yW7Hm8
FveEmzlzFWh+IAFGt9KEAaIFd1frCRcYXdxHnflxbuZs3TpGunxuI+CPvvJV51ST
JuglGbT8/GICqvyF1dHDtXvYyIpf0YfJjMe50tfAmA3vmvw8Oy9T+vAo+WbDwOfl
EJ0qJJygIJJv8ZcxFGfwI0k2O0MarKYLOoubzcvVVjG5jARmup2+lpeL4leQko4X
78s3AtkGbRFHudgMGHxYsVKFdp7kGEOXkGM3zhOEYhh5ZvCjq6khkZXRDO33s81r
nZ1Oz9vcXDGYD8lt7Q/gbRNRpoLxCwDzT07jXrkrcJ4u7UI8OQ0TNEat3z0E3pVD
NbRfMIw7dMw9MsjVkUpL7hduxJ6WFLnWkWHwaBueLkgR04l5BY3jcOXh4QIDAQAB
o0IwQDAdBgNVHQ4EFgQU92EtOMWMEea+CxU7Xb5ktWsxuHIwEgYDVR0TAQH/BAgw
BgEB/wIBADALBgNVHQ8EBAMCAQYwDQYJKoZIhvcNAQEMBQADggGBAC5N0X7xqPRB
y7ezWHMTvLAQM0i4CfCuZnvTg+vTrGxceXHUAkFmJAgntyODDGsDiPotOZIU4e3H
+d5o4RZf3lNn4jE6xg0cGGgXug5r4UX9yJSi77hGRSSzWqUkkNvAMFfdnJg44Q/c
l3pRSiNBfXUTReBRMbwznLSjaJ6W+Xhw5VirAXaDMH6sd0hhnk4X7ZI2cqcXgoGm
0hxSlG7I37MYbrehk26mrcKdEBSgzLyjp5o0HHadzH+7tXarVJSk+2VJVYk57Nxm
JL2wOYO2NMaZdjIXJu+TkiisNJLhO+qQmXqmn2uTlbraEsGayJMufm5w1yTxYDsq
MmwCI7ajl2E4ffR6LYqPPkhEe1+iybEMWv/a04OuVXNwu5RKLwTpKcvNkOunw1XM
InA1zmpHFdPnMkPG3x7SoLZxCErKtk0RuAdfksPk1PRX5r0nqGiTq2fEQo+r6s8G
oLcFmnSVl63Ou1tioUB7ZLDi1UcUKK+/Uisml8r+601ATLYlxJxgRQ==
-----END CERTIFICATE-----`;
        console.log('✅ CA certificate loaded from hardcoded fallback');
    }

    sslConfig = {
        ca: caCert,
        rejectUnauthorized: true
    };
}

// Database Connection
const pool = mysql.createPool({
    host: process.env.MYSQLHOST || 'localhost',
    user: process.env.MYSQLUSER || 'root',
    password: process.env.MYSQLPASSWORD || '',
    database: process.env.MYSQLDATABASE || 'talaen_hardware',
    port: process.env.MYSQLPORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    ssl: sslConfig
});

// Helper Functions
function logActivity(userId, userName, action, details) {
    pool.query("INSERT INTO activity_log (userId, userName, action, details, date) VALUES (?,?,?,?,NOW())", 
        [userId||null, userName||'System', action, details]);
}

async function logLoginAttempt(username, ipAddress, success) {
    try {
        await pool.query(
            `INSERT INTO login_attempts (username, ip_address, success, attempt_time) 
             VALUES (?, ?, ?, NOW())`,
            [username, ipAddress, success ? 1 : 0]
        );
    } catch (error) {
        console.error('Error logging login attempt:', error);
    }
}

// JWT Middleware
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

// Initialize Database
async function initDB() {
    const tables = [
        `CREATE TABLE IF NOT EXISTS products (id INT AUTO_INCREMENT PRIMARY KEY, sku VARCHAR(50), name VARCHAR(255), brand VARCHAR(255) DEFAULT '', variant VARCHAR(255) DEFAULT '', category VARCHAR(255) DEFAULT 'General', price DECIMAL(10,2), cost DECIMAL(10,2) DEFAULT 0, stock INT DEFAULT 0, unit VARCHAR(50) DEFAULT 'pcs', minStock INT DEFAULT 10, isActive INT DEFAULT 1)`,
        `CREATE TABLE IF NOT EXISTS sales (id INT AUTO_INCREMENT PRIMARY KEY, receiptNo VARCHAR(50), customerName VARCHAR(255), paymentMethod VARCHAR(50), subtotal DECIMAL(10,2), tax DECIMAL(10,2), discount DECIMAL(10,2) DEFAULT 0, total DECIMAL(10,2), transportCost DECIMAL(10,2) DEFAULT 0, cashierId INT, cashierName VARCHAR(255), mpesaRef VARCHAR(100), isCredit INT DEFAULT 0, customerId INT, debtPaid DECIMAL(10,2) DEFAULT 0, date TEXT, isVoid INT DEFAULT 0, is_returned TINYINT DEFAULT 0, return_type VARCHAR(20) NULL, return_date DATETIME NULL)`,
        `CREATE TABLE IF NOT EXISTS sale_items (id INT AUTO_INCREMENT PRIMARY KEY, saleId INT, productId INT, productName VARCHAR(255), quantity INT, price DECIMAL(10,2), total DECIMAL(10,2))`,
        `CREATE TABLE IF NOT EXISTS users (id INT AUTO_INCREMENT PRIMARY KEY, username VARCHAR(255) UNIQUE, password VARCHAR(255), role VARCHAR(50) DEFAULT 'cashier', fullName VARCHAR(255) DEFAULT '', isActive INT DEFAULT 1)`,
        `CREATE TABLE IF NOT EXISTS settings (id INT PRIMARY KEY DEFAULT 1, adminPassword VARCHAR(255) DEFAULT 'admin123', taxRate DECIMAL(10,2) DEFAULT 16, announcement TEXT)`,
        `CREATE TABLE IF NOT EXISTS activity_log (id INT AUTO_INCREMENT PRIMARY KEY, userId INT, userName VARCHAR(255), action VARCHAR(100), details TEXT, date TEXT)`,
        `CREATE TABLE IF NOT EXISTS purchase_orders (id INT AUTO_INCREMENT PRIMARY KEY, poNumber VARCHAR(50), supplierName VARCHAR(255), supplierId INT, status VARCHAR(50) DEFAULT 'pending', notes TEXT, total DECIMAL(10,2) DEFAULT 0, createdBy VARCHAR(255), date TEXT, receivedDate TEXT)`,
        `CREATE TABLE IF NOT EXISTS po_items (id INT AUTO_INCREMENT PRIMARY KEY, poId INT, productName VARCHAR(255), brand VARCHAR(255), variant VARCHAR(255), quantity INT, unitPrice DECIMAL(10,2), sellingPrice DECIMAL(10,2) DEFAULT 0, lastPrice DECIMAL(10,2) DEFAULT 0, currentStock INT DEFAULT 0, discount DECIMAL(10,2) DEFAULT 0, total DECIMAL(10,2))`,
        `CREATE TABLE IF NOT EXISTS suppliers (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(255), contact VARCHAR(255), email VARCHAR(255), phone VARCHAR(50), address TEXT)`,
        `CREATE TABLE IF NOT EXISTS daily_reports (id INT AUTO_INCREMENT PRIMARY KEY, reportDate VARCHAR(50) UNIQUE, totalSales DECIMAL(10,2), transactionCount INT, totalItemsSold INT, closingStock INT, stockAdded INT, stockSold INT, productsCount INT)`,
        `CREATE TABLE IF NOT EXISTS mpesa_config (id INT PRIMARY KEY DEFAULT 1, consumerKey VARCHAR(255), consumerSecret VARCHAR(255), passkey VARCHAR(255), tillNumber VARCHAR(50), shortCode VARCHAR(50), environment VARCHAR(50) DEFAULT 'sandbox')`,
        `CREATE TABLE IF NOT EXISTS mpesa_transactions (id INT AUTO_INCREMENT PRIMARY KEY, transactionType VARCHAR(50), saleId INT, phoneNumber VARCHAR(50), amount DECIMAL(10,2), accountReference VARCHAR(100), checkoutRequestID VARCHAR(100), merchantRequestID VARCHAR(100), resultCode INT, resultDesc TEXT, mpesaReceiptNumber VARCHAR(50), status VARCHAR(50) DEFAULT 'pending', date TEXT)`,
        `CREATE TABLE IF NOT EXISTS credit_customers (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(255), phone VARCHAR(50), idNumber VARCHAR(50), address TEXT, debtLimit DECIMAL(10,2) DEFAULT 5000, totalDebt DECIMAL(10,2) DEFAULT 0, registeredBy VARCHAR(255), registeredById INT, dateRegistered TEXT, isActive INT DEFAULT 1)`,
        `CREATE TABLE IF NOT EXISTS debt_payments (id INT AUTO_INCREMENT PRIMARY KEY, customerId INT, customerName VARCHAR(255), amount DECIMAL(10,2), paymentMethod VARCHAR(50) DEFAULT 'cash', saleId INT, receivedBy VARCHAR(255), receivedById INT, date TEXT)`,
        `CREATE TABLE IF NOT EXISTS credit_sales (id INT AUTO_INCREMENT PRIMARY KEY, saleId INT, customerId INT, customerName VARCHAR(255), amount DECIMAL(10,2), debtBefore DECIMAL(10,2), debtAfter DECIMAL(10,2), cashierId INT, cashierName VARCHAR(255), date TEXT)`,
        `CREATE TABLE IF NOT EXISTS returns_table (id INT AUTO_INCREMENT PRIMARY KEY, originalSaleId INT, originalReceiptNo VARCHAR(50), customerName VARCHAR(255), returnType VARCHAR(50) DEFAULT 'return', productId INT, productName VARCHAR(255), quantity INT, returnAmount DECIMAL(10,2), exchangeProductId INT, exchangeProductName VARCHAR(255), exchangeAmount DECIMAL(10,2), refundAmount DECIMAL(10,2), reason TEXT, cashierName VARCHAR(255), date TEXT)`,
        `CREATE TABLE IF NOT EXISTS login_attempts (id INT AUTO_INCREMENT PRIMARY KEY, username VARCHAR(255), ip_address VARCHAR(45), attempt_time DATETIME DEFAULT CURRENT_TIMESTAMP, success TINYINT DEFAULT 0)`,
        `CREATE TABLE IF NOT EXISTS sessions (id INT AUTO_INCREMENT PRIMARY KEY, user_id INT, token VARCHAR(500), created_at DATETIME DEFAULT CURRENT_TIMESTAMP, expires_at DATETIME, ip_address VARCHAR(45), user_agent TEXT)`
    ];
    
    for (const table of tables) { await pool.query(table); }
    try { await pool.query("ALTER TABLE sales ADD COLUMN transportCost DECIMAL(10,2) DEFAULT 0"); } catch(e) {}
    try { await pool.query("ALTER TABLE sales ADD COLUMN is_returned TINYINT DEFAULT 0"); } catch(e) {}
    try { await pool.query("ALTER TABLE sales ADD COLUMN return_type VARCHAR(20) NULL"); } catch(e) {}
    try { await pool.query("ALTER TABLE sales ADD COLUMN return_date DATETIME NULL"); } catch(e) {}
    try { await pool.query("ALTER TABLE settings ADD COLUMN announcement TEXT"); } catch(e) {}

    // Create default users with hashed passwords
    const [users] = await pool.query("SELECT COUNT(*) as c FROM users");
    if (users[0].c === 0) {
        const hashedAdmin = await bcrypt.hash('admin123', 10);
        const hashedCashier = await bcrypt.hash('cashier123', 10);
        
        await pool.query(
            "INSERT INTO users (id, username, password, role, fullName, isActive) VALUES (1, 'admin', ?, 'admin', 'Administrator', 1)",
            [hashedAdmin]
        );
        await pool.query(
            "INSERT INTO users (id, username, password, role, fullName, isActive) VALUES (2, 'cashier', ?, 'cashier', 'Cashier User', 1)",
            [hashedCashier]
        );
        
        const hashedSettingsAdmin = await bcrypt.hash('admin123', 10);
        await pool.query(
            "INSERT IGNORE INTO settings (id, adminPassword, taxRate) VALUES (1, ?, 16)",
            [hashedSettingsAdmin]
        );
    }
    
    const [mpesa] = await pool.query("SELECT COUNT(*) as c FROM mpesa_config");
    if (mpesa[0].c === 0) { await pool.query("INSERT INTO mpesa_config (id, environment) VALUES (1, 'sandbox')"); }
    console.log('✅ Database initialized (MySQL)');
}

// ============================================
// 🔐 AUTHENTICATION ENDPOINTS
// ============================================

// 🔥 LOGIN
app.post('/api/auth/login', loginLimiter, async (req, res) => {
    const { username, password } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'] || 'Unknown';
    
    if (!username || !password) {
        return res.json({ success: false, message: 'Username and password are required' });
    }

    try {
        // Check if account is locked
        const [lockCheck] = await pool.query(
            `SELECT COUNT(*) as failed_count FROM login_attempts 
             WHERE username = ? AND success = 0 
             AND attempt_time > DATE_SUB(NOW(), INTERVAL 15 MINUTE)`,
            [username]
        );
        
        if (lockCheck[0].failed_count >= MAX_LOGIN_ATTEMPTS) {
            return res.json({
                success: false,
                message: 'Account temporarily locked. Too many failed attempts. Please try again later.'
            });
        }

        // Get user
        const [user] = await pool.query(
            "SELECT * FROM users WHERE username = ?",
            [username]
        );

        if (user.length === 0) {
            await logLoginAttempt(username, ipAddress, false);
            return res.json({ success: false, message: 'Invalid credentials' });
        }

        // Check if account is active
        if (user[0].isActive !== 1) {
            await logLoginAttempt(username, ipAddress, false);
            return res.json({ success: false, message: 'Account is deactivated. Contact administrator.' });
        }

        // Verify password
        const isMatch = await bcrypt.compare(password, user[0].password);
        
        if (!isMatch) {
            await logLoginAttempt(username, ipAddress, false);
            const [attemptCount] = await pool.query(
                `SELECT COUNT(*) as count FROM login_attempts 
                 WHERE username = ? AND success = 0 
                 AND attempt_time > DATE_SUB(NOW(), INTERVAL 15 MINUTE)`,
                [username]
            );
            const remainingAttempts = MAX_LOGIN_ATTEMPTS - attemptCount[0].count;
            return res.json({ 
                success: false, 
                message: `Invalid credentials. ${remainingAttempts} attempts remaining before lockout.`
            });
        }

        // SUCCESS!
        await logLoginAttempt(username, ipAddress, true);

        // Generate JWT Token
        const token = jwt.sign(
            { 
                id: user[0].id, 
                username: user[0].username, 
                role: user[0].role,
                fullName: user[0].fullName
            },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRY }
        );

        // Store session
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24);
        
        await pool.query(
            `INSERT INTO sessions (user_id, token, expires_at, ip_address, user_agent) 
             VALUES (?, ?, ?, ?, ?)`,
            [user[0].id, token, expiresAt, ipAddress, userAgent]
        );

        // Clear failed attempts
        await pool.query("DELETE FROM login_attempts WHERE username = ?", [username]);

        logActivity(user[0].id, user[0].fullName, 'login', 'Logged in successfully');

        return res.json({
            success: true,
            message: 'Login successful!',
            token: token,
            expiresIn: JWT_EXPIRY,
            user: {
                id: user[0].id,
                username: user[0].username,
                role: user[0].role,
                fullName: user[0].fullName
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, message: 'An error occurred during login.' });
    }
});

// 🔥 LOGOUT
app.post('/api/auth/logout', verifyToken, async (req, res) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
        
        await pool.query("DELETE FROM sessions WHERE token = ?", [token]);
        logActivity(req.user.id, req.user.fullName, 'logout', 'Logged out');
        
        res.json({ success: true, message: 'Logged out successfully' });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ success: false, message: 'Error during logout' });
    }
});

// 🔥 VERIFY SESSION
app.get('/api/auth/verify', verifyToken, async (req, res) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
        
        const [session] = await pool.query(
            "SELECT * FROM sessions WHERE token = ? AND expires_at > NOW()",
            [token]
        );
        
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
// 👤 USER MANAGEMENT ENDPOINTS
// ============================================

// 🔥 GET ALL USERS - ADMIN sees ALL including passwords (hashed)
// Cashier sees only their own password
app.get('/api/users', verifyToken, async (req, res) => {
    try {
        let query;
        let params = [];
        
        if (req.user.role === 'admin') {
            // ✅ Admin sees ALL users with passwords (hashed)
            query = "SELECT id, username, password, role, fullName, isActive FROM users ORDER BY id";
        } else {
            // ✅ Cashier sees only their own data with password
            query = "SELECT id, username, password, role, fullName, isActive FROM users WHERE id = ?";
            params = [req.user.id];
        }
        
        const [r] = await pool.query(query, params);
        res.json(r);
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ success: false, message: 'Error fetching users' });
    }
});

// 🔥 GET SINGLE USER - Admin sees any user with password, Cashier sees only self
app.get('/api/users/:id', verifyToken, async (req, res) => {
    try {
        let query;
        let params = [req.params.id];
        
        if (req.user.role === 'admin') {
            // ✅ Admin sees any user with password
            query = "SELECT id, username, password, role, fullName, isActive FROM users WHERE id = ?";
        } else {
            // ✅ Cashier can only see themselves
            if (req.params.id != req.user.id) {
                return res.status(403).json({ 
                    success: false, 
                    message: 'You can only view your own profile' 
                });
            }
            query = "SELECT id, username, password, role, fullName, isActive FROM users WHERE id = ?";
        }
        
        const [user] = await pool.query(query, params);
        
        if (user.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        
        res.json(user[0]);
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ success: false, message: 'Error fetching user' });
    }
});

// 🔥 CREATE USER (ADMIN ONLY)
app.post('/api/users', verifyToken, authorize('admin'), async (req, res) => {
    const { username, password, role, fullName } = req.body;
    
    try {
        if (!password || password.length < 6) {
            return res.json({ success: false, message: 'Password must be at least 6 characters' });
        }
        
        const hashedPassword = await bcrypt.hash(password, 10);
        const [r] = await pool.query(
            "INSERT INTO users (username, password, role, fullName, isActive) VALUES (?,?,?,?,1)",
            [username, hashedPassword, role || 'cashier', fullName]
        );
        
        logActivity(req.user.id, req.user.fullName, 'add_user', 'Added: ' + fullName);
        
        const [newUser] = await pool.query(
            "SELECT id, username, password, role, fullName, isActive FROM users WHERE id = ?",
            [r.insertId]
        );
        
        res.json({ success: true, message: 'User created successfully', user: newUser[0] });
        
    } catch(e) {
        if (e.code === 'ER_DUP_ENTRY') {
            res.json({ success: false, message: 'Username already exists' });
        } else {
            console.error('Create user error:', e);
            res.json({ success: false, message: 'Error creating user' });
        }
    }
});

// 🔥 ADMIN UPDATES USER (Excluding password field)
app.put('/api/users/:id', verifyToken, authorize('admin'), async (req, res) => {
    const userId = req.params.id;
    const { isActive, fullName, username, role } = req.body;
    
    try {
        const [user] = await pool.query("SELECT * FROM users WHERE id = ?", [userId]);
        if (!user.length) {
            return res.json({ success: false, message: 'User not found' });
        }
        
        // Prevent admin from deactivating themselves
        if (isActive === 0 && userId == req.user.id) {
            return res.json({ success: false, message: 'You cannot deactivate your own account' });
        }
        
        // Prevent changing admin role
        if (role && user[0].role === 'admin' && role !== 'admin') {
            return res.json({ success: false, message: 'Cannot change admin role' });
        }
        
        const updates = [];
        const values = [];
        
        if (fullName !== undefined) {
            updates.push('fullName = ?');
            values.push(fullName);
        }
        if (username !== undefined) {
            updates.push('username = ?');
            values.push(username);
        }
        if (isActive !== undefined) {
            updates.push('isActive = ?');
            values.push(isActive);
        }
        if (role !== undefined && user[0].role !== 'admin') {
            updates.push('role = ?');
            values.push(role);
        }
        
        if (updates.length === 0) {
            return res.json({ success: false, message: 'No updates provided' });
        }
        
        values.push(userId);
        await pool.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values);
        
        const [updatedUser] = await pool.query(
            "SELECT id, username, password, role, fullName, isActive FROM users WHERE id = ?",
            [userId]
        );
        
        logActivity(req.user.id, req.user.fullName, 'update_user', 'Updated: ' + (updatedUser[0].fullName || updatedUser[0].username));
        
        res.json({ success: true, message: 'User updated successfully', user: updatedUser[0] });
        
    } catch(e) {
        if (e.code === 'ER_DUP_ENTRY') {
            res.json({ success: false, message: 'Username already exists' });
        } else {
            console.error('Update user error:', e);
            res.json({ success: false, message: 'Error updating user' });
        }
    }
});

// 🔥 ADMIN RESETS USER PASSWORD (Without knowing current password)
app.post('/api/users/:id/reset-password', verifyToken, authorize('admin'), async (req, res) => {
    const userId = req.params.id;
    const { newPassword } = req.body;
    
    try {
        if (!newPassword || newPassword.length < 6) {
            return res.json({ success: false, message: 'New password must be at least 6 characters' });
        }
        
        const [user] = await pool.query("SELECT * FROM users WHERE id = ?", [userId]);
        if (!user.length) {
            return res.json({ success: false, message: 'User not found' });
        }
        
        // Prevent admin from resetting their own password here (use profile update instead)
        if (userId == req.user.id) {
            return res.json({ 
                success: false, 
                message: 'Use profile update to change your own password' 
            });
        }
        
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await pool.query("UPDATE users SET password = ? WHERE id = ?", [hashedPassword, userId]);
        
        logActivity(req.user.id, req.user.fullName, 'password_reset', 
            'Reset password for: ' + (user[0].fullName || user[0].username));
        
        res.json({ 
            success: true, 
            message: `Password reset successfully for ${user[0].fullName || user[0].username}` 
        });
        
    } catch (error) {
        console.error('Password reset error:', error);
        res.status(500).json({ success: false, message: 'Error resetting password' });
    }
});

// 🔥 USER UPDATES OWN PASSWORD (Requires current password)
app.put('/api/users/profile/password', verifyToken, async (req, res) => {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;
    
    try {
        const [user] = await pool.query("SELECT * FROM users WHERE id = ?", [userId]);
        if (!user.length) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        
        if (!currentPassword) {
            return res.json({ success: false, message: 'Current password is required' });
        }
        
        const isMatch = await bcrypt.compare(currentPassword, user[0].password);
        if (!isMatch) {
            return res.json({ success: false, message: 'Current password is incorrect' });
        }
        
        if (!newPassword || newPassword.length < 6) {
            return res.json({ success: false, message: 'New password must be at least 6 characters' });
        }
        
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await pool.query("UPDATE users SET password = ? WHERE id = ?", [hashedPassword, userId]);
        
        logActivity(userId, req.user.fullName, 'password_change', 'User changed their own password');
        
        // Get updated user with password
        const [updatedUser] = await pool.query(
            "SELECT id, username, password, role, fullName, isActive FROM users WHERE id = ?",
            [userId]
        );
        
        res.json({ 
            success: true, 
            message: 'Password changed successfully',
            user: updatedUser[0]
        });
        
    } catch (error) {
        console.error('Password change error:', error);
        res.status(500).json({ success: false, message: 'Error changing password' });
    }
});

// 🔥 USER UPDATES OWN PROFILE (FullName only)
app.put('/api/users/profile', verifyToken, async (req, res) => {
    const userId = req.user.id;
    const { fullName } = req.body;
    
    try {
        if (fullName !== undefined) {
            await pool.query("UPDATE users SET fullName = ? WHERE id = ?", [fullName, userId]);
        }
        
        const [updatedUser] = await pool.query(
            "SELECT id, username, password, role, fullName, isActive FROM users WHERE id = ?",
            [userId]
        );
        
        // Update token user info
        req.user.fullName = updatedUser[0].fullName;
        
        res.json({ 
            success: true, 
            message: 'Profile updated successfully',
            user: updatedUser[0]
        });
        
    } catch (error) {
        console.error('Profile update error:', error);
        res.status(500).json({ success: false, message: 'Error updating profile' });
    }
});

// ============================================
// 📦 PRODUCTS ENDPOINTS (With Authentication)
// ============================================

app.get('/api/products', verifyToken, async (req, res) => {
    try {
        const [r] = await pool.query("SELECT * FROM products WHERE isActive=1 ORDER BY name,brand");
        res.json(r);
    } catch (error) {
        console.error('Get products error:', error);
        res.status(500).json({ success: false, message: 'Error fetching products' });
    }
});

app.post('/api/products', verifyToken, authorize('admin'), async (req, res) => {
    const { name, brand, variant, category, price, cost, stock, unit } = req.body;
    const sku = Date.now().toString(36).toUpperCase();
    try {
        const [r] = await pool.query(
            "INSERT INTO products (sku,name,brand,variant,category,price,cost,stock,unit) VALUES (?,?,?,?,?,?,?,?,?)",
            [sku, name, brand, variant, category, price, cost||0, stock||0, unit||'pcs']
        );
        logActivity(req.user.id, req.user.fullName, 'add_product', 'Added: ' + (brand||'') + ' ' + name);
        res.json({ success: true, id: r.insertId });
    } catch (error) {
        console.error('Add product error:', error);
        res.status(500).json({ success: false, message: 'Error adding product' });
    }
});

app.put('/api/products/:id', verifyToken, authorize('admin'), async (req, res) => {
    const { name, brand, variant, price, cost, stock, unit } = req.body;
    try {
        await pool.query(
            "UPDATE products SET name=?,brand=?,variant=?,price=?,cost=?,stock=?,unit=? WHERE id=?",
            [name,brand,variant,price,cost,stock,unit,req.params.id]
        );
        res.json({ success: true });
    } catch (error) {
        console.error('Update product error:', error);
        res.status(500).json({ success: false, message: 'Error updating product' });
    }
});

app.delete('/api/products/:id', verifyToken, authorize('admin'), async (req, res) => {
    try {
        await pool.query("UPDATE products SET isActive=0 WHERE id=?", [req.params.id]);
        res.json({ success: true });
    } catch (error) {
        console.error('Delete product error:', error);
        res.status(500).json({ success: false, message: 'Error deleting product' });
    }
});

// ============================================
// 📊 SALES ENDPOINTS (With Authentication)
// ============================================

app.get('/api/sales', verifyToken, async (req, res) => {
    try {
        const [sales] = await pool.query("SELECT * FROM sales ORDER BY date DESC");
        for (let s of sales) {
            const [items] = await pool.query("SELECT * FROM sale_items WHERE saleId = ?", [s.id]);
            s.items = items;
        }
        res.json(sales);
    } catch (error) {
        console.error('Get sales error:', error);
        res.status(500).json({ success: false, message: 'Error fetching sales' });
    }
});

app.post('/api/sales', verifyToken, async (req, res) => {
    const { customerName, items, paymentMethod, subtotal, tax, discount, total, cashierId, cashierName, mpesaRef, isCredit, customerId, debtPaid, transportCost } = req.body;
    const rn = 'TIH-' + Date.now().toString(36).toUpperCase();
    try {
        const [s] = await pool.query(
            `INSERT INTO sales (receiptNo,customerName,paymentMethod,subtotal,tax,discount,total,transportCost,cashierId,cashierName,mpesaRef,isCredit,customerId,debtPaid,date) 
             VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,NOW())`,
            [rn, customerName, paymentMethod, subtotal, tax, discount||0, total, transportCost||0, cashierId||null, cashierName||null, mpesaRef||null, isCredit||0, customerId||null, debtPaid||0]
        );
        const saleId = s.insertId;
        for (let i of items) {
            await pool.query(
                "INSERT INTO sale_items (saleId,productId,productName,quantity,price,total) VALUES (?,?,?,?,?,?)",
                [saleId, i.productId, i.productName, i.quantity, i.price, i.quantity*i.price]
            );
            await pool.query("UPDATE products SET stock=stock-? WHERE id=?", [i.quantity, i.productId]);
        }
        logActivity(req.user.id, req.user.fullName, 'sale', 'Sale: ' + rn + ' - KES ' + (total||0).toLocaleString());
        res.json({ success: true, receiptNo: rn, saleId: saleId });
    } catch (error) {
        console.error('Create sale error:', error);
        res.status(500).json({ success: false, message: 'Error creating sale' });
    }
});

// ============================================
// ⚙️ SETTINGS ENDPOINTS
// ============================================

app.get('/api/settings', verifyToken, async (req, res) => {
    try {
        const [r] = await pool.query("SELECT * FROM settings WHERE id=1");
        // Return admin password if user is admin
        if (req.user.role === 'admin') {
            res.json(r[0] || { adminPassword: 'admin123' });
        } else {
            // Cashier sees settings without admin password
            const { adminPassword, ...settings } = r[0] || {};
            res.json(settings);
        }
    } catch (error) {
        console.error('Get settings error:', error);
        res.status(500).json({ success: false, message: 'Error fetching settings' });
    }
});

app.put('/api/settings', verifyToken, authorize('admin'), async (req, res) => {
    try {
        if (req.body.adminPassword) {
            const hashedPassword = await bcrypt.hash(req.body.adminPassword, 10);
            await pool.query("UPDATE settings SET adminPassword=? WHERE id=1", [hashedPassword]);
        }
        if (req.body.announcement !== undefined) {
            await pool.query("UPDATE settings SET announcement=? WHERE id=1", [req.body.announcement]);
        }
        res.json({ success: true });
    } catch (error) {
        console.error('Update settings error:', error);
        res.status(500).json({ success: false, message: 'Error updating settings' });
    }
});

// ============================================
// 🏠 FRONTEND ROUTE
// ============================================

app.all('/{*splat}', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'public', 'index.html'));
});

// ============================================
// 🚀 START SERVER
// ============================================

initDB().then(() => {
    app.listen(PORT, '0.0.0.0', () => {
        console.log('========================================');
        console.log('  TALAEN HARDWARE SYSTEM');
        console.log('  Server: http://localhost:' + PORT);
        console.log('  Network: http://YOUR-IP:' + PORT);
        console.log('========================================');
    });
}).catch(err => { console.error('DB init error:', err); });
