const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PORT = 5000;
const HOST = "127.0.0.1";

const DATA_DIR = path.join(__dirname, "data");
const USERS_FILE = path.join(DATA_DIR, "users.json");
const ORDERS_FILE = path.join(DATA_DIR, "orders.json");
const CATEGORIES_FILE = path.join(DATA_DIR, "categories.json");
const SUBCATEGORIES_FILE = path.join(DATA_DIR, "subcategories.json");
const PRODUCTS_FILE = path.join(DATA_DIR, "products.json");
const ADMIN_USER = process.env.HOWDI_ADMIN_USER || "admin";
const ADMIN_PASSWORD = process.env.HOWDI_ADMIN_PASSWORD || "HOWDI@2026";
const ADMIN_TOKEN = process.env.HOWDI_ADMIN_TOKEN || "howdi-local-admin-token";

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

if (!fs.existsSync(USERS_FILE)) {
  fs.writeFileSync(USERS_FILE, "[]", "utf8");
}

if (!fs.existsSync(ORDERS_FILE)) {
  fs.writeFileSync(ORDERS_FILE, "[]", "utf8");
}

if (!fs.existsSync(CATEGORIES_FILE)) { fs.writeFileSync(CATEGORIES_FILE, "[]", "utf8"); }
if (!fs.existsSync(SUBCATEGORIES_FILE)) { fs.writeFileSync(SUBCATEGORIES_FILE, "[]", "utf8"); }
if (!fs.existsSync(PRODUCTS_FILE)) { fs.writeFileSync(PRODUCTS_FILE, "[]", "utf8"); }

function readUsers() {
  try {
    return JSON.parse(fs.readFileSync(USERS_FILE, "utf8"));
  } catch (error) {
    return [];
  }
}

function saveUsers(users) {
  fs.writeFileSync(
    USERS_FILE,
    JSON.stringify(users, null, 2),
    "utf8"
  );
}

function readOrders() {
  try {
    const data = JSON.parse(
      fs.readFileSync(ORDERS_FILE, "utf8")
    );

    return Array.isArray(data) ? data : [];
  } catch (error) {
    return [];
  }
}

function saveOrders(orders) {
  fs.writeFileSync(
    ORDERS_FILE,
    JSON.stringify(orders, null, 2),
    "utf8"
  );
}

function readJSONFile(file) {
  try { const data = JSON.parse(fs.readFileSync(file, "utf8")); return Array.isArray(data) ? data : []; }
  catch (error) { return []; }
}
function writeJSONFile(file, data) { fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf8"); }
function readCategories() { return readJSONFile(CATEGORIES_FILE); }
function saveCategories(items) { writeJSONFile(CATEGORIES_FILE, items); }
function readSubcategories() { return readJSONFile(SUBCATEGORIES_FILE); }
function saveSubcategories(items) { writeJSONFile(SUBCATEGORIES_FILE, items); }
function readProducts() { return readJSONFile(PRODUCTS_FILE); }
function saveProducts(items) { writeJSONFile(PRODUCTS_FILE, items); }
function isAdmin(req) { const token = String(req.headers["x-howdi-admin-token"] || "").trim(); return Boolean(token && token === ADMIN_TOKEN); }
function slugify(value) { return String(value || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""); }
function visibleCatalogueProducts() {
  const categories = readCategories(); const subcategories = readSubcategories();
  const categoryMap = new Map(categories.map((c) => [String(c.id), c]));
  const subcategoryMap = new Map(subcategories.map((s) => [String(s.id), s]));
  return readProducts().filter((product) => {
    if (product.visible === false) return false;
    const category = categoryMap.get(String(product.categoryId));
    if (category && category.visible === false) return false;
    const subcategory = product.subcategoryId ? subcategoryMap.get(String(product.subcategoryId)) : null;
    if (subcategory && subcategory.visible === false) return false;
    return true;
  });
}

function sendJSON(res, statusCode, data) {
  const body = JSON.stringify(data);

  res.writeHead(statusCode, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "http://localhost:5173",
    "Access-Control-Allow-Methods":
      "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, x-howdi-admin-token",
  });

  res.end(body);
}

function getRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";

    req.on("data", (chunk) => {
      body += chunk.toString();

      if (body.length > 1024 * 1024) {
        reject(new Error("Request too large"));
        req.destroy();
      }
    });

    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(new Error("Invalid JSON"));
      }
    });

    req.on("error", reject);
  });
}

function hashPassword(password) {
  return crypto
    .createHash("sha256")
    .update(password)
    .digest("hex");
}

const server = http.createServer(async (req, res) => {

  // ==========================================
  // CORS
  // ==========================================

  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin":
        "http://localhost:5173",
      "Access-Control-Allow-Methods":
        "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers":
        "Content-Type",
    });

    res.end();
    return;
  }

  console.log(`${req.method} ${req.url}`);


  // ==========================================
  // HEALTH CHECK
  // ==========================================

  if (
    req.method === "GET" &&
    req.url === "/api/health"
  ) {
    sendJSON(res, 200, {
      status: "ok",
      message: "HOWDI backend is running",
    });

    return;
  }


  // ==========================================
  // REGISTER
  // ==========================================

  if (
    req.method === "POST" &&
    req.url === "/api/auth/register"
  ) {
    try {
      const body = await getRequestBody(req);

      const name = String(
        body.name ||
        body.fullName ||
        body.full_name ||
        ""
      ).trim();

      const email = String(
        body.email || ""
      ).trim().toLowerCase();

      const phone = String(
        body.phone || ""
      ).trim();

      const password = String(
        body.password || ""
      );

      if (!name) {
        sendJSON(res, 400, {
          status: "error",
          message: "Name is required",
        });

        return;
      }

      if (!phone) {
        sendJSON(res, 400, {
          status: "error",
          message: "Mobile number is required",
        });

        return;
      }

      if (!password) {
        sendJSON(res, 400, {
          status: "error",
          message: "Password is required",
        });

        return;
      }

      const users = readUsers();

      const existingUser = users.find(
        (user) => user.phone === phone
      );

      if (existingUser) {
        sendJSON(res, 409, {
          status: "error",
          message:
            "Mobile number already registered",
        });

        return;
      }

      const user = {
        id: crypto.randomUUID(),

        name,

        email:
          email ||
          `${phone}@howdi.local`,

        phone,

        password:
          hashPassword(password),

        createdAt:
          new Date().toISOString(),
      };

      users.push(user);

      saveUsers(users);

      sendJSON(res, 201, {
        status: "success",
        message:
          "Account created successfully",

        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
        },
      });

      return;

    } catch (error) {

      console.error(
        "REGISTER ERROR:",
        error
      );

      sendJSON(res, 500, {
        status: "error",
        message: "Unable to register",
      });

      return;
    }
  }


  // ==========================================
  // LOGIN
  // ==========================================

  if (
    req.method === "POST" &&
    req.url === "/api/auth/login"
  ) {
    try {

      const body =
        await getRequestBody(req);

      const phone = String(
        body.phone || ""
      ).trim();

      const password = String(
        body.password || ""
      );

      if (!phone || !password) {

        sendJSON(res, 400, {
          status: "error",
          message:
            "Mobile number and password are required",
        });

        return;
      }

      const users = readUsers();

      const user = users.find(
        (item) =>
          item.phone === phone
      );

      if (!user) {

        sendJSON(res, 401, {
          status: "error",
          message: "Account not found",
        });

        return;
      }

      const passwordHash =
        hashPassword(password);

      if (
        user.password !== passwordHash
      ) {

        sendJSON(res, 401, {
          status: "error",
          message:
            "Invalid mobile number or password",
        });

        return;
      }

      sendJSON(res, 200, {
        status: "success",
        message: "Login successful",

        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
        },
      });

      return;

    } catch (error) {

      console.error(
        "LOGIN ERROR:",
        error
      );

      sendJSON(res, 500, {
        status: "error",
        message: "Unable to login",
      });

      return;
    }
  }


  // ==========================================
  // CUSTOMER ORDERS
  // ==========================================


  // ==========================================
  // CREATE ORDER
  // POST /api/orders
  // ==========================================

  if (
    req.method === "POST" &&
    req.url === "/api/orders"
  ) {

    try {

      const body =
        await getRequestBody(req);

      const customer_id =
        String(
          body.customer_id ||
          body.customerId ||
          ""
        ).trim();

      const items =
        Array.isArray(body.items)
          ? body.items
          : [];

      if (!customer_id) {

        sendJSON(res, 400, {
          status: "error",
          message:
            "customer_id is required",
        });

        return;
      }

      if (!items.length) {

        sendJSON(res, 400, {
          status: "error",
          message:
            "At least one order item is required",
        });

        return;
      }

      // ------------------------------------------
      // VALIDATE ORDER AMOUNT
      // ------------------------------------------

      const amount =
        Number(
          body.amount ??
          body.total_amount ??
          0
        );

      if (
        !Number.isFinite(amount) ||
        amount < 0
      ) {

        sendJSON(res, 400, {
          status: "error",
          message:
            "A valid non-negative order amount is required",
        });

        return;
      }


      // ------------------------------------------
      // VALIDATE PAYMENT METHOD
      // ------------------------------------------

      const paymentMethod =
        String(
          body.payment_method ||
          "COD"
        )
          .trim()
          .toUpperCase();

      const allowedPaymentMethods = [
        "COD",
        "UPI",
        "CARD",
        "SAVED",
      ];

      if (
        !allowedPaymentMethods.includes(
          paymentMethod
        )
      ) {

        sendJSON(res, 400, {
          status: "error",
          message:
            "Invalid payment method",
        });

        return;
      }


      // ------------------------------------------
      // VALIDATE DELIVERY ADDRESS
      // ------------------------------------------

      const address =
        body.address &&
        typeof body.address === "object"
          ? body.address
          : null;

      const pincode =
        String(
          address?.pincode || ""
        ).replace(/\D/g, "");

      if (
        !address ||
        !/^[1-9][0-9]{5}$/.test(pincode)
      ) {

        sendJSON(res, 400, {
          status: "error",
          message:
            "A valid delivery address with 6-digit pincode is required",
        });

        return;
      }


      const now =
        new Date().toISOString();


      // ------------------------------------------
      // ORDER NUMBER
      // ------------------------------------------

      const orderNumber =
        String(
          body.order_number || ""
        ).trim() ||
        `HD${String(
          Date.now()
        ).slice(-8)}`;


      // ------------------------------------------
      // TRACKING NUMBER
      // ------------------------------------------

      const trackingNumber =
        String(
          body.tracking_number || ""
        ).trim() ||
        `HOWDI${String(
          Date.now()
        ).slice(-10)}`;


      // ------------------------------------------
      // ITEM COUNT
      // ------------------------------------------

      const itemCount =
        Number(body.item_count) ||
        items.reduce(
          (sum, item) =>
            sum +
            (
              Number(
                item?.quantity
              ) || 1
            ),
          0
        );


      // ==========================================
      // BUILD ORDER
      // ==========================================

      const order = {

        id:
          crypto.randomUUID(),

        order_number:
          orderNumber,

        customer_id,

        title:
          String(
            body.title ||
            (
              items.length === 1
                ? items[0]?.name ||
                  "HOWDI Order"
                : `${items[0]?.name ||
                    "HOWDI"} + ${
                    items.length - 1
                  } more`
            )
          ),

        shop:
          String(
            body.shop ||
            items[0]?.shop ||
            "HOWDI Marketplace"
          ),

        amount,

        total:
          String(
            body.total ||
            `₹${amount.toLocaleString(
              "en-IN"
            )}`
          ),

        item_count:
          itemCount,

        items,

        status:
          String(
            body.status ||
            "confirmed"
          ),

        created_at:
          String(
            body.created_at ||
            now
          ),

        updated_at:
          now,

        payment_method:
          paymentMethod,

        payment_status:
          String(
            body.payment_status ||
            "pending"
          ),

        address: {
          ...address,
          pincode,
        },

        delivery_option:
          String(
            body.delivery_option ||
            "STANDARD"
          ),

        estimated_delivery:
          String(
            body.estimated_delivery ||
            "3–6 days"
          ),

        tracking_number:
          trackingNumber,

        coupon:
          String(
            body.coupon || ""
          ),

        subtotal:
          Number(
            body.subtotal || 0
          ),

        discount:
          Number(
            body.discount || 0
          ),

        delivery_charge:
          Number(
            body.delivery_charge || 0
          ),

        tax:
          Number(
            body.tax || 0
          ),

        wallet_used:
          Number(
            body.wallet_used || 0
          ),

        rewards_used:
          Number(
            body.rewards_used || 0
          ),

        maker_note:
          String(
            body.maker_note ||
            "Your piece will receive a final handmade quality check before dispatch."
          ),

        cancellation:
          null,

        timeline: [
          {
            label:
              "Order confirmed",

            date:
              now,

            note:
              "Your order has been received.",
          },
        ],
      };


      // ==========================================
      // SAVE ORDER
      // ==========================================

      const orders =
        readOrders();

      orders.unshift(order);

      saveOrders(orders);


      // ==========================================
      // RESPONSE
      // ==========================================

      sendJSON(res, 201, {

        status:
          "success",

        message:
          "Order created successfully",

        order,
      });

      return;

    } catch (error) {

      console.error(
        "CREATE ORDER ERROR:",
        error
      );

      sendJSON(res, 500, {
        status: "error",
        message:
          "Unable to create order",
      });

      return;
    }
  }


  // ==========================================
  // GET CUSTOMER ORDERS
  // GET /api/orders?customer_id=...
  // ==========================================

  if (
    req.method === "GET" &&
    (
      req.url === "/api/orders" ||
      req.url.startsWith(
        "/api/orders?"
      )
    )
  ) {

    try {

      const requestUrl =
        new URL(
          req.url,
          `http://${HOST}:${PORT}`
        );

      const customerId =
        String(
          requestUrl.searchParams.get(
            "customer_id"
          ) ||
          requestUrl.searchParams.get(
            "customerId"
          ) ||
          ""
        ).trim();

      if (!customerId) {

        sendJSON(res, 400, {
          status: "error",
          message:
            "customer_id is required",
        });

        return;
      }

      const orders =
        readOrders();

      const customerOrders =
        orders
          .filter(
            (order) =>
              String(
                order.customer_id
              ) === customerId
          )
          .sort(
            (a, b) =>
              new Date(
                b.created_at || 0
              ) -
              new Date(
                a.created_at || 0
              )
          );

      sendJSON(res, 200, {

        status:
          "success",

        orders:
          customerOrders,

        count:
          customerOrders.length,
      });

      return;

    } catch (error) {

      console.error(
        "GET ORDERS ERROR:",
        error
      );

      sendJSON(res, 500, {
        status: "error",
        message:
          "Unable to load orders",
      });

      return;
    }
  }


  // ==========================================
  // GET SINGLE ORDER
  // GET /api/orders/:id
  // ==========================================

  if (
    req.method === "GET" &&
    req.url.startsWith(
      "/api/orders/"
    )
  ) {

    try {

      const id =
        decodeURIComponent(
          req.url
            .split("?")[0]
            .replace(
              "/api/orders/",
              ""
            )
        );

      if (
        id.endsWith(
          "/cancel"
        )
      ) {

        sendJSON(res, 405, {
          status: "error",
          message:
            "Use POST to cancel an order",
        });

        return;
      }

      const orders =
        readOrders();

      const order =
        orders.find(
          (item) =>
            String(item.id) === id ||
            String(
              item.order_number
            ) === id
        );

      if (!order) {

        sendJSON(res, 404, {
          status: "error",
          message:
            "Order not found",
        });

        return;
      }

      sendJSON(res, 200, {

        status:
          "success",

        order,
      });

      return;

    } catch (error) {

      console.error(
        "GET ORDER ERROR:",
        error
      );

      sendJSON(res, 500, {
        status: "error",
        message:
          "Unable to load order",
      });

      return;
    }
  }


  // ==========================================
  // CANCEL ORDER
  // POST /api/orders/:id/cancel
  // ==========================================

  if (
    req.method === "POST" &&
    req.url.startsWith(
      "/api/orders/"
    ) &&
    req.url.endsWith(
      "/cancel"
    )
  ) {

    try {

      const id =
        decodeURIComponent(
          req.url
            .split("?")[0]
            .replace(
              "/api/orders/",
              ""
            )
            .replace(
              "/cancel",
              ""
            )
        );

      const body =
        await getRequestBody(req);

      const orders =
        readOrders();

      const index =
        orders.findIndex(
          (item) =>
            String(item.id) === id ||
            String(
              item.order_number
            ) === id
        );

      if (index < 0) {

        sendJSON(res, 404, {
          status: "error",
          message:
            "Order not found",
        });

        return;
      }

      const current =
        orders[index];

      const currentStatus =
        String(
          current.status || ""
        ).toLowerCase();

      if (
        [
          "delivered",
          "cancelled",
          "canceled",
        ].includes(
          currentStatus
        )
      ) {

        sendJSON(res, 409, {
          status: "error",
          message:
            "This order cannot be cancelled",
          order:
            current,
        });

        return;
      }

      const now =
        new Date().toISOString();

      const cancellation = {

        status:
          "Cancelled",

        actor:
          String(
            body.actor ||
            "Customer"
          ),

        reason:
          String(
            body.reason ||
            "Other"
          ),

        details:
          String(
            body.details ||
            "Order cancelled by customer."
          ),

        date:
          now,

        refundStatus:
          "Refund initiated",
      };

      orders[index] = {

        ...current,

        status:
          "cancelled",

        updated_at:
          now,

        cancellation,

        timeline: [

          ...(
            Array.isArray(
              current.timeline
            )
              ? current.timeline
              : []
          ),

          {

            label:
              "Cancelled",

            date:
              now,

            note:
              cancellation.details,
          },
        ],
      };

      saveOrders(orders);

      sendJSON(res, 200, {

        status:
          "success",

        message:
          "Order cancelled successfully",

        order:
          orders[index],
      });

      return;

    } catch (error) {

      console.error(
        "CANCEL ORDER ERROR:",
        error
      );

      sendJSON(res, 500, {
        status: "error",
        message:
          "Unable to cancel order",
      });

      return;
    }
  }

