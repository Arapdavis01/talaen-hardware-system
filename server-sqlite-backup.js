const express = require('express');
const path = require('path');
const Database = require('better-sqlite3');
const app = express();
const PORT = 8080;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'frontend', 'public')));
app.use('/src', express.static(path.join(__dirname, 'frontend', 'src')));

const db = new Database(path.join(__dirname, 'database', 'talaen.db'));

db.exec("CREATE TABLE IF NOT EXISTS products (id INTEGER PRIMARY KEY AUTOINCREMENT, sku TEXT, name TEXT, brand TEXT DEFAULT '', variant TEXT DEFAULT '', category TEXT DEFAULT 'General', price REAL, cost REAL DEFAULT 0, stock INTEGER DEFAULT 0, unit TEXT DEFAULT 'pcs', minStock INTEGER DEFAULT 10, isActive INTEGER DEFAULT 1)");
db.exec("CREATE TABLE IF NOT EXISTS sales (id INTEGER PRIMARY KEY AUTOINCREMENT, receiptNo TEXT, customerName TEXT, paymentMethod TEXT, subtotal REAL, tax REAL, discount REAL DEFAULT 0, total REAL, cashierId INTEGER, cashierName TEXT, date TEXT, isVoid INTEGER DEFAULT 0)");
db.exec("CREATE TABLE IF NOT EXISTS sale_items (id INTEGER PRIMARY KEY AUTOINCREMENT, saleId INTEGER, productId INTEGER, productName TEXT, quantity INTEGER, price REAL, total REAL)");
db.exec("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE, password TEXT, role TEXT DEFAULT 'cashier', fullName TEXT DEFAULT '', isActive INTEGER DEFAULT 1)");
db.exec("CREATE TABLE IF NOT EXISTS settings (id INTEGER PRIMARY KEY CHECK (id = 1), adminPassword TEXT DEFAULT 'admin123', taxRate REAL DEFAULT 16)");
db.exec("CREATE TABLE IF NOT EXISTS activity_log (id INTEGER PRIMARY KEY AUTOINCREMENT, userId INTEGER, userName TEXT, action TEXT, details TEXT, date TEXT)");
db.exec("CREATE TABLE IF NOT EXISTS purchase_orders (id INTEGER PRIMARY KEY AUTOINCREMENT, poNumber TEXT, supplierName TEXT, supplierId INTEGER, status TEXT DEFAULT 'pending', notes TEXT, total REAL DEFAULT 0, createdBy TEXT, date TEXT, receivedDate TEXT)");
db.exec("CREATE TABLE IF NOT EXISTS po_items (id INTEGER PRIMARY KEY AUTOINCREMENT, poId INTEGER, productName TEXT, brand TEXT, variant TEXT, quantity INTEGER, unitPrice REAL, sellingPrice REAL DEFAULT 0, lastPrice REAL DEFAULT 0, currentStock INTEGER DEFAULT 0, discount REAL DEFAULT 0, total REAL)");
db.exec("CREATE TABLE IF NOT EXISTS suppliers (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, contact TEXT, email TEXT, phone TEXT, address TEXT)");
db.exec("CREATE TABLE IF NOT EXISTS daily_reports (id INTEGER PRIMARY KEY AUTOINCREMENT, reportDate TEXT UNIQUE, totalSales REAL, transactionCount INTEGER, totalItemsSold INTEGER, closingStock INTEGER, stockAdded INTEGER, stockSold INTEGER, productsCount INTEGER)");
db.exec("CREATE TABLE IF NOT EXISTS mpesa_config (id INTEGER PRIMARY KEY CHECK (id = 1), consumerKey TEXT, consumerSecret TEXT, passkey TEXT, tillNumber TEXT, shortCode TEXT, environment TEXT DEFAULT 'sandbox')");
db.exec("CREATE TABLE IF NOT EXISTS mpesa_transactions (id INTEGER PRIMARY KEY AUTOINCREMENT, transactionType TEXT, saleId INTEGER, phoneNumber TEXT, amount REAL, accountReference TEXT, checkoutRequestID TEXT, merchantRequestID TEXT, resultCode INTEGER, resultDesc TEXT, mpesaReceiptNumber TEXT, status TEXT DEFAULT 'pending', date TEXT)");
db.exec("CREATE TABLE IF NOT EXISTS credit_customers (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, phone TEXT, idNumber TEXT, address TEXT, debtLimit REAL DEFAULT 5000, totalDebt REAL DEFAULT 0, registeredBy TEXT, registeredById INTEGER, dateRegistered TEXT, isActive INTEGER DEFAULT 1)");
db.exec("CREATE TABLE IF NOT EXISTS debt_payments (id INTEGER PRIMARY KEY AUTOINCREMENT, customerId INTEGER, customerName TEXT, amount REAL, paymentMethod TEXT DEFAULT 'cash', saleId INTEGER, receivedBy TEXT, receivedById INTEGER, date TEXT)");
db.exec("CREATE TABLE IF NOT EXISTS credit_sales (id INTEGER PRIMARY KEY AUTOINCREMENT, saleId INTEGER, customerId INTEGER, customerName TEXT, amount REAL, debtBefore REAL, debtAfter REAL, cashierId INTEGER, cashierName TEXT, date TEXT)");

