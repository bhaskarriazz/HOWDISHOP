const fs = require('fs');
const path = require('path');
const http = require('http');
const crypto = require('crypto');

const PORT = 5000;
const HOST = '127.0.0.1';
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const FILES = {
  users: path.join(DATA_DIR, 'users.json'),
  addresses: path.join(DATA_DIR, 'addresses.json'),
  products: path.join(DATA_DIR, 'products.json'),
  orders: path.join(DATA_DIR, 'orders.json'),
  wishlist: path.join(DATA_DIR, 'wishlist.json'),
  cart: path.join(DATA_DIR, 'cart.json'),
  wallet: path.join(DATA_DIR, 'wallet.json'),
  notifications: path.join(DATA_DIR, 'notifications.json'),
};

function readJSON(file, fallback = []) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
}
function writeJSON(file, data) { fs.writeFileSync(file, JSON.stringify(data, null, 2)); }
for (const file of Object.values(FILES)) if (!fs.existsSync(file)) writeJSON(file, []);

function sendJSON(res, status, body) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': 'http://localhost:5173',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  });
  res.end(JSON.stringify(body));
}
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', chunk => raw += chunk);
    req.on('end', () => { try { resolve(raw ? JSON.parse(raw) : {}); } catch { reject(new Error('Invalid JSON')); } });
    req.on('error', reject);
  });
}
function hashPassword(password) { return crypto.createHash('sha256').update(String(password)).digest('hex'); }
function id() { return crypto.randomUUID(); }
function now() { return new Date().toISOString(); }
function normalizePhone(v) { return String(v || '').replace(/\D/g, ''); }
function customerIdFrom(url) { return url.searchParams.get('customer_id') || ''; }

