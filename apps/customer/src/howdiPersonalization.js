// HOWDI Taste Engine - lightweight client-side personalization foundation.
// Stores customer taste signals locally and ranks the existing product catalogue.

const GLOBAL_KEY = "howdiTasteProfile";
const EVENTS_KEY = "howdiTasteEvents";

const readJSON = (key, fallback) => {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "null");
    return value ?? fallback;
  } catch {
    return fallback;
  }
};

const writeJSON = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
};

const money = (value) => {
  const n = Number(String(value ?? "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : 0;
};

const normalize = (value) =>
  String(value ?? "").trim().toLowerCase();

const firstValue = (...values) =>
  values.find((v) => String(v ?? "").trim() !== "");

const profileKey = (customerId) =>
  customerId
    ? `howdiTasteProfile_${customerId}`
    : GLOBAL_KEY;

const eventKey = (customerId) =>
  customerId
    ? `howdiTasteEvents_${customerId}`
    : EVENTS_KEY;

const addWeight = (bucket, value, weight) => {
  const key = normalize(value);

  if (!key) return;

  bucket[key] =
    Number(bucket[key] || 0) +
    Number(weight || 0);
};


// ============================================================
// GET CUSTOMER TASTE PROFILE
// ============================================================

export function getTasteProfile(customerId) {
  const profile = readJSON(
    profileKey(customerId),
    null
  );

  return profile &&
    typeof profile === "object"
    ? profile
    : {
        categories: {},
        subcategories: {},
        colors: {},
        shops: {},
        locations: {},
        priceTotal: 0,
        priceCount: 0,
        actions: {},
        updatedAt: null,
      };
}


// ============================================================
// RECORD TASTE EVENT
// ============================================================

export function recordTasteEvent(event = {}) {
  const customerId =
    event.customerId ||
    event.customer_id ||
    "";

  const profile =
    getTasteProfile(customerId);

  const type =
    normalize(event.type) ||
    "view";

  const actionWeights = {
    view: 1,
    search: 2,
    wishlist: 6,
    cart: 8,
    purchase: 12,
    remove_wishlist: -2,
  };

  const weight = Number(
    event.weight ??
      actionWeights[type] ??
      1
  );


  // CATEGORY
  addWeight(
    profile.categories,
    event.category,
    weight
  );


  // SUBCATEGORY
  addWeight(
    profile.subcategories,
    firstValue(
      event.subcategory,
      event.subCategory
    ),
    weight
  );


  // COLOR
  addWeight(
    profile.colors,
    firstValue(
      event.color,
      event.colors?.[0]
    ),
    weight
  );


  // SHOP
  addWeight(
    profile.shops,
    event.shop,
    weight
  );


  // LOCATION
  addWeight(
    profile.locations,
    firstValue(
      event.location,
      event.city
    ),
    weight
  );


  // PRICE
  const price = money(
    firstValue(
      event.price,
      event.offerPrice
    )
  );

  if (
    price > 0 &&
    weight > 0
  ) {
    profile.priceTotal +=
      price * weight;

    profile.priceCount +=
      weight;
  }


  // ACTION COUNT
  profile.actions[type] =
    Number(
      profile.actions[type] || 0
    ) + 1;

  profile.updatedAt =
    new Date().toISOString();


  // SAVE PROFILE
  writeJSON(
    profileKey(customerId),
    profile
  );


  // ==========================================================
  // SAVE EVENT HISTORY
  // ==========================================================

  const events = readJSON(
    eventKey(customerId),
    []
  );

  events.unshift({
    type,

    productId:
      event.productId ||
      event.product_id ||
      event.name ||
      "",

    name:
      event.name || "",

    category:
      event.category || "",

    subcategory:
      firstValue(
        event.subcategory,
        event.subCategory
      ) || "",

    color:
      firstValue(
        event.color,
        event.colors?.[0]
      ) || "",

    shop:
      event.shop || "",

    location:
      firstValue(
        event.location,
        event.city
      ) || "",

    price,

    at:
      new Date().toISOString(),
  });


  // Keep latest 100 events
  writeJSON(
    eventKey(customerId),
    events.slice(0, 100)
  );


  // Notify the app
  window.dispatchEvent(
    new CustomEvent(
      "howdi:taste-updated"
    )
  );

  return profile;
}


// ============================================================
// RECENTLY VIEWED
// ============================================================

export function rememberRecentlyViewed(
  product,
  customerId = ""
) {
  if (!product) return;

  const key = customerId
    ? `howdiRecentlyViewed_${customerId}`
    : "howdiRecentlyViewed";

  const current =
    readJSON(key, []);


  const item = {
    id:
      product.id ||
      product.product_id ||
      product._id ||
      product.name,

    name:
      product.name,

    category:
      product.category,

    subcategory:
      product.subcategory,

    color:
      product.color ||
      product.colors?.[0],

    shop:
      product.shop,

    price:
      money(
        product.price ||
        product.offerPrice
      ),
  };


  const next = [
    item,

    ...current.filter(
      (x) =>
        (x?.name || x?.id) !==
          item.name &&
        (x?.id || "") !==
          item.id
    ),
  ].slice(0, 12);


  writeJSON(
    key,
    next
  );


  // VIEW = small positive taste signal
  recordTasteEvent({
    ...item,
    customerId,
    type: "view",
  });
}


// ============================================================
// SIGNAL HELPER
// ============================================================

const getSignal = (
  bucket,
  value
) => {
  const key =
    normalize(value);

  return key
    ? Number(
        bucket?.[key] || 0
      )
    : 0;
};


// ============================================================
// SAFE ARRAY HELPER
// ============================================================

const getContextItems = (
  items
) =>
  Array.isArray(items)
    ? items.filter(Boolean)
    : [];


// ============================================================
// HOWDI PERSONALIZED PRODUCTS
// ============================================================

export function getPersonalizedProducts(
  products = [],
  context = {}
) {
  const catalog =
    getContextItems(products);

  const profile =
    getTasteProfile(
      context.customerId
    );

  const location =
    normalize(
      context.location
    );

  const cart =
    getContextItems(
      context.cart
    );

  const wishlist =
    getContextItems(
      context.wishlist
    );

  const recent =
    getContextItems(
      context.recentlyViewed
    );


  const recentNames =
    new Set(
      recent
        .map(
          (x) => x?.name
        )
        .filter(Boolean)
    );


  const cartNames =
    new Set(
      cart
        .map(
          (x) => x?.name
        )
        .filter(Boolean)
    );


  const wishNames =
    new Set(
      wishlist
        .map(
          (x) => x?.name
        )
        .filter(Boolean)
    );


  // CUSTOMER'S USUAL PRICE
  const averagePrice =
    profile.priceCount > 0
      ? profile.priceTotal /
        profile.priceCount
      : 0;


  return catalog
    .map(
      (
        product,
        index
      ) => {

        const price =
          money(
            product.price ||
            product.offerPrice
          );

        let score = 0;

        const reasons = [];


        // ====================================================
        // CATEGORY MATCH
        // ====================================================

        const categoryScore =
          getSignal(
            profile.categories,
            product.category
          );

        if (categoryScore) {
          score += Math.min(
            28,
            categoryScore * 2
          );

          reasons.push(
            product.category
          );
        }


        // ====================================================
        // SUBCATEGORY MATCH
        // ====================================================

        const subcategoryScore =
          getSignal(
            profile.subcategories,
            product.subcategory
          );

        if (subcategoryScore) {
          score += Math.min(
            22,
            subcategoryScore * 2.5
          );

          reasons.push(
            product.subcategory
          );
        }


        // ====================================================
        // COLOR MATCH
        // ====================================================

        const colorScore =
          getSignal(
            profile.colors,
            product.color ||
              product.colors?.[0]
          );

        if (colorScore) {
          score += Math.min(
            14,
            colorScore * 1.5
          );

          reasons.push(
            product.color ||
              product.colors?.[0]
          );
        }


        // ====================================================
        // SHOP MATCH
        // ====================================================

        const shopScore =
          getSignal(
            profile.shops,
            product.shop
          );

        if (shopScore) {
          score += Math.min(
            12,
            shopScore * 1.2
          );
        }


        // ====================================================
        // LOCATION MATCH
        // ====================================================

        const locationScore =
          getSignal(
            profile.locations,
            location
          );

        if (locationScore) {
          score += Math.min(
            10,
            locationScore
          );
        }


        // ====================================================
        // RECENTLY VIEWED MATCH
        // ====================================================

        if (
          recentNames.has(
            product.name
          )
        ) {
          score += 10;
        }


        // ====================================================
        // WISHLIST MATCH
        // ====================================================

        if (
          wishNames.has(
            product.name
          )
        ) {
          score += 8;
        }


        // ====================================================
        // CART MATCH
        // ====================================================

        if (
          cartNames.has(
            product.name
          )
        ) {
          score += 7;
        }


        // ====================================================
        // PRICE AFFINITY
        // ====================================================

        if (
          averagePrice > 0 &&
          price > 0
        ) {
          const difference =
            Math.abs(
              price -
                averagePrice
            ) /
            averagePrice;


          if (
            difference <= 0.15
          ) {
            score += 10;

            reasons.push(
              "your usual price range"
            );
          } else if (
            difference <= 0.30
          ) {
            score += 5;
          }
        }


        // ====================================================
        // HANDMADE BONUS
        // ====================================================

        if (
          product.handmade
        ) {
          score += 2;
        }


        // ====================================================
        // RATING BONUS
        // ====================================================

        score += Math.min(
          5,
          Number(
            product.rating || 0
          ) - 4
        );


        return {
          product,
          score,

          reasons: [
            ...new Set(
              reasons.filter(Boolean)
            ),
          ].slice(0, 2),

          index,
        };
      }
    )

    // BEST MATCH FIRST
    .sort(
      (a, b) =>
        b.score -
          a.score ||
        a.index -
          b.index
    )

    .slice(0, 8);
}


// ============================================================
// CART RECOMMENDATIONS
// ============================================================

export function getCartRecommendations(
  cartItems = [],
  products = [],
  context = {}
) {
  const cart =
    getContextItems(
      cartItems
    );

  return getPersonalizedProducts(
    products,
    {
      ...context,
      cart,
    }
  )
    .filter(
      ({ product }) =>
        !cart.some(
          (item) =>
            item.name ===
            product.name
        )
    )
    .slice(0, 5);
}


// ============================================================
// WISHLIST RECOMMENDATIONS
// ============================================================

export function getWishlistRecommendations(
  wishlist = [],
  products = [],
  context = {}
) {
  return getPersonalizedProducts(
    products,
    {
      ...context,
      wishlist,
    }
  )
    .filter(
      ({ product }) =>
        !wishlist.some(
          (item) =>
            item.name ===
            product.name
        )
    )
    .slice(0, 6);
}


// ============================================================
// PERSONALIZED OFFERS
// ============================================================

export function getPersonalizedOffers(
  products = [],
  context = {}
) {
  return getPersonalizedProducts(
    products,
    context
  )
    .filter(
      ({ product }) =>
        product?.offerText ||
        product?.offerPrice ||
        product?.discount ||
        product?.discountPercent
    )
    .slice(0, 5);
}


// ============================================================
// HUMAN-READABLE TASTE SUMMARY
// ============================================================

export function getTasteSummary(
  context = {}
) {
  const profile =
    getTasteProfile(
      context.customerId
    );


  const top = (
    bucket
  ) =>
    Object.entries(
      bucket || {}
    )
      .sort(
        (a, b) =>
          b[1] - a[1]
      )[0]?.[0] || "";


  const category =
    top(
      profile.categories
    );

  const color =
    top(
      profile.colors
    );


  const averagePrice =
    profile.priceCount > 0
      ? Math.round(
          profile.priceTotal /
            profile.priceCount
        )
      : 0;


  if (
    !category &&
    !color &&
    !averagePrice
  ) {
    return "HOWDI is learning from what you view, like and add to cart.";
  }


  const parts = [];


  if (category) {
    parts.push(
      category
    );
  }


  if (color) {
    parts.push(
      `${color} tones`
    );
  }


  if (averagePrice) {
    parts.push(
      `around ₹${averagePrice.toLocaleString(
        "en-IN"
      )}`
    );
  }


  return `Because you like ${parts.join(
    " · "
  )}.`;
}