try { db.exec("ALTER TABLE sales ADD COLUMN cashierId INTEGER"); } catch(e) {}
try { db.exec("ALTER TABLE sales ADD COLUMN cashierName TEXT"); } catch(e) {}
try { db.exec("ALTER TABLE purchase_orders ADD COLUMN supplierId INTEGER"); } catch(e) {}
try { db.exec("ALTER TABLE po_items ADD COLUMN discount REAL DEFAULT 0"); } catch(e) {}
try { db.exec("ALTER TABLE sales ADD COLUMN mpesaRef TEXT"); } catch(e) {}
try { db.exec("ALTER TABLE sales ADD COLUMN isCredit INTEGER DEFAULT 0"); } catch(e) {}
try { db.exec("ALTER TABLE sales ADD COLUMN customerId INTEGER"); } catch(e) {}
try { db.exec("ALTER TABLE sales ADD COLUMN debtPaid REAL DEFAULT 0"); } catch(e) {}

const uc = db.prepare("SELECT COUNT(*) as c FROM users").get();
if (uc.c === 0) {
    db.prepare("INSERT INTO users VALUES (1,'admin','admin123','admin','Administrator',1)").run();
    db.prepare("INSERT INTO users VALUES (2,'cashier','cashier123','cashier','Cashier User',1)").run();
    db.prepare("INSERT OR IGNORE INTO settings VALUES (1,'admin123',16)").run();
}

const mc = db.prepare("SELECT COUNT(*) as c FROM mpesa_config").get();
if (mc.c === 0) {
    db.prepare("INSERT INTO mpesa_config (id, environment) VALUES (1, 'sandbox')").run();
}

function logActivity(userId, userName, action, details) {
    db.prepare("INSERT INTO activity_log (userId, userName, action, details, date) VALUES (?,?,?,?,datetime('now'))").run(userId||null, userName||'System', action, details);
}

// AUTH
app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;
    const user = db.prepare("SELECT * FROM users WHERE username=? AND password=? AND isActive=1").get(username, password);
    if (user) { logActivity(user.id, user.fullName, 'login', 'Logged in'); return res.json({ success: true, user: { id: user.id, username: user.username, role: user.role, fullName: user.fullName } }); }
    res.json({ success: false, message: 'Invalid credentials' });
});

// USERS
app.get('/api/users', (req, res) => { res.json(db.prepare("SELECT id, username, password, role, fullName, isActive FROM users").all()); });
app.post('/api/users', (req, res) => {
    const { username, password, role, fullName } = req.body;
    try { const r = db.prepare("INSERT INTO users (username, password, role, fullName) VALUES (?,?,?,?)").run(username, password, role||'cashier', fullName); logActivity(null, 'Admin', 'add_user', 'Added: ' + fullName); res.json({ success: true, id: r.lastInsertRowid }); }
    catch(e) { res.json({ success: false, message: 'Username exists' }); }
});
app.put('/api/users/:id', (req, res) => {
    const { password, isActive, fullName, username, toggle } = req.body;
    const user = db.prepare("SELECT * FROM users WHERE id=?").get(req.params.id);
    if (!user) return res.json({ success: false });
    if (password) { db.prepare("UPDATE users SET password=? WHERE id=?").run(password, req.params.id); logActivity(user.id, user.fullName, 'password_change', 'Password changed'); }
    if (isActive !== undefined) db.prepare("UPDATE users SET isActive=? WHERE id=?").run(isActive, req.params.id);
    if (toggle) { if (user.role === 'admin') return res.json({ success: false, message: 'Cannot deactivate admin' }); db.prepare("UPDATE users SET isActive=? WHERE id=?").run(user.isActive ? 0 : 1, req.params.id); logActivity(null, 'Admin', 'toggle_user', (user.isActive?'Deactivated':'Activated')+': '+user.fullName); }
    if (fullName) db.prepare("UPDATE users SET fullName=? WHERE id=?").run(fullName, req.params.id);
    if (username) db.prepare("UPDATE users SET username=? WHERE id=?").run(username, req.params.id);
    res.json({ success: true });
});

