const Database = require('better-sqlite3');
const db = new Database('database/talaen.db');

db.exec('CREATE TABLE IF NOT EXISTS purchase_orders (id INTEGER PRIMARY KEY AUTOINCREMENT, poNumber TEXT UNIQUE, supplierName TEXT, supplierContact TEXT, status TEXT DEFAULT "pending", notes TEXT, total REAL DEFAULT 0, createdBy TEXT, date TEXT, receivedDate TEXT)');

db.exec('CREATE TABLE IF NOT EXISTS po_items (id INTEGER PRIMARY KEY AUTOINCREMENT, poId INTEGER, productName TEXT, brand TEXT, variant TEXT, quantity INTEGER, unitPrice REAL, total REAL)');

console.log('PO tables created!');
db.close();
