const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PORT = 5000;
const HOST = "127.0.0.1";

const DATA_DIR = path.join(__dirname, "data");
const FILES = {
  users: path.join(DATA_DIR, "users.json"),
  orders: path.join(DATA_DIR, "orders.json"),
  addresses: path.join(DATA_DIR, "addresses.json"),
  categories: path.join(DATA_DIR, "categories.json"),
  subcategories: path.join(DATA_DIR, "subcategories.json"),
  products: path.join(DATA_DIR, "products.json"),
};

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
for (const file of Object.values(FILES)) {
  if (!fs.existsSync(file)) fs.writeFileSync(file, "[]", "utf8");
}

function readList(key) {
  try {
    const data = JSON.parse(fs.readFileSync(FILES[key], "utf8"));
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function saveList(key, value) {
  fs.writeFileSync(FILES[key], JSON.stringify(value, null, 2), "utf8");
}

function id() {
  return crypto.randomUUID();
}

function now() {
  return new Date().toISOString();
}

function hashPassword(password) {
  return crypto.createHash("sha256").update(String(password)).digest("hex");
}

function clean(value, fallback = "") {
  if (value === undefined || value === null) return fallback;
  return String(value).trim();
}

function number(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function bool(value, fallback = true) {
  return typeof value === "boolean" ? value : fallback;
}

function sendJSON(res, statusCode, data) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "http://localhost:5174",
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, x-howdi-admin-token",
  });
  res.end(JSON.stringify(data));
}

function getBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
      if (body.length > 1024 * 1024) {
        req.destroy();
        reject(new Error("Request too large"));
      }
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error("Invalid JSON"));
      }
    });
    req.on("error", reject);
  });
}

function requestURL(req) {
  return new URL(req.url, `http://${HOST}:${PORT}`);
}

function normalizeAddress(body, existing = {}) {
  return {
    ...existing,
    label: clean(body.label ?? existing.label ?? "Home") || "Other",
    full_name: clean(body.full_name ?? body.fullName ?? existing.full_name),
    phone: clean(body.phone ?? existing.phone).replace(/\D/g, "").slice(0, 10),
    address_line1: clean(body.address_line1 ?? body.addressLine1 ?? existing.address_line1),
    address_line2: clean(body.address_line2 ?? body.addressLine2 ?? existing.address_line2),
    city: clean(body.city ?? existing.city),
    state: clean(body.state ?? existing.state),
    pincode: clean(body.pincode ?? existing.pincode).replace(/\D/g, "").slice(0, 6),
    updated_at: now(),
  };
}

function validateAddress(address) {
  if (!address.full_name) return "Full name is required";
  if (!/^[0-9]{10}$/.test(address.phone)) return "A valid 10-digit mobile number is required";
  if (!address.address_line1) return "Address line 1 is required";
  if (!address.city) return "City is required";
  if (!address.state) return "State is required";
  if (!/^[1-9][0-9]{5}$/.test(address.pincode)) return "A valid 6-digit pincode is required";
  return null;
}

function normalizeCategory(body, existing = {}) {
  return {
    ...existing,
    name: clean(body.name, existing.name || ""),
    icon: clean(body.icon, existing.icon || "🧶") || "🧶",
    description: clean(body.description, existing.description || ""),
    visible: bool(body.visible, existing.visible !== false),
    showOnHome: bool(body.showOnHome, existing.showOnHome !== false),
    updatedAt: now(),
  };
}

function normalizeSubcategory(body, existing = {}) {
  return {
    ...existing,
    categoryId: clean(body.categoryId ?? body.category_id, existing.categoryId || ""),
    name: clean(body.name, existing.name || ""),
    icon: clean(body.icon, existing.icon || "🧶") || "🧶",
    visible: bool(body.visible, existing.visible !== false),
    updatedAt: now(),
  };
}

function normalizeProduct(body, existing = {}) {
  return {
    ...existing,
    name: clean(body.name, existing.name || ""),
    brand: clean(body.brand, existing.brand || ""),
    categoryId: clean(body.categoryId ?? body.category_id, existing.categoryId || ""),
    subcategoryId: clean(body.subcategoryId ?? body.subcategory_id, existing.subcategoryId || ""),
    subcategory: clean(body.subcategory, existing.subcategory || ""),
    icon: clean(body.icon, existing.icon || "🧶") || "🧶",
    price: number(body.price, number(existing.price, 0)),
    stock: number(body.stock, number(existing.stock, 0)),
    visible: bool(body.visible, existing.visible !== false),
    updatedAt: now(),
  };
}