// SETTINGS
app.get('/api/settings', (req, res) => { res.json(db.prepare("SELECT * FROM settings WHERE id=1").get() || { adminPassword: 'admin123' }); });
app.put('/api/settings', (req, res) => { if (req.body.adminPassword) { db.prepare("UPDATE settings SET adminPassword=? WHERE id=1").run(req.body.adminPassword); logActivity(null, 'Admin', 'password_change', 'Admin password changed'); } res.json({ success: true }); });

// ACTIVITY
app.get('/api/activity', (req, res) => { res.json(db.prepare("SELECT * FROM activity_log ORDER BY date DESC LIMIT 100").all()); });
app.delete('/api/activity', (req, res) => { db.prepare("DELETE FROM activity_log").run(); res.json({ success: true }); });

// SUPPLIERS
app.get('/api/suppliers', (req, res) => { res.json(db.prepare("SELECT * FROM suppliers ORDER BY name").all()); });
app.post('/api/suppliers', (req, res) => { const { name, phone, email, address } = req.body; const r = db.prepare("INSERT INTO suppliers (name, phone, email, address) VALUES (?,?,?,?)").run(name, phone, email, address); res.json({ success: true, id: r.lastInsertRowid }); });

// PRODUCTS
app.get('/api/products', (req, res) => { res.json(db.prepare("SELECT * FROM products WHERE isActive=1 ORDER BY name,brand").all()); });
app.get('/api/products/with-prices', (req, res) => {
    const products = db.prepare("SELECT * FROM products WHERE isActive=1 ORDER BY name,brand").all();
    products.forEach(p => { const lastPO = db.prepare("SELECT pi.unitPrice, pi.sellingPrice FROM po_items pi JOIN purchase_orders po ON pi.poId=po.id WHERE pi.productName=? AND pi.brand=? AND pi.variant=? ORDER BY po.date DESC LIMIT 1").get(p.name, p.brand, p.variant); p.lastPrice = lastPO ? lastPO.unitPrice : p.cost; });
    res.json(products);
});
app.post('/api/products', (req, res) => { const { name, brand, variant, category, price, cost, stock, unit } = req.body; const sku = Date.now().toString(36).toUpperCase(); const r = db.prepare("INSERT INTO products (sku,name,brand,variant,category,price,cost,stock,unit) VALUES (?,?,?,?,?,?,?,?,?)").run(sku, name, brand, variant, category, price, cost||0, stock||0, unit||'pcs'); logActivity(null, 'Admin', 'add_product', 'Added: ' + (brand||'') + ' ' + name); res.json({ success: true, id: r.lastInsertRowid }); });
app.put('/api/products/:id', (req, res) => { const { name, brand, variant, price, cost, stock, unit } = req.body; db.prepare("UPDATE products SET name=?,brand=?,variant=?,price=?,cost=?,stock=?,unit=? WHERE id=?").run(name,brand,variant,price,cost,stock,unit,req.params.id); res.json({ success: true }); });
app.delete('/api/products/:id', (req, res) => { db.prepare("UPDATE products SET isActive=0 WHERE id=?").run(req.params.id); res.json({ success: true }); });
app.put('/api/products/:id/stock', (req, res) => { db.prepare("UPDATE products SET stock=stock+? WHERE id=?").run(req.body.quantity, req.params.id); res.json({ success: true }); });

