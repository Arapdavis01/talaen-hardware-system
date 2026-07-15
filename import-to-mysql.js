const mysql = require('mysql2/promise');
const fs = require('fs');
const bcrypt = require('bcrypt');

async function importData() {
    // 🔥 UPDATED: Uses environment variables with SSL support
    const pool = mysql.createPool({
        host: process.env.MYSQLHOST || 'localhost',
        user: process.env.MYSQLUSER || 'root',
        password: process.env.MYSQLPASSWORD || '',
        database: process.env.MYSQLDATABASE || 'talaen_hardware',
        port: process.env.MYSQLPORT || 3306,
        waitForConnections: true,
        connectionLimit: 10,
        ssl: process.env.MYSQL_SSL === 'true' ? { rejectUnauthorized: true } : false
    });

    // Check if export file exists
    if (!fs.existsSync('./database/export.json')) {
        console.error('❌ Error: ./database/export.json not found!');
        console.log('   Please export your data from Railway first.');
        process.exit(1);
    }

    console.log('📖 Reading export.json...');
    const data = JSON.parse(fs.readFileSync('./database/export.json', 'utf8'));

    // Clear existing data (order matters due to foreign keys)
    const tables = [
        'sale_items', 
        'credit_sales', 
        'debt_payments', 
        'po_items', 
        'sales', 
        'purchase_orders', 
        'activity_log', 
        'credit_customers', 
        'products', 
        'users', 
        'suppliers', 
        'settings', 
        'mpesa_config', 
        'daily_reports', 
        'mpesa_transactions',
        'returns_table'
    ];
    
    console.log('🗑️  Clearing existing data...');
    for (const table of tables) {
        try { 
            await pool.query('DELETE FROM ' + table); 
            console.log(`   ✅ Cleared: ${table}`);
        } catch(e) {
            // Ignore if table doesn't exist
            console.log(`   ⏭️  Skipped: ${table} (may not exist)`);
        }
    }

    // Import data in correct order (parents first)
    
    // Users
    if (data.users && data.users.length > 0) {
        console.log(`📥 Importing ${data.users.length} users...`);
        for (const u of data.users) {
            // Check if password is already hashed (starts with $2b$)
            let password = u.password;
            if (!password.startsWith('$2b$') && !password.startsWith('$2a$')) {
                // Hash plain text password
                password = await bcrypt.hash(password, 10);
            }
            await pool.query(
                'INSERT INTO users (id, username, password, role, fullName, isActive) VALUES (?,?,?,?,?,?)',
                [u.id, u.username, password, u.role, u.fullName, u.isActive]
            );
        }
    }

    // Suppliers
    if (data.suppliers && data.suppliers.length > 0) {
        console.log(`📥 Importing ${data.suppliers.length} suppliers...`);
        for (const s of data.suppliers) {
            await pool.query(
                'INSERT INTO suppliers (id, name, contact, email, phone, address) VALUES (?,?,?,?,?,?)',
                [s.id, s.name, s.contact||'', s.email||'', s.phone||'', s.address||'']
            );
        }
    }

    // Products
    if (data.products && data.products.length > 0) {
        console.log(`📥 Importing ${data.products.length} products...`);
        for (const p of data.products) {
            await pool.query(
                'INSERT INTO products (id, sku, name, brand, variant, category, price, cost, stock, unit, minStock, isActive) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
                [p.id, p.sku, p.name, p.brand, p.variant, p.category, p.price, p.cost, p.stock, p.unit, p.minStock, p.isActive]
            );
        }
    }

    // Credit Customers
    if (data.credit_customers && data.credit_customers.length > 0) {
        console.log(`📥 Importing ${data.credit_customers.length} credit customers...`);
        for (const c of data.credit_customers) {
            await pool.query(
                'INSERT INTO credit_customers (id, name, phone, idNumber, address, debtLimit, totalDebt, registeredBy, registeredById, dateRegistered, isActive) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
                [c.id, c.name, c.phone||'', c.idNumber||'', c.address||'', c.debtLimit, c.totalDebt, c.registeredBy||'', c.registeredById||null, c.dateRegistered, c.isActive]
            );
        }
    }

    // Settings
    if (data.settings && data.settings.length > 0) {
        console.log('📥 Importing settings...');
        for (const s of data.settings) {
            // Hash admin password if it's not already hashed
            let adminPassword = s.adminPassword || 'admin123';
            if (!adminPassword.startsWith('$2b$') && !adminPassword.startsWith('$2a$')) {
                adminPassword = await bcrypt.hash(adminPassword, 10);
            }
            await pool.query(
                'INSERT INTO settings (id, adminPassword, taxRate, announcement) VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE adminPassword=VALUES(adminPassword), taxRate=VALUES(taxRate), announcement=VALUES(announcement)',
                [s.id, adminPassword, s.taxRate||16, s.announcement||null]
            );
        }
    }

    // Sales (with all new columns)
    if (data.sales && data.sales.length > 0) {
        console.log(`📥 Importing ${data.sales.length} sales...`);
        for (const s of data.sales) {
            await pool.query(
                `INSERT INTO sales (id, receiptNo, customerName, paymentMethod, subtotal, tax, discount, total, 
                transportCost, cashierId, cashierName, mpesaRef, isCredit, customerId, debtPaid, date, isVoid, 
                is_returned, return_type, return_date) 
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
                [s.id, s.receiptNo, s.customerName, s.paymentMethod, s.subtotal, s.tax, s.discount||0, s.total, 
                s.transportCost||0, s.cashierId||null, s.cashierName||null, s.mpesaRef||null, s.isCredit||0, 
                s.customerId||null, s.debtPaid||0, s.date, s.isVoid||0, s.is_returned||0, s.return_type||null, 
                s.return_date||null]
            );
        }
    }

    // Sale Items
    if (data.sale_items && data.sale_items.length > 0) {
        console.log(`📥 Importing ${data.sale_items.length} sale items...`);
        for (const si of data.sale_items) {
            await pool.query(
                'INSERT INTO sale_items (id, saleId, productId, productName, quantity, price, total) VALUES (?,?,?,?,?,?,?)',
                [si.id, si.saleId, si.productId, si.productName, si.quantity, si.price, si.total]
            );
        }
    }

    // Credit Sales
    if (data.credit_sales && data.credit_sales.length > 0) {
        console.log(`📥 Importing ${data.credit_sales.length} credit sales...`);
        for (const cs of data.credit_sales) {
            await pool.query(
                'INSERT INTO credit_sales (id, saleId, customerId, customerName, amount, debtBefore, debtAfter, cashierId, cashierName, date) VALUES (?,?,?,?,?,?,?,?,?,?)',
                [cs.id, cs.saleId, cs.customerId, cs.customerName, cs.amount, cs.debtBefore, cs.debtAfter, cs.cashierId, cs.cashierName, cs.date]
            );
        }
    }

    // Debt Payments
    if (data.debt_payments && data.debt_payments.length > 0) {
        console.log(`📥 Importing ${data.debt_payments.length} debt payments...`);
        for (const dp of data.debt_payments) {
            await pool.query(
                'INSERT INTO debt_payments (id, customerId, customerName, amount, paymentMethod, receivedBy, receivedById, date) VALUES (?,?,?,?,?,?,?,?)',
                [dp.id, dp.customerId, dp.customerName, dp.amount, dp.paymentMethod||'cash', dp.receivedBy||'', dp.receivedById||null, dp.date]
            );
        }
    }

    // Purchase Orders
    if (data.purchase_orders && data.purchase_orders.length > 0) {
        console.log(`📥 Importing ${data.purchase_orders.length} purchase orders...`);
        for (const po of data.purchase_orders) {
            await pool.query(
                'INSERT INTO purchase_orders (id, poNumber, supplierName, supplierId, status, notes, total, createdBy, date, receivedDate) VALUES (?,?,?,?,?,?,?,?,?,?)',
                [po.id, po.poNumber, po.supplierName, po.supplierId||null, po.status||'pending', po.notes||'', po.total, po.createdBy||'', po.date, po.receivedDate||null]
            );
        }
    }

    // PO Items
    if (data.po_items && data.po_items.length > 0) {
        console.log(`📥 Importing ${data.po_items.length} PO items...`);
        for (const pi of data.po_items) {
            await pool.query(
                'INSERT INTO po_items (id, poId, productName, brand, variant, quantity, unitPrice, sellingPrice, lastPrice, currentStock, discount, total) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
                [pi.id, pi.poId, pi.productName, pi.brand||'', pi.variant||'', pi.quantity, pi.unitPrice, pi.sellingPrice||0, pi.lastPrice||0, pi.currentStock||0, pi.discount||0, pi.total]
            );
        }
    }

    // Activity Log
    if (data.activity_log && data.activity_log.length > 0) {
        console.log(`📥 Importing ${data.activity_log.length} activity logs...`);
        for (const al of data.activity_log) {
            await pool.query(
                'INSERT INTO activity_log (id, userId, userName, action, details, date) VALUES (?,?,?,?,?,?)',
                [al.id, al.userId||null, al.userName||'System', al.action, al.details, al.date]
            );
        }
    }

    console.log('✅ Migration complete successfully!');
    console.log(`📊 Summary:`);
    console.log(`   - ${data.users?.length || 0} users imported`);
    console.log(`   - ${data.products?.length || 0} products imported`);
    console.log(`   - ${data.sales?.length || 0} sales imported`);
    console.log(`   - ${data.suppliers?.length || 0} suppliers imported`);
    console.log(`   - ${data.credit_customers?.length || 0} credit customers imported`);
    process.exit(0);
}

importData().catch(function(e) { 
    console.error('❌ Error during import:', e.message); 
    if (e.code === 'ECONNREFUSED') {
        console.error('   ⚠️  Could not connect to database. Check your environment variables.');
        console.error('   💡 Make sure MYSQLHOST, MYSQLUSER, MYSQLPASSWORD, MYSQLDATABASE, MYSQLPORT are set correctly.');
        console.error('   💡 Also ensure MYSQL_SSL=true for Aiven.');
    }
    if (e.code === 'ER_BAD_DB_ERROR') {
        console.error('   ⚠️  Database does not exist. Make sure your Aiven database name is correct.');
    }
    if (e.code === 'ENOENT') {
        console.error('   ⚠️  Export file not found. Make sure ./database/export.json exists.');
    }
    process.exit(1); 
});
