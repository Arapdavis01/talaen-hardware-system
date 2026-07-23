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
            salesUnit VARCHAR(50),
            conversionFactor INT DEFAULT 0,
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
            total DECIMAL(10,2),
            soldInUnit VARCHAR(50),
            conversionFactor INT DEFAULT 0,
            baseQuantity INT DEFAULT 0
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
            orderedInUnit VARCHAR(50),
            conversionFactor INT DEFAULT 0,
            baseQuantity INT DEFAULT 0,
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
            returnedInUnit VARCHAR(50),
            conversionFactor INT DEFAULT 0,
            baseQuantity INT DEFAULT 0,
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
        )`,
        `CREATE TABLE IF NOT EXISTS mpesa_config (
            id SERIAL PRIMARY KEY,
            consumerKey VARCHAR(255),
            consumerSecret VARCHAR(255),
            passkey VARCHAR(255),
            tillNumber VARCHAR(50),
            shortCode VARCHAR(50),
            environment VARCHAR(20) DEFAULT 'sandbox'
        )`,
        `CREATE TABLE IF NOT EXISTS mpesa_transactions (
            id SERIAL PRIMARY KEY,
            transactionType VARCHAR(50),
            saleId INT,
            phoneNumber VARCHAR(20),
            amount DECIMAL(10,2),
            mpesaReceiptNumber VARCHAR(50),
            checkoutRequestID VARCHAR(100),
            merchantRequestID VARCHAR(100),
            resultCode INT,
            resultDesc TEXT,
            status VARCHAR(50) DEFAULT 'pending',
            date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS daily_reports (
            id SERIAL PRIMARY KEY,
            reportDate DATE UNIQUE,
            totalSales DECIMAL(10,2) DEFAULT 0,
            transactionCount INT DEFAULT 0,
            totalItemsSold INT DEFAULT 0,
            closingStock INT DEFAULT 0,
            stockAdded INT DEFAULT 0,
            stockSold INT DEFAULT 0,
            productsCount INT DEFAULT 0
        )`
    ];

    for (const query of queries) {
        try {
            await pool.query(query);
        } catch (e) {
            console.error('Error creating table:', e.message);
        }
    }

    // Add columns if they don't exist (for existing tables)
    try {
        await pool.query("ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS soldInUnit VARCHAR(50)");
        await pool.query("ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS conversionFactor INT DEFAULT 0");
        await pool.query("ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS baseQuantity INT DEFAULT 0");
        await pool.query("ALTER TABLE po_items ADD COLUMN IF NOT EXISTS orderedInUnit VARCHAR(50)");
        await pool.query("ALTER TABLE po_items ADD COLUMN IF NOT EXISTS conversionFactor INT DEFAULT 0");
        await pool.query("ALTER TABLE po_items ADD COLUMN IF NOT EXISTS baseQuantity INT DEFAULT 0");
        await pool.query("ALTER TABLE returns_table ADD COLUMN IF NOT EXISTS returnedInUnit VARCHAR(50)");
        await pool.query("ALTER TABLE returns_table ADD COLUMN IF NOT EXISTS conversionFactor INT DEFAULT 0");
        await pool.query("ALTER TABLE returns_table ADD COLUMN IF NOT EXISTS baseQuantity INT DEFAULT 0");
    } catch (e) {
        console.error('Error adding columns:', e.message);
    }

    // Initialize mpesa_config if empty
    try {
        const mpesaConfigResult = await pool.query("SELECT COUNT(*) as c FROM mpesa_config");
        if (parseInt(mpesaConfigResult.rows[0].c) === 0) {
            await pool.query("INSERT INTO mpesa_config (id) VALUES (1)");
        }
    } catch (error) {
        console.error('Error initializing mpesa_config:', error.message);
    }

    // Seed default products if table is empty
    try {
        const productsCount = await pool.query("SELECT COUNT(*) as c FROM products");
        if (parseInt(productsCount.rows[0].c) === 0) {
            const seedProducts = [
                "INSERT INTO products (sku, name, brand, variant, category, price, cost, stock, unit, salesUnit, conversionFactor, minStock) VALUES ('SKU001', 'Cement', 'Bamburi', '50kg', 'Building Materials', 750.00, 650.00, 100, 'bags', NULL, 0, 20)",
                "INSERT INTO products (sku, name, brand, variant, category, price, cost, stock, unit, salesUnit, conversionFactor, minStock) VALUES ('SKU002', 'Cement', 'Mombasa', '50kg', 'Building Materials', 720.00, 620.00, 80, 'bags', NULL, 0, 20)",
                "INSERT INTO products (sku, name, brand, variant, category, price, cost, stock, unit, salesUnit, conversionFactor, minStock) VALUES ('SKU003', 'Steel Bars', 'Doshi', '12mm', 'Construction', 450.00, 380.00, 200, 'pcs', NULL, 0, 50)",
                "INSERT INTO products (sku, name, brand, variant, category, price, cost, stock, unit, salesUnit, conversionFactor, minStock) VALUES ('SKU004', 'Paint', 'Crown', 'White 20L', 'Paints', 3500.00, 3000.00, 50, 'cans', NULL, 0, 10)",
                "INSERT INTO products (sku, name, brand, variant, category, price, cost, stock, unit, salesUnit, conversionFactor, minStock) VALUES ('SKU005', 'Timber', 'Local', '2x4', 'Wood', 250.00, 200.00, 500, 'pcs', NULL, 0, 100)",
                "INSERT INTO products (sku, name, brand, variant, category, price, cost, stock, unit, salesUnit, conversionFactor, minStock) VALUES ('SKU006', 'Nails', 'Generic', '3-inch', 'Hardware', 150.00, 120.00, 1000, 'kg', NULL, 0, 200)",
                "INSERT INTO products (sku, name, brand, variant, category, price, cost, stock, unit, salesUnit, conversionFactor, minStock) VALUES ('SKU007', 'Sand', 'River', 'Fine', 'Building Materials', 200.00, 150.00, 216, 'wheelbarrow', 'tonne', 24, 48)",
                "INSERT INTO products (sku, name, brand, variant, category, price, cost, stock, unit, salesUnit, conversionFactor, minStock) VALUES ('SKU008', 'Ballast', 'Quarry', '3/4 inch', 'Building Materials', 250.00, 200.00, 500, 'wheelbarrow', 'tonne', 20, 100)"
            ];
            for (const seedQuery of seedProducts) {
                await pool.query(seedQuery);
            }
            console.log('Default products seeded successfully');
        }
    } catch (error) {
        console.error('Error seeding products:', error.message);
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
    ).catch(err => console.error('Log activity error:', err.message));
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

function formatUserResponse(user) {
    return {
        id: user.id,
        username: user.username,
        password: user.password || '',
        role: user.role,
        fullName: user.fullname,
        isActive: user.isactive
    };
}

/**
 * Calculate display stock info for dual-unit products
 */
function getDisplayStock(product) {
    const stock = parseInt(product.stock) || 0;
    const unit = product.unit || 'pcs';
    const salesUnit = product.salesUnit || null;
    const conversionFactor = parseInt(product.conversionFactor) || 0;
    const price = parseFloat(product.price) || 0;
    
    const result = {
        baseStock: stock,
        baseUnit: unit,
        hasAlternativeUnit: !!(salesUnit && conversionFactor > 0),
        displayText: `${stock} ${unit}`,
        priceDisplay: `KES ${price.toLocaleString()}/${unit}`,
        isLowStock: stock <= (parseInt(product.minStock) || 10)
    };
    
    if (result.hasAlternativeUnit) {
        result.salesUnit = salesUnit;
        result.conversionFactor = conversionFactor;
        const salesQty = Math.floor(stock / conversionFactor);
        const remainder = stock % conversionFactor;
        result.salesStock = salesQty;
        result.remainder = remainder;
        result.bulkPrice = price * conversionFactor;
        
        if (salesQty > 0 && remainder > 0) {
            result.displayText = `${stock} ${unit} (${salesQty} ${salesUnit} + ${remainder} ${unit})`;
        } else if (salesQty > 0) {
            result.displayText = `${stock} ${unit} (${salesQty} ${salesUnit})`;
        } else {
            result.displayText = `${stock} ${unit} (0 ${salesUnit})`;
        }
        
        result.priceDisplay = `KES ${price.toLocaleString()}/${unit} | KES ${result.bulkPrice.toLocaleString()}/${salesUnit}`;
    }
    
    return result;
}

/**
 * Convert quantity to base units for stock operations
 */
function convertToBaseUnits(quantity, sellingUnit, conversionFactor) {
    if (sellingUnit && conversionFactor > 0) {
        return quantity * conversionFactor;
    }
    return quantity;
}

// ============================================
// AUTH LOGIN
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
// USER ENDPOINTS
// ============================================

app.get('/api/users', verifyToken, authorize('admin'), async (req, res) => {
    try {
        const r = await pool.query(
            "SELECT id, username, plain_password as password, role, fullName, isActive FROM users ORDER BY id"
        );
        const users = r.rows.map(user => formatUserResponse(user));
        res.json(users);
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ success: false, message: 'Error fetching users' });
    }
});

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
        res.json(formatUserResponse(user));
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ success: false, message: 'Error fetching profile' });
    }
});

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
        res.json(formatUserResponse(user));
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ success: false, message: 'Error fetching user' });
    }
});

app.post('/api/users', verifyToken, authorize('admin'), async (req, res) => {
    const { username, password, role, fullName } = req.body;
    try {
        if (!username || !password || password.length < 6) {
            return res.json({ success: false, message: 'Username and password (min 6 chars) required' });
        }
        
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
            user: formatUserResponse(newUser)
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

app.put('/api/users/:id', verifyToken, authorize('admin'), async (req, res) => {
    const userId = req.params.id;
    const { isActive, fullName, username, role, toggle, password } = req.body;
    
    try {
        const userResult = await pool.query("SELECT * FROM users WHERE id = $1", [userId]);
        const user = userResult.rows;
        
        if (!user.length) {
            return res.json({ success: false, message: 'User not found' });
        }
        
        if (toggle !== undefined) {
            if (user[0].role === 'admin') {
                return res.json({ success: false, message: 'Cannot deactivate admin account' });
            }
            if (parseInt(userId) === req.user.id) {
                return res.json({ success: false, message: 'You cannot deactivate your own account' });
            }
            
            const newStatus = user[0].isactive === 1 ? 0 : 1;
            await pool.query("UPDATE users SET isActive = $1 WHERE id = $2", [newStatus, userId]);
            
            const action = newStatus === 1 ? 'activated' : 'deactivated';
            logActivity(req.user.id, req.user.fullName, 'toggle_user', action + ' user: ' + (user[0].fullname || user[0].username));
            
            const updatedUserResult = await pool.query(
                "SELECT id, username, plain_password as password, role, fullName, isActive FROM users WHERE id = $1",
                [userId]
            );
            return res.json({ 
                success: true, 
                message: 'User ' + action + ' successfully',
                user: formatUserResponse(updatedUserResult.rows[0])
            });
        }
        
        if (password !== undefined) {
            if (password.length < 6) {
                return res.json({ success: false, message: 'Password must be at least 6 characters' });
            }
            
            const hashedPassword = await bcrypt.hash(password, 10);
            await pool.query(
                "UPDATE users SET password = $1, plain_password = $2 WHERE id = $3",
                [hashedPassword, password, userId]
            );
            
            logActivity(req.user.id, req.user.fullName, 'password_change', 'Changed password for: ' + (user[0].fullname || user[0].username));
            
            const updatedUserResult = await pool.query(
                "SELECT id, username, plain_password as password, role, fullName, isActive FROM users WHERE id = $1",
                [userId]
            );
            return res.json({ 
                success: true, 
                message: 'Password updated successfully',
                user: formatUserResponse(updatedUserResult.rows[0])
            });
        }
        
        if (isActive === 0 && parseInt(userId) === req.user.id) {
            return res.json({ success: false, message: 'You cannot deactivate your own account' });
        }
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
            user: formatUserResponse(updatedUser)
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
        
        if (parseInt(userId) === req.user.id) {
            return res.json({ success: false, message: 'Use profile update to change your own password' });
        }
        
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await pool.query(
            "UPDATE users SET password = $1, plain_password = $2 WHERE id = $3",
            [hashedPassword, newPassword, userId]
        );
        
        logActivity(req.user.id, req.user.fullName, 'password_reset', 'Reset password for: ' + (user[0].fullname || user[0].username));
        
        const updatedUserResult = await pool.query(
            "SELECT id, username, plain_password as password, role, fullName, isActive FROM users WHERE id = $1",
            [userId]
        );
        
        res.json({ 
            success: true, 
            message: 'Password reset successfully for ' + (user[0].fullname || user[0].username),
            user: formatUserResponse(updatedUserResult.rows[0])
        });
    } catch (error) {
        console.error('Password reset error:', error);
        res.status(500).json({ success: false, message: 'Error resetting password: ' + error.message });
    }
});

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
        res.json({ 
            success: true, 
            message: 'Profile updated successfully',
            user: formatUserResponse(updatedUserResult.rows[0])
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
        const r = await pool.query("SELECT id, sku, name, brand, variant, category, price, cost, stock, unit, salesunit AS \"salesUnit\", conversionfactor AS \"conversionFactor\", minstock AS \"minStock\", isactive AS \"isActive\" FROM products WHERE isActive=1 ORDER BY name, brand");
        const products = r.rows.map(p => ({ ...p, displayStock: getDisplayStock(p) }));
        res.json(products);
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
            var q = '%' + search + '%';
            whereClause += ' AND (name ILIKE $' + paramCount + '::text' +
                          ' OR brand ILIKE $' + (paramCount + 1) + '::text' +
                          ' OR variant ILIKE $' + (paramCount + 2) + '::text' +
                          ' OR category ILIKE $' + (paramCount + 3) + '::text)';
            params.push(q, q, q, q);
            paramCount += 4;
        }
        
        if (category) {
            whereClause += ' AND category = $' + paramCount + '::varchar';
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
        
        var countQuery = 'SELECT COUNT(*) as total FROM products ' + whereClause;
        var countResult = await pool.query(countQuery, params);
        var total = parseInt(countResult.rows[0].total);
        
        var productsQuery = 'SELECT id, sku, name, brand, variant, category, price, cost, stock, unit, salesunit AS "salesUnit", conversionfactor AS "conversionFactor", minstock AS "minStock", isactive AS "isActive" FROM products ' + whereClause + ' ORDER BY name, brand LIMIT $' + paramCount + ' OFFSET $' + (paramCount + 1);
        params.push(limit, offset);
        
        var productsResult = await pool.query(productsQuery, params);
        const products = productsResult.rows.map(p => ({ ...p, displayStock: getDisplayStock(p) }));
        
        res.json({ 
            products: products, 
            pagination: { 
                page: page, 
                limit: limit, 
                total: total, 
                totalPages: Math.ceil(total / limit), 
                hasNext: offset + limit < total, 
                hasPrev: page > 1 
            } 
        });
    } catch(e) {
        console.error('Paginated products error:', e);
        res.json({ 
            products: [], 
            pagination: { 
                page: 1, 
                limit: 25, 
                total: 0, 
                totalPages: 0, 
                hasNext: false, 
                hasPrev: false 
            } 
        });
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
        const productsResult = await pool.query("SELECT id, sku, name, brand, variant, category, price, cost, stock, unit, salesunit AS \"salesUnit\", conversionfactor AS \"conversionFactor\", minstock AS \"minStock\", isactive AS \"isActive\" FROM products WHERE isActive=1 ORDER BY name,brand");
        const products = productsResult.rows;
        for (let p of products) {
            const lastPOResult = await pool.query(
                "SELECT pi.unitPrice, pi.sellingPrice FROM po_items pi JOIN purchase_orders po ON pi.poId=po.id WHERE pi.productName=$1 AND pi.brand=$2 AND pi.variant=$3 ORDER BY po.date DESC LIMIT 1",
                [p.name, p.brand, p.variant]
            );
            p.lastPrice = lastPOResult.rows.length ? lastPOResult.rows[0].unitprice : p.cost;
            p.displayStock = getDisplayStock(p);
        }
        res.json(products);
    } catch(e) {
        console.error('Products with prices error:', e);
        res.status(500).json({ success: false, message: 'Error fetching products' });
    }
});

app.post('/api/products', verifyToken, authorize('admin'), async (req, res) => {
    const { name, brand, variant, category, price, cost, stock, unit, salesUnit, conversionFactor } = req.body;
    const sku = Date.now().toString(36).toUpperCase();
    try {
        const r = await pool.query(
            "INSERT INTO products (sku, name, brand, variant, category, price, cost, stock, unit, salesUnit, conversionFactor) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id",
            [sku, name, brand, variant, category, price, cost || 0, stock || 0, unit || 'pcs', salesUnit || null, parseInt(conversionFactor) || 0]
        );
        logActivity(req.user.id, req.user.fullName, 'add_product', 'Added: ' + (brand || '') + ' ' + name);
        res.json({ success: true, id: r.rows[0].id });
    } catch (error) {
        console.error('Add product error:', error);
        res.status(500).json({ success: false, message: 'Error adding product' });
    }
});

app.put('/api/products/:id', verifyToken, authorize('admin'), async (req, res) => {
    const { name, brand, variant, price, cost, stock, unit, salesUnit, conversionFactor } = req.body;
    try {
        await pool.query(
            "UPDATE products SET name=$1, brand=$2, variant=$3, price=$4, cost=$5, stock=$6, unit=$7, salesUnit=$8, conversionFactor=$9 WHERE id=$10",
            [name, brand, variant, price, cost, stock, unit, salesUnit || null, parseInt(conversionFactor) || 0, req.params.id]
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
            "SELECT id, name, brand, variant, price, stock, unit, salesunit AS \"salesUnit\", conversionfactor AS \"conversionFactor\", minstock AS \"minStock\", category FROM products WHERE isActive=1 AND (name ILIKE $1 OR brand ILIKE $2 OR variant ILIKE $3) AND stock > 0 ORDER BY name LIMIT 20",
            [q, q, q]
        );
        const products = productsResult.rows.map(p => ({ ...p, displayStock: getDisplayStock(p) }));
        res.json(products);
    } catch (error) {
        console.error('Search products error:', error);
        res.status(500).json({ success: false, message: 'Error searching products' });
    }
});

// ============================================
// SALES ENDPOINTS (with dual-unit support)
// ============================================

app.get('/api/sales', verifyToken, async (req, res) => {
    try {
        const salesResult = await pool.query(
            "SELECT id, receiptno AS \"receiptNo\", customername AS \"customerName\", paymentmethod AS \"paymentMethod\", subtotal, tax, discount, total, transportcost AS \"transportCost\", cashierid AS \"cashierId\", cashiername AS \"cashierName\", mpesaref AS \"mpesaRef\", iscredit AS \"isCredit\", customerid AS \"customerId\", debtpaid AS \"debtPaid\", date, isvoid AS \"isVoid\", is_returned, return_type, return_date FROM sales ORDER BY date DESC"
        );
        const sales = salesResult.rows;
        for (let s of sales) {
            const itemsResult = await pool.query(
                "SELECT id, saleid AS \"saleId\", productid AS \"productId\", productname AS \"productName\", quantity, price, total, soldinunit AS \"soldInUnit\", conversionfactor AS \"conversionFactor\", basequantity AS \"baseQuantity\" FROM sale_items WHERE saleId = $1",
                [s.id]
            );
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
        const cashiersResult = await pool.query("SELECT id, fullname AS \"fullName\", username FROM users WHERE role='cashier' AND isActive=1");
        const cashiers = cashiersResult.rows;
        const today = new Date().toISOString().split('T')[0];
        const result = [];
        for (let c of cashiers) {
            const salesResult = await pool.query(
                "SELECT id, total, date FROM sales WHERE cashierid=$1 AND isvoid=0",
                [c.id]
            );
            const sales = salesResult.rows;
            const todaySales = sales.filter(function(s) { 
                if (!s.date) return false;
                var d = new Date(s.date);
                return d.toISOString().startsWith(today);
            });
            result.push({
                id: c.id,
                name: c.fullName,
                username: c.username,
                totalAll: sales.reduce(function(s, sale) { return s + Number(sale.total || 0); }, 0),
                totalToday: todaySales.reduce(function(s, sale) { return s + Number(sale.total || 0); }, 0),
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
        const salesResult = await pool.query(
            "SELECT id, receiptno AS \"receiptNo\", customername AS \"customerName\", paymentmethod AS \"paymentMethod\", subtotal, tax, discount, total, transportcost AS \"transportCost\", cashierid AS \"cashierId\", cashiername AS \"cashierName\", mpesaref AS \"mpesaRef\", iscredit AS \"isCredit\", customerid AS \"customerId\", debtpaid AS \"debtPaid\", date, isvoid AS \"isVoid\" FROM sales WHERE cashierid=$1 AND isvoid=0 ORDER BY date DESC",
            [req.params.id]
        );
        const sales = salesResult.rows;
        const today = new Date().toISOString().split('T')[0];
        const todaySales = sales.filter(function(s) { 
            if (!s.date) return false;
            var d = new Date(s.date);
            return d.toISOString().startsWith(today);
        });
        res.json({
            all: sales,
            today: todaySales,
            totalAll: sales.reduce(function(s, sale) { return s + Number(sale.total || 0); }, 0),
            totalToday: todaySales.reduce(function(s, sale) { return s + Number(sale.total || 0); }, 0),
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
            const productResult = await pool.query("SELECT * FROM products WHERE id = $1", [i.productId]);
            const product = productResult.rows[0];
            
            let soldInUnit = i.soldInUnit || null;
            let conversionFactor = parseInt(i.conversionFactor) || 0;
            let baseQuantity = i.quantity;
            
            // If sold in alternative unit, convert to base units for stock deduction
            if (soldInUnit && conversionFactor > 0) {
                baseQuantity = i.quantity * conversionFactor;
            }
            
            // Validate stock
            if (product && baseQuantity > product.stock) {
                const ds = getDisplayStock(product);
                return res.status(400).json({ 
                    success: false, 
                    message: `Insufficient stock for ${i.productName}. Available: ${ds.displayText}` 
                });
            }
            
            await pool.query(
                "INSERT INTO sale_items (saleId, productId, productName, quantity, price, total, soldInUnit, conversionFactor, baseQuantity) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)",
                [saleId, i.productId, i.productName, i.quantity, i.price, i.total || i.quantity * i.price, soldInUnit, conversionFactor, baseQuantity]
            );
            // Deduct base units from stock
            await pool.query("UPDATE products SET stock = stock - $1 WHERE id = $2", [baseQuantity, i.productId]);
        }
        logActivity(cashierId, cashierName, 'sale', 'Sale: ' + rn + ' - KES ' + (total || 0).toLocaleString());
        res.json({ success: true, receiptNo: rn, saleId: saleId });
    } catch (error) {
        console.error('Create sale error:', error);
        res.status(500).json({ success: false, message: 'Error creating sale' });
    }
});

app.get('/api/sales/search/:receiptNo', verifyToken, async (req, res) => {
    try {
        const saleResult = await pool.query(
            "SELECT id, receiptno AS \"receiptNo\", customername AS \"customerName\", paymentmethod AS \"paymentMethod\", subtotal, tax, discount, total, transportcost AS \"transportCost\", cashierid AS \"cashierId\", cashiername AS \"cashierName\", mpesaref AS \"mpesaRef\", iscredit AS \"isCredit\", customerid AS \"customerId\", debtpaid AS \"debtPaid\", date, isvoid AS \"isVoid\", is_returned, return_type, return_date FROM sales WHERE receiptno = $1",
            [req.params.receiptNo]
        );
        const sale = saleResult.rows;
        if (sale.length) {
            const itemsResult = await pool.query(
                "SELECT id, saleid AS \"saleId\", productid AS \"productId\", productname AS \"productName\", quantity, price, total, soldinunit AS \"soldInUnit\", conversionfactor AS \"conversionFactor\", basequantity AS \"baseQuantity\" FROM sale_items WHERE saleId = $1",
                [sale[0].id]
            );
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
// RETURN ENDPOINTS (with dual-unit support)
// ============================================

app.post('/api/returns', verifyToken, async (req, res) => {
    const { originalSaleId, originalReceiptNo, customerName, returnType, productId, productName, quantity, returnAmount, exchangeProductId, exchangeProductName, exchangeAmount, refundAmount, reason, cashierName, returnedInUnit, conversionFactor } = req.body;
    try {
        let baseQuantity = quantity;
        
        // If returned in alternative unit, convert to base units
        if (returnedInUnit && conversionFactor > 0) {
            baseQuantity = quantity * conversionFactor;
        }
        
        await pool.query(
            "INSERT INTO returns_table (originalSaleId, originalReceiptNo, customerName, returnType, productId, productName, quantity, returnedInUnit, conversionFactor, baseQuantity, returnAmount, exchangeProductId, exchangeProductName, exchangeAmount, refundAmount, reason, cashierName, date) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW())",
            [originalSaleId, originalReceiptNo, customerName, returnType, productId, productName, quantity, returnedInUnit || null, conversionFactor || 0, baseQuantity, returnAmount, exchangeProductId || null, exchangeProductName || null, exchangeAmount || 0, refundAmount || 0, reason, cashierName]
        );
        // Add back base units to stock
        await pool.query("UPDATE products SET stock = stock + $1 WHERE id = $2", [baseQuantity, productId]);
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
        const r = await pool.query(
            "SELECT id, originalsaleid AS \"originalSaleId\", originalreceiptno AS \"originalReceiptNo\", customername AS \"customerName\", returntype AS \"returnType\", productid AS \"productId\", productname AS \"productName\", quantity, returnedinunit AS \"returnedInUnit\", conversionfactor AS \"conversionFactor\", basequantity AS \"baseQuantity\", returnamount AS \"returnAmount\", exchangeproductid AS \"exchangeProductId\", exchangeproductname AS \"exchangeProductName\", exchangeamount AS \"exchangeAmount\", refundamount AS \"refundAmount\", reason, cashiername AS \"cashierName\", date FROM returns_table ORDER BY date DESC LIMIT 100"
        );
        res.json(r.rows);
    } catch (error) {
        console.error('Get returns error:', error);
        res.status(500).json({ success: false, message: 'Error fetching returns' });
    }
});

app.get('/api/returns/receipt/:receiptNo', verifyToken, async (req, res) => {
    try {
        const returnsResult = await pool.query(
            "SELECT id, productid AS \"productId\", productname AS \"productName\", quantity, returnedinunit AS \"returnedInUnit\", returntype AS \"returnType\", date FROM returns_table WHERE originalreceiptno = $1 ORDER BY date DESC",
            [req.params.receiptNo]
        );
        res.json(returnsResult.rows);
    } catch (error) {
        console.error('Get returns by receipt error:', error);
        res.status(500).json({ success: false, message: 'Error fetching returns' });
    }
});

app.get('/api/returns/summary', verifyToken, async (req, res) => {
    try {
        var totalReturnsResult = await pool.query("SELECT COUNT(*) as count FROM returns_table WHERE returntype='return'");
        var totalExchangesResult = await pool.query("SELECT COUNT(*) as count FROM returns_table WHERE returntype='exchange'");
        var totalRefundedResult = await pool.query("SELECT COALESCE(SUM(refundamount), 0) as total FROM returns_table");
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

// ============================================
// PURCHASE ORDERS (with dual-unit support & camelCase aliases)
// ============================================

app.get('/api/purchase-orders', verifyToken, authorize('admin'), async (req, res) => {
    try {
        const posResult = await pool.query(
            "SELECT id, ponumber AS \"poNumber\", suppliername AS \"supplierName\", supplierid AS \"supplierId\", status, notes, total, createdby AS \"createdBy\", date, receiveddate AS \"receivedDate\" FROM purchase_orders ORDER BY date DESC"
        );
        const pos = posResult.rows;
        for (let po of pos) {
            const itemsResult = await pool.query(
                "SELECT id, poid AS \"poId\", productname AS \"productName\", brand, variant, quantity, orderedinunit AS \"orderedInUnit\", conversionfactor AS \"conversionFactor\", basequantity AS \"baseQuantity\", unitprice AS \"unitPrice\", sellingprice AS \"sellingPrice\", lastprice AS \"lastPrice\", currentstock AS \"currentStock\", discount, total FROM po_items WHERE poId = $1",
                [po.id]
            );
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
                let orderedInUnit = i.orderedInUnit || null;
                let conversionFactor = parseInt(i.conversionFactor) || 0;
                let baseQuantity = i.quantity;
                
                // If ordered in alternative unit, calculate base quantity
                if (orderedInUnit && conversionFactor > 0) {
                    baseQuantity = i.quantity * conversionFactor;
                }
                
                await pool.query(
                    "INSERT INTO po_items (poId, productName, brand, variant, quantity, orderedInUnit, conversionFactor, baseQuantity, unitPrice, sellingPrice, lastPrice, currentStock, discount, total) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)",
                    [poId, i.productName, i.brand || '', i.variant || '', i.quantity, orderedInUnit, conversionFactor, baseQuantity, i.unitPrice, i.sellingPrice || 0, i.lastPrice || 0, i.currentStock || 0, i.discount || 0, i.total]
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
        const poResult = await pool.query("SELECT id, ponumber AS \"poNumber\" FROM purchase_orders WHERE id = $1", [req.params.id]);
        const po = poResult.rows;
        if (!po.length) return res.json({ success: false });
        const itemsResult = await pool.query("SELECT * FROM po_items WHERE poId = $1", [req.params.id]);
        const items = itemsResult.rows;
        for (let i of items) {
            // Use basequantity (lowercase from DB) for stock addition (already converted)
            const stockToAdd = i.basequantity || i.quantity;
            
            const pResult = await pool.query("SELECT * FROM products WHERE name=$1 AND brand=$2 AND variant=$3 AND isActive=1", [i.productname, i.brand, i.variant]);
            const p = pResult.rows;
            if (p.length) {
                await pool.query("UPDATE products SET stock = stock + $1, cost = $2 WHERE id = $3", [stockToAdd, i.unitprice, p[0].id]);
            }
        }
        await pool.query("UPDATE purchase_orders SET status = 'received', receivedDate = NOW() WHERE id = $1", [req.params.id]);
        logActivity(null, 'Admin', 'po_received', 'PO received: ' + po[0].poNumber);
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
        const r = await pool.query(
            "SELECT id, name, phone, idnumber AS \"idNumber\", address, debtlimit AS \"debtLimit\", totaldebt AS \"totalDebt\", registeredby AS \"registeredBy\", registeredbyid AS \"registeredById\", dateregistered AS \"dateRegistered\", isactive AS \"isActive\" FROM credit_customers WHERE isactive=1 ORDER BY name"
        );
        res.json(r.rows);
    } catch (error) {
        console.error('Get credit customers error:', error);
        res.json([]);
    }
});

app.get('/api/credit-customers/:id', verifyToken, async (req, res) => {
    try {
        const cResult = await pool.query(
            "SELECT id, name, phone, idnumber AS \"idNumber\", address, debtlimit AS \"debtLimit\", totaldebt AS \"totalDebt\", registeredby AS \"registeredBy\", registeredbyid AS \"registeredById\", dateregistered AS \"dateRegistered\", isactive AS \"isActive\" FROM credit_customers WHERE id = $1",
            [req.params.id]
        );
        const c = cResult.rows;
        if (c.length) {
            const salesResult = await pool.query(
                "SELECT id, saleid AS \"saleId\", customerid AS \"customerId\", customername AS \"customerName\", amount, debtbefore AS \"debtBefore\", debtafter AS \"debtAfter\", cashierid AS \"cashierId\", cashiername AS \"cashierName\", date FROM credit_sales WHERE customerId = $1 ORDER BY date DESC LIMIT 10",
                [req.params.id]
            );
            const paymentsResult = await pool.query(
                "SELECT id, customerid AS \"customerId\", customername AS \"customerName\", amount, paymentmethod AS \"paymentMethod\", saleid AS \"saleId\", receivedby AS \"receivedBy\", receivedbyid AS \"receivedById\", date FROM debt_payments WHERE customerId = $1 ORDER BY date DESC LIMIT 10",
                [req.params.id]
            );
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
        const r = await pool.query(
            "SELECT id, name, phone, idnumber AS \"idNumber\", address, debtlimit AS \"debtLimit\", totaldebt AS \"totalDebt\", registeredby AS \"registeredBy\", registeredbyid AS \"registeredById\", dateregistered AS \"dateRegistered\", isactive AS \"isActive\" FROM credit_customers WHERE isactive=1 AND (name ILIKE $1 OR phone ILIKE $2 OR idnumber ILIKE $3) LIMIT 10",
            [q, q, q]
        );
        res.json(r.rows);
    } catch (error) {
        console.error('Search credit customers error:', error);
        res.json([]);
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
        const r = await pool.query(
            "SELECT id, customerid AS \"customerId\", customername AS \"customerName\", amount, paymentmethod AS \"paymentMethod\", saleid AS \"saleId\", receivedby AS \"receivedBy\", receivedbyid AS \"receivedById\", date FROM debt_payments WHERE customerId = $1 ORDER BY date DESC",
            [req.params.customerId]
        );
        res.json(r.rows);
    } catch (error) {
        console.error('Get debt payments error:', error);
        res.json([]);
    }
});

app.delete('/api/debt-payments/:id', verifyToken, authorize('admin'), async (req, res) => {
    try {
        const paymentResult = await pool.query(
            "SELECT id, amount, customerid, customername FROM debt_payments WHERE id = $1",
            [req.params.id]
        );
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
        const r = await pool.query(
            "SELECT id, saleid AS \"saleId\", customerid AS \"customerId\", customername AS \"customerName\", amount, debtbefore AS \"debtBefore\", debtafter AS \"debtAfter\", cashierid AS \"cashierId\", cashiername AS \"cashierName\", date FROM credit_sales ORDER BY date DESC LIMIT 100"
        );
        res.json(r.rows);
    } catch (error) {
        console.error('Get credit sales error:', error);
        res.json([]);
    }
});

app.get('/api/credit-summary', verifyToken, async (req, res) => {
    try {
        const tdResult = await pool.query("SELECT COALESCE(SUM(totalDebt), 0) as total FROM credit_customers WHERE isActive=1");
        const acResult = await pool.query("SELECT COUNT(*) as count FROM credit_customers WHERE isActive=1 AND totalDebt > 0");
        const tcResult = await pool.query("SELECT COUNT(*) as count FROM credit_customers WHERE isActive=1");
        const today = new Date().toISOString().split('T')[0];
        const tsResult = await pool.query(
            "SELECT COALESCE(SUM(amount), 0) as total FROM credit_sales WHERE date::date = $1::date",
            [today]
        );
        const tpResult = await pool.query(
            "SELECT COALESCE(SUM(amount), 0) as total FROM debt_payments WHERE date::date = $1::date",
            [today]
        );
        res.json({
            totalDebt: parseFloat(tdResult.rows[0].total || 0),
            activeCustomers: parseInt(acResult.rows[0].count || 0),
            totalCustomers: parseInt(tcResult.rows[0].count || 0),
            todayCreditSales: parseFloat(tsResult.rows[0].total || 0),
            todayPayments: parseFloat(tpResult.rows[0].total || 0)
        });
    } catch (error) {
        console.error('Credit summary error:', error);
        res.json({
            totalDebt: 0,
            activeCustomers: 0,
            totalCustomers: 0,
            todayCreditSales: 0,
            todayPayments: 0
        });
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
        res.json({ tillNumber: '', shortCode: '', environment: 'sandbox', configured: false });
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
        res.json([]);
    }
});

app.get('/api/mpesa/transaction/:checkoutRequestID', verifyToken, async (req, res) => {
    try {
        const r = await pool.query("SELECT * FROM mpesa_transactions WHERE checkoutRequestID=$1", [req.params.checkoutRequestID]);
        res.json(r.rows[0] || { status: 'not_found' });
    } catch (error) {
        console.error('Get M-Pesa transaction error:', error);
        res.json({ status: 'not_found' });
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
        res.json([]);
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
            var itemsSoldResult = await pool.query("SELECT SUM(si.baseQuantity) as total FROM sale_items si JOIN sales s ON si.saleId=s.id WHERE s.date::text LIKE $1 AND s.isVoid=0", [today + '%']);
            var stockAddedResult = await pool.query("SELECT SUM(pi.baseQuantity) as total FROM po_items pi JOIN purchase_orders po ON pi.poId=po.id WHERE po.receivedDate::text LIKE $1", [today + '%']);
            var stockSoldResult = await pool.query("SELECT SUM(si.baseQuantity) as total FROM sale_items si JOIN sales s ON si.saleId=s.id WHERE s.date::text LIKE $1 AND s.isVoid=0", [today + '%']);
            var productsResult = await pool.query("SELECT COUNT(*) as count, SUM(stock) as totalStock FROM products WHERE isActive=1");
            var totalSales = sales.reduce(function(s, sale) { return s + Number(sale.total || 0); }, 0);
            await pool.query(
                "INSERT INTO daily_reports (reportDate, totalSales, transactionCount, totalItemsSold, closingStock, stockAdded, stockSold, productsCount) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
                [today, totalSales, sales.length, parseInt(itemsSoldResult.rows[0]?.total || 0), parseInt(productsResult.rows[0]?.totalstock || 0), parseInt(stockAddedResult.rows[0]?.total || 0), parseInt(stockSoldResult.rows[0]?.total || 0), parseInt(productsResult.rows[0]?.count || 0)]
            );
            var newReportResult = await pool.query("SELECT * FROM daily_reports WHERE reportDate = $1", [today]);
            report = newReportResult.rows;
        }
        res.json(report[0] || {});
    } catch (error) {
        console.error('Get today report error:', error);
        res.json({});
    }
});

app.post('/api/daily-reports/generate', verifyToken, authorize('admin'), async (req, res) => {
    try {
        var today = new Date().toISOString().split('T')[0];
        var salesResult = await pool.query("SELECT * FROM sales WHERE date::text LIKE $1 AND isVoid=0", [today + '%']);
        var sales = salesResult.rows;
        var itemsSoldResult = await pool.query("SELECT SUM(si.baseQuantity) as total FROM sale_items si JOIN sales s ON si.saleId=s.id WHERE s.date::text LIKE $1 AND s.isVoid=0", [today + '%']);
        var stockAddedResult = await pool.query("SELECT SUM(pi.baseQuantity) as total FROM po_items pi JOIN purchase_orders po ON pi.poId=po.id WHERE po.receivedDate::text LIKE $1", [today + '%']);
        var stockSoldResult = await pool.query("SELECT SUM(si.baseQuantity) as total FROM sale_items si JOIN sales s ON si.saleId=s.id WHERE s.date::text LIKE $1 AND s.isVoid=0", [today + '%']);
        var productsResult = await pool.query("SELECT COUNT(*) as count, SUM(stock) as totalStock FROM products WHERE isActive=1");
        var totalSales = sales.reduce(function(s, sale) { return s + Number(sale.total || 0); }, 0);
        await pool.query(
            "INSERT INTO daily_reports (reportDate, totalSales, transactionCount, totalItemsSold, closingStock, stockAdded, stockSold, productsCount) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT (reportDate) DO UPDATE SET totalSales=$2, transactionCount=$3, totalItemsSold=$4, closingStock=$5, stockAdded=$6, stockSold=$7, productsCount=$8",
            [today, totalSales, sales.length, parseInt(itemsSoldResult.rows[0]?.total || 0), parseInt(productsResult.rows[0]?.totalstock || 0), parseInt(stockAddedResult.rows[0]?.total || 0), parseInt(stockSoldResult.rows[0]?.total || 0), parseInt(productsResult.rows[0]?.count || 0)]
        );
        res.json({ success: true });
    } catch (error) {
        console.error('Generate daily report error:', error);
        res.status(500).json({ success: false, message: 'Error generating daily report' });
    }
});

// ============================================
// FRONTEND ROUTE
// ============================================

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