function seedProducts() {
  const products = readJSON(FILES.products, []);
  if (products.length) return;
  writeJSON(FILES.products, [
    { id:id(), name:'HOWDI Everyday T-Shirt', category:'Fashion', price:499, stock:25, image:'', created_at:now() },
    { id:id(), name:'HOWDI Casual Sneakers', category:'Footwear', price:1299, stock:15, image:'', created_at:now() },
    { id:id(), name:'HOWDI Classic Backpack', category:'Bags', price:899, stock:20, image:'', created_at:now() }
  ]);
}
seedProducts();

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') return sendJSON(res, 204, {});
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname;

  try {
    if (req.method === 'GET' && pathname === '/api/health') {
      return sendJSON(res, 200, { status:'ok', message:'HOWDI Backend is running' });
    }

    if (req.method === 'POST' && pathname === '/api/auth/register') {
      const body = await parseBody(req);
      const name = String(body.name || body.fullName || body.full_name || '').trim();
      const phone = normalizePhone(body.phone || body.mobile);
      const email = String(body.email || `${phone}@howdi.local`).trim().toLowerCase();
      const password = String(body.password || '');
      if (!name || !phone || password.length < 6) return sendJSON(res, 400, { status:'error', message:'Name, phone and password (minimum 6 characters) are required' });
      const users = readJSON(FILES.users, []);
      if (users.some(u => normalizePhone(u.phone) === phone || String(u.email).toLowerCase() === email)) return sendJSON(res, 409, { status:'error', message:'Account already exists' });
      const user = { id:id(), name, email, phone, password_hash:hashPassword(password), created_at:now() };
      users.push(user); writeJSON(FILES.users, users);
      const safe = { id:user.id, name:user.name, email:user.email, phone:user.phone };
      return sendJSON(res, 201, { status:'success', message:'Account created successfully!', user:safe });
    }

    if (req.method === 'POST' && pathname === '/api/auth/login') {
      const body = await parseBody(req);
      const identifier = String(body.phone || body.mobile || body.email || '').trim();
      const users = readJSON(FILES.users, []);
      const user = users.find(u => normalizePhone(u.phone) === normalizePhone(identifier) || String(u.email).toLowerCase() === identifier.toLowerCase());
      if (!user || user.password_hash !== hashPassword(body.password || '')) return sendJSON(res, 401, { status:'error', message:'Invalid phone/email or password' });
      const safe = { id:user.id, name:user.name, email:user.email, phone:user.phone };
      return sendJSON(res, 200, { status:'success', message:'Login successful', user:safe });
    }

    // Address Book API
    if (pathname === '/api/addresses' && req.method === 'GET') {
      const customerId = customerIdFrom(url);
      if (!customerId) return sendJSON(res, 400, { status:'error', message:'customer_id is required' });
      const addresses = readJSON(FILES.addresses, []).filter(a => String(a.customer_id) === String(customerId));
      addresses.sort((a,b) => Number(b.is_default) - Number(a.is_default) || String(b.updated_at || '').localeCompare(String(a.updated_at || '')));
      return sendJSON(res, 200, { status:'success', addresses });
    }

    if (pathname === '/api/addresses' && req.method === 'POST') {
      const body = await parseBody(req);
      const customerId = String(body.customer_id || '').trim();
      if (!customerId) return sendJSON(res, 400, { status:'error', message:'customer_id is required' });
      if (!String(body.full_name || body.name || '').trim() || !String(body.address || '').trim() || !String(body.city || '').trim() || !String(body.state || '').trim() || !String(body.pincode || '').trim() || !normalizePhone(body.phone)) return sendJSON(res, 400, { status:'error', message:'Complete address details are required' });
      const addresses = readJSON(FILES.addresses, []);
      const customerAddresses = addresses.filter(a => String(a.customer_id) === customerId);
      const address = { id:id(), customer_id:customerId, label:String(body.label || 'Home'), full_name:String(body.full_name || body.name).trim(), address:String(body.address).trim(), city:String(body.city).trim(), state:String(body.state).trim(), pincode:String(body.pincode).trim(), phone:normalizePhone(body.phone), landmark:String(body.landmark || '').trim(), is_default: Boolean(body.is_default) || customerAddresses.length === 0, created_at:now(), updated_at:now() };
      if (address.is_default) for (const a of addresses) if (String(a.customer_id) === customerId) a.is_default = false;
      addresses.push(address); writeJSON(FILES.addresses, addresses);
      return sendJSON(res, 201, { status:'success', address });
    }

    const addressMatch = pathname.match(/^\/api\/addresses\/([^/]+)$/);
    const defaultMatch = pathname.match(/^\/api\/addresses\/([^/]+)\/default$/);

    if (defaultMatch && req.method === 'POST') {
      const addressId = decodeURIComponent(defaultMatch[1]);
      const body = await parseBody(req);
      const customerId = String(body.customer_id || url.searchParams.get('customer_id') || '');
      const addresses = readJSON(FILES.addresses, []);
      const target = addresses.find(a => a.id === addressId && String(a.customer_id) === customerId);
      if (!target) return sendJSON(res, 404, { status:'error', message:'Address not found' });
      for (const a of addresses) if (String(a.customer_id) === customerId) a.is_default = a.id === addressId;
      writeJSON(FILES.addresses, addresses);
      return sendJSON(res, 200, { status:'success', address:addresses.find(a => a.id === addressId) });
    }

    if (addressMatch && (req.method === 'PUT' || req.method === 'DELETE')) {
      const addressId = decodeURIComponent(addressMatch[1]);
      const body = req.method === 'PUT' ? await parseBody(req) : {};
      const customerId = String(body.customer_id || url.searchParams.get('customer_id') || '');
      const addresses = readJSON(FILES.addresses, []);
      const index = addresses.findIndex(a => a.id === addressId && String(a.customer_id) === customerId);
      if (index < 0) return sendJSON(res, 404, { status:'error', message:'Address not found' });
      if (req.method === 'DELETE') {
        const removed = addresses.splice(index, 1)[0];
        if (removed.is_default) { const next = addresses.find(a => String(a.customer_id) === customerId); if (next) next.is_default = true; }
        writeJSON(FILES.addresses, addresses);
        return sendJSON(res, 200, { status:'success', message:'Address deleted' });
      }
      const current = addresses[index];
      const updated = { ...current, ...body, id:current.id, customer_id:current.customer_id, updated_at:now() };
      updated.full_name = String(body.full_name ?? body.name ?? current.full_name).trim();
      updated.phone = normalizePhone(body.phone ?? current.phone);
      updated.is_default = Boolean(body.is_default ?? current.is_default);
      if (updated.is_default) for (const a of addresses) if (String(a.customer_id) === customerId) a.is_default = false;
      addresses[index] = updated; writeJSON(FILES.addresses, addresses);
      return sendJSON(res, 200, { status:'success', address:updated });
    }

    // Products
    if (req.method === 'GET' && pathname === '/api/products') {
      let products = readJSON(FILES.products, []);
      const q = String(url.searchParams.get('q') || '').toLowerCase();
      const category = String(url.searchParams.get('category') || '').toLowerCase();
      if (q) products = products.filter(p => String(p.name).toLowerCase().includes(q) || String(p.category).toLowerCase().includes(q));
      if (category) products = products.filter(p => String(p.category).toLowerCase() === category);
      return sendJSON(res, 200, { status:'success', products });
    }

    // Orders (foundation)
    if (req.method === 'GET' && pathname === '/api/orders') {
      const customerId = url.searchParams.get('customer_id') || '';
      return sendJSON(res, 200, { status:'success', orders:readJSON(FILES.orders, []).filter(o => !customerId || String(o.customer_id) === String(customerId)) });
    }
    if (req.method === 'POST' && pathname === '/api/orders') {
      const body = await parseBody(req);
      const orders = readJSON(FILES.orders, []);
      const order = { id:id(), order_id:`HOWDI-${Date.now()}`, ...body, status:'PLACED', created_at:now(), updated_at:now() };
      orders.push(order); writeJSON(FILES.orders, orders);
      return sendJSON(res, 201, { status:'success', order });
    }

    return sendJSON(res, 404, { status:'error', message:'API endpoint not found' });
  } catch (err) {
    console.error(err);
    return sendJSON(res, 500, { status:'error', message:err.message || 'Internal server error' });
  }
});

server.listen(PORT, HOST, () => {
  console.log('HOWDI BACKEND V2');
  console.log(`API:    http://${HOST}:${PORT}`);
  console.log(`Health: http://${HOST}:${PORT}/api/health`);
  console.log(`Orders: http://${HOST}:${PORT}/api/orders`);
});
