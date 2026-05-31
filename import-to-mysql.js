const mysql = require('mysql2/promise');
const fs = require('fs');

async function importData() {
    const pool = mysql.createPool({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'talaen_hardware'
    });

    const data = JSON.parse(fs.readFileSync('./database/export.json', 'utf8'));

    // Clear existing data
    const tables = ['sale_items', 'credit_sales', 'debt_payments', 'po_items', 'sales', 'purchase_orders', 'activity_log', 'credit_customers', 'products', 'users', 'suppliers', 'settings', 'mpesa_config', 'daily_reports', 'mpesa_transactions'];
    for (const table of tables) {
        try { await pool.query('DELETE FROM ' + table); } catch(e) {}
    }

    if (data.products && data.products.length > 0) {
        console.log('Importing ' + data.products.length + ' products...');
        for (const p of data.products) {
            await pool.query(
                'INSERT INTO products (id, sku, name, brand, variant, category, price, cost, stock, unit, minStock, isActive) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
                [p.id, p.sku, p.name, p.brand, p.variant, p.category, p.price, p.cost, p.stock, p.unit, p.minStock, p.isActive]
            );
        }
    }

    if (data.users && data.users.length > 0) {
        console.log('Importing ' + data.users.length + ' users...');
        for (const u of data.users) {
            await pool.query(
                'INSERT INTO users (id, username, password, role, fullName, isActive) VALUES (?,?,?,?,?,?)',
                [u.id, u.username, u.password, u.role, u.fullName, u.isActive]
            );
        }
    }

    if (data.suppliers && data.suppliers.length > 0) {
        console.log('Importing ' + data.suppliers.length + ' suppliers...');
        for (const s of data.suppliers) {
            await pool.query(
                'INSERT INTO suppliers (id, name, contact, email, phone, address) VALUES (?,?,?,?,?,?)',
                [s.id, s.name, s.contact||'', s.email||'', s.phone||'', s.address||'']
            );
        }
    }

    if (data.settings && data.settings.length > 0) {
        for (const s of data.settings) {
            await pool.query('INSERT INTO settings (id, adminPassword, taxRate) VALUES (?,?,?)', [s.id, s.adminPassword||'admin123', s.taxRate||16]);
        }
    }

    if (data.sales && data.sales.length > 0) {
        console.log('Importing ' + data.sales.length + ' sales...');
        for (const s of data.sales) {
            await pool.query(
                'INSERT INTO sales (id, receiptNo, customerName, paymentMethod, subtotal, tax, discount, total, cashierId, cashierName, mpesaRef, isCredit, customerId, date, isVoid) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
                [s.id, s.receiptNo, s.customerName, s.paymentMethod, s.subtotal, s.tax, s.discount||0, s.total, s.cashierId||null, s.cashierName||null, s.mpesaRef||null, s.isCredit||0, s.customerId||null, s.date, s.isVoid||0]
            );
        }
    }

    if (data.sale_items && data.sale_items.length > 0) {
        console.log('Importing ' + data.sale_items.length + ' sale items...');
        for (const si of data.sale_items) {
            await pool.query(
                'INSERT INTO sale_items (id, saleId, productId, productName, quantity, price, total) VALUES (?,?,?,?,?,?,?)',
                [si.id, si.saleId, si.productId, si.productName, si.quantity, si.price, si.total]
            );
        }
    }

    if (data.credit_customers && data.credit_customers.length > 0) {
        console.log('Importing ' + data.credit_customers.length + ' credit customers...');
        for (const c of data.credit_customers) {
            await pool.query(
                'INSERT INTO credit_customers (id, name, phone, idNumber, address, debtLimit, totalDebt, registeredBy, registeredById, dateRegistered, isActive) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
                [c.id, c.name, c.phone||'', c.idNumber||'', c.address||'', c.debtLimit, c.totalDebt, c.registeredBy||'', c.registeredById||null, c.dateRegistered, c.isActive]
            );
        }
    }

    if (data.credit_sales && data.credit_sales.length > 0) {
        console.log('Importing ' + data.credit_sales.length + ' credit sales...');
        for (const cs of data.credit_sales) {
            await pool.query(
                'INSERT INTO credit_sales (id, saleId, customerId, customerName, amount, debtBefore, debtAfter, cashierId, cashierName, date) VALUES (?,?,?,?,?,?,?,?,?,?)',
                [cs.id, cs.saleId, cs.customerId, cs.customerName, cs.amount, cs.debtBefore, cs.debtAfter, cs.cashierId, cs.cashierName, cs.date]
            );
        }
    }

    if (data.debt_payments && data.debt_payments.length > 0) {
        console.log('Importing ' + data.debt_payments.length + ' debt payments...');
        for (const dp of data.debt_payments) {
            await pool.query(
                'INSERT INTO debt_payments (id, customerId, customerName, amount, paymentMethod, receivedBy, receivedById, date) VALUES (?,?,?,?,?,?,?,?)',
                [dp.id, dp.customerId, dp.customerName, dp.amount, dp.paymentMethod||'cash', dp.receivedBy||'', dp.receivedById||null, dp.date]
            );
        }
    }

    if (data.purchase_orders && data.purchase_orders.length > 0) {
        console.log('Importing ' + data.purchase_orders.length + ' purchase orders...');
        for (const po of data.purchase_orders) {
            await pool.query(
                'INSERT INTO purchase_orders (id, poNumber, supplierName, supplierId, status, notes, total, createdBy, date, receivedDate) VALUES (?,?,?,?,?,?,?,?,?,?)',
                [po.id, po.poNumber, po.supplierName, po.supplierId||null, po.status||'pending', po.notes||'', po.total, po.createdBy||'', po.date, po.receivedDate||null]
            );
        }
    }

    if (data.po_items && data.po_items.length > 0) {
        console.log('Importing ' + data.po_items.length + ' PO items...');
        for (const pi of data.po_items) {
            await pool.query(
                'INSERT INTO po_items (id, poId, productName, brand, variant, quantity, unitPrice, sellingPrice, lastPrice, currentStock, discount, total) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
                [pi.id, pi.poId, pi.productName, pi.brand||'', pi.variant||'', pi.quantity, pi.unitPrice, pi.sellingPrice||0, pi.lastPrice||0, pi.currentStock||0, pi.discount||0, pi.total]
            );
        }
    }

    if (data.activity_log && data.activity_log.length > 0) {
        console.log('Importing ' + data.activity_log.length + ' activity logs...');
        for (const al of data.activity_log) {
            await pool.query(
                'INSERT INTO activity_log (id, userId, userName, action, details, date) VALUES (?,?,?,?,?,?)',
                [al.id, al.userId||null, al.userName||'System', al.action, al.details, al.date]
            );
        }
    }

    console.log('Migration complete!');
    process.exit();
}

importData().catch(function(e) { console.error('Error:', e.message); process.exit(); });