// ==========================================
// ADMIN + CUSTOMER CATALOGUE
// ==========================================
if (req.method === "POST" && req.url === "/api/admin/login") {
  try {
    const body = await getRequestBody(req); const username = String(body.username || "").trim(); const password = String(body.password || "");
    if (username !== ADMIN_USER || password !== ADMIN_PASSWORD) { sendJSON(res, 401, { status: "error", message: "Invalid admin credentials" }); return; }
    sendJSON(res, 200, { status: "success", token: ADMIN_TOKEN, admin: { username } }); return;
  } catch (error) { sendJSON(res, 500, { status: "error", message: "Unable to login as admin" }); return; }
}
if (req.method === "GET" && req.url === "/api/catalog/categories") { sendJSON(res, 200, { status: "success", categories: readCategories().filter((c) => c.visible !== false) }); return; }
if (req.method === "GET" && req.url.startsWith("/api/catalog/subcategories")) {
  const requestUrl = new URL(req.url, `http://${HOST}:${PORT}`); const categoryId = String(requestUrl.searchParams.get("category_id") || "").trim();
  let items = readSubcategories().filter((s) => s.visible !== false); if (categoryId) items = items.filter((s) => String(s.categoryId) === categoryId);
  sendJSON(res, 200, { status: "success", subcategories: items }); return;
}
if (req.method === "GET" && req.url === "/api/products") {
  const requestUrl = new URL(req.url, `http://${HOST}:${PORT}`); let items = visibleCatalogueProducts();
  const q = String(requestUrl.searchParams.get("q") || "").trim().toLowerCase(); const categoryId = String(requestUrl.searchParams.get("category_id") || "").trim(); const subcategoryId = String(requestUrl.searchParams.get("subcategory_id") || "").trim();
  if (q) items = items.filter((p) => `${p.name} ${p.category} ${p.subcategory} ${p.artisan || ""}`.toLowerCase().includes(q));
  if (categoryId) items = items.filter((p) => String(p.categoryId) === categoryId); if (subcategoryId) items = items.filter((p) => String(p.subcategoryId) === subcategoryId);
  sendJSON(res, 200, { status: "success", products: items, count: items.length }); return;
}
if (req.url.startsWith("/api/admin/categories")) {
  if (!isAdmin(req)) { sendJSON(res, 401, { status: "error", message: "Admin authorization required" }); return; }
  if (req.method === "GET" && req.url === "/api/admin/categories") { sendJSON(res, 200, { status: "success", categories: readCategories() }); return; }
  if (req.method === "POST" && req.url === "/api/admin/categories") {
    const body = await getRequestBody(req); const name = String(body.name || "").trim(); if (!name) { sendJSON(res, 400, { status: "error", message: "Category name is required" }); return; }
    const items = readCategories(); if (items.some((c) => c.name.toLowerCase() === name.toLowerCase())) { sendJSON(res, 409, { status: "error", message: "Category already exists" }); return; }
    const record = { id: crypto.randomUUID(), name, slug: slugify(name), icon: String(body.icon || "🧶"), description: String(body.description || "").trim(), sortOrder: Number(body.sortOrder) || items.length + 1, visible: body.visible !== false, showOnHome: body.showOnHome !== false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    items.push(record); saveCategories(items); sendJSON(res, 201, { status: "success", category: record }); return;
  }
  if (req.method === "PUT" && req.url.startsWith("/api/admin/categories/")) {
    const id = decodeURIComponent(req.url.split("?")[0].replace("/api/admin/categories/", "")); const body = await getRequestBody(req); const items = readCategories(); const index = items.findIndex((c) => String(c.id) === id);
    if (index < 0) { sendJSON(res, 404, { status: "error", message: "Category not found" }); return; }
    const current = items[index]; const name = String(body.name ?? current.name).trim(); if (!name) { sendJSON(res, 400, { status: "error", message: "Category name is required" }); return; }
    items[index] = { ...current, ...body, id: current.id, name, slug: slugify(name), visible: body.visible !== undefined ? Boolean(body.visible) : current.visible, showOnHome: body.showOnHome !== undefined ? Boolean(body.showOnHome) : current.showOnHome, updatedAt: new Date().toISOString() };
    saveCategories(items); sendJSON(res, 200, { status: "success", category: items[index] }); return;
  }
}
if (req.url.startsWith("/api/admin/subcategories")) {
  if (!isAdmin(req)) { sendJSON(res, 401, { status: "error", message: "Admin authorization required" }); return; }
  if (req.method === "GET" && req.url === "/api/admin/subcategories") { sendJSON(res, 200, { status: "success", subcategories: readSubcategories() }); return; }
  if (req.method === "POST" && req.url === "/api/admin/subcategories") {
    const body = await getRequestBody(req); const name = String(body.name || "").trim(); const categoryId = String(body.categoryId || "").trim();
    if (!name || !categoryId) { sendJSON(res, 400, { status: "error", message: "Subcategory name and category are required" }); return; }
    const categories = readCategories(); if (!categories.some((c) => String(c.id) === categoryId)) { sendJSON(res, 400, { status: "error", message: "Parent category not found" }); return; }
    const items = readSubcategories(); if (items.some((s) => String(s.categoryId) === categoryId && s.name.toLowerCase() === name.toLowerCase())) { sendJSON(res, 409, { status: "error", message: "Subcategory already exists" }); return; }
    const record = { id: crypto.randomUUID(), categoryId, name, slug: slugify(name), icon: String(body.icon || "🧶"), sortOrder: Number(body.sortOrder) || items.filter((s) => String(s.categoryId) === categoryId).length + 1, visible: body.visible !== false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    items.push(record); saveSubcategories(items); sendJSON(res, 201, { status: "success", subcategory: record }); return;
  }
  if (req.method === "PUT" && req.url.startsWith("/api/admin/subcategories/")) {
    const id = decodeURIComponent(req.url.split("?")[0].replace("/api/admin/subcategories/", "")); const body = await getRequestBody(req); const items = readSubcategories(); const index = items.findIndex((s) => String(s.id) === id);
    if (index < 0) { sendJSON(res, 404, { status: "error", message: "Subcategory not found" }); return; }
    const current = items[index]; const name = String(body.name ?? current.name).trim(); const categoryId = String(body.categoryId ?? current.categoryId).trim(); if (!name || !categoryId) { sendJSON(res, 400, { status: "error", message: "Subcategory name and category are required" }); return; }
    items[index] = { ...current, ...body, id: current.id, name, categoryId, slug: slugify(name), visible: body.visible !== undefined ? Boolean(body.visible) : current.visible, updatedAt: new Date().toISOString() };
    saveSubcategories(items); sendJSON(res, 200, { status: "success", subcategory: items[index] }); return;
  }
}
if (req.url.startsWith("/api/admin/products")) {
  if (!isAdmin(req)) { sendJSON(res, 401, { status: "error", message: "Admin authorization required" }); return; }
  if (req.method === "GET" && req.url === "/api/admin/products") { sendJSON(res, 200, { status: "success", products: readProducts() }); return; }
  if (req.method === "PUT" && req.url.startsWith("/api/admin/products/")) {
    const id = decodeURIComponent(req.url.split("?")[0].replace("/api/admin/products/", "")); const body = await getRequestBody(req); const items = readProducts(); const index = items.findIndex((p) => String(p.id) === id);
    if (index < 0) { sendJSON(res, 404, { status: "error", message: "Product not found" }); return; }
    items[index] = { ...items[index], visible: body.visible !== undefined ? Boolean(body.visible) : items[index].visible, categoryId: body.categoryId ?? items[index].categoryId, subcategoryId: body.subcategoryId ?? items[index].subcategoryId, updatedAt: new Date().toISOString() };
    saveProducts(items); sendJSON(res, 200, { status: "success", product: items[index] }); return;
  }
}

// ==========================================
// MOST PURCHASED PRODUCTS
// GET /api/products/most-purchased
// ==========================================

if (
  req.method === "GET" &&
  req.url === "/api/products/most-purchased"
) {
  try {
    const orders = readOrders();

    const purchaseCounts = {};

    orders.forEach((order) => {
      const status = String(order?.status || "").toLowerCase();

      // Cancelled orders must not count
      if (status === "cancelled" || status === "canceled") {
        return;
      }

      const items = Array.isArray(order?.items)
        ? order.items
        : [];

      items.forEach((item) => {
        const name = String(item?.name || "").trim();

        if (!name) return;

        const quantity =
          Number(item?.quantity) || 1;

        purchaseCounts[name] =
          (purchaseCounts[name] || 0) + quantity;
      });
    });

    const products = Object.entries(purchaseCounts)
      .map(([name, purchasedCount]) => ({
        name,
        purchasedCount,
      }))
      .sort(
        (a, b) =>
          b.purchasedCount -
          a.purchasedCount
      )
      .slice(0, 10);

    sendJSON(res, 200, {
      status: "success",
      products,
    });

    return;
  } catch (error) {
    console.error(
      "MOST PURCHASED ERROR:",
      error
    );

    sendJSON(res, 500, {
      status: "error",
      message:
        "Unable to load most purchased products",
    });

    return;
  }
}
  // ==========================================
  // 404
  // ==========================================

  sendJSON(res, 404, {

    status:
      "error",

    message:
      "API endpoint not found",
  });
});


server.on(
  "error",
  (error) => {

    console.error(
      "SERVER ERROR:",
      error
    );

    if (
      error.code ===
      "EADDRINUSE"
    ) {

      console.error(
        `Port ${PORT} is already in use.`
      );
    }
  }
);


server.listen(
  PORT,
  HOST,
  () => {

    console.log("");

    console.log(
      "================================="
    );

    console.log(
      "       HOWDI BACKEND RUNNING"
    );

    console.log(
      "================================="
    );

    console.log(
      `API:    http://localhost:${PORT}`
    );

    console.log(
      `Health: http://localhost:${PORT}/api/health`
    );

    console.log(
      `Orders: http://localhost:${PORT}/api/orders`
    );

    console.log(
      "================================="
    );

    console.log("");
  }
);