// SALES
app.get('/api/sales', (req, res) => { const sales = db.prepare("SELECT * FROM sales ORDER BY date DESC").all(); sales.forEach(s => { s.items = db.prepare("SELECT * FROM sale_items WHERE saleId = ?").all(s.id); }); res.json(sales); });
app.get('/api/sales/cashiers-summary', (req, res) => {
    var cashiers = db.prepare("SELECT id, fullName, username FROM users WHERE role='cashier' AND isActive=1").all();
    var today = new Date().toISOString().split('T')[0];
    var result = cashiers.map(function(c) { var sales = db.prepare('SELECT * FROM sales WHERE cashierId=? AND isVoid=0').all(c.id); var todaySales = sales.filter(function(s) { return s.date && s.date.startsWith(today); }); return { id: c.id, name: c.fullName, username: c.username, totalAll: sales.reduce(function(s, sale) { return s + sale.total; }, 0), totalToday: todaySales.reduce(function(s, sale) { return s + sale.total; }, 0), countAll: sales.length, countToday: todaySales.length }; });
    res.json(result);
});
app.get('/api/sales/cashier/:id', (req, res) => {
    var sales = db.prepare('SELECT * FROM sales WHERE cashierId=? AND isVoid=0 ORDER BY date DESC').all(req.params.id);
    var today = new Date().toISOString().split('T')[0];
    var todaySales = sales.filter(function(s) { return s.date && s.date.startsWith(today); });
    res.json({ all: sales, today: todaySales, totalAll: sales.reduce(function(s, sale) { return s + sale.total; }, 0), totalToday: todaySales.reduce(function(s, sale) { return s + sale.total; }, 0), countAll: sales.length, countToday: todaySales.length });
});
app.post('/api/sales', (req, res) => {
    const { customerName, items, paymentMethod, subtotal, tax, discount, total, cashierId, cashierName, mpesaRef, isCredit, customerId, debtPaid } = req.body;
    const rn = 'TIH-' + Date.now().toString(36).toUpperCase();
    const s = db.prepare("INSERT INTO sales (receiptNo,customerName,paymentMethod,subtotal,tax,discount,total,cashierId,cashierName,mpesaRef,isCredit,customerId,debtPaid,date) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,datetime('now'))").run(rn, customerName, paymentMethod, subtotal, tax, discount||0, total, cashierId||null, cashierName||null, mpesaRef||null, isCredit||0, customerId||null, debtPaid||0);
    items.forEach(function(i) { db.prepare("INSERT INTO sale_items (saleId,productId,productName,quantity,price,total) VALUES (?,?,?,?,?,?)").run(s.lastInsertRowid, i.productId, i.productName, i.quantity, i.price, i.quantity*i.price); db.prepare("UPDATE products SET stock=stock-? WHERE id=?").run(i.quantity, i.productId); });
    logActivity(cashierId, cashierName, 'sale', 'Sale: ' + rn + ' - KES ' + (total||0).toLocaleString() + (mpesaRef ? ' (M-Pesa: ' + mpesaRef + ')' : '') + (isCredit ? ' (CREDIT)' : ''));
    res.json({ success: true, receiptNo: rn, saleId: s.lastInsertRowid });
});

// PURCHASE ORDERS
app.get('/api/purchase-orders', (req, res) => { var pos = db.prepare("SELECT * FROM purchase_orders ORDER BY date DESC").all(); pos.forEach(function(po) { po.items = db.prepare("SELECT * FROM po_items WHERE poId = ?").all(po.id); }); res.json(pos); });
app.post('/api/purchase-orders', (req, res) => {
    try { var d = req.body; var poNumber = 'PO-' + Date.now().toString(36).toUpperCase(); var po = db.prepare("INSERT INTO purchase_orders (poNumber, supplierName, supplierId, notes, total, createdBy, date) VALUES (?,?,?,?,?,?,datetime('now'))").run(poNumber, d.supplierName, d.supplierId||null, d.notes, d.total, d.createdBy); if (d.items) { d.items.forEach(function(i) { db.prepare("INSERT INTO po_items (poId, productName, brand, variant, quantity, unitPrice, sellingPrice, lastPrice, currentStock, discount, total) VALUES (?,?,?,?,?,?,?,?,?,?,?)").run(po.lastInsertRowid, i.productName, i.brand||'', i.variant||'', i.quantity, i.unitPrice, i.sellingPrice||0, i.lastPrice||0, i.currentStock||0, i.discount||0, i.total); }); } logActivity(null, 'Admin', 'purchase_order', 'PO: ' + poNumber); res.json({ success: true, poNumber: poNumber }); }
    catch(e) { res.json({ success: false, message: e.message }); }
});
app.put('/api/purchase-orders/:id/receive', (req, res) => {
    var po = db.prepare("SELECT * FROM purchase_orders WHERE id = ?").get(req.params.id); if (!po) return res.json({ success: false });
    db.prepare("SELECT * FROM po_items WHERE poId = ?").all(req.params.id).forEach(function(i) { var p = db.prepare("SELECT * FROM products WHERE name=? AND brand=? AND variant=? AND isActive=1").get(i.productName, i.brand, i.variant); if (p) db.prepare("UPDATE products SET stock = stock + ?, cost = ? WHERE id = ?").run(i.quantity, i.unitPrice, p.id); });
    db.prepare("UPDATE purchase_orders SET status = 'received', receivedDate = datetime('now') WHERE id = ?").run(req.params.id);
    logActivity(null, 'Admin', 'po_received', 'PO received: ' + po.poNumber);
    res.json({ success: true });
});
app.put('/api/purchase-orders/:id/update', (req, res) => {
    try {
        var d = req.body;
        db.prepare("DELETE FROM po_items WHERE poId = ?").run(req.params.id);
        db.prepare("UPDATE purchase_orders SET supplierName=?, supplierId=?, notes=?, total=?, date=datetime('now') WHERE id=?").run(d.supplierName, d.supplierId||null, d.notes, d.total, req.params.id);
        if (d.items) { d.items.forEach(function(i) { db.prepare("INSERT INTO po_items (poId, productName, brand, variant, quantity, unitPrice, sellingPrice, lastPrice, currentStock, discount, total) VALUES (?,?,?,?,?,?,?,?,?,?,?)").run(req.params.id, i.productName, i.brand||'', i.variant||'', i.quantity, i.unitPrice, i.sellingPrice||0, i.lastPrice||0, i.currentStock||0, i.discount||0, i.total); }); }
        res.json({ success: true, message: 'PO updated' });
    } catch(e) { res.json({ success: false, message: e.message }); }
});

