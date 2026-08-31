const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PORT = 5000;
const HOST = "127.0.0.1";

const DATA_DIR = path.join(__dirname, "data");
const USERS_FILE = path.join(DATA_DIR, "users.json");
const ORDERS_FILE = path.join(DATA_DIR, "orders.json");
const ADDRESSES_FILE = path.join(DATA_DIR, "addresses.json");

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

if (!fs.existsSync(USERS_FILE)) {
  fs.writeFileSync(USERS_FILE, "[]", "utf8");
}

if (!fs.existsSync(ORDERS_FILE)) {
  fs.writeFileSync(ORDERS_FILE, "[]", "utf8");
}

if (!fs.existsSync(ADDRESSES_FILE)) {
  fs.writeFileSync(ADDRESSES_FILE, "[]", "utf8");
}

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

function readAddresses() {
  try {
    const data = JSON.parse(
      fs.readFileSync(ADDRESSES_FILE, "utf8")
    );

    return Array.isArray(data) ? data : [];
  } catch (error) {
    return [];
  }
}

function saveAddresses(addresses) {
  fs.writeFileSync(
    ADDRESSES_FILE,
    JSON.stringify(addresses, null, 2),
    "utf8"
  );
}

function normalizeAddress(body, existing = {}) {
  const pincode = String(
    body.pincode ?? existing.pincode ?? ""
  )
    .replace(/\D/g, "")
    .slice(0, 6);

  return {
    ...existing,

    label:
      String(
        body.label ??
        existing.label ??
        "Home"
      ).trim() || "Other",

    full_name:
      String(
        body.full_name ??
        body.fullName ??
        existing.full_name ??
        ""
      ).trim(),

    phone:
      String(
        body.phone ??
        existing.phone ??
        ""
      )
        .replace(/\D/g, "")
        .slice(0, 10),

    address_line1:
      String(
        body.address_line1 ??
        body.addressLine1 ??
        existing.address_line1 ??
        ""
      ).trim(),

    address_line2:
      String(
        body.address_line2 ??
        body.addressLine2 ??
        existing.address_line2 ??
        ""
      ).trim(),

    city:
      String(
        body.city ??
        existing.city ??
        ""
      ).trim(),

    state:
      String(
        body.state ??
        existing.state ??
        ""
      ).trim(),

    pincode,

    updated_at:
      new Date().toISOString(),
  };
}

function validateAddress(address) {
  if (!address.full_name) {
    return "Full name is required";
  }

  if (!/^[0-9]{10}$/.test(address.phone)) {
    return "A valid 10-digit mobile number is required";
  }

  if (!address.address_line1) {
    return "Address line 1 is required";
  }

  if (!address.city) {
    return "City is required";
  }

  if (!address.state) {
    return "State is required";
  }

  if (!/^[1-9][0-9]{5}$/.test(address.pincode)) {
    return "A valid 6-digit pincode is required";
  }

  return null;
}

function sendJSON(res, statusCode, data) {
  const body = JSON.stringify(data);

  res.writeHead(statusCode, {
    "Content-Type": "application/json",

    "Access-Control-Allow-Origin":
      "http://localhost:5173",

    "Access-Control-Allow-Methods":
      "GET,POST,PUT,DELETE,OPTIONS",

    "Access-Control-Allow-Headers":
      "Content-Type",
  });

  res.end(body);
}

function getRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";

    req.on("data", (chunk) => {
      body += chunk.toString();

      if (body.length > 1024 * 1024) {
        reject(
          new Error("Request too large")
        );

        req.destroy();
      }
    });

    req.on("end", () => {
      try {
        resolve(
          body
            ? JSON.parse(body)
            : {}
        );
      } catch (error) {
        reject(
          new Error("Invalid JSON")
        );
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

const server = http.createServer(
  async (req, res) => {

    // ==========================================
    // CORS
    // ==========================================

    if (req.method === "OPTIONS") {
      res.writeHead(204, {
        "Access-Control-Allow-Origin":
          "http://localhost:5173",

        "Access-Control-Allow-Methods":
          "GET,POST,PUT,DELETE,OPTIONS",

        "Access-Control-Allow-Headers":
          "Content-Type",
      });

      res.end();
      return;
    }

    console.log(
      `${req.method} ${req.url}`
    );


    // ==========================================
    // HEALTH CHECK
    // ==========================================

    if (
      req.method === "GET" &&
      req.url === "/api/health"
    ) {

      sendJSON(res, 200, {
        status: "ok",
        message:
          "HOWDI backend is running",
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

        const body =
          await getRequestBody(req);

        const name =
          String(
            body.name ||
            body.fullName ||
            body.full_name ||
            ""
          ).trim();

        const email =
          String(
            body.email || ""
          )
            .trim()
            .toLowerCase();

        const phone =
          String(
            body.phone || ""
          ).trim();

        const password =
          String(
            body.password || ""
          );

        if (!name) {

          sendJSON(res, 400, {
            status: "error",
            message:
              "Name is required",
          });

          return;
        }

        if (!phone) {

          sendJSON(res, 400, {
            status: "error",
            message:
              "Mobile number is required",
          });

          return;
        }

        if (!password) {

          sendJSON(res, 400, {
            status: "error",
            message:
              "Password is required",
          });

          return;
        }

        const users =
          readUsers();

        const existingUser =
          users.find(
            (user) =>
              user.phone === phone
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

          id:
            crypto.randomUUID(),

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

          status:
            "success",

          message:
            "Account created successfully",

          user: {

            id:
              user.id,

            name:
              user.name,

            email:
              user.email,

            phone:
              user.phone,
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
          message:
            "Unable to register",
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

        const phone =
          String(
            body.phone || ""
          ).trim();

        const password =
          String(
            body.password || ""
          );

        if (
          !phone ||
          !password
        ) {

          sendJSON(res, 400, {
            status: "error",
            message:
              "Mobile number and password are required",
          });

          return;
        }

        const users =
          readUsers();

        const user =
          users.find(
            (item) =>
              item.phone === phone
          );

        if (!user) {

          sendJSON(res, 401, {
            status: "error",
            message:
              "Account not found",
          });

          return;
        }

        const passwordHash =
          hashPassword(password);

        if (
          user.password !==
          passwordHash
        ) {

          sendJSON(res, 401, {
            status: "error",
            message:
              "Invalid mobile number or password",
          });

          return;
        }

        sendJSON(res, 200, {

          status:
            "success",

          message:
            "Login successful",

          user: {

            id:
              user.id,

            name:
              user.name,

            email:
              user.email,

            phone:
              user.phone,
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
          message:
            "Unable to login",
        });

        return;
      }
    }


    // ==========================================
    // CUSTOMER ADDRESS BOOK
    // ==========================================

    // GET /api/addresses?customer_id=...

    if (
      req.method === "GET" &&
      (
        req.url ===
          "/api/addresses" ||
        req.url.startsWith(
          "/api/addresses?"
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

        const addresses =
          readAddresses()
            .filter(
              (address) =>
                String(
                  address.customer_id
                ) === customerId
            )
            .sort(
              (a, b) =>
                Number(
                  Boolean(
                    b.is_default
                  )
                ) -
                Number(
                  Boolean(
                    a.is_default
                  )
                ) ||
                new Date(
                  b.updated_at || 0
                ) -
                new Date(
                  a.updated_at || 0
                )
            );

        sendJSON(res, 200, {

          status:
            "success",

          addresses,

          count:
            addresses.length,
        });

        return;

      } catch (error) {

        console.error(
          "GET ADDRESSES ERROR:",
          error
        );

        sendJSON(res, 500, {
          status: "error",
          message:
            "Unable to load addresses",
        });

        return;
      }
    }


    // ==========================================
    // CREATE ADDRESS
    // POST /api/addresses
    // ==========================================

    if (
      req.method === "POST" &&
      req.url === "/api/addresses"
    ) {

      try {

        const body =
          await getRequestBody(req);

        const customerId =
          String(
            body.customer_id ||
            body.customerId ||
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

        const address =
          normalizeAddress(body);

        const validationError =
          validateAddress(address);

        if (validationError) {

          sendJSON(res, 400, {
            status: "error",
            message:
              validationError,
          });

          return;
        }

        const addresses =
          readAddresses();

        const customerAddresses =
          addresses.filter(
            (item) =>
              String(
                item.customer_id
              ) === customerId
          );

        const isDefault =
          customerAddresses.length === 0 ||
          Boolean(body.is_default);

        const newAddress = {

          id:
            crypto.randomUUID(),

          customer_id:
            customerId,

          ...address,

          is_default:
            isDefault,

          created_at:
            new Date().toISOString(),
        };

        if (isDefault) {

          for (
            const item of addresses
          ) {

            if (
              String(
                item.customer_id
              ) === customerId
            ) {

              item.is_default =
                false;
            }
          }
        }

        addresses.unshift(
          newAddress
        );

        saveAddresses(
          addresses
        );

        sendJSON(res, 201, {

          status:
            "success",

          message:
            "Address saved successfully",

          address:
            newAddress,
        });

        return;

      } catch (error) {

        console.error(
          "CREATE ADDRESS ERROR:",
          error
        );

        sendJSON(res, 500, {
          status: "error",
          message:
            "Unable to save address",
        });

        return;
      }
    }


    // ==========================================
    // UPDATE ADDRESS
    // PUT /api/addresses/:id
    // ==========================================

    if (
      req.method === "PUT" &&
      req.url.startsWith(
        "/api/addresses/"
      )
    ) {

      try {

        const id =
          decodeURIComponent(
            req.url
              .split("?")[0]
              .replace(
                "/api/addresses/",
                ""
              )
          );

        const body =
          await getRequestBody(req);

        const customerId =
          String(
            body.customer_id ||
            body.customerId ||
            ""
          ).trim();

        const addresses =
          readAddresses();

        if (!customerId) {

          sendJSON(res, 400, {
            status: "error",
            message:
              "customer_id is required",
          });

          return;
        }

        const index =
          addresses.findIndex(
            (item) =>
              String(item.id) === id &&
              String(
                item.customer_id
              ) === customerId
          );

        if (index < 0) {

          sendJSON(res, 404, {
            status: "error",
            message:
              "Address not found",
          });

          return;
        }

        const updated =
          normalizeAddress(
            body,
            addresses[index]
          );

        const validationError =
          validateAddress(
            updated
          );

        if (validationError) {

          sendJSON(res, 400, {
            status: "error",
            message:
              validationError,
          });

          return;
        }

        const makeDefault =
          Boolean(
            body.is_default
          );

        if (makeDefault) {

          for (
            const item of addresses
          ) {

            if (
              String(
                item.customer_id
              ) === customerId
            ) {

              item.is_default =
                false;
            }
          }
        }

        addresses[index] = {

          ...updated,

          id:
            addresses[index].id,

          customer_id:
            customerId,

          is_default:
            makeDefault ||
            Boolean(
              addresses[index]
                .is_default
            ),
        };

        saveAddresses(
          addresses
        );

        sendJSON(res, 200, {

          status:
            "success",

          message:
            "Address updated successfully",

          address:
            addresses[index],
        });

        return;

      } catch (error) {

        console.error(
          "UPDATE ADDRESS ERROR:",
          error
        );

        sendJSON(res, 500, {
          status: "error",
          message:
            "Unable to update address",
        });

        return;
      }
    }


    // ==========================================
    // DELETE ADDRESS
    // DELETE /api/addresses/:id?customer_id=...
    // ==========================================

    if (
      req.method === "DELETE" &&
      req.url.startsWith(
        "/api/addresses/"
      )
    ) {

      try {

        const requestUrl =
          new URL(
            req.url,
            `http://${HOST}:${PORT}`
          );

        const id =
          decodeURIComponent(
            requestUrl.pathname.replace(
              "/api/addresses/",
              ""
            )
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

        const addresses =
          readAddresses();

        const index =
          addresses.findIndex(
            (item) =>
              String(item.id) === id &&
              String(
                item.customer_id
              ) === customerId
          );

        if (index < 0) {

          sendJSON(res, 404, {
            status: "error",
            message:
              "Address not found",
          });

          return;
        }

        const wasDefault =
          Boolean(
            addresses[index]
              .is_default
          );

        addresses.splice(
          index,
          1
        );

        if (wasDefault) {

          const replacement =
            addresses.find(
              (item) =>
                String(
                  item.customer_id
                ) === customerId
            );

          if (replacement) {

            replacement.is_default =
              true;
          }
        }

        saveAddresses(
          addresses
        );

        sendJSON(res, 200, {

          status:
            "success",

          message:
            "Address deleted successfully",
        });

        return;

      } catch (error) {

        console.error(
          "DELETE ADDRESS ERROR:",
          error
        );

        sendJSON(res, 500, {
          status: "error",
          message:
            "Unable to delete address",
        });

        return;
      }
    }


    // ==========================================
    // SET DEFAULT ADDRESS
    // POST /api/addresses/:id/default
    // ==========================================

    if (
      req.method === "POST" &&
      req.url.startsWith(
        "/api/addresses/"
      ) &&
      req.url.endsWith(
        "/default"
      )
    ) {

      try {

        const id =
          decodeURIComponent(
            req.url
              .split("?")[0]
              .replace(
                "/api/addresses/",
                ""
              )
              .replace(
                "/default",
                ""
              )
          );

        const body =
          await getRequestBody(req);

        const customerId =
          String(
            body.customer_id ||
            body.customerId ||
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

        const addresses =
          readAddresses();

        const exists =
          addresses.some(
            (item) =>
              String(item.id) === id &&
              String(
                item.customer_id
              ) === customerId
          );

        if (!exists) {

          sendJSON(res, 404, {
            status: "error",
            message:
              "Address not found",
          });

          return;
        }

        for (
          const item of addresses
        ) {

          if (
            String(
              item.customer_id
            ) === customerId
          ) {

            item.is_default =
              String(item.id) === id;
          }
        }

        saveAddresses(
          addresses
        );

        const address =
          addresses.find(
            (item) =>
              String(item.id) === id
          );

        sendJSON(res, 200, {

          status:
            "success",

          message:
            "Default address updated",

          address,
        });

        return;

      } catch (error) {

        console.error(
          "DEFAULT ADDRESS ERROR:",
          error
        );

        sendJSON(res, 500, {
          status: "error",
          message:
            "Unable to set default address",
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
          Array.isArray(
            body.items
          )
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

        const amount =
          Number(
            body.amount ??
            body.total_amount ??
            0
          ) || 0;

        const now =
          new Date().toISOString();

        const orderNumber =
          String(
            body.order_number ||
            ""
          ).trim() ||
          `HD${String(
            Date.now()
          ).slice(-8)}`;

        const trackingNumber =
          String(
            body.tracking_number ||
            ""
          ).trim() ||
          `HOWDI${String(
            Date.now()
          ).slice(-10)}`;

        const itemCount =
          Number(
            body.item_count
          ) ||
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
                  : `${
                      items[0]?.name ||
                      "HOWDI"
                    } + ${
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
            String(
              body.payment_method ||
              "COD"
            ),

          payment_status:
            String(
              body.payment_status ||
              "pending"
            ),

          address:
            body.address &&
            typeof body.address ===
              "object"
              ? body.address
              : null,

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

        const orders =
          readOrders();

        orders.unshift(
          order
        );

        saveOrders(
          orders
        );

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
        req.url ===
          "/api/orders" ||
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

            status:
              "error",

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

            status:
              "error",

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

            status:
              "error",

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

            status:
              "error",

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

        saveOrders(
          orders
        );

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
    // 404
    // ==========================================

    sendJSON(res, 404, {

      status:
        "error",

      message:
        "API endpoint not found",
    });
  }
);


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