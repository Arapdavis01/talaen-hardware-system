const Database = require('better-sqlite3');
const path = require('path');

// Create/open database file
const db = new Database(path.join(__dirname, 'talaen.db'));

// Create tables
db.exec(`
    CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sku TEXT UNIQUE,
        name TEXT NOT NULL,
        brand TEXT,
        variant TEXT,
        category TEXT,
        description TEXT,
        price REAL NOT NULL,
        cost REAL,
        stock INTEGER DEFAULT 0,
        unit TEXT DEFAULT 'pcs',
        minStock INTEGER DEFAULT 10,
        barcode TEXT,
        isActive INTEGER DEFAULT 1,
        createdAt TEXT DEFAULT (datetime('now')),
        updatedAt TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sales (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        receiptNo TEXT UNIQUE NOT NULL,
        customerName TEXT DEFAULT 'Walk-in Customer',
        customerPhone TEXT,
        paymentMethod TEXT DEFAULT 'cash',
        subtotal REAL NOT NULL,
        tax REAL NOT NULL,
        discount REAL DEFAULT 0,
        total REAL NOT NULL,
        cashier TEXT,
        date TEXT DEFAULT (datetime('now')),
        isVoid INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS sale_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        saleId INTEGER REFERENCES sales(id),
        productId INTEGER REFERENCES products(id),
        productName TEXT,
        quantity INTEGER NOT NULL,
        price REAL NOT NULL,
        total REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT DEFAULT 'cashier',
        fullName TEXT,
        isActive INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        storeName TEXT DEFAULT 'Talaen Investment Hardware',
        adminPassword TEXT DEFAULT 'admin123',
        taxRate REAL DEFAULT 16,
        currency TEXT DEFAULT 'KES'
    );
`);

// Insert default data if empty
const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
if (userCount.count === 0) {
    const insertUser = db.prepare('INSERT INTO users (username, password, role, fullName) VALUES (?, ?, ?, ?)');
    insertUser.run('admin', 'admin123', 'admin', 'Administrator');
    insertUser.run('cashier', 'cashier123', 'cashier', 'Cashier User');
    
    const insertSettings = db.prepare('INSERT OR IGNORE INTO settings (id, storeName, adminPassword) VALUES (1, ?, ?)');
    insertSettings.run('Talaen Investment Hardware', 'admin123');
    
    console.log('✅ Default users and settings created!');
}

console.log('✅ Database ready!');
module.exports = db;