// M-PESA CONFIG
app.get('/api/mpesa/config', (req, res) => {
    const config = db.prepare("SELECT * FROM mpesa_config WHERE id=1").get();
    res.json({ tillNumber: config?.tillNumber || '', shortCode: config?.shortCode || '', environment: config?.environment || 'sandbox', configured: !!(config?.consumerKey && config?.consumerSecret && config?.passkey) });
});
app.put('/api/mpesa/config', (req, res) => {
    const { consumerKey, consumerSecret, passkey, tillNumber, shortCode, environment } = req.body;
    db.prepare("UPDATE mpesa_config SET consumerKey=?, consumerSecret=?, passkey=?, tillNumber=?, shortCode=?, environment=? WHERE id=1").run(consumerKey, consumerSecret, passkey, tillNumber, shortCode, environment || 'sandbox');
    logActivity(null, 'Admin', 'mpesa_config', 'M-Pesa configuration updated');
    res.json({ success: true });
});

// M-PESA AUTH TOKEN
async function getMpesaToken() {
    const config = db.prepare("SELECT * FROM mpesa_config WHERE id=1").get();
    if (!config?.consumerKey || !config?.consumerSecret) return null;
    const auth = Buffer.from(`${config.consumerKey}:${config.consumerSecret}`).toString('base64');
    const url = config.environment === 'production' ? 'https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials' : 'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials';
    try { const response = await fetch(url, { headers: { Authorization: `Basic ${auth}` } }); const data = await response.json(); return data.access_token; }
    catch(e) { console.error('M-Pesa token error:', e); return null; }
}

// M-PESA STK PUSH
app.post('/api/mpesa/stk-push', async (req, res) => {
    const { phoneNumber, amount, saleId, accountReference } = req.body;
    const config = db.prepare("SELECT * FROM mpesa_config WHERE id=1").get();
    if (!config?.passkey || !config?.shortCode) return res.json({ success: false, message: 'M-Pesa not configured.' });
    const token = await getMpesaToken();
    if (!token) return res.json({ success: false, message: 'Failed to authenticate' });
    const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
    const password = Buffer.from(`${config.shortCode}${config.passkey}${timestamp}`).toString('base64');
    const url = config.environment === 'production' ? 'https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest' : 'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest';
    const formattedPhone = phoneNumber.replace(/^0/, '254').replace(/^\+/, '').replace(/\s/g, '');
    const ref = accountReference || `TIH-${saleId || Date.now()}`;
    try {
        const response = await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ BusinessShortCode: config.shortCode, Password: password, Timestamp: timestamp, TransactionType: 'CustomerPayBillOnline', Amount: Math.round(amount), PartyA: formattedPhone, PartyB: config.shortCode, PhoneNumber: formattedPhone, CallBackURL: `https://your-domain.com/api/mpesa/callback`, AccountReference: ref.substring(0, 12), TransactionDesc: 'Talaen Hardware' }) });
        const data = await response.json();
        db.prepare("INSERT INTO mpesa_transactions (transactionType, saleId, phoneNumber, amount, accountReference, checkoutRequestID, merchantRequestID, status, date) VALUES ('stk_push', ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))").run(saleId || null, formattedPhone, amount, ref, data.CheckoutRequestID, data.MerchantRequestID, 'pending');
        res.json({ success: data.ResponseCode === '0', checkoutRequestID: data.CheckoutRequestID, message: data.ResponseDescription || data.errorMessage || 'STK Push sent' });
    } catch(e) { res.json({ success: false, message: e.message }); }
});