function listResponse(res, name, items) {
  sendJSON(res, 200, { status: "success", [name]: items, count: items.length });
}

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "http://localhost:5174",
      "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, x-howdi-admin-token",
    });
    res.end();
    return;
  }

  const url = requestURL(req);
  const pathname = url.pathname;
  console.log(`${req.method} ${req.url}`);

  try {
    // HEALTH
    if (req.method === "GET" && pathname === "/api/health") {
      return sendJSON(res, 200, { status: "ok", message: "HOWDI backend is running" });
    }

    // ADMIN LOGIN
    if (req.method === "POST" && pathname === "/api/admin/login") {
      const body = await getBody(req);
      const username = clean(body.username);
      const password = String(body.password || "");
      const adminUsername = process.env.ADMIN_USERNAME || "admin";
      const adminPassword = process.env.ADMIN_PASSWORD || "admin";

      if (username !== adminUsername || password !== adminPassword) {
        return sendJSON(res, 401, { status: "error", message: "Invalid admin credentials" });
      }

      const token = "howdi-admin-" + Buffer.from(`${username}:${Date.now()}`).toString("base64");
      return sendJSON(res, 200, {
        status: "success",
        token,
        user: { username, role: "admin" },
      });
    }

    // CUSTOMER REGISTER
    if (req.method === "POST" && pathname === "/api/auth/register") {
      const body = await getBody(req);
      const name = clean(body.name ?? body.fullName);
            const email = clean(body.email).toLowerCase();
      const phone = clean(body.phone).replace(/\D/g, "").slice(0, 10);
      const password = String(body.password || "");

      if (!name || !email || !password) {
        return sendJSON(res, 400, { status: "error", message: "Name, email and password are required" });
      }
      if (!/^\S+@\S+\.\S+$/.test(email)) {
        return sendJSON(res, 400, { status: "error", message: "A valid email is required" });
      }
      if (password.length < 4) {
        return sendJSON(res, 400, { status: "error", message: "Password must be at least 4 characters" });
      }

      const users = readList("users");
      if (users.some((user) => String(user.email || "").toLowerCase() === email)) {
        return sendJSON(res, 409, { status: "error", message: "An account with this email already exists" });
      }

      const user = {
        id: id(),
        name,
        email,
        phone,
        password_hash: hashPassword(password),
        created_at: now(),
      };
      users.push(user);
      saveList("users", users);

      return sendJSON(res, 201, {
        status: "success",
        message: "Account created successfully",
        token: "howdi-customer-" + Buffer.from(`${user.id}:${Date.now()}`).toString("base64"),
        user: { id: user.id, name: user.name, email: user.email, phone: user.phone },
      });
    }

    // CUSTOMER LOGIN
    if (req.method === "POST" && pathname === "/api/auth/login") {
      const body = await getBody(req);
      const identifier = clean(body.email ?? body.phone ?? body.username).toLowerCase();
      const password = String(body.password || "");
      const users = readList("users");
      const user = users.find((item) =>
        String(item.email || "").toLowerCase() === identifier ||
        String(item.phone || "") === identifier.replace(/\D/g, "")
      );

      if (!user || user.password_hash !== hashPassword(password)) {
        return sendJSON(res, 401, { status: "error", message: "Invalid email/phone or password" });
      }

      return sendJSON(res, 200, {
        status: "success",
        token: "howdi-customer-" + Buffer.from(`${user.id}:${Date.now()}`).toString("base64"),
        user: { id: user.id, name: user.name, email: user.email, phone: user.phone },
      });
    }

    // ADDRESS BOOK - GET
    if (req.method === "GET" && pathname === "/api/addresses") {
      const customerId = clean(url.searchParams.get("customer_id") || url.searchParams.get("customerId"));
      if (!customerId) return sendJSON(res, 400, { status: "error", message: "customer_id is required" });
      const addresses = readList("addresses").filter((item) => String(item.customer_id) === customerId);
      return listResponse(res, "addresses", addresses);
    }

    // ADDRESS BOOK - CREATE
    if (req.method === "POST" && pathname === "/api/addresses") {
      const body = await getBody(req);
      const customerId = clean(body.customer_id ?? body.customerId);
      if (!customerId) return sendJSON(res, 400, { status: "error", message: "customer_id is required" });
      const address = normalizeAddress(body);
      const error = validateAddress(address);
      if (error) return sendJSON(res, 400, { status: "error", message: error });

      const addresses = readList("addresses");
      const customerAddresses = addresses.filter((item) => String(item.customer_id) === customerId);
      const isDefault = body.is_default === true || body.isDefault === true || customerAddresses.length === 0;
      if (isDefault) {
        for (const item of addresses) if (String(item.customer_id) === customerId) item.is_default = false;
      }

      const newAddress = {
        id: id(),
        customer_id: customerId,
        ...address,
        is_default: isDefault,
        created_at: now(),
        updated_at: now(),
      };
      addresses.push(newAddress);
      saveList("addresses", addresses);
      return sendJSON(res, 201, { status: "success", message: "Address saved successfully", address: newAddress });
    }

    // ADDRESS BOOK - UPDATE
    if (req.method === "PUT" && pathname.startsWith("/api/addresses/")) {
      const addressId = decodeURIComponent(pathname.replace("/api/addresses/", ""));
      const body = await getBody(req);
      const addresses = readList("addresses");
      const index = addresses.findIndex((item) => String(item.id) === addressId);
      if (index < 0) return sendJSON(res, 404, { status: "error", message: "Address not found" });

      const customerId = clean(body.customer_id ?? body.customerId ?? addresses[index].customer_id);
      if (customerId !== String(addresses[index].customer_id)) {
        return sendJSON(res, 403, { status: "error", message: "Address does not belong to this customer" });
      }

      const updated = { ...addresses[index], ...normalizeAddress(body, addresses[index]) };
      const error = validateAddress(updated);
      if (error) return sendJSON(res, 400, { status: "error", message: error });
      addresses[index] = updated;
      saveList("addresses", addresses);
      return sendJSON(res, 200, { status: "success", message: "Address updated successfully", address: updated });
    }

    // ADDRESS BOOK - DELETE
    if (req.method === "DELETE" && pathname.startsWith("/api/addresses/")) {
      const addressId = decodeURIComponent(pathname.replace("/api/addresses/", ""));
      const customerId = clean(url.searchParams.get("customer_id") || url.searchParams.get("customerId"));
      const addresses = readList("addresses");
      const index = addresses.findIndex((item) => String(item.id) === addressId);
      if (index < 0) return sendJSON(res, 404, { status: "error", message: "Address not found" });
      if (customerId && String(addresses[index].customer_id) !== customerId) {
        return sendJSON(res, 403, { status: "error", message: "Address does not belong to this customer" });
      }
      const deleted = addresses.splice(index, 1)[0];
      const remaining = addresses.filter((item) => String(item.customer_id) === String(deleted.customer_id));
      if (deleted.is_default && remaining.length) remaining[0].is_default = true;
      saveList("addresses", addresses);
      return sendJSON(res, 200, { status: "success", message: "Address deleted successfully", address: deleted });
    }

    // ADDRESS BOOK - SET DEFAULT
    if (req.method === "POST" && pathname.startsWith("/api/addresses/") && pathname.endsWith("/default")) {
      const addressId = decodeURIComponent(pathname.replace("/api/addresses/", "").replace("/default", ""));
      const body = await getBody(req);
      const customerId = clean(body.customer_id ?? body.customerId);
      const addresses = readList("addresses");
      const target = addresses.find((item) => String(item.id) === addressId);
      if (!target) return sendJSON(res, 404, { status: "error", message: "Address not found" });
      if (customerId && String(target.customer_id) !== customerId) {
        return sendJSON(res, 403, { status: "error", message: "Address does not belong to this customer" });
      }
      for (const item of addresses) if (String(item.customer_id) === String(target.customer_id)) item.is_default = String(item.id) === addressId;
      saveList("addresses", addresses);
      return sendJSON(res, 200, { status: "success", message: "Default address updated", address: target });
    }

    // ORDERS - CREATE
    if (req.method === "POST" && pathname === "/api/orders") {
      const body = await getBody(req);
      const customerId = clean(body.customer_id ?? body.customerId);
      const items = Array.isArray(body.items) ? body.items : [];
      if (!customerId) return sendJSON(res, 400, { status: "error", message: "customer_id is required" });
      if (!items.length) return sendJSON(res, 400, { status: "error", message: "At least one order item is required" });

      const orders = readList("orders");
      const order = {
        id: id(),
        order_number: body.order_number || `HOWDI-${Date.now()}`,
        customer_id: customerId,
        items,
        totals: body.totals || body.total || {},
        address: body.address || body.delivery_address || null,
        payment: body.payment || null,
        status: body.status || "PLACED",
        cancellation: null,
        created_at: now(),
        updated_at: now(),
      };
      orders.push(order);
      saveList("orders", orders);
      return sendJSON(res, 201, { status: "success", message: "Order created successfully", order });
    }

    // ORDERS - LIST
    if (req.method === "GET" && pathname === "/api/orders") {
      const customerId = clean(url.searchParams.get("customer_id") || url.searchParams.get("customerId"));
      const orders = readList("orders").filter((item) => !customerId || String(item.customer_id) === customerId)
        .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
      return listResponse(res, "orders", orders);
    }

    // ORDERS - CANCEL
    if (req.method === "POST" && pathname.startsWith("/api/orders/") && pathname.endsWith("/cancel")) {
      const orderId = decodeURIComponent(pathname.replace("/api/orders/", "").replace("/cancel", ""));
      const body = await getBody(req);
      const orders = readList("orders");
      const index = orders.findIndex((item) => String(item.id) === orderId);
      if (index < 0) return sendJSON(res, 404, { status: "error", message: "Order not found" });
      const order = orders[index];
      const customerId = clean(body.customer_id ?? body.customerId);
      if (customerId && String(order.customer_id) !== customerId) return sendJSON(res, 403, { status: "error", message: "Order does not belong to this customer" });
      if (["CANCELLED", "DELIVERED", "RETURNED"].includes(String(order.status).toUpperCase())) {
        return sendJSON(res, 409, { status: "error", message: `Order cannot be cancelled in ${order.status} status` });
      }
      order.status = "CANCELLED";
      order.cancellation = { reason: clean(body.reason, "Cancelled by customer"), cancelled_at: now() };
      order.updated_at = now();
      orders[index] = order;
      saveList("orders", orders);
      return sendJSON(res, 200, { status: "success", message: "Order cancelled successfully", order });
    }

    // ORDERS - SINGLE
    if (req.method === "GET" && pathname.startsWith("/api/orders/")) {
      const orderId = decodeURIComponent(pathname.replace("/api/orders/", ""));
            const order = readList("orders").find((item) => String(item.id) === orderId || String(item.order_number) === orderId);
      if (!order) return sendJSON(res, 404, { status: "error", message: "Order not found" });
      return sendJSON(res, 200, { status: "success", order });
    }

    // ADMIN CATEGORIES - GET
    if (req.method === "GET" && pathname === "/api/admin/categories") {
      const categories = readList("categories").sort((a, b) => clean(a.name).localeCompare(clean(b.name)));
      return listResponse(res, "categories", categories);
    }

    // ADMIN CATEGORIES - CREATE
    if (req.method === "POST" && pathname === "/api/admin/categories") {
      const body = await getBody(req);
      const category = normalizeCategory(body);
      if (!category.name) return sendJSON(res, 400, { status: "error", message: "Category name is required" });
      const categories = readList("categories");
      if (categories.some((item) => clean(item.name).toLowerCase() === category.name.toLowerCase())) {
        return sendJSON(res, 409, { status: "error", message: "A category with this name already exists" });
      }
      const item = { id: id(), ...category, createdAt: now(), updatedAt: now() };
      categories.push(item);
      saveList("categories", categories);
      return sendJSON(res, 201, { status: "success", message: "Category created successfully", category: item });
    }

    // ADMIN CATEGORIES - UPDATE / DELETE
    if (pathname.startsWith("/api/admin/categories/")) {
      const categoryId = decodeURIComponent(pathname.replace("/api/admin/categories/", ""));
      const categories = readList("categories");
      const index = categories.findIndex((item) => String(item.id) === categoryId);

      if (req.method === "PUT") {
        if (index < 0) return sendJSON(res, 404, { status: "error", message: "Category not found" });

        const body = await getBody(req);
        const updated = normalizeCategory(body, categories[index]);

        if (!updated.name) {
          return sendJSON(res, 400, { status: "error", message: "Category name is required" });
        }

        if (categories.some((item, i) =>
          i !== index &&
          clean(item.name).toLowerCase() === updated.name.toLowerCase()
        )) {
          return sendJSON(res, 409, {
            status: "error",
            message: "A category with this name already exists"
          });
        }

        categories[index] = updated;
        saveList("categories", categories);

        return sendJSON(res, 200, {
          status: "success",
          message: "Category updated successfully",
          category: updated
        });
      }

      if (req.method === "DELETE") {
        if (index < 0) return sendJSON(res, 404, {
          status: "error",
          message: "Category not found"
        });

        const hasChildren =
          readList("subcategories").some(
            (item) => String(item.categoryId) === categoryId
          ) ||
          readList("products").some(
            (item) => String(item.categoryId) === categoryId
          );

        if (hasChildren) {
          return sendJSON(res, 409, {
            status: "error",
            message: "This category still contains subcategories or products"
          });
        }

        const deleted = categories.splice(index, 1)[0];
        saveList("categories", categories);

        return sendJSON(res, 200, {
          status: "success",
          message: "Category deleted successfully",
          category: deleted
        });
      }
    }

    // ADMIN SUBCATEGORIES - GET
    if (req.method === "GET" && pathname === "/api/admin/subcategories") {
      const subcategories = readList("subcategories")
        .sort((a, b) => clean(a.name).localeCompare(clean(b.name)));

      return listResponse(res, "subcategories", subcategories);
    }

    // ADMIN SUBCATEGORIES - CREATE
    if (req.method === "POST" && pathname === "/api/admin/subcategories") {
      const body = await getBody(req);
      const subcategory = normalizeSubcategory(body);

      if (!subcategory.categoryId) {
        return sendJSON(res, 400, {
          status: "error",
          message: "Parent category is required"
        });
      }

      if (!subcategory.name) {
        return sendJSON(res, 400, {
          status: "error",
          message: "Subcategory name is required"
        });
      }

      if (!readList("categories").some(
        (item) => String(item.id) === subcategory.categoryId
      )) {
        return sendJSON(res, 400, {
          status: "error",
          message: "Selected parent category does not exist"
        });
      }

      const subcategories = readList("subcategories");

      if (subcategories.some(
        (item) =>
          String(item.categoryId) === subcategory.categoryId &&
          clean(item.name).toLowerCase() === subcategory.name.toLowerCase()
      )) {
        return sendJSON(res, 409, {
          status: "error",
          message: "This subcategory already exists in the selected category"
        });
      }

      const item = {
        id: id(),
        ...subcategory,
        createdAt: now(),
        updatedAt: now()
      };

      subcategories.push(item);
      saveList("subcategories", subcategories);

      return sendJSON(res, 201, {
        status: "success",
        message: "Subcategory created successfully",
        subcategory: item
      });
    }

    // ADMIN SUBCATEGORIES - UPDATE / DELETE
    if (pathname.startsWith("/api/admin/subcategories/")) {
      const subcategoryId = decodeURIComponent(
        pathname.replace("/api/admin/subcategories/", "")
      );

      const subcategories = readList("subcategories");

      const index = subcategories.findIndex(
        (item) => String(item.id) === subcategoryId
      );

      if (req.method === "PUT") {
        if (index < 0) {
          return sendJSON(res, 404, {
            status: "error",
            message: "Subcategory not found"
          });
        }

        const body = await getBody(req);
        const updated = normalizeSubcategory(body, subcategories[index]);

        if (!updated.categoryId || !updated.name) {
          return sendJSON(res, 400, {
            status: "error",
            message: "Parent category and subcategory name are required"
          });
        }

        if (!readList("categories").some(
          (item) => String(item.id) === updated.categoryId
        )) {
          return sendJSON(res, 400, {
            status: "error",
            message: "Selected parent category does not exist"
          });
        }

        if (subcategories.some(
          (item, i) =>
            i !== index &&
            String(item.categoryId) === updated.categoryId &&
            clean(item.name).toLowerCase() === updated.name.toLowerCase()
        )) {
          return sendJSON(res, 409, {
            status: "error",
            message: "This subcategory already exists in the selected category"
          });
        }

        subcategories[index] = updated;
        saveList("subcategories", subcategories);

        return sendJSON(res, 200, {
          status: "success",
          message: "Subcategory updated successfully",
          subcategory: updated
        });
      }

      if (req.method === "DELETE") {
        if (index < 0) {
          return sendJSON(res, 404, {
            status: "error",
            message: "Subcategory not found"
          });
        }

        if (readList("products").some(
          (item) => String(item.subcategoryId) === subcategoryId
        )) {
          return sendJSON(res, 409, {
            status: "error",
            message: "This subcategory still contains products"
          });
        }

        const deleted = subcategories.splice(index, 1)[0];
        saveList("subcategories", subcategories);

        return sendJSON(res, 200, {
          status: "success",
          message: "Subcategory deleted successfully",
          subcategory: deleted
        });
      }
    }

    // ADMIN PRODUCTS - GET
    if (req.method === "GET" && pathname === "/api/admin/products") {
      const products = readList("products")
        .sort(
          (a, b) =>
            new Date(b.updatedAt || 0) -
            new Date(a.updatedAt || 0)
        );

      return listResponse(res, "products", products);
    }

    // ADMIN PRODUCTS - CREATE
    if (req.method === "POST" && pathname === "/api/admin/products") {
      const body = await getBody(req);
      const product = normalizeProduct(body);

      if (!product.name) {
        return sendJSON(res, 400, {
          status: "error",
          message: "Product name is required"
        });
      }

      if (!product.categoryId) {
        return sendJSON(res, 400, {
          status: "error",
          message: "Product category is required"
        });
      }

      if (!readList("categories").some(
        (item) => String(item.id) === product.categoryId
      )) {
        return sendJSON(res, 400, {
          status: "error",
          message: "Selected product category does not exist"
        });
      }

      const products = readList("products");

      const item = {
        id: id(),
        ...product,
        createdAt: now(),
        updatedAt: now()
      };

      products.push(item);
      saveList("products", products);

      return sendJSON(res, 201, {
        status: "success",
        message: "Product created successfully",
        product: item
      });
    }

    // ADMIN PRODUCTS - UPDATE / DELETE
    if (pathname.startsWith("/api/admin/products/")) {
      const productId = decodeURIComponent(
        pathname.replace("/api/admin/products/", "")
      );

      const products = readList("products");

      const index = products.findIndex(
        (item) => String(item.id) === productId
      );

      if (req.method === "PUT") {
        if (index < 0) {
          return sendJSON(res, 404, {
            status: "error",
            message: "Product not found"
          });
        }

        const body = await getBody(req);
        const updated = normalizeProduct(body, products[index]);

        if (!updated.name || !updated.categoryId) {
          return sendJSON(res, 400, {
            status: "error",
            message: "Product name and category are required"
          });
        }

        products[index] = updated;
        saveList("products", products);

        return sendJSON(res, 200, {
          status: "success",
          message: "Product updated successfully",
          product: updated
        });
      }

      if (req.method === "DELETE") {
        if (index < 0) {
          return sendJSON(res, 404, {
            status: "error",
            message: "Product not found"
          });
        }

        const deleted = products.splice(index, 1)[0];
        saveList("products", products);

        return sendJSON(res, 200, {
          status: "success",
          message: "Product deleted successfully",
          product: deleted
        });
      }
    }

    return sendJSON(res, 404, {
      status: "error",
      message: "API endpoint not found"
    });

  } catch (error) {
    console.error("SERVER ROUTE ERROR:", error);

    return sendJSON(res, 500, {
      status: "error",
      message: error.message || "Internal server error"
    });
  }
});

server.on("error", (error) => {
  console.error("SERVER ERROR:", error);

  if (error.code === "EADDRINUSE") {
    console.error(`Port ${PORT} is already in use.`);
  }
});

server.listen(PORT, HOST, () => {
  console.log("=================================");
  console.log("       HOWDI BACKEND RUNNING");
  console.log("=================================");
  console.log(`API:    http://localhost:${PORT}`);
  console.log(`Health: http://localhost:${PORT}/api/health`);
  console.log("=================================");
});