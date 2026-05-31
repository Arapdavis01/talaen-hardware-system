const Database = require('better-sqlite3');
const db = new Database('database/talaen.db');

db.exec("CREATE TABLE IF NOT EXISTS daily_reports (id INTEGER PRIMARY KEY AUTOINCREMENT, reportDate TEXT UNIQUE, totalSales REAL, transactionCount INTEGER, totalItemsSold INTEGER, openingStock INTEGER, closingStock INTEGER, stockAdded INTEGER, stockSold INTEGER, productsCount INTEGER, generatedAt TEXT DEFAULT (datetime('now')))");

console.log('Daily reports table created!');
db.close();