// M-PESA CALLBACK
app.post('/api/mpesa/callback', (req, res) => {
    try {
        const callback = req.body.Body?.stkCallback;
        if (!callback) return res.json({ ResultCode: 1, ResultDesc: 'Invalid callback' });
        const { MerchantRequestID, CheckoutRequestID, ResultCode, ResultDesc } = callback;
        let mpesaReceiptNumber = null, amount = null;
        if (callback.CallbackMetadata?.Item) {
            mpesaReceiptNumber = callback.CallbackMetadata.Item.find(i => i.Name === 'MpesaReceiptNumber')?.Value;
            amount = callback.CallbackMetadata.Item.find(i => i.Name === 'Amount')?.Value;
        }
        db.prepare("UPDATE mpesa_transactions SET resultCode=?, resultDesc=?, mpesaReceiptNumber=?, status=?, date=datetime('now') WHERE checkoutRequestID=?").run(ResultCode, ResultDesc, mpesaReceiptNumber, ResultCode === 0 ? 'completed' : 'failed', CheckoutRequestID);
        if (ResultCode === 0) {
            const transaction = db.prepare("SELECT * FROM mpesa_transactions WHERE checkoutRequestID=?").get(CheckoutRequestID);
            if (transaction?.saleId) db.prepare("UPDATE sales SET paymentMethod='M-Pesa', mpesaRef=? WHERE id=?").run(mpesaReceiptNumber, transaction.saleId);
            logActivity(null, 'System', 'mpesa_payment', `M-Pesa: ${mpesaReceiptNumber} - KES ${amount}`);
        }
        res.json({ ResultCode: 0, ResultDesc: 'Success' });
    } catch(e) { res.json({ ResultCode: 1, ResultDesc: 'Error' }); }
});

// M-PESA TILL PAYMENT
app.post('/api/mpesa/till-payment', (req, res) => {
    const { saleId, mpesaReceiptNumber, phoneNumber, amount } = req.body;
    db.prepare("INSERT INTO mpesa_transactions (transactionType, saleId, phoneNumber, amount, mpesaReceiptNumber, status, date) VALUES ('till_payment', ?, ?, ?, ?, 'completed', datetime('now'))").run(saleId, phoneNumber, amount, mpesaReceiptNumber);
    db.prepare("UPDATE sales SET paymentMethod='M-Pesa', mpesaRef=? WHERE id=?").run(mpesaReceiptNumber, saleId);
    logActivity(null, 'Admin', 'mpesa_till', `Till payment: ${mpesaReceiptNumber} - KES ${amount}`);
    res.json({ success: true });
});

// M-PESA TRANSACTIONS
app.get('/api/mpesa/transactions', (req, res) => { res.json(db.prepare("SELECT * FROM mpesa_transactions ORDER BY date DESC LIMIT 100").all()); });
app.get('/api/mpesa/transaction/:checkoutRequestID', (req, res) => { res.json(db.prepare("SELECT * FROM mpesa_transactions WHERE checkoutRequestID=?").get(req.params.checkoutRequestID) || { status: 'not_found' }); });

