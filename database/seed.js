const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.join(__dirname, 'database', 'talaen.db'));

const products = [
    { name: 'Cement', brand: 'Bamburi', variant: '50kg', category: 'Building Materials', price: 850, cost: 720, stock: 100, unit: 'bag' },
    { name: 'Cement', brand: 'Blue Circle', variant: '50kg', category: 'Building Materials', price: 820, cost: 700, stock: 80, unit: 'bag' },
    { name: 'Cement', brand: 'Simba', variant: '50kg', category: 'Building Materials', price: 800, cost: 680, stock: 120, unit: 'bag' },
    { name: 'Cement', brand: 'Bamburi', variant: '25kg', category: 'Building Materials', price: 450, cost: 380, stock: 200, unit: 'bag' },
    { name: 'Iron Sheets', brand: 'Mabati Rolling Mills', variant: 'G30', category: 'Roofing', price: 1850, cost: 1600, stock: 150, unit: 'sheet' },
    { name: 'Iron Sheets', brand: 'Mabati Rolling Mills', variant: 'G32', category: 'Roofing', price: 2100, cost: 1850, stock: 100, unit: 'sheet' },
    { name: 'Iron Sheets', brand: 'Apex', variant: 'G30', category: 'Roofing', price: 1750, cost: 1500, stock: 200, unit: 'sheet' },
    { name: 'Nails', brand: 'SteelPro', variant: '2 inch', category: 'Hardware', price: 180, cost: 150, stock: 500, unit: 'kg' },
    { name: 'Nails', brand: 'SteelPro', variant: '3 inch', category: 'Hardware', price: 220, cost: 180, stock: 400, unit: 'kg' },
    { name: 'Nails', brand: 'SteelPro', variant: '4 inch', category: 'Hardware', price: 260, cost: 210, stock: 300, unit: 'kg' },
    { name: 'Paint', brand: 'Crown', variant: '4L White', category: 'Paint', price: 3200, cost: 2800, stock: 80, unit: 'bucket' },
    { name: 'Paint', brand: 'Duracoat', variant: '4L White', category: 'Paint', price: 2900, cost: 2500, stock: 60, unit: 'bucket' },
    { name: 'Paint', brand: 'Crown', variant: '20L White', category: 'Paint', price: 14000, cost: 12000, stock: 30, unit: 'bucket' },
    { name: 'PVC Pipes', brand: 'Polypipe', variant: '4 inch x 3m', category: 'Plumbing', price: 1850, cost: 1600, stock: 200, unit: 'length' },
    { name: 'PVC Pipes', brand: 'Polypipe', variant: '2 inch x 3m', category: 'Plumbing', price: 950, cost: 800, stock: 300, unit: 'length' },
    { name: 'Sand', brand: 'River', variant: '1 Ton', category: 'Building Materials', price: 2800, cost: 2400, stock: 50, unit: 'ton' },
    { name: 'Door Handles', brand: 'Stainless', variant: 'Standard', category: 'Hardware', price: 450, cost: 380, stock: 300, unit: 'pair' },
    { name: 'Tiles', brand: 'Ceramic', variant: '60x60cm White', category: 'Flooring', price: 1200, cost: 950, stock: 500, unit: 'box' }
];

const count = db.prepare('SELECT COUNT(*) as c FROM products').get();
if (count.c === 0) {
    const stmt = db.prepare('INSERT INTO products (sku, name, brand, variant, category, price, cost, stock, unit, minStock) VALUES (?,?,?,?,?,?,?,?,?,?)');
    products.forEach(p => {
        stmt.run(Date.now().toString(36).toUpperCase() + Math.random().toString(36).substr(2,4).toUpperCase(), p.name, p.brand, p.variant, p.category, p.price, p.cost, p.stock, p.unit, 10);
    });
    console.log('Added ' + products.length + ' products!');
} else {
    console.log('Already ' + count.c + ' products exist');
}

db.close();