// CREDIT CUSTOMERS
app.get('/api/credit-customers', (req, res) => { res.json(db.prepare("SELECT * FROM credit_customers WHERE isActive=1 ORDER BY name").all()); });
app.get('/api/credit-customers/:id', (req, res) => {
    const customer = db.prepare("SELECT * FROM credit_customers WHERE id=?").get(req.params.id);
    if (customer) {
        customer.recentSales = db.prepare("SELECT * FROM credit_sales WHERE customerId=? ORDER BY date DESC LIMIT 10").all(req.params.id);
        customer.payments = db.prepare("SELECT * FROM debt_payments WHERE customerId=? ORDER BY date DESC LIMIT 10").all(req.params.id);
    }
    res.json(customer || {});
});
app.post('/api/credit-customers', (req, res) => {
    const { name, phone, idNumber, address, debtLimit, cashierId, cashierName } = req.body;
    const r = db.prepare("INSERT INTO credit_customers (name, phone, idNumber, address, debtLimit, registeredBy, registeredById, dateRegistered) VALUES (?,?,?,?,?,?,?,datetime('now'))").run(name, phone, idNumber, address, debtLimit || 5000, cashierName || 'Admin', cashierId || null);
    logActivity(cashierId, cashierName, 'register_customer', 'Registered credit customer: ' + name + ' (Limit: KES ' + (debtLimit||5000).toLocaleString() + ')');
    res.json({ success: true, id: r.lastInsertRowid });
});
app.put('/api/credit-customers/:id', (req, res) => {
    const { name, phone, idNumber, address, debtLimit, isActive } = req.body;
    db.prepare("UPDATE credit_customers SET name=?, phone=?, idNumber=?, address=?, debtLimit=? WHERE id=?").run(name, phone, idNumber, address, debtLimit, req.params.id);
    if (isActive !== undefined) db.prepare("UPDATE credit_customers SET isActive=? WHERE id=?").run(isActive, req.params.id);
    res.json({ success: true });
});
app.get('/api/credit-customers/search/:query', (req, res) => {
    const q = '%' + req.params.query + '%';
    res.json(db.prepare("SELECT * FROM credit_customers WHERE isActive=1 AND (name LIKE ? OR phone LIKE ? OR idNumber LIKE ?) LIMIT 10").all(q, q, q));
});

// DEBT PAYMENTS
app.post('/api/debt-payments', (req, res) => {
    const { customerId, customerName, amount, paymentMethod, receivedBy, receivedById } = req.body;
    db.prepare("INSERT INTO debt_payments (customerId, customerName, amount, paymentMethod, receivedBy, receivedById, date) VALUES (?,?,?,?,?,?,datetime('now'))").run(customerId, customerName, amount, paymentMethod || 'cash', receivedBy, receivedById);
    db.prepare("UPDATE credit_customers SET totalDebt = MAX(0, totalDebt - ?) WHERE id = ?").run(amount, customerId);
    logActivity(receivedById, receivedBy, 'debt_payment', 'Debt payment: ' + customerName + ' - KES ' + amount);
    res.json({ success: true });
});
app.get('/api/debt-payments/:customerId', (req, res) => { res.json(db.prepare("SELECT * FROM debt_payments WHERE customerId=? ORDER BY date DESC").all(req.params.customerId)); });

// CREDIT SALES
app.post('/api/credit-sales', (req, res) => {
    const { saleId, customerId, customerName, amount, cashierId, cashierName } = req.body;
    const customer = db.prepare("SELECT * FROM credit_customers WHERE id=?").get(customerId);
    if (!customer) return res.json({ success: false, message: 'Customer not found' });
    const debtBefore = customer.totalDebt || 0;
    const debtAfter = debtBefore + amount;
    if (debtAfter > customer.debtLimit) return res.json({ success: false, message: 'Debt limit exceeded! Current: KES ' + debtBefore.toLocaleString() + ', Limit: KES ' + customer.debtLimit.toLocaleString() + ', Available: KES ' + (customer.debtLimit - debtBefore).toLocaleString() });
    db.prepare("INSERT INTO credit_sales (saleId, customerId, customerName, amount, debtBefore, debtAfter, cashierId, cashierName, date) VALUES (?,?,?,?,?,?,?,?,datetime('now'))").run(saleId, customerId, customerName, amount, debtBefore, debtAfter, cashierId, cashierName);
    db.prepare("UPDATE credit_customers SET totalDebt = totalDebt + ? WHERE id = ?").run(amount, customerId);
    db.prepare("UPDATE sales SET isCredit=1, customerId=? WHERE id=?").run(customerId, saleId);
    logActivity(cashierId, cashierName, 'credit_sale', 'Credit sale to ' + customerName + ' - KES ' + amount + ' (Debt: ' + debtBefore.toLocaleString() + ' → ' + debtAfter.toLocaleString() + ')');
    res.json({ success: true, debtBefore: debtBefore, debtAfter: debtAfter });
});
app.get('/api/credit-sales', (req, res) => { res.json(db.prepare("SELECT * FROM credit_sales ORDER BY date DESC LIMIT 100").all()); });
app.get('/api/credit-summary', (req, res) => {
    const totalDebt = db.prepare("SELECT SUM(totalDebt) as total FROM credit_customers WHERE isActive=1").get();
    const activeCustomers = db.prepare("SELECT COUNT(*) as count FROM credit_customers WHERE isActive=1 AND totalDebt > 0").get();
    const today = new Date().toISOString().split('T')[0] + '%';
    const todaySales = db.prepare("SELECT SUM(amount) as total FROM credit_sales WHERE date LIKE ?").get(today);
    const todayPayments = db.prepare("SELECT SUM(amount) as total FROM debt_payments WHERE date LIKE ?").get(today);
    res.json({ totalDebt: totalDebt?.total || 0, activeCustomers: activeCustomers?.count || 0, todayCreditSales: todaySales?.total || 0, todayPayments: todayPayments?.total || 0 });
});

// DAILY REPORTS
app.get('/api/daily-reports', (req, res) => { res.json(db.prepare("SELECT * FROM daily_reports ORDER BY reportDate DESC LIMIT 30").all()); });
app.get('/api/daily-reports/today', (req, res) => {
    var today = new Date().toISOString().split('T')[0];
    var report = db.prepare("SELECT * FROM daily_reports WHERE reportDate = ?").get(today);
    if (!report) {
        var sales = db.prepare("SELECT * FROM sales WHERE date LIKE ? AND isVoid=0").all(today + '%');
        var itemsSold = db.prepare("SELECT SUM(quantity) as total FROM sale_items si JOIN sales s ON si.saleId=s.id WHERE s.date LIKE ? AND s.isVoid=0").get(today + '%');
        var stockAdded = db.prepare("SELECT SUM(quantity) as total FROM po_items pi JOIN purchase_orders po ON pi.poId=po.id WHERE po.receivedDate LIKE ?").get(today + '%');
        var stockSold = db.prepare("SELECT SUM(si.quantity) as total FROM sale_items si JOIN sales s ON si.saleId=s.id WHERE s.date LIKE ? AND s.isVoid=0").get(today + '%');
        var products = db.prepare("SELECT COUNT(*) as count, SUM(stock) as totalStock FROM products WHERE isActive=1").get();
        db.prepare("INSERT OR REPLACE INTO daily_reports (reportDate, totalSales, transactionCount, totalItemsSold, closingStock, stockAdded, stockSold, productsCount) VALUES (?,?,?,?,?,?,?,?)").run(today, sales.reduce(function(s,sale){return s+sale.total;},0), sales.length, itemsSold?.total||0, products?.totalStock||0, stockAdded?.total||0, stockSold?.total||0, products?.count||0);
        report = db.prepare("SELECT * FROM daily_reports WHERE reportDate = ?").get(today);
    }
    res.json(report);
});
app.post('/api/daily-reports/generate', (req, res) => {
    var today = new Date().toISOString().split('T')[0];
    var sales = db.prepare("SELECT * FROM sales WHERE date LIKE ? AND isVoid=0").all(today + '%');
    var itemsSold = db.prepare("SELECT SUM(quantity) as total FROM sale_items si JOIN sales s ON si.saleId=s.id WHERE s.date LIKE ? AND s.isVoid=0").get(today + '%');
    var stockAdded = db.prepare("SELECT SUM(quantity) as total FROM po_items pi JOIN purchase_orders po ON pi.poId=po.id WHERE po.receivedDate LIKE ?").get(today + '%');
    var stockSold = db.prepare("SELECT SUM(si.quantity) as total FROM sale_items si JOIN sales s ON si.saleId=s.id WHERE s.date LIKE ? AND s.isVoid=0").get(today + '%');
    var products = db.prepare("SELECT COUNT(*) as count, SUM(stock) as totalStock FROM products WHERE isActive=1").get();
    db.prepare("INSERT OR REPLACE INTO daily_reports (reportDate, totalSales, transactionCount, totalItemsSold, closingStock, stockAdded, stockSold, productsCount) VALUES (?,?,?,?,?,?,?,?)").run(today, sales.reduce(function(s,sale){return s+sale.total;},0), sales.length, itemsSold?.total||0, products?.totalStock||0, stockAdded?.total||0, stockSold?.total||0, products?.count||0);
    res.json({ success: true });
});

app.all('/{*splat}', (req, res) => { res.sendFile(path.join(__dirname, 'frontend', 'public', 'index.html')); });
app.listen(PORT, () => { console.log('Server: http://localhost:' + PORT); });