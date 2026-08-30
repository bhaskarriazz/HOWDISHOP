import { useEffect, useState } from "react";
import "./App.css";

const slides = {
  home: [
    {
      eyebrow: "HOWDI • EVERYTHING NEAR YOU",
      title: "One place for work, shopping & opportunities.",
      text: "Find trusted workers, discover local shops, shop products and explore new ways to learn & earn.",
      button: "Explore HOWDI",
      icon: "✨",
    },
    {
      eyebrow: "TRUSTED WORKERS",
      title: "Find the right worker for every job.",
      text: "Skilled, verified and ready to work — from small tasks to big projects.",
      button: "Find a Worker",
      icon: "👷",
    },
    {
      eyebrow: "LOCAL SHOPPING",
      title: "Discover products from shops near you.",
      text: "Support local businesses and get the products you need without the hassle.",
      button: "Shop Now",
      icon: "🛍️",
    },
  ],

  work: [
    {
      eyebrow: "WORK • NEAR YOU",
      title: "Find trusted help, near you.",
      text: "Connect with verified electricians, plumbers, carpenters, painters and more.",
      button: "Find a Worker",
      icon: "🧰",
    },
    {
      eyebrow: "QUICK SERVICE",
      title: "Your job. Your price. Your choice.",
      text: "Compare worker offers and choose the service that works best for you.",
      button: "Post a Job",
      icon: "⚡",
    },
  ],

  shop: [
    {
      eyebrow: "SHOP • LOCAL",
      title: "Everything you need, closer than you think.",
      text: "Explore products from trusted local vendors and discover great offers.",
      button: "Start Shopping",
      icon: "🛒",
    },
    {
      eyebrow: "SPECIAL OFFERS",
      title: "Save more with local deals.",
      text: "Find special prices and limited-time offers from shops around you.",
      button: "View Offers",
      icon: "🏷️",
    },
  ],

  learn: [
    {
      eyebrow: "LEARN & EARN",
      title: "Learn something useful. Build something bigger.",
      text: "Discover learning opportunities, skills and ways to create additional income.",
      button: "Explore Learning",
      icon: "🎓",
    },
    {
      eyebrow: "SKILLS TO INCOME",
      title: "Turn your skills into opportunities.",
      text: "Learn, improve your skills and discover opportunities available through HOWDI.",
      button: "Start Learning",
      icon: "💡",
    },
  ],
};

const categories = [
  { icon: "⚡", name: "Electrician" },
  { icon: "🚰", name: "Plumber" },
  { icon: "🪚", name: "Carpenter" },
  { icon: "🎨", name: "Painter" },
  { icon: "❄️", name: "AC Service" },
  { icon: "🧹", name: "Cleaning" },
  { icon: "🔧", name: "Repair" },
  { icon: "➕", name: "More" },
];

const workers = [
  {
    name: "Rajesh Kumar",
    service: "Electrician",
    rating: "4.9",
    jobs: "184",
    price: "₹399",
    verified: true,
  },
  {
    name: "Suresh B",
    service: "Plumber",
    rating: "4.8",
    jobs: "126",
    price: "₹349",
    verified: true,
  },
  {
    name: "Mahesh Rao",
    service: "Carpenter",
    rating: "4.9",
    jobs: "219",
    price: "₹499",
    verified: true,
  },
];

const products = [
  {
    icon: "🪴",
    name: "Indoor Plant",
    shop: "Green Home Store",
    price: "₹299",
    oldPrice: "₹399",
  },
  {
    icon: "💡",
    name: "LED Smart Light",
    shop: "Sri Lakshmi Electricals",
    price: "₹549",
    oldPrice: "₹699",
  },
  {
    icon: "🪑",
    name: "Wooden Stool",
    shop: "Local Wood Works",
    price: "₹899",
    oldPrice: "₹1,199",
  },
];

function App() {
  // ==============================
  // GENERAL WEBSITE STATE
  // ==============================

  const [activeSection, setActiveSection] = useState("home");
  const [slideIndex, setSlideIndex] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);

  // ==============================
  // AUTH STATE
  // ==============================

  const [showLogin, setShowLogin] = useState(false);

  // Persist the logged-in customer across refreshes.
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("howdiUser")) || null;
    } catch {
      return null;
    }
  });

  // ==============================
  // CUSTOMER PROFILE / ADDRESS BOOK
  // ==============================
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileTab, setProfileTab] = useState("overview");
  const [walletSection, setWalletSection] = useState("overview");
  const [messageFilter, setMessageFilter] = useState("all");
  const [messageSearch, setMessageSearch] = useState("");
  const [messages, setMessages] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("howdiMessages") || "null");
      return Array.isArray(saved) && saved.length ? saved : [
        { id: 1, type: "order", icon: "📦", title: "Your order is on the way", text: "Your HOWDI order #HD10284 has been shipped and is expected soon.", date: "Today, 9:20 AM", unread: true },
        { id: 2, type: "offer", icon: "🎁", title: "Festival offer unlocked", text: "Buy 2 items and get 5% off. Buy 3 items and get 10% off.", date: "Today, 8:05 AM", unread: true },
        { id: 3, type: "wallet", icon: "💰", title: "Cashback added to wallet", text: "₹330 cashback was transferred to your HOWDI Wallet.", date: "Yesterday", unread: false },
        { id: 4, type: "account", icon: "👋", title: "Welcome to HOWDI", text: "Your HOWDI account is ready. Explore local services, products and opportunities.", date: "Yesterday", unread: false },
        { id: 5, type: "offer", icon: "⭐", title: "Reward points reminder", text: "You have reward points waiting to be redeemed in your HOWDI Wallet.", date: "20 Aug 2026", unread: false },
      ];
    } catch {
      return [];
    }
  });
  const [messageComposeOpen, setMessageComposeOpen] = useState(false);
  const [messageRecipient, setMessageRecipient] = useState("");
  const [messageBody, setMessageBody] = useState("");
  const [walletBalance, setWalletBalance] = useState(() => {
    try {
      return Number(localStorage.getItem("howdiWalletBalance")) || 1250;
    } catch {
      return 1250;
    }
  });
  const [walletAmount, setWalletAmount] = useState("");
  const [walletMessage, setWalletMessage] = useState("");
  const [walletTransactions, setWalletTransactions] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("howdiWalletTransactions") || "[]");
      return Array.isArray(saved) && saved.length ? saved : [
        { id: 1, title: "Welcome bonus", type: "credit", amount: 250, date: "Today" },
        { id: 2, title: "Wallet created", type: "credit", amount: 1000, date: "Today" },
      ];
    } catch {
      return [
        { id: 1, title: "Welcome bonus", type: "credit", amount: 250, date: "Today" },
        { id: 2, title: "Wallet created", type: "credit", amount: 1000, date: "Today" },
      ];
    }
  });
  const [cashbackStats, setCashbackStats] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("howdiCashbackStats")) || { total: 450, pending: 120, available: 330 };
    } catch {
      return { total: 450, pending: 120, available: 330 };
    }
  });
  const [rewardPoints, setRewardPoints] = useState(() => {
    try {
      return Number(localStorage.getItem("howdiRewardPoints")) || 1950;
    } catch {
      return 1950;
    }
  });
  const [walletRewards, setWalletRewards] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("howdiRewardHistory") || "[]");
      return Array.isArray(saved) && saved.length ? saved : [
        { id: 1, title: "Welcome reward", points: 250, date: "Today" },
        { id: 2, title: "Festival bonus", points: 500, date: "Yesterday" },
      ];
    } catch {
      return [
        { id: 1, title: "Welcome reward", points: 250, date: "Today" },
        { id: 2, title: "Festival bonus", points: 500, date: "Yesterday" },
      ];
    }
  });
  const cashbackHistory = [
    { id: 1, title: "Indoor Plant purchase", amount: 30, status: "Credited", date: "Today" },
    { id: 2, title: "LED Smart Light purchase", amount: 55, status: "Pending", date: "Yesterday" },
    { id: 3, title: "Wooden Stool purchase", amount: 90, status: "Credited", date: "20 Aug 2026" },
    { id: 4, title: "Festival cashback", amount: 275, status: "Credited", date: "18 Aug 2026" },
  ];

  useEffect(() => {
    localStorage.setItem("howdiWalletBalance", String(walletBalance));
    localStorage.setItem("howdiWalletTransactions", JSON.stringify(walletTransactions));
    localStorage.setItem("howdiCashbackStats", JSON.stringify(cashbackStats));
    localStorage.setItem("howdiRewardPoints", String(rewardPoints));
    localStorage.setItem("howdiRewardHistory", JSON.stringify(walletRewards));
  }, [walletBalance, walletTransactions, cashbackStats, rewardPoints, walletRewards]);

  useEffect(() => {
    localStorage.setItem("howdiMessages", JSON.stringify(messages));
  }, [messages]);

  const markMessageRead = (id) => {
    setMessages((items) => items.map((item) => item.id === id ? { ...item, unread: false } : item));
  };

  const deleteMessage = (id) => {
    setMessages((items) => items.filter((item) => item.id !== id));
  };

  const markAllMessagesRead = () => {
    setMessages((items) => items.map((item) => ({ ...item, unread: false })));
  };

  const sendHowdiMessage = () => {
    const recipient = messageRecipient.trim();
    const body = messageBody.trim();
    if (!recipient || !body) return;
    setMessages((items) => [
      { id: Date.now(), type: "sent", icon: "✉️", title: `Message to ${recipient}`, text: body, date: "Just now", unread: false },
      ...items,
    ]);
    setMessageRecipient("");
    setMessageBody("");
    setMessageComposeOpen(false);
  };

  const unreadMessageCount = messages.filter((item) => item.unread).length;
  const filteredMessages = messages.filter((item) => {
    const matchesFilter = messageFilter === "all" || (messageFilter === "unread" ? item.unread : item.type === messageFilter);
    const query = messageSearch.trim().toLowerCase();
    const matchesSearch = !query || `${item.title} ${item.text}`.toLowerCase().includes(query);
    return matchesFilter && matchesSearch;
  });

  const openWalletSection = (section) => {
    setWalletSection(section);
    setProfileTab("wallet");
    setAddressFormOpen(false);
  };

  const addWalletMoney = () => {
    const amount = Number(walletAmount);
    if (!amount || amount <= 0) {
      setWalletMessage("Enter a valid amount.");
      return;
    }
    setWalletBalance((balance) => balance + amount);
    setWalletTransactions((items) => [
      { id: Date.now(), title: "Money added to wallet", type: "credit", amount, date: "Just now" },
      ...items,
    ]);
    setWalletAmount("");
    setWalletMessage(`₹${amount.toLocaleString("en-IN")} added to your wallet.`);
  };

  const moveCashbackToWallet = () => {
    const amount = Number(cashbackStats.available || 0);
    if (!amount) return;
    setWalletBalance((balance) => balance + amount);
    setWalletTransactions((items) => [
      { id: Date.now(), title: "Cashback transferred to wallet", type: "credit", amount, date: "Just now" },
      ...items,
    ]);
    setCashbackStats((stats) => ({ ...stats, available: 0 }));
    setWalletMessage(`₹${amount.toLocaleString("en-IN")} cashback transferred to your wallet.`);
  };

  const redeemRewards = () => {
    if (rewardPoints < 500) return;
    setRewardPoints((points) => points - 500);
    setWalletBalance((balance) => balance + 50);
    setWalletTransactions((items) => [
      { id: Date.now(), title: "Reward redeemed", type: "credit", amount: 50, date: "Just now" },
      ...items,
    ]);
    setWalletRewards((items) => [
      { id: Date.now(), title: "500 points redeemed for wallet credit", points: -500, date: "Just now" },
      ...items,
    ]);
    setWalletMessage("500 reward points redeemed for ₹50 wallet credit.");
  };

  const [addresses, setAddresses] = useState([]);

  // ==============================
  // CUSTOMER PAYMENTS
  // ==============================
  const [paymentMethods, setPaymentMethods] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("howdiPaymentMethods") || "[]");
      return Array.isArray(saved) ? saved : [];
    } catch {
      return [];
    }
  });
  const [paymentFormOpen, setPaymentFormOpen] = useState(false);
  const [paymentType, setPaymentType] = useState("UPI");
  const [paymentValue, setPaymentValue] = useState("");
  const [paymentHolder, setPaymentHolder] = useState("");
  const [paymentExpiry, setPaymentExpiry] = useState("");
  const [paymentMessage, setPaymentMessage] = useState("");

  useEffect(() => {
    localStorage.setItem("howdiPaymentMethods", JSON.stringify(paymentMethods));
  }, [paymentMethods]);

  const resetPaymentForm = () => {
    setPaymentValue("");
    setPaymentHolder("");
    setPaymentExpiry("");
    setPaymentMessage("");
  };

  const handlePaymentTypeChange = (type) => {
    setPaymentType(type);
    resetPaymentForm();
  };

  const addPaymentMethod = () => {
    const value = paymentValue.trim();
    const holder = paymentHolder.trim();
    const expiry = paymentExpiry.trim();

    if (paymentType === "UPI") {
      if (!value || !value.includes("@") || value.startsWith("@") || value.endsWith("@")) {
        setPaymentMessage("Please enter your UPI ID, for example bhaskar@upi.");
        return;
      }
    }

    if (paymentType === "CARD") {
      const digits = value.replace(/\D/g, "");
      if (digits.length < 12 || digits.length > 19) {
        setPaymentMessage("Please enter a valid card number (12–19 digits).");
        return;
      }
      if (!holder) {
        setPaymentMessage("Please enter the card holder name.");
        return;
      }
      if (!/^(0[1-9]|1[0-2])\/?([0-9]{2})$/.test(expiry)) {
        setPaymentMessage("Please enter expiry in MM/YY format.");
        return;
      }
    }

    if (paymentType === "BANK") {
      const digits = value.replace(/\D/g, "");
      if (digits.length < 9 || digits.length > 18) {
        setPaymentMessage("Please enter a valid bank account number (9–18 digits).");
        return;
      }
      if (!holder) {
        setPaymentMessage("Please enter the account holder name.");
        return;
      }
    }

    const digits = value.replace(/\D/g, "");
    const method = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type: paymentType,
      value: paymentType === "UPI" ? value : `•••• ${digits.slice(-4)}`,
      holder: paymentType === "UPI" ? "" : holder,
      expiry: paymentType === "CARD" ? expiry : "",
      label:
        paymentType === "UPI"
          ? "UPI ID"
          : paymentType === "CARD"
            ? "Debit / Credit Card"
            : "Bank Account",
    };

    setPaymentMethods((current) => [...current, method]);
    setPaymentMessage("Payment method added successfully.");
    resetPaymentForm();
    setPaymentFormOpen(false);
  };

  const removePaymentMethod = (id) => {
    setPaymentMethods((current) => current.filter((item) => item.id !== id));
  };

  // ==============================
  // CUSTOMER ORDERS
  // ==============================
  const [orders, setOrders] = useState([]);
  const [orderFilter, setOrderFilter] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState(null);

  // ==============================
  // CUSTOMER WISHLIST
  // ==============================
  const [wishlist, setWishlist] = useState([]);

  // ==============================
  // SHOPPING CART
  // ==============================
  const [cart, setCart] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("howdiCart") || "[]");
      return Array.isArray(saved) ? saved : [];
    } catch {
      return [];
    }
  });
  const [cartOpen, setCartOpen] = useState(false);
  const [selectedQuantities, setSelectedQuantities] = useState({});

  useEffect(() => {
    localStorage.setItem("howdiCart", JSON.stringify(cart));
  }, [cart]);

  const addToCart = (product, quantity = 1) => {
    const qty = Math.max(1, Number(quantity) || 1);
    setCart((current) => {
      const exists = current.find((item) => item.name === product.name);
      if (exists) {
        return current.map((item) =>
          item.name === product.name
            ? { ...item, quantity: (item.quantity || 1) + qty }
            : item
        );
      }
      return [...current, { ...product, quantity: qty }];
    });
    setCartOpen(true);
  };

  const buyNow = (product, quantity = 1) => {
    const qty = Math.max(1, Number(quantity) || 1);
    setCart([{ ...product, quantity: qty }]);
    setCartOpen(true);
  };

  const setProductQuantity = (product, quantity) => {
    const qty = Math.max(1, Math.min(10, Number(quantity) || 1));
    setSelectedQuantities((current) => ({ ...current, [product.name]: qty }));
  };

  const updateCartQuantity = (productName, change) => {
    setCart((current) =>
      current
        .map((item) =>
          item.name === productName
            ? { ...item, quantity: (item.quantity || 1) + change }
            : item
        )
        .filter((item) => (item.quantity || 0) > 0)
    );
  };

  const removeFromCart = (productName) => {
    setCart((current) =>
      current.filter((item) => item.name !== productName)
    );
  };

  const cartCount = cart.reduce(
    (total, item) => total + (item.quantity || 1),
    0
  );

  const cartSubtotal = cart.reduce((total, item) => {
    const price =
      Number(String(item.price || "").replace(/[^0-9.]/g, "")) || 0;
    return total + price * (item.quantity || 1);
  }, 0);


  const [addressFormOpen, setAddressFormOpen] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState(null);
  const [addressForm, setAddressForm] = useState({
    label: "Home",
    full_name: "",
    phone: "",
    address_line1: "",
    address_line2: "",
    city: "",
    state: "",
    pincode: "",
  });

  // login = login screen
  // signup = create account screen
  const [authMode, setAuthMode] = useState("login");

  const [loginPhone, setLoginPhone] = useState("");
  const [loginName, setLoginName] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [loginLoading, setLoginLoading] = useState(false);
  const [loginMessage, setLoginMessage] = useState("");

  const [backendStatus, setBackendStatus] = useState("Checking...");

  // ==============================
  // CHECK BACKEND
  // ==============================

  useEffect(() => {
    fetch("http://localhost:5000/api/health")
      .then((response) => response.json())
      .then((data) => {
        setBackendStatus(data.status || "online");
      })
      .catch(() => {
        setBackendStatus("offline");
      });
  }, []);

  // ==============================
  // LOGIN
  // ==============================

  const handleLogin = async (e) => {
    e?.preventDefault();

    const phone = loginPhone.replace(/\D/g, "");

    if (!phone || phone.length !== 10) {
      setLoginMessage(
        "Please enter a valid 10-digit mobile number."
      );
      return;
    }

    if (!loginPassword) {
      setLoginMessage(
        "Please enter your password."
      );
      return;
    }

    try {
      setLoginLoading(true);
      setLoginMessage("");

      const response = await fetch(
        "http://localhost:5000/api/auth/login",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            phone: phone,
            password: loginPassword,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setLoginMessage(
          data.message || "Login failed."
        );
        return;
      }

      // Save logged-in user
      localStorage.setItem(
        "howdiUser",
        JSON.stringify(data.user)
      );

      setCurrentUser(data.user);

      setLoginMessage(
        "Login successful! 🎉"
      );

      setTimeout(() => {
        setShowLogin(false);
        setLoginMessage("");
        setLoginPhone("");
        setLoginPassword("");
      }, 1000);

    } catch (error) {
      console.error("Login error:", error);

      setLoginMessage(
        "Cannot connect to HOWDI server."
      );

    } finally {
      setLoginLoading(false);
    }
  };

  // ==============================
  // SIGNUP / REGISTER
  // ==============================

  const handleRegister = async (e) => {
    e?.preventDefault();

    const name = loginName.trim();

    const phone = loginPhone.replace(
      /\D/g,
      ""
    );

    if (!name) {
      setLoginMessage(
        "Please enter your full name."
      );
      return;
    }

    if (!phone || phone.length !== 10) {
      setLoginMessage(
        "Please enter a valid 10-digit mobile number."
      );
      return;
    }

    if (
      !loginPassword ||
      loginPassword.length < 6
    ) {
      setLoginMessage(
        "Password must be at least 6 characters."
      );
      return;
    }

    try {
      setLoginLoading(true);
      setLoginMessage("");

      const response = await fetch(
        "http://localhost:5000/api/auth/register",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            full_name: name,
            email: `${phone}@howdi.local`,
            phone: phone,
            password: loginPassword,
            role: "customer",
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setLoginMessage(
          data.message ||
          "Registration failed."
        );
        return;
      }

      // Save newly created user
      localStorage.setItem(
        "howdiUser",
        JSON.stringify(data.user)
      );

      setCurrentUser(data.user);

      setLoginMessage(
        "Account created successfully! 🎉"
      );

      setTimeout(() => {
        setShowLogin(false);
        setLoginMessage("");
        setLoginName("");
        setLoginPhone("");
        setLoginPassword("");
        setAuthMode("login");
      }, 1000);

    } catch (error) {
      console.error(
        "Registration error:",
        error
      );

      setLoginMessage(
        "Cannot connect to HOWDI server."
      );

    } finally {
      setLoginLoading(false);
    }
  };

  // ==============================
  // SLIDER
  // ==============================

  const currentSlides =
    slides[activeSection] || slides.home;

  const currentSlide =
    currentSlides[
      slideIndex % currentSlides.length
    ];

  useEffect(() => {
    setSlideIndex(0);
  }, [activeSection]);

  useEffect(() => {
    const timer = setInterval(() => {
      setSlideIndex(
        (current) => current + 1
      );
    }, 5000);

    return () => clearInterval(timer);
  }, [activeSection]);

  // ==============================
  // NAVIGATION
  // ==============================

  const navigate = (section) => {
    setActiveSection(section);
    setMenuOpen(false);

    setTimeout(() => {
      const target =
        document.getElementById(section);

      target?.scrollIntoView({
        behavior: "smooth",
      });
    }, 50);
  };

  // ==============================
  // OPEN LOGIN
  // ==============================

  const openLogin = () => {
    setAuthMode("login");
    setLoginMessage("");
    setShowLogin(true);
  };

  // ==============================
  // OPEN SIGNUP
  // ==============================

  const openSignup = () => {
    setAuthMode("signup");
    setLoginMessage("");
    setShowLogin(true);
  };

  // ==============================
  // CLOSE AUTH
  // ==============================

  const closeAuth = () => {
    if (loginLoading) return;

    setShowLogin(false);
    setLoginMessage("");
    setLoginName("");
    setLoginPhone("");
    setLoginPassword("");
    setAuthMode("login");
  };

  // ==============================
  // ADDRESS BOOK HELPERS
  // ==============================

  useEffect(() => {
    if (!currentUser?.id) {
      setAddresses([]);
      return;
    }

    try {
      const saved = JSON.parse(
        localStorage.getItem(`howdiAddresses_${currentUser.id}`) || "[]"
      );
      setAddresses(Array.isArray(saved) ? saved : []);
    } catch {
      setAddresses([]);
    }
  }, [currentUser]);

  const persistAddresses = (nextAddresses) => {
    setAddresses(nextAddresses);

    if (currentUser?.id) {
      localStorage.setItem(
        `howdiAddresses_${currentUser.id}`,
        JSON.stringify(nextAddresses)
      );
    }
  };

  // ==============================
  // WISHLIST HELPERS
  // ==============================

  useEffect(() => {
    if (!currentUser?.id) {
      setWishlist([]);
      return;
    }

    try {
      const saved = JSON.parse(
        localStorage.getItem(`howdiWishlist_${currentUser.id}`) || "[]"
      );
      setWishlist(Array.isArray(saved) ? saved : []);
    } catch {
      setWishlist([]);
    }
  }, [currentUser]);

  const toggleWishlist = (product) => {
    if (!currentUser) {
      openLogin();
      return;
    }

    setWishlist((current) => {
      const exists = current.some((item) => item.name === product.name);
      const next = exists
        ? current.filter((item) => item.name !== product.name)
        : [...current, product];

      localStorage.setItem(
        `howdiWishlist_${currentUser.id}`,
        JSON.stringify(next)
      );

      return next;
    });
  };

  // ==============================
  // ORDERS HELPERS
  // ==============================
  useEffect(() => {
    if (!currentUser?.id) {
      setOrders([]);
      setSelectedOrder(null);
      return;
    }

    try {
      const saved = JSON.parse(
        localStorage.getItem(`howdiOrders_${currentUser.id}`) || "[]"
      );
      setOrders(Array.isArray(saved) ? saved : []);
    } catch {
      setOrders([]);
    }
  }, [currentUser]);

  const openOrders = () => {
    if (!currentUser) {
      openLogin();
      return;
    }
    setProfileTab("orders");
    setOrderFilter("all");
    setSelectedOrder(null);
    setProfileOpen(true);
  };

  const orderStatusLabel = (status) => {
    const value = String(status || "processing").toLowerCase();
    if (value === "delivered") return "Delivered";
    if (value === "cancelled" || value === "canceled") return "Cancelled";
    if (value === "shipped") return "Shipped";
    if (value === "confirmed") return "Confirmed";
    return "Processing";
  };

  const filteredOrders = orders.filter((order) => {
    const status = String(order.status || "processing").toLowerCase();
    if (orderFilter === "active") return !["delivered", "cancelled", "canceled"].includes(status);
    if (orderFilter === "completed") return status === "delivered";
    if (orderFilter === "cancelled") return ["cancelled", "canceled"].includes(status);
    return true;
  });

  const formatOrderDate = (value) => {
    if (!value) return "";
    try {
      return new Intl.DateTimeFormat("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(new Date(value));
    } catch {
      return String(value);
    }
  };

  const openProfile = () => {
    if (!currentUser) {
      openLogin();
      return;
    }

    setProfileTab("overview");
    setProfileOpen(true);
  };

  const openAddressBook = () => {
    if (!currentUser) {
      openLogin();
      return;
    }

    setProfileTab("addresses");
    setProfileOpen(true);
  };

  const openNewAddress = () => {
    setEditingAddressId(null);
    setAddressForm({
      label: "Home",
      full_name: currentUser?.full_name || currentUser?.name || "",
      phone: currentUser?.phone || "",
      address_line1: "",
      address_line2: "",
      city: "",
      state: "",
      pincode: "",
    });
    setAddressFormOpen(true);
  };

  const openEditAddress = (address) => {
    setEditingAddressId(address.id);
    setAddressForm({
      label: address.label || "Home",
      full_name: address.full_name || "",
      phone: address.phone || "",
      address_line1: address.address_line1 || "",
      address_line2: address.address_line2 || "",
      city: address.city || "",
      state: address.state || "",
      pincode: address.pincode || "",
    });
    setAddressFormOpen(true);
  };

  const saveAddress = (event) => {
    event.preventDefault();

    // Normalize the pincode before validating it.
    // This prevents spaces/formatting from causing a false validation error.
    const pincode = String(addressForm.pincode ?? "")
      .replace(/\D/g, "")
      .slice(0, 6);

    if (pincode.length !== 6) {
      alert("Please enter a valid 6-digit pincode.");
      return;
    }

    if (
      !addressForm.full_name.trim() ||
      !addressForm.phone.trim() ||
      !addressForm.address_line1.trim() ||
      !addressForm.city.trim() ||
      !addressForm.state.trim()
    ) {
      alert("Please complete all required address fields.");
      return;
    }

    const newAddress = {
      id: editingAddressId || `addr_${Date.now()}`,
      ...addressForm,
      label: addressForm.label.trim() || "Other",
      full_name: addressForm.full_name.trim(),
      phone: addressForm.phone.trim(),
      address_line1: addressForm.address_line1.trim(),
      address_line2: addressForm.address_line2.trim(),
      city: addressForm.city.trim(),
      state: addressForm.state.trim(),
      pincode,
      updated_at: new Date().toISOString(),
    };

    let nextAddresses;

    if (editingAddressId) {
      nextAddresses = addresses.map((item) =>
        item.id === editingAddressId ? newAddress : item
      );
    } else {
      nextAddresses = [
        ...addresses,
        {
          ...newAddress,
          is_default: addresses.length === 0,
        },
      ];
    }

    persistAddresses(nextAddresses);
    setAddressFormOpen(false);
    setEditingAddressId(null);
  };

  const deleteAddress = (addressId) => {
    const address = addresses.find((item) => item.id === addressId);
    if (!address) return;

    if (!window.confirm(`Delete your ${address.label || "address"}?`)) {
      return;
    }

    let nextAddresses = addresses.filter(
      (item) => item.id !== addressId
    );

    if (
      address.is_default &&
      nextAddresses.length > 0
    ) {
      nextAddresses = nextAddresses.map((item, index) => ({
        ...item,
        is_default: index === 0,
      }));
    }

    persistAddresses(nextAddresses);
  };

  const setDefaultAddress = (addressId) => {
    persistAddresses(
      addresses.map((item) => ({
        ...item,
        is_default: item.id === addressId,
      }))
    );
  };

  const closeProfile = () => {
    if (addressFormOpen) {
      setAddressFormOpen(false);
      setEditingAddressId(null);
    }
    setProfileOpen(false);
  };

  // ==============================
  // PAGE
  // ==============================

  return (
    <div className="howdi-app">

      {/* ======================================
          TOP ANNOUNCEMENT
      ====================================== */}

      <div className="announcement">
        <span>🎁</span>

        <strong>
          HOWDI SPECIAL:
        </strong>

        <span>
          Discover local services,
          products and opportunities
          near you.
        </span>

        <button
          onClick={() =>
            navigate("shop")
          }
        >
          Explore now →
        </button>
      </div>


      {/* ======================================
          HEADER
      ====================================== */}

      <header className="header">

        <div className="header-inner">

          <button
            className="brand"
            onClick={() =>
              navigate("home")
            }
          >

            <div className="brand-mark">
              H
            </div>

            <div>
              <div className="brand-name">
                HOWDI
              </div>

              <div className="brand-tagline">
                Kaam bhi, Samaan bhi.
              </div>
            </div>

          </button>


          {/* NAVIGATION */}

          <nav
            className={`main-nav ${
              menuOpen
                ? "mobile-open"
                : ""
            }`}
          >

            <button
              className={
                activeSection === "home"
                  ? "active"
                  : ""
              }
              onClick={() =>
                navigate("home")
              }
            >
              🏠 Home
            </button>


            <button
              className={
                activeSection === "work"
                  ? "active"
                  : ""
              }
              onClick={() =>
                navigate("work")
              }
            >
              👷 Work
            </button>


            <button
              className={
                activeSection === "shop"
                  ? "active"
                  : ""
              }
              onClick={() =>
                navigate("shop")
              }
            >
              🛍️ Shop
            </button>


            <button
              onClick={() =>
                navigate("shop")
              }
            >
              🏪 Vendors
            </button>


            <button
              className={
                activeSection === "learn"
                  ? "active"
                  : ""
              }
              onClick={() =>
                navigate("learn")
              }
            >
              🎓 Learn & Earn
            </button>


            <button
              onClick={() =>
                navigate("shop")
              }
            >
              🏷️ Offers
            </button>

          </nav>


          {/* HEADER ACTIONS */}

          <div className="header-actions">

            <button
              className="location-button"
            >
              📍
              <span>
                Khammam
              </span>
              <small>
                ⌄
              </small>
            </button>


            <button
              type="button"
              className="login-button"
              onClick={() => setCartOpen(true)}
              title="Open cart"
              style={{ position: "relative" }}
            >
              🛒 Cart
              {cartCount > 0 && (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    minWidth: "22px",
                    height: "22px",
                    marginLeft: "7px",
                    padding: "0 6px",
                    borderRadius: "999px",
                    background: "#e11d48",
                    color: "#fff",
                    fontSize: "12px",
                    fontWeight: 900,
                  }}
                >
                  {cartCount}
                </span>
              )}
            </button>


            {currentUser ? (
              <div className="user-menu">
                <button
                  type="button"
                  className="user-welcome"
                  onClick={openProfile}
                  title="Open My HOWDI"
                >
                  👋 {currentUser.full_name || currentUser.name || "Customer"}
                </button>

                <button
                  className="login-button"
                  onClick={() => {
                    localStorage.removeItem("howdiUser");
                    setCurrentUser(null);
                  }}
                >
                  Logout
                </button>
              </div>
            ) : (
              <button
                className="login-button"
                onClick={openLogin}
              >
                Login / Sign up
              </button>
            )}


            <button
              className="menu-button"
              onClick={() =>
                setMenuOpen(
                  !menuOpen
                )
              }
            >
              ☰
            </button>

          </div>

        </div>

      </header>


      {/* ======================================
          SHOPPING CART
      ====================================== */}
      {cartOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 10000,
            background: "rgba(15, 23, 42, 0.55)",
            display: "flex",
            justifyContent: "flex-end",
          }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setCartOpen(false);
            }
          }}
        >
          <div
            style={{
              width: "min(440px, 94vw)",
              height: "100%",
              background: "#fff",
              boxShadow: "-20px 0 60px rgba(15,23,42,.22)",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                padding: "22px 24px",
                borderBottom: "1px solid #e5e7eb",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: "12px",
                    fontWeight: 800,
                    letterSpacing: "1.2px",
                    color: "#64748b",
                  }}
                >
                  HOWDI SHOPPING
                </div>
                <h2 style={{ margin: "5px 0 0", fontSize: "25px" }}>
                  🛒 Your Cart
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setCartOpen(false)}
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "50%",
                  border: "1px solid #e5e7eb",
                  background: "#f8fafc",
                  fontSize: "20px",
                  cursor: "pointer",
                }}
              >
                ×
              </button>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
              {cart.length === 0 ? (
                <div
                  style={{
                    minHeight: "360px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    textAlign: "center",
                  }}
                >
                  <div>
                    <div style={{ fontSize: "58px" }}>🛒</div>
                    <h3 style={{ fontSize: "24px", margin: "12px 0 8px" }}>
                      Your cart is empty
                    </h3>
                    <p style={{ color: "#64748b", marginBottom: "20px" }}>
                      Add products from local shops and they will appear here.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setCartOpen(false);
                        navigate("shop");
                      }}
                      style={{
                        border: 0,
                        borderRadius: "12px",
                        padding: "13px 18px",
                        background: "#0f172a",
                        color: "#fff",
                        fontWeight: 800,
                        cursor: "pointer",
                      }}
                    >
                      Continue Shopping →
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: "grid", gap: "14px" }}>
                  {cart.map((item) => (
                    <div
                      key={item.name}
                      style={{
                        border: "1px solid #e5e7eb",
                        borderRadius: "16px",
                        padding: "14px",
                        display: "grid",
                        gridTemplateColumns: "58px 1fr",
                        gap: "12px",
                      }}
                    >
                      <div
                        style={{
                          width: "58px",
                          height: "58px",
                          borderRadius: "12px",
                          background: "#e7e0cf",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "30px",
                        }}
                      >
                        {item.icon}
                      </div>

                      <div>
                        <div
                          style={{
                            fontSize: "11px",
                            textTransform: "uppercase",
                            letterSpacing: "1px",
                            color: "#9a6b25",
                            fontWeight: 800,
                          }}
                        >
                          {item.shop}
                        </div>

                        <div
                          style={{
                            fontWeight: 800,
                            fontSize: "17px",
                            marginTop: "3px",
                          }}
                        >
                          {item.name}
                        </div>

                        <div style={{ marginTop: "5px", fontWeight: 800 }}>
                          {item.price}
                        </div>

                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            marginTop: "10px",
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => updateCartQuantity(item.name, -1)}
                            style={{
                              width: "30px",
                              height: "30px",
                              borderRadius: "8px",
                              border: "1px solid #cbd5e1",
                              background: "#fff",
                              cursor: "pointer",
                              fontWeight: 900,
                            }}
                          >
                            −
                          </button>

                          <strong
                            style={{
                              minWidth: "20px",
                              textAlign: "center",
                            }}
                          >
                            {item.quantity || 1}
                          </strong>

                          <button
                            type="button"
                            onClick={() => updateCartQuantity(item.name, 1)}
                            style={{
                              width: "30px",
                              height: "30px",
                              borderRadius: "8px",
                              border: "1px solid #cbd5e1",
                              background: "#fff",
                              cursor: "pointer",
                              fontWeight: 900,
                            }}
                          >
                            +
                          </button>

                          <button
                            type="button"
                            onClick={() => removeFromCart(item.name)}
                            style={{
                              marginLeft: "auto",
                              border: 0,
                              background: "transparent",
                              color: "#dc2626",
                              cursor: "pointer",
                              fontWeight: 800,
                            }}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {cart.length > 0 && (
              <div
                style={{
                  padding: "18px 20px 22px",
                  borderTop: "1px solid #e5e7eb",
                  background: "#f8fafc",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "12px",
                    fontSize: "18px",
                  }}
                >
                  <strong>Subtotal</strong>
                  <strong>₹{cartSubtotal.toLocaleString("en-IN")}</strong>
                </div>

                <p
                  style={{
                    margin: "0 0 14px",
                    color: "#64748b",
                    fontSize: "13px",
                  }}
                >
                  Delivery charges and offers will be calculated at checkout.
                </p>

                <button
                  type="button"
                  onClick={() => alert("Checkout will be connected next.")}
                  style={{
                    width: "100%",
                    border: 0,
                    borderRadius: "13px",
                    padding: "15px",
                    background: "#0f172a",
                    color: "#fff",
                    fontWeight: 900,
                    fontSize: "16px",
                    cursor: "pointer",
                  }}
                >
                  Proceed to Checkout →
                </button>
              </div>
            )}
          </div>
        </div>
      )}


      {/* ======================================
          CUSTOMER PROFILE
      ====================================== */}
      {profileOpen && currentUser && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(15, 23, 42, 0.55)",
            padding: "24px",
            overflowY: "auto",
          }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeProfile();
            }
          }}
        >
          <div
            style={{
              maxWidth: "1120px",
              margin: "40px auto",
              background: "#ffffff",
              borderRadius: "28px",
              overflow: "hidden",
              boxShadow: "0 30px 80px rgba(15,23,42,.25)",
              minHeight: "620px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "24px 28px",
                borderBottom: "1px solid #e5e7eb",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: "12px",
                    fontWeight: 800,
                    letterSpacing: "1.4px",
                    color: "#64748b",
                  }}
                >
                  MY HOWDI
                </div>
                <h2 style={{ margin: "6px 0 0", fontSize: "28px" }}>
                  👋 {currentUser.full_name || currentUser.name || "Customer"}
                </h2>
              </div>

              <button
                type="button"
                onClick={closeProfile}
                style={{
                  width: "42px",
                  height: "42px",
                  borderRadius: "50%",
                  border: "1px solid #e5e7eb",
                  background: "#f8fafc",
                  fontSize: "20px",
                  cursor: "pointer",
                }}
              >
                ×
              </button>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "240px 1fr",
                minHeight: "540px",
              }}
            >
              <aside
                style={{
                  background: "#f8fafc",
                  padding: "22px 16px",
                  borderRight: "1px solid #e5e7eb",
                }}
              >
                {[
                  ["overview", "👤", "Profile"],
                  ["addresses", "📍", "Address Book"],
                  ["orders", "📦", "My Orders"],
                  ["wishlist", "❤️", "Wishlist"],
                  ["payments", "💳", "Payments"],
                  ["wallet", "💰", "HOWDI Wallet"],
                  ["messages", "💬", "Messages"],
                  ["learning", "🎓", "My Learning"],
                  ["subscription", "⭐", "Subscription"],
                  ["support", "🆘", "Help & Support"],
                ].map(([tab, icon, label]) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => {
                      if (tab === "wallet") {
                        openWalletSection("overview");
                      } else if (tab === "addresses") {
                        setProfileTab("addresses");
                        setAddressFormOpen(false);
                      } else {
                        setProfileTab(tab);
                        setAddressFormOpen(false);
                      }
                    }}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      padding: "12px 14px",
                      marginBottom: "6px",
                      border: 0,
                      borderRadius: "12px",
                      background:
                        profileTab === tab ? "#e2e8f0" : "transparent",
                      fontWeight: profileTab === tab ? 800 : 600,
                      color: "#0f172a",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <span>{icon}</span>
                    <span>{label}</span>
                  </button>
                ))}
              </aside>

              <section style={{ padding: "30px", background: "#fff" }}>
                {profileTab === "overview" && (
                  <>
                    <div style={{ marginBottom: "24px" }}>
                      <div
                        style={{
                          fontSize: "12px",
                          fontWeight: 800,
                          letterSpacing: "1px",
                          color: "#64748b",
                        }}
                      >
                        ACCOUNT OVERVIEW
                      </div>
                      <h3 style={{ fontSize: "24px", margin: "6px 0" }}>
                        Everything in one place
                      </h3>
                      <p style={{ color: "#64748b", marginTop: 0 }}>
                        Manage your HOWDI account, addresses, orders and rewards.
                      </p>
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "repeat(auto-fit, minmax(190px, 1fr))",
                        gap: "14px",
                      }}
                    >
                      {[
                        ["📍", "Address Book", `${addresses.length} saved`, "addresses"],
                        ["📦", "My Orders", "View your orders", "orders"],
                        ["❤️", "Wishlist", "Saved items", "wishlist"],
                        ["💰", "Wallet", "Balance & transactions", "wallet"],
                        ["🎁", "Rewards", "Points & benefits", "rewards"],
                        ["💬", "Messages", "Your HOWDI messages", "messages"],
                      ].map(([icon, title, textValue, tab]) => (
                        <button
                          key={title}
                          type="button"
                          onClick={() => setProfileTab(tab)}
                          style={{
                            textAlign: "left",
                            padding: "20px",
                            border: "1px solid #e2e8f0",
                            borderRadius: "18px",
                            background: "#fff",
                            cursor: "pointer",
                            boxShadow: "0 8px 24px rgba(15,23,42,.05)",
                          }}
                        >
                          <div style={{ fontSize: "28px" }}>{icon}</div>
                          <strong
                            style={{
                              display: "block",
                              marginTop: "12px",
                              fontSize: "16px",
                            }}
                          >
                            {title}
                          </strong>
                          <span
                            style={{
                              display: "block",
                              marginTop: "5px",
                              color: "#64748b",
                              fontSize: "13px",
                            }}
                          >
                            {textValue}
                          </span>
                        </button>
                      ))}
                    </div>

                    <div
                      style={{
                        marginTop: "22px",
                        padding: "20px",
                        borderRadius: "18px",
                        background: "#f8fafc",
                        border: "1px solid #e2e8f0",
                      }}
                    >
                      <strong>📍 Your default address</strong>
                      {addresses.find((item) => item.is_default) ? (
                        <p style={{ marginBottom: 0, color: "#475569" }}>
                          {addresses.find((item) => item.is_default).address_line1},{" "}
                          {addresses.find((item) => item.is_default).city},{" "}
                          {addresses.find((item) => item.is_default).pincode}
                        </p>
                      ) : (
                        <p style={{ marginBottom: 0, color: "#64748b" }}>
                          No default address yet. Add your first address.
                        </p>
                      )}
                      <button
                        type="button"
                        onClick={openAddressBook}
                        style={{
                          marginTop: "12px",
                          border: 0,
                          background: "transparent",
                          padding: 0,
                          fontWeight: 800,
                          cursor: "pointer",
                        }}
                      >
                        Manage addresses →
                      </button>
                    </div>
                  </>
                )}

                {profileTab === "addresses" && (
                  <>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: "16px",
                        alignItems: "center",
                        marginBottom: "22px",
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontSize: "12px",
                            fontWeight: 800,
                            letterSpacing: "1px",
                            color: "#64748b",
                          }}
                        >
                          📍 ADDRESS BOOK
                        </div>
                        <h3 style={{ fontSize: "24px", margin: "6px 0" }}>
                          Your saved addresses
                        </h3>
                        <p style={{ color: "#64748b", margin: 0 }}>
                          Save Home, Work and other addresses for faster checkout.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={openNewAddress}
                        style={{
                          border: 0,
                          borderRadius: "12px",
                          padding: "12px 16px",
                          background: "#0f172a",
                          color: "#fff",
                          fontWeight: 800,
                          cursor: "pointer",
                          whiteSpace: "nowrap",
                        }}
                      >
                        + Add Address
                      </button>
                    </div>

                    {addresses.length === 0 ? (
                      <div
                        style={{
                          textAlign: "center",
                          padding: "56px 20px",
                          border: "1px dashed #cbd5e1",
                          borderRadius: "20px",
                          background: "#f8fafc",
                        }}
                      >
                        <div style={{ fontSize: "48px" }}>📍</div>
                        <h4 style={{ fontSize: "20px", margin: "12px 0 6px" }}>
                          No addresses saved yet
                        </h4>
                        <p style={{ color: "#64748b" }}>
                          Add your first address to make HOWDI checkout faster.
                        </p>
                        <button
                          type="button"
                          onClick={openNewAddress}
                          style={{
                            border: 0,
                            borderRadius: "12px",
                            padding: "12px 18px",
                            background: "#0f172a",
                            color: "#fff",
                            fontWeight: 800,
                            cursor: "pointer",
                          }}
                        >
                          Add your first address
                        </button>
                      </div>
                    ) : (
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns:
                            "repeat(auto-fit, minmax(280px, 1fr))",
                          gap: "16px",
                        }}
                      >
                        {addresses.map((address) => (
                          <article
                            key={address.id}
                            style={{
                              border: address.is_default
                                ? "2px solid #0f172a"
                                : "1px solid #e2e8f0",
                              borderRadius: "18px",
                              padding: "20px",
                              background: "#fff",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                              }}
                            >
                              <strong>
                                {address.label === "Home"
                                  ? "🏠"
                                  : address.label === "Work"
                                  ? "💼"
                                  : "📍"}{" "}
                                {address.label}
                              </strong>

                              {address.is_default && (
                                <span
                                  style={{
                                    fontSize: "11px",
                                    fontWeight: 800,
                                    padding: "5px 8px",
                                    borderRadius: "999px",
                                    background: "#e2e8f0",
                                  }}
                                >
                                  DEFAULT
                                </span>
                              )}
                            </div>

                            <div style={{ marginTop: "14px", lineHeight: 1.6 }}>
                              <strong>{address.full_name}</strong>
                              <br />
                              {address.address_line1}
                              {address.address_line2 && (
                                <>
                                  <br />
                                  {address.address_line2}
                                </>
                              )}
                              <br />
                              {address.city}, {address.state} - {address.pincode}
                              <br />
                              📞 {address.phone}
                            </div>

                            <div
                              style={{
                                display: "flex",
                                gap: "8px",
                                flexWrap: "wrap",
                                marginTop: "16px",
                              }}
                            >
                              <button
                                type="button"
                                onClick={() => openEditAddress(address)}
                                style={{
                                  border: "1px solid #cbd5e1",
                                  background: "#fff",
                                  borderRadius: "10px",
                                  padding: "8px 12px",
                                  fontWeight: 700,
                                  cursor: "pointer",
                                }}
                              >
                                Edit
                              </button>

                              <button
                                type="button"
                                onClick={() => deleteAddress(address.id)}
                                style={{
                                  border: "1px solid #fecaca",
                                  background: "#fff",
                                  color: "#b91c1c",
                                  borderRadius: "10px",
                                  padding: "8px 12px",
                                  fontWeight: 700,
                                  cursor: "pointer",
                                }}
                              >
                                Delete
                              </button>

                              {!address.is_default && (
                                <button
                                  type="button"
                                  onClick={() => setDefaultAddress(address.id)}
                                  style={{
                                    border: 0,
                                    background: "#0f172a",
                                    color: "#fff",
                                    borderRadius: "10px",
                                    padding: "8px 12px",
                                    fontWeight: 700,
                                    cursor: "pointer",
                                  }}
                                >
                                  Set Default
                                </button>
                              )}
                            </div>
                          </article>
                        ))}
                      </div>
                    )}

                    {addressFormOpen && (
                      <div
                        style={{
                          position: "fixed",
                          inset: 0,
                          zIndex: 10001,
                          background: "rgba(15,23,42,.55)",
                          padding: "20px",
                          overflowY: "auto",
                        }}
                      >
                        <form
                          onSubmit={saveAddress}
                          onMouseDown={(event) => event.stopPropagation()}
                          style={{
                            maxWidth: "680px",
                            margin: "40px auto",
                            background: "#fff",
                            borderRadius: "24px",
                            padding: "28px",
                            boxShadow: "0 30px 80px rgba(15,23,42,.25)",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                            }}
                          >
                            <div>
                              <div
                                style={{
                                  fontSize: "12px",
                                  fontWeight: 800,
                                  color: "#64748b",
                                  letterSpacing: "1px",
                                }}
                              >
                                {editingAddressId ? "EDIT ADDRESS" : "NEW ADDRESS"}
                              </div>
                              <h3 style={{ margin: "6px 0", fontSize: "24px" }}>
                                {editingAddressId
                                  ? "Update your address"
                                  : "Add a new address"}
                              </h3>
                            </div>

                            <button
                              type="button"
                              onClick={() => setAddressFormOpen(false)}
                              style={{
                                width: "40px",
                                height: "40px",
                                borderRadius: "50%",
                                border: "1px solid #e2e8f0",
                                background: "#f8fafc",
                                cursor: "pointer",
                                fontSize: "18px",
                              }}
                            >
                              ×
                            </button>
                          </div>

                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns:
                                "repeat(auto-fit, minmax(220px, 1fr))",
                              gap: "14px",
                              marginTop: "22px",
                            }}
                          >
                            {[
                              ["label", "Address type", "Home"],
                              ["full_name", "Full name", "Bhaskar Badavath"],
                              ["phone", "Mobile number", "10-digit mobile number"],
                              ["address_line1", "Address line 1", "House / Flat / Street"],
                              ["address_line2", "Address line 2 (optional)", "Landmark / Area"],
                              ["city", "City", "Khammam"],
                              ["state", "State", "Telangana"],
                              ["pincode", "Pincode", "507001"],
                            ].map(([field, label, placeholder]) => (
                              <label
                                key={field}
                                style={{
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: "7px",
                                  gridColumn:
                                    field === "address_line1" ||
                                    field === "address_line2"
                                      ? "1 / -1"
                                      : "auto",
                                }}
                              >
                                <span
                                  style={{
                                    fontSize: "13px",
                                    fontWeight: 800,
                                    color: "#334155",
                                  }}
                                >
                                  {label}
                                </span>

                                <input
                                  value={addressForm[field]}
                                  onChange={(event) => {
                                    let value = event.target.value;

                                    if (field === "pincode") {
                                      value = value.replace(/\D/g, "").slice(0, 6);
                                    }

                                    if (field === "phone") {
                                      value = value.replace(/\D/g, "").slice(0, 10);
                                    }

                                    setAddressForm({
                                      ...addressForm,
                                      [field]: value,
                                    });
                                  }}
                                  placeholder={placeholder}
                                  inputMode={
                                    field === "phone" || field === "pincode"
                                      ? "numeric"
                                      : "text"
                                  }
                                  maxLength={
                                    field === "pincode"
                                      ? 6
                                      : field === "phone"
                                      ? 10
                                      : undefined
                                  }
                                  required={
                                    ![
                                      "address_line2",
                                    ].includes(field)
                                  }
                                  style={{
                                    width: "100%",
                                    boxSizing: "border-box",
                                    border: "1px solid #cbd5e1",
                                    borderRadius: "11px",
                                    padding: "12px 13px",
                                    fontSize: "14px",
                                    outline: "none",
                                  }}
                                />
                              </label>
                            ))}
                          </div>

                          <div
                            style={{
                              display: "flex",
                              justifyContent: "flex-end",
                              gap: "10px",
                              marginTop: "24px",
                            }}
                          >
                            <button
                              type="button"
                              onClick={() => setAddressFormOpen(false)}
                              style={{
                                border: "1px solid #cbd5e1",
                                background: "#fff",
                                borderRadius: "11px",
                                padding: "12px 18px",
                                fontWeight: 800,
                                cursor: "pointer",
                              }}
                            >
                              Cancel
                            </button>

                            <button
                              type="submit"
                              style={{
                                border: 0,
                                background: "#0f172a",
                                color: "#fff",
                                borderRadius: "11px",
                                padding: "12px 20px",
                                fontWeight: 800,
                                cursor: "pointer",
                              }}
                            >
                              {editingAddressId
                                ? "Save Changes"
                                : "Save Address"}
                            </button>
                          </div>
                        </form>
                      </div>
                    )}
                  </>
                )}

                {profileTab === "orders" && (
                  <>
                    <div style={{ marginBottom: "22px" }}>
                      <div style={{ fontSize: "12px", fontWeight: 800, letterSpacing: "1.2px", color: "#64748b" }}>
                        📦 MY ORDERS
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px", flexWrap: "wrap" }}>
                        <div>
                          <h3 style={{ fontSize: "28px", margin: "6px 0" }}>Your orders, all in one place</h3>
                          <p style={{ color: "#64748b", margin: 0 }}>Track purchases, service bookings and order history.</p>
                        </div>
                        <button type="button" onClick={() => { closeProfile(); navigate("shop"); }} style={{ border: 0, borderRadius: "12px", padding: "12px 16px", background: "#0f172a", color: "#fff", fontWeight: 800, cursor: "pointer" }}>
                          🛍️ Continue Shopping
                        </button>
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: "10px", marginBottom: "20px" }}>
                      {[
                        ["all", "All", orders.length],
                        ["active", "Active", orders.filter(o => !["delivered", "cancelled", "canceled"].includes(String(o.status || "processing").toLowerCase())).length],
                        ["completed", "Completed", orders.filter(o => String(o.status || "").toLowerCase() === "delivered").length],
                        ["cancelled", "Cancelled", orders.filter(o => ["cancelled", "canceled"].includes(String(o.status || "").toLowerCase())).length],
                      ].map(([filter, label, count]) => (
                        <button key={filter} type="button" onClick={() => setOrderFilter(filter)} style={{ border: orderFilter === filter ? "2px solid #0f172a" : "1px solid #e2e8f0", background: orderFilter === filter ? "#f1f5f9" : "#fff", borderRadius: "14px", padding: "12px 8px", cursor: "pointer", fontWeight: 800 }}>
                          {label} <span style={{ color: "#64748b" }}>{count}</span>
                        </button>
                      ))}
                    </div>

                    {filteredOrders.length === 0 ? (
                      <div style={{ textAlign: "center", padding: "58px 24px", border: "1px dashed #cbd5e1", borderRadius: "22px", background: "linear-gradient(180deg,#f8fafc,#fff)" }}>
                        <div style={{ fontSize: "58px" }}>📦</div>
                        <h4 style={{ fontSize: "22px", margin: "14px 0 8px" }}>
                          {orders.length === 0 ? "No orders yet" : "No orders in this category"}
                        </h4>
                        <p style={{ color: "#64748b", maxWidth: "440px", margin: "0 auto 20px", lineHeight: 1.6 }}>
                          {orders.length === 0 ? "Your HOWDI purchases and service bookings will appear here automatically after checkout." : "Try another order filter to see your history."}
                        </p>
                        {orders.length === 0 && (
                          <button type="button" onClick={() => { closeProfile(); navigate("shop"); }} style={{ border: 0, borderRadius: "12px", padding: "12px 20px", background: "#0f172a", color: "#fff", fontWeight: 800, cursor: "pointer" }}>
                            Explore HOWDI →
                          </button>
                        )}
                      </div>
                    ) : (
                      <div style={{ display: "grid", gap: "14px" }}>
                        {filteredOrders.map((order) => {
                          const status = orderStatusLabel(order.status);
                          const itemCount = order.item_count ?? (Array.isArray(order.items) ? order.items.length : 1);
                          return (
                            <article key={order.id || order.order_id} style={{ border: "1px solid #e2e8f0", borderRadius: "20px", padding: "18px", background: "#fff", boxShadow: "0 8px 24px rgba(15,23,42,.04)" }}>
                              <div style={{ display: "flex", justifyContent: "space-between", gap: "14px", alignItems: "flex-start", flexWrap: "wrap" }}>
                                <div>
                                  <div style={{ fontSize: "12px", fontWeight: 800, color: "#64748b" }}>ORDER #{order.order_number || order.id || "—"}</div>
                                  <h4 style={{ margin: "6px 0 4px", fontSize: "18px" }}>{order.title || order.shop || "HOWDI Order"}</h4>
                                  <div style={{ color: "#64748b", fontSize: "13px" }}>{formatOrderDate(order.created_at || order.date)} · {itemCount} {itemCount === 1 ? "item" : "items"}</div>
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                  <span style={{ padding: "7px 10px", borderRadius: "999px", background: status === "Delivered" ? "#dcfce7" : status === "Cancelled" ? "#fee2e2" : "#fef3c7", color: status === "Delivered" ? "#166534" : status === "Cancelled" ? "#991b1b" : "#92400e", fontSize: "12px", fontWeight: 800 }}>{status}</span>
                                  <strong style={{ fontSize: "18px" }}>{order.total || order.amount || "₹0"}</strong>
                                </div>
                              </div>
                              <div style={{ marginTop: "16px", paddingTop: "14px", borderTop: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                                <span style={{ color: "#64748b", fontSize: "13px" }}>{status === "Delivered" ? "Delivered successfully." : status === "Cancelled" ? "Order cancelled." : "Your order is being processed."}</span>
                                <button type="button" onClick={() => setSelectedOrder(order)} style={{ border: "1px solid #cbd5e1", background: "#fff", borderRadius: "10px", padding: "9px 13px", fontWeight: 800, cursor: "pointer" }}>View details →</button>
                              </div>
                            </article>
                          );
                        })}
                      </div>
                    )}

                    {selectedOrder && (
                      <div style={{ position: "fixed", inset: 0, zIndex: 10002, background: "rgba(15,23,42,.58)", padding: "20px", overflowY: "auto" }} onMouseDown={(e) => e.target === e.currentTarget && setSelectedOrder(null)}>
                        <div style={{ maxWidth: "620px", margin: "50px auto", background: "#fff", borderRadius: "24px", padding: "26px", boxShadow: "0 30px 80px rgba(15,23,42,.25)" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                            <div><div style={{ fontSize: "12px", fontWeight: 800, color: "#64748b" }}>ORDER DETAILS</div><h3 style={{ margin: "6px 0", fontSize: "24px" }}>#{selectedOrder.order_number || selectedOrder.id || "—"}</h3></div>
                            <button type="button" onClick={() => setSelectedOrder(null)} style={{ width: "40px", height: "40px", borderRadius: "50%", border: "1px solid #e2e8f0", background: "#f8fafc", cursor: "pointer", fontSize: "18px" }}>×</button>
                          </div>
                          <div style={{ marginTop: "18px", padding: "16px", borderRadius: "16px", background: "#f8fafc" }}><strong>{selectedOrder.title || selectedOrder.shop || "HOWDI Order"}</strong><div style={{ marginTop: "6px", color: "#64748b" }}>{formatOrderDate(selectedOrder.created_at || selectedOrder.date)}</div></div>
                          <div style={{ marginTop: "20px" }}><strong>Current status: {orderStatusLabel(selectedOrder.status)}</strong></div>
                          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "24px", paddingTop: "18px", borderTop: "1px solid #e2e8f0" }}><span style={{ color: "#64748b" }}>Total</span><strong style={{ fontSize: "20px" }}>{selectedOrder.total || selectedOrder.amount || "₹0"}</strong></div>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {profileTab === "wishlist" && (
                  <div>
                    <div style={{ marginBottom: "24px" }}>
                      <div style={{ fontSize: "12px", fontWeight: 800, letterSpacing: "1px", color: "#64748b" }}>
                        ❤️ YOUR WISHLIST
                      </div>
                      <h3 style={{ fontSize: "28px", margin: "6px 0" }}>Saved for later</h3>
                      <p style={{ color: "#64748b", marginTop: 0 }}>
                        Keep the products you love in one place.
                      </p>
                    </div>

                    {wishlist.length === 0 ? (
                      <div style={{ minHeight: "320px", border: "1px dashed #cbd5e1", borderRadius: "22px", display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", background: "#f8fafc", padding: "30px" }}>
                        <div>
                          <div style={{ fontSize: "58px" }}>❤️</div>
                          <h3 style={{ fontSize: "24px", margin: "12px 0 8px" }}>Your Wishlist is empty</h3>
                          <p style={{ color: "#64748b", maxWidth: "430px", margin: "0 auto 20px" }}>
                            Tap the <strong>♡ Like</strong> button on any product to save it here.
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              setProfileOpen(false);
                              navigate("shop");
                            }}
                            style={{ border: 0, borderRadius: "12px", padding: "13px 18px", background: "#0f172a", color: "#fff", fontWeight: 800, cursor: "pointer" }}
                          >
                            Browse Products →
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" }}>
                        {wishlist.map((product) => (
                          <article key={product.name} style={{ border: "1px solid #e2e8f0", borderRadius: "18px", overflow: "hidden", background: "#fff", boxShadow: "0 8px 24px rgba(15,23,42,.06)" }}>
                            <div style={{ height: "150px", background: "#e7e0cf", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "64px", position: "relative" }}>
                              {product.icon}
                              <button
                                type="button"
                                onClick={() => toggleWishlist(product)}
                                style={{ position: "absolute", top: "12px", right: "12px", border: "1px solid #fecdd3", borderRadius: "999px", background: "#fff1f2", color: "#e11d48", padding: "8px 11px", fontWeight: 800, cursor: "pointer" }}
                              >
                                ♥ Liked
                              </button>
                            </div>
                            <div style={{ padding: "16px" }}>
                              <div style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "1px", color: "#9a6b25", fontWeight: 800 }}>
                                {product.shop}
                              </div>
                              <h4 style={{ margin: "7px 0", fontSize: "18px" }}>{product.name}</h4>
                              <strong style={{ fontSize: "18px" }}>{product.price}</strong>
                            </div>
                          </article>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {profileTab === "payments" && (
                  <div style={{ minHeight: "420px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "18px", marginBottom: "24px" }}>
                      <div>
                        <div style={{ fontSize: "12px", fontWeight: 800, letterSpacing: "1px", color: "#64748b" }}>PAYMENT METHODS</div>
                        <h3 style={{ fontSize: "26px", margin: "6px 0" }}>Your saved payments</h3>
                        <p style={{ color: "#64748b", margin: 0 }}>Save UPI, card or bank details for faster checkout.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setPaymentMessage("");
                          setPaymentFormOpen((open) => !open);
                        }}
                        style={{ border: 0, borderRadius: "12px", padding: "12px 18px", background: "#365947", color: "#fff", fontWeight: 800, cursor: "pointer", whiteSpace: "nowrap" }}
                      >
                        {paymentFormOpen ? "✕ Close" : "+ Add payment"}
                      </button>
                    </div>

                    {paymentFormOpen && (
                      <div style={{ padding: "20px", border: "1px solid #dbe3dc", borderRadius: "18px", background: "#f8faf8", marginBottom: "18px" }}>
                        <div style={{ display: "grid", gap: "16px" }}>
                          <div style={{ display: "grid", gridTemplateColumns: "180px 1fr", gap: "14px" }}>
                            <label style={{ fontSize: "12px", fontWeight: 800, color: "#475569" }}>
                              <span style={{ display: "block", marginBottom: "7px" }}>PAYMENT TYPE</span>
                              <select
                                value={paymentType}
                                onChange={(e) => handlePaymentTypeChange(e.target.value)}
                                style={{ width: "100%", height: "46px", border: "1px solid #cbd5e1", borderRadius: "10px", padding: "0 10px", background: "#fff", fontSize: "14px" }}
                              >
                                <option value="UPI">UPI</option>
                                <option value="CARD">Debit / Credit Card</option>
                                <option value="BANK">Bank Account</option>
                              </select>
                            </label>

                            <label style={{ fontSize: "12px", fontWeight: 800, color: "#475569" }}>
                              <span style={{ display: "block", marginBottom: "7px" }}>
                                {paymentType === "UPI" ? "UPI ID" : paymentType === "CARD" ? "CARD NUMBER" : "ACCOUNT NUMBER"}
                              </span>
                              <input
                                value={paymentValue}
                                onChange={(e) => {
                                  setPaymentMessage("");
                                  setPaymentValue(e.target.value);
                                }}
                                inputMode={paymentType === "UPI" ? "email" : "numeric"}
                                autoComplete="off"
                                placeholder={paymentType === "UPI" ? "bhaskar@upi" : paymentType === "CARD" ? "1234 5678 9012 3456" : "Enter bank account number"}
                                style={{ width: "100%", height: "46px", boxSizing: "border-box", border: "1px solid #cbd5e1", borderRadius: "10px", padding: "0 12px", background: "#fff", fontSize: "14px" }}
                              />
                            </label>
                          </div>

                          {paymentType !== "UPI" && (
                            <div style={{ display: "grid", gridTemplateColumns: paymentType === "CARD" ? "1fr 180px" : "1fr", gap: "14px" }}>
                              <label style={{ fontSize: "12px", fontWeight: 800, color: "#475569" }}>
                                <span style={{ display: "block", marginBottom: "7px" }}>{paymentType === "CARD" ? "CARD HOLDER NAME" : "ACCOUNT HOLDER NAME"}</span>
                                <input
                                  value={paymentHolder}
                                  onChange={(e) => {
                                    setPaymentMessage("");
                                    setPaymentHolder(e.target.value);
                                  }}
                                  placeholder="Full name"
                                  autoComplete="off"
                                  style={{ width: "100%", height: "46px", boxSizing: "border-box", border: "1px solid #cbd5e1", borderRadius: "10px", padding: "0 12px", background: "#fff", fontSize: "14px" }}
                                />
                              </label>

                              {paymentType === "CARD" && (
                                <label style={{ fontSize: "12px", fontWeight: 800, color: "#475569" }}>
                                  <span style={{ display: "block", marginBottom: "7px" }}>EXPIRY</span>
                                  <input
                                    value={paymentExpiry}
                                    onChange={(e) => {
                                      setPaymentMessage("");
                                      const digits = e.target.value.replace(/\D/g, "").slice(0, 4);
                                      setPaymentExpiry(digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits);
                                    }}
                                    inputMode="numeric"
                                    placeholder="MM/YY"
                                    maxLength={5}
                                    style={{ width: "100%", height: "46px", boxSizing: "border-box", border: "1px solid #cbd5e1", borderRadius: "10px", padding: "0 12px", background: "#fff", fontSize: "14px" }}
                                  />
                                </label>
                              )}
                            </div>
                          )}

                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
                            <div style={{ color: "#64748b", fontSize: "12px" }}>🔒 Card and bank numbers are saved only as the last 4 digits in this prototype.</div>
                            <button
                              type="button"
                              onClick={addPaymentMethod}
                              style={{ minWidth: "130px", height: "46px", border: 0, borderRadius: "10px", padding: "0 20px", background: "#0f172a", color: "#fff", fontWeight: 900, cursor: "pointer" }}
                            >
                              Save payment
                            </button>
                          </div>
                        </div>
                        {paymentMessage && (
                          <div style={{ marginTop: "12px", padding: "10px 12px", borderRadius: "10px", background: paymentMessage.includes("successfully") ? "#ecfdf3" : "#fff1f2", color: paymentMessage.includes("successfully") ? "#166534" : "#b91c1c", fontSize: "13px", fontWeight: 800 }}>
                            {paymentMessage}
                          </div>
                        )}
                      </div>
                    )}

                    {paymentMethods.length === 0 ? (
                      <div style={{ minHeight: "250px", display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", border: "1px dashed #cbd5e1", borderRadius: "18px", background: "#f8fafc" }}>
                        <div>
                          <div style={{ fontSize: "52px" }}>💳</div>
                          <h4 style={{ fontSize: "20px", margin: "10px 0 6px" }}>No payment methods saved</h4>
                          <p style={{ color: "#64748b", margin: 0 }}>Click <strong>+ Add payment</strong> above to add UPI, card or bank details.</p>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: "grid", gap: "12px" }}>
                        {paymentMethods.map((method) => (
                          <div key={method.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "14px", padding: "16px 18px", border: "1px solid #e2e8f0", borderRadius: "16px", background: "#fff" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                              <div style={{ width: "44px", height: "44px", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", background: "#eef2ff", fontSize: "22px" }}>{method.type === "UPI" ? "📱" : method.type === "CARD" ? "💳" : "🏦"}</div>
                              <div>
                                <div style={{ fontWeight: 800 }}>{method.label}</div>
                                <div style={{ color: "#64748b", fontSize: "14px", marginTop: "3px" }}>{method.value}</div>
                                {method.holder && <div style={{ color: "#64748b", fontSize: "12px", marginTop: "3px" }}>{method.holder}{method.expiry ? ` • Exp ${method.expiry}` : ""}</div>}
                              </div>
                            </div>
                            <button type="button" onClick={() => removePaymentMethod(method.id)} style={{ border: "1px solid #fecaca", borderRadius: "10px", padding: "8px 12px", background: "#fff1f2", color: "#b91c1c", fontWeight: 800, cursor: "pointer" }}>Remove</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {profileTab === "wallet" && (
                  <div style={{ minHeight: "420px" }}>
                    <div style={{ marginBottom: "18px" }}>
                      <div style={{ fontSize: "12px", fontWeight: 800, letterSpacing: "1px", color: "#64748b" }}>HOWDI WALLET</div>
                      <h3 style={{ fontSize: "28px", margin: "6px 0" }}>Your money, cashback & rewards</h3>
                      <p style={{ color: "#64748b", margin: 0 }}>Manage your HOWDI balance, cashback and rewards in one place.</p>
                    </div>

                    <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "18px" }}>
                      {[['overview','💰','Wallet'],['cashback','💸','Cashback'],['rewards','🎁','Rewards']].map(([section, icon, label]) => (
                        <button key={section} type="button" onClick={() => openWalletSection(section)} style={{ border: walletSection === section ? 0 : "1px solid #dbe3dc", borderRadius: "999px", padding: "10px 16px", background: walletSection === section ? "#365947" : "#fff", color: walletSection === section ? "#fff" : "#334155", fontWeight: 800, cursor: "pointer" }}>
                          {icon} {label}
                        </button>
                      ))}
                    </div>

                    {walletSection === "overview" && (
                      <>
                        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.5fr) minmax(260px, .8fr)", gap: "16px", marginBottom: "16px" }}>
                          <div style={{ borderRadius: "22px", padding: "26px", background: "#244d3b", color: "#fff", minHeight: "130px" }}>
                            <div style={{ fontSize: "12px", fontWeight: 800, opacity: .82, letterSpacing: "1px" }}>AVAILABLE BALANCE</div>
                            <div style={{ fontSize: "38px", fontWeight: 900, marginTop: "8px" }}>₹{walletBalance.toLocaleString("en-IN")}</div>
                            <div style={{ opacity: .78, marginTop: "6px" }}>HOWDI Wallet • Ready to use</div>
                          </div>
                          <div style={{ border: "1px solid #dbe3dc", borderRadius: "22px", padding: "22px", background: "#f8faf8" }}>
                            <div style={{ fontWeight: 800, marginBottom: "10px" }}>Add money</div>
                            <div style={{ display: "flex", gap: "8px" }}>
                              <input value={walletAmount} onChange={(e) => { setWalletMessage(""); setWalletAmount(e.target.value.replace(/[^0-9.]/g, "")); }} inputMode="decimal" placeholder="₹ Amount" style={{ minWidth: 0, flex: 1, height: "44px", boxSizing: "border-box", border: "1px solid #cbd5e1", borderRadius: "10px", padding: "0 12px", background: "#fff" }} />
                              <button type="button" onClick={addWalletMoney} style={{ border: 0, borderRadius: "10px", padding: "0 18px", background: "#0f172a", color: "#fff", fontWeight: 900, cursor: "pointer" }}>Add</button>
                            </div>
                            {walletMessage && <div style={{ marginTop: "9px", color: "#166534", fontSize: "12px", fontWeight: 800 }}>{walletMessage}</div>}
                          </div>
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.3fr) minmax(260px, .8fr)", gap: "16px", marginBottom: "16px" }}>
                          <div style={{ border: "1px solid #e2e8f0", borderRadius: "18px", padding: "20px", background: "#fff" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                              <strong style={{ fontSize: "18px" }}>💸 Cashback Overview</strong>
                              <button type="button" onClick={() => openWalletSection("cashback")} style={{ border: "1px solid #b7cdbf", background: "#fff", color: "#365947", borderRadius: "999px", padding: "8px 12px", fontWeight: 800, cursor: "pointer" }}>View cashback →</button>
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", marginTop: "18px" }}>
                              {[[`₹${cashbackStats.total}`,"Total earned"],[`₹${cashbackStats.available}`,"Available"],[`₹${cashbackStats.pending}`,"Pending"]].map(([value,label],i)=><div key={label} style={{ padding: "4px 14px", borderLeft: i ? "1px solid #e2e8f0" : 0 }}><div style={{ fontSize: "24px", fontWeight: 900 }}>{value}</div><div style={{ color: "#64748b", fontSize: "12px", marginTop: "4px" }}>{label}</div></div>)}
                            </div>
                          </div>
                          <div style={{ border: "1px solid #e2e8f0", borderRadius: "18px", padding: "20px", background: "#fff" }}>
                            <div style={{ fontWeight: 800, fontSize: "18px" }}>🎁 Reward Points</div>
                            <div style={{ fontSize: "28px", fontWeight: 900, marginTop: "12px" }}>{rewardPoints.toLocaleString("en-IN")} pts</div>
                            <div style={{ color: "#64748b", fontSize: "12px", margin: "4px 0 14px" }}>Redeem 500 pts = ₹50</div>
                            <button type="button" onClick={redeemRewards} disabled={rewardPoints < 500} style={{ border: 0, borderRadius: "10px", padding: "10px 14px", background: rewardPoints >= 500 ? "#365947" : "#cbd5e1", color: "#fff", fontWeight: 900, cursor: rewardPoints >= 500 ? "pointer" : "not-allowed" }}>🎁 Redeem now</button>
                          </div>
                        </div>

                        <div style={{ border: "1px solid #e2e8f0", borderRadius: "18px", overflow: "hidden", background: "#fff" }}>
                          <div style={{ padding: "16px 18px", borderBottom: "1px solid #e2e8f0", fontWeight: 900 }}>Recent wallet activity</div>
                          {walletTransactions.slice(0, 6).map((tx) => (
                            <div key={tx.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "14px", padding: "16px 18px", borderBottom: "1px solid #f1f5f9" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}><div style={{ width: "38px", height: "38px", borderRadius: "12px", background: "#ecfdf3", display: "flex", alignItems: "center", justifyContent: "center" }}>↓</div><div><div style={{ fontWeight: 800 }}>{tx.title}</div><div style={{ color: "#64748b", fontSize: "12px", marginTop: "3px" }}>{tx.date}</div></div></div>
                              <strong style={{ color: "#166534" }}>+₹{Number(tx.amount || 0).toLocaleString("en-IN")}</strong>
                            </div>
                          ))}
                        </div>
                      </>
                    )}

                    {walletSection === "cashback" && (
                      <div style={{ display: "grid", gap: "14px" }}>
                        <div style={{ border: "1px solid #e2e8f0", borderRadius: "18px", padding: "20px", background: "#fff" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap" }}><div><div style={{ fontSize: "12px", fontWeight: 800, color: "#64748b", letterSpacing: "1px" }}>CASHBACK</div><h4 style={{ fontSize: "22px", margin: "6px 0" }}>Earn more on every purchase</h4><p style={{ color: "#64748b", margin: 0 }}>Available cashback can be moved into your HOWDI Wallet.</p></div><button type="button" onClick={moveCashbackToWallet} disabled={!cashbackStats.available} style={{ border: 0, borderRadius: "10px", padding: "11px 15px", background: cashbackStats.available ? "#365947" : "#cbd5e1", color: "#fff", fontWeight: 900, cursor: cashbackStats.available ? "pointer" : "not-allowed" }}>Transfer ₹{cashbackStats.available} to wallet →</button></div>
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "10px", marginTop: "20px" }}>{[[cashbackStats.total,"Total earned"],[cashbackStats.available,"Available"],[cashbackStats.pending,"Pending"]].map(([value,label])=><div key={label} style={{ padding: "16px", borderRadius: "14px", background: "#f8faf8" }}><div style={{ fontSize: "24px", fontWeight: 900 }}>₹{value}</div><div style={{ color: "#64748b", fontSize: "12px" }}>{label}</div></div>)}</div>
                        </div>
                        <div style={{ border: "1px solid #e2e8f0", borderRadius: "18px", overflow: "hidden", background: "#fff" }}><div style={{ padding: "16px 18px", fontWeight: 900 }}>Cashback history</div>{cashbackHistory.map((item)=><div key={item.id} style={{ display: "flex", justifyContent: "space-between", padding: "15px 18px", borderTop: "1px solid #f1f5f9", gap: "12px" }}><div><div style={{ fontWeight: 800 }}>{item.title}</div><div style={{ color: "#64748b", fontSize: "12px" }}>{item.date} · {item.status}</div></div><strong style={{ color: "#166534" }}>+₹{item.amount}</strong></div>)}</div>
                      </div>
                    )}

                    {walletSection === "rewards" && (
                      <div style={{ display: "grid", gap: "14px" }}>
                        <div style={{ border: "1px solid #e2e8f0", borderRadius: "18px", padding: "22px", background: "#fff" }}><div style={{ fontSize: "12px", fontWeight: 800, color: "#64748b", letterSpacing: "1px" }}>REWARDS</div><h4 style={{ fontSize: "24px", margin: "6px 0" }}>{rewardPoints.toLocaleString("en-IN")} points available</h4><p style={{ color: "#64748b" }}>Every 500 points can be redeemed for ₹50 wallet credit.</p><button type="button" onClick={redeemRewards} disabled={rewardPoints < 500} style={{ border: 0, borderRadius: "10px", padding: "11px 15px", background: rewardPoints >= 500 ? "#365947" : "#cbd5e1", color: "#fff", fontWeight: 900, cursor: rewardPoints >= 500 ? "pointer" : "not-allowed" }}>🎁 Redeem 500 points → ₹50</button></div>
                        <div style={{ border: "1px solid #e2e8f0", borderRadius: "18px", overflow: "hidden", background: "#fff" }}><div style={{ padding: "16px 18px", fontWeight: 900 }}>Reward history</div>{walletRewards.map((item)=><div key={item.id} style={{ display: "flex", justifyContent: "space-between", padding: "15px 18px", borderTop: "1px solid #f1f5f9", gap: "12px" }}><div><div style={{ fontWeight: 800 }}>{item.title}</div><div style={{ color: "#64748b", fontSize: "12px" }}>{item.date}</div></div><strong style={{ color: item.points < 0 ? "#b45309" : "#166534" }}>{item.points > 0 ? "+" : ""}{item.points} pts</strong></div>)}</div>
                      </div>
                    )}
                  </div>
                )}

                {profileTab === "messages" && (
                  <div style={{ minHeight: "420px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "18px", flexWrap: "wrap", marginBottom: "22px" }}>
                      <div>
                        <div style={{ fontSize: "12px", fontWeight: 800, letterSpacing: "1px", color: "#64748b" }}>HOWDI MESSAGES</div>
                        <h3 style={{ fontSize: "28px", margin: "6px 0" }}>Your messages {unreadMessageCount > 0 && <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: "28px", height: "28px", padding: "0 7px", borderRadius: "999px", background: "#365947", color: "#fff", fontSize: "13px", verticalAlign: "middle" }}>{unreadMessageCount}</span>}</h3>
                        <p style={{ color: "#64748b", margin: 0 }}>Stay updated with orders, offers, wallet activity and HOWDI support.</p>
                      </div>
                      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                        <button type="button" onClick={markAllMessagesRead} disabled={!unreadMessageCount} style={{ border: "1px solid #dbe3dc", borderRadius: "10px", padding: "10px 13px", background: "#fff", color: unreadMessageCount ? "#365947" : "#94a3b8", fontWeight: 800, cursor: unreadMessageCount ? "pointer" : "not-allowed" }}>✓ Mark all read</button>
                        <button type="button" onClick={() => setMessageComposeOpen((open) => !open)} style={{ border: 0, borderRadius: "10px", padding: "10px 15px", background: "#365947", color: "#fff", fontWeight: 900, cursor: "pointer" }}>{messageComposeOpen ? "✕ Close" : "+ New message"}</button>
                      </div>
                    </div>

                    {messageComposeOpen && (
                      <div style={{ padding: "18px", border: "1px solid #dbe3dc", borderRadius: "18px", background: "#f8faf8", marginBottom: "16px" }}>
                        <div style={{ display: "grid", gap: "10px" }}>
                          <input value={messageRecipient} onChange={(e) => setMessageRecipient(e.target.value)} placeholder="Recipient / support team" style={{ width: "100%", height: "44px", boxSizing: "border-box", border: "1px solid #cbd5e1", borderRadius: "10px", padding: "0 12px", background: "#fff" }} />
                          <textarea value={messageBody} onChange={(e) => setMessageBody(e.target.value)} placeholder="Write your message..." rows={3} style={{ width: "100%", boxSizing: "border-box", border: "1px solid #cbd5e1", borderRadius: "10px", padding: "12px", background: "#fff", resize: "vertical", fontFamily: "inherit" }} />
                          <div style={{ display: "flex", justifyContent: "flex-end" }}><button type="button" onClick={sendHowdiMessage} style={{ border: 0, borderRadius: "10px", padding: "10px 18px", background: "#0f172a", color: "#fff", fontWeight: 900, cursor: "pointer" }}>Send message →</button></div>
                        </div>
                      </div>
                    )}

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 220px", gap: "12px", marginBottom: "16px" }}>
                      <input value={messageSearch} onChange={(e) => setMessageSearch(e.target.value)} placeholder="🔎 Search messages" style={{ width: "100%", height: "44px", boxSizing: "border-box", border: "1px solid #dbe3dc", borderRadius: "12px", padding: "0 13px", background: "#fff" }} />
                      <select value={messageFilter} onChange={(e) => setMessageFilter(e.target.value)} style={{ height: "44px", border: "1px solid #dbe3dc", borderRadius: "12px", padding: "0 12px", background: "#fff", fontWeight: 700, color: "#334155" }}>
                        <option value="all">All messages</option>
                        <option value="unread">Unread</option>
                        <option value="order">Orders</option>
                        <option value="offer">Offers</option>
                        <option value="wallet">Wallet</option>
                        <option value="account">Account</option>
                      </select>
                    </div>

                    {filteredMessages.length === 0 ? (
                      <div style={{ minHeight: "250px", display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", border: "1px dashed #cbd5e1", borderRadius: "18px", background: "#f8fafc" }}>
                        <div><div style={{ fontSize: "48px" }}>💬</div><h4 style={{ fontSize: "20px", margin: "10px 0 6px" }}>No messages found</h4><p style={{ color: "#64748b", margin: 0 }}>Try another filter or search term.</p></div>
                      </div>
                    ) : (
                      <div style={{ display: "grid", gap: "10px" }}>
                        {filteredMessages.map((item) => (
                          <div key={item.id} style={{ display: "flex", alignItems: "flex-start", gap: "13px", padding: "16px", border: item.unread ? "1px solid #b7cdbf" : "1px solid #e2e8f0", borderRadius: "16px", background: item.unread ? "#f8faf8" : "#fff", boxShadow: item.unread ? "0 5px 16px rgba(54,89,71,.06)" : "none" }}>
                            <div style={{ width: "44px", height: "44px", flex: "0 0 44px", borderRadius: "13px", display: "flex", alignItems: "center", justifyContent: "center", background: item.unread ? "#e5f2e9" : "#f1f5f9", fontSize: "22px" }}>{item.icon}</div>
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", alignItems: "flex-start" }}>
                                <div style={{ fontWeight: item.unread ? 900 : 800 }}>{item.title}{item.unread && <span style={{ display: "inline-block", width: "7px", height: "7px", borderRadius: "50%", background: "#365947", marginLeft: "7px", verticalAlign: "middle" }} />}</div>
                                <div style={{ color: "#94a3b8", fontSize: "11px", whiteSpace: "nowrap" }}>{item.date}</div>
                              </div>
                              <div style={{ color: "#64748b", fontSize: "13px", lineHeight: 1.5, marginTop: "5px" }}>{item.text}</div>
                              <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
                                {item.unread && <button type="button" onClick={() => markMessageRead(item.id)} style={{ border: 0, borderRadius: "8px", padding: "7px 10px", background: "#e7f2eb", color: "#365947", fontWeight: 800, cursor: "pointer", fontSize: "12px" }}>Mark read</button>}
                                <button type="button" onClick={() => deleteMessage(item.id)} style={{ border: "1px solid #fecaca", borderRadius: "8px", padding: "7px 10px", background: "#fff", color: "#b91c1c", fontWeight: 800, cursor: "pointer", fontSize: "12px" }}>Delete</button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </section>
            </div>
          </div>
        </div>
      )}

      {/* ======================================
          MAIN
      ====================================== */}

      <main>

        {/* ====================================
            HERO
        ==================================== */}

        <section
          className="hero"
          id="home"
        >

          <div className="hero-content">

            <div
              className="hero-copy"
              key={`${activeSection}-${slideIndex}`}
            >

              <div className="eyebrow">
                {currentSlide.eyebrow}
              </div>


              <h1>
                {currentSlide.title}
              </h1>


              <p>
                {currentSlide.text}
              </p>


              <div className="hero-buttons">

                <button
                  className="primary-button"
                  onClick={() =>
                    navigate(
                      activeSection ===
                        "home"
                        ? "work"
                        : activeSection
                    )
                  }
                >
                  {currentSlide.button}
                  <span>→</span>
                </button>


                <button
                  className="secondary-button"
                  onClick={() =>
                    navigate("shop")
                  }
                >
                  Explore more
                </button>

              </div>


              <div className="trust-row">
                <span>
                  ✓ Verified
                </span>

                <span>
                  ✓ Local
                </span>

                <span>
                  ✓ Transparent
                </span>

                <span>
                  ✓ Secure
                </span>
              </div>

            </div>


            <div className="hero-visual">

              <div className="hero-card">

                <div className="hero-icon">
                  {currentSlide.icon}
                </div>


                <div className="floating-card card-one">

                  <span>
                    ⭐
                  </span>

                  <div>
                    <strong>
                      4.9 Rating
                    </strong>

                    <small>
                      Trusted service
                    </small>
                  </div>

                </div>


                <div className="floating-card card-two">

                  <span>
                    ✓
                  </span>

                  <div>
                    <strong>
                      Verified
                    </strong>

                    <small>
                      HOWDI checked
                    </small>
                  </div>

                </div>


                <div className="hero-card-bottom">

                  <span>
                    Made for your neighbourhood
                  </span>

                  <strong>
                    HOWDI
                  </strong>

                </div>

              </div>

            </div>

          </div>


          {/* SLIDER */}

          <div className="slider-controls">

            <button
              onClick={() =>
                setSlideIndex(
                  (
                    slideIndex -
                    1 +
                    currentSlides.length
                  ) %
                    currentSlides.length
                )
              }
            >
              ←
            </button>


            <div className="slider-dots">

              {currentSlides.map(
                (_, index) => (

                  <button
                    key={index}
                    className={
                      index ===
                      slideIndex %
                        currentSlides.length
                        ? "active"
                        : ""
                    }
                    onClick={() =>
                      setSlideIndex(
                        index
                      )
                    }
                  />

                )
              )}

            </div>


            <button
              onClick={() =>
                setSlideIndex(
                  slideIndex + 1
                )
              }
            >
              →
            </button>

          </div>

        </section>


        {/* ====================================
            QUICK NAVIGATION
        ==================================== */}

        <section className="quick-navigation">

          <div
            className="quick-card"
            onClick={() =>
              navigate("work")
            }
          >

            <div className="quick-icon">
              👷
            </div>

            <div>
              <strong>
                Find a Worker
              </strong>

              <span>
                Trusted help near you
              </span>
            </div>

            <b>→</b>

          </div>


          <div
            className="quick-card"
            onClick={() =>
              navigate("shop")
            }
          >

            <div className="quick-icon">
              🛒
            </div>

            <div>
              <strong>
                Shop Local
              </strong>

              <span>
                Products from nearby shops
              </span>
            </div>

            <b>→</b>

          </div>


          <div
            className="quick-card"
            onClick={() =>
              navigate("learn")
            }
          >

            <div className="quick-icon">
              🎓
            </div>

            <div>
              <strong>
                Learn & Earn
              </strong>

              <span>
                Build skills & opportunities
              </span>
            </div>

            <b>→</b>

          </div>

        </section>


        {/* ====================================
            WORK
        ==================================== */}

        <section
          className="section"
          id="work"
        >

          <div className="section-heading">

            <div>

              <span className="section-label">
                WORK • TRUSTED HELP
              </span>

              <h2>
                Find the right worker
                <br />
                for every job.
              </h2>

              <p>
                Skilled, verified and ready
                to work.
                <br />
                From small tasks to big
                projects.
              </p>

            </div>


            <button
              className="outline-button"
              onClick={() =>
                navigate("work")
              }
            >
              Find a Worker →
            </button>

          </div>


          <div className="category-grid">

            {categories.map(
              (category) => (

                <button
                  className="category-card"
                  key={category.name}
                >

                  <span>
                    {category.icon}
                  </span>

                  <strong>
                    {category.name}
                  </strong>

                  <small>
                    View workers →
                  </small>

                </button>

              )
            )}

          </div>


          <div className="worker-grid">

            {workers.map(
              (worker) => (

                <article
                  className="worker-card"
                  key={worker.name}
                >

                  <div className="worker-avatar">
                    {worker.name.charAt(0)}
                  </div>


                  <div className="worker-info">

                    <div className="worker-name">

                      {worker.name}

                      {worker.verified && (
                        <span>
                          ✓
                        </span>
                      )}

                    </div>


                    <div className="worker-service">
                      {worker.service}
                    </div>


                    <div className="worker-meta">
                      ⭐ {worker.rating}
                      {" · "}
                      {worker.jobs} jobs
                    </div>

                  </div>


                  <div className="worker-price">

                    <small>
                      Starting
                    </small>

                    <strong>
                      {worker.price}
                    </strong>

                  </div>


                  <button>
                    View profile →
                  </button>

                </article>

              )
            )}

          </div>

        </section>


        {/* ====================================
            SHOP
        ==================================== */}

        <section
          className="section shop-section"
          id="shop"
        >

          <div className="section-heading">

            <div>

              <span className="section-label">
                SHOP • LOCAL VENDORS
              </span>

              <h2>
                Made nearby.
                <br />
                Chosen by you.
              </h2>

              <p>
                Discover products from local
                businesses and
                <br />
                get special offers around you.
              </p>

            </div>


            <button className="outline-button">
              View all products →
            </button>

          </div>


          <div className="product-grid">

            {products.map(
              (product) => (

                <article
                  className="product-card"
                  key={product.name}
                >

                  <div
                    className="product-image"
                    style={{ position: "relative" }}
                  >
                    {product.icon}

                    <button
                      type="button"
                      onClick={() => toggleWishlist(product)}
                      aria-label={
                        wishlist.some((item) => item.name === product.name)
                          ? `Remove ${product.name} from wishlist`
                          : `Add ${product.name} to wishlist`
                      }
                      title={
                        wishlist.some((item) => item.name === product.name)
                          ? "Remove from Wishlist"
                          : "Add to Wishlist"
                      }
                      style={{
                        position: "absolute",
                        top: "14px",
                        right: "14px",
                        zIndex: 100,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "7px",
                        minWidth: "88px",
                        height: "40px",
                        padding: "0 14px",
                        border: wishlist.some(
                          (item) => item.name === product.name
                        )
                          ? "2px solid #e11d48"
                          : "2px solid #172019",
                        borderRadius: "999px",
                        background: wishlist.some(
                          (item) => item.name === product.name
                        )
                          ? "#fff1f2"
                          : "#ffffff",
                        color: wishlist.some(
                          (item) => item.name === product.name
                        )
                          ? "#e11d48"
                          : "#172019",
                        fontSize: "14px",
                        fontWeight: 800,
                        lineHeight: 1,
                        cursor: "pointer",
                        boxShadow: "0 5px 16px rgba(23,32,25,.25)",
                        opacity: 1,
                        visibility: "visible",
                      }}
                    >
                      <span style={{ fontSize: "23px", lineHeight: 1 }}>
                        {wishlist.some((item) => item.name === product.name)
                          ? "♥"
                          : "♡"}
                      </span>
                      <span>
                        {wishlist.some((item) => item.name === product.name)
                          ? "Liked"
                          : "Like"}
                      </span>
                    </button>
                  </div>


                  <div className="product-body">

                    <span className="product-shop">
                      {product.shop}
                    </span>

                    <h3>
                      {product.name}
                    </h3>


                    <div className="product-price">

                      <strong>
                        {product.price}
                      </strong>

                      <del>
                        {product.oldPrice}
                      </del>

                    </div>


                    <div
                      style={{
                        marginTop: "14px",
                        padding: "12px",
                        borderRadius: "14px",
                        background: "#f7f4ec",
                        border: "1px solid #e4dece",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px" }}>
                        <div>
                          <div style={{ fontSize: "11px", fontWeight: 900, color: "#9a5b1f", letterSpacing: "0.08em" }}>OFFER PRICE</div>
                          <div style={{ display: "flex", alignItems: "baseline", gap: "7px", marginTop: "2px" }}>
                            <strong style={{ fontSize: "22px", color: "#153b2b" }}>{product.price}</strong>
                            <span style={{ fontSize: "13px", color: "#8b8b83", textDecoration: "line-through" }}>{product.oldPrice}</span>
                          </div>
                        </div>
                        <span style={{ padding: "6px 9px", borderRadius: "999px", background: "#e8f2e9", color: "#24613d", fontSize: "11px", fontWeight: 900 }}>
                          SAVE ₹{(Number(String(product.oldPrice).replace(/[^0-9]/g, "")) - Number(String(product.price).replace(/[^0-9]/g, "")))}
                        </span>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "10px" }}>
                        <span style={{ fontSize: "13px", fontWeight: 900, color: "#24362d" }}>Quantity</span>
                        <div style={{ display: "flex", alignItems: "center", border: "1px solid #c9c2b1", borderRadius: "10px", overflow: "hidden", background: "#fff" }}>
                          <button type="button" onClick={() => setProductQuantity(product, (selectedQuantities[product.name] || 1) - 1)} style={{ width: "34px", height: "34px", border: 0, background: "#fff", fontSize: "18px", cursor: "pointer" }}>−</button>
                          <strong style={{ minWidth: "30px", textAlign: "center" }}>{selectedQuantities[product.name] || 1}</strong>
                          <button type="button" onClick={() => setProductQuantity(product, (selectedQuantities[product.name] || 1) + 1)} style={{ width: "34px", height: "34px", border: 0, background: "#fff", fontSize: "18px", cursor: "pointer" }}>+</button>
                        </div>
                      </div>

                      <div style={{ marginTop: "7px", textAlign: "right", fontSize: "12px", color: "#64748b", fontWeight: 800 }}>
                        {(selectedQuantities[product.name] || 1)} × {product.price}
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginTop: "10px" }}>
                      <button type="button" onClick={() => buyNow(product, selectedQuantities[product.name] || 1)} style={{ width: "100%", minHeight: "48px", border: 0, borderRadius: "12px", background: "#0f172a", color: "#fff", fontWeight: 900, fontSize: "15px", cursor: "pointer" }}>Buy Now</button>
                      <button type="button" onClick={() => addToCart(product, selectedQuantities[product.name] || 1)} style={{ width: "100%", minHeight: "48px", border: 0, borderRadius: "12px", background: "#365947", color: "#fff", fontWeight: 900, fontSize: "15px", cursor: "pointer" }}>Add to Cart</button>
                    </div>

                                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginTop: "10px" }}>
  <button
    type="button"
    onClick={() => buyNow(product, selectedQuantities[product.name] || 1)}
    style={{
      width: "100%",
      minHeight: "48px",
      border: 0,
      borderRadius: "12px",
      background: "#0f172a",
      color: "#fff",
      fontWeight: 900,
      fontSize: "15px",
      cursor: "pointer",
    }}
  >
  </button>

  <button
    type="button"
    onClick={() => addToCart(product, selectedQuantities[product.name] || 1)}
    style={{
      width: "100%",
      minHeight: "48px",
      border: 0,
      borderRadius: "12px",
      background: "#365947",
      color: "#fff",
      fontWeight: 900,
      fontSize: "15px",
      cursor: "pointer",
    }}
  >
  </button>
</div>

</div>
</article>

              )
            )}

          </div>

        </section>


        {/* ====================================
            LEARN
        ==================================== */}

        <section
          className="learn-section"
          id="learn"
        >

          <div className="learn-content">

            <span className="section-label">
              LEARN & EARN
            </span>


            <h2>
              Your skills can become
              <br />
              your next opportunity.
            </h2>


            <p>
              Learn useful skills, discover
              opportunities and
              <br />
              build your future with HOWDI.
            </p>


            <div className="learn-actions">

              <button className="primary-button">
                Explore Learning →
              </button>

              <button className="learn-link">
                How it works ↗
              </button>

            </div>

          </div>


          <div className="learn-visual">

            <div className="learn-circle">
              <span>
                🎓
              </span>
            </div>


            <div className="learn-badge badge-top">
              💡 Learn
            </div>


            <div className="learn-badge badge-bottom">
              💰 Earn
            </div>

          </div>

        </section>


        {/* ====================================
            OFFERS
        ==================================== */}

        <section className="offers-section">

          <div>

            <span className="section-label">
              SPECIAL OFFERS
            </span>

            <h2>
              Good deals.
              <br />
              Better locally.
            </h2>

            <p>
              Exclusive offers from
              participating HOWDI
              <br />
              workers and vendors.
            </p>

          </div>


          <div className="offer-ticket">

            <span>
              HOWDI OFFER
            </span>

            <strong>
              WELCOME20
            </strong>

            <small>
              Get special savings on
              your first order.
            </small>

            <button>
              Explore offers →
            </button>

          </div>

        </section>


        {/* ====================================
            FOOTER
        ==================================== */}

        <footer className="footer">

          <div className="footer-top">

            <div className="footer-brand">

              <div className="brand-mark">
                H
              </div>

              <div>

                <strong>
                  HOWDI
                </strong>

                <span>
                  Kaam bhi, Samaan bhi.
                </span>

              </div>

            </div>


            <p>
              Your local platform for
              trusted work,
              <br />
              shopping and opportunities.
            </p>

          </div>


          <div className="footer-links">

            <div>

              <strong>
                HOWDI
              </strong>

              <button>
                About us
              </button>

              <button>
                Contact
              </button>

              <button>
                Careers
              </button>

            </div>


            <div>

              <strong>
                FOR CUSTOMERS
              </strong>

              <button>
                Find a Worker
              </button>

              <button>
                Shop
              </button>

              <button>
                Offers
              </button>

            </div>


            <div>

              <strong>
                FOR BUSINESS
              </strong>

              <button>
                Become a Vendor
              </button>

              <button>
                Become a Worker
              </button>

              <button>
                Partner with us
              </button>

            </div>


            <div>

              <strong>
                SUPPORT
              </strong>

              <button>
                Help Centre
              </button>

              <button>
                Terms & Conditions
              </button>

              <button>
                Privacy Policy
              </button>

            </div>

          </div>


          <div className="footer-bottom">

            <span>
              © 2026 HOWDI.
              All rights reserved.
            </span>

            <span>
              Made with ❤️ for local
              communities.
            </span>

          </div>

        </footer>


        {/* ====================================
            LOGIN / SIGNUP MODAL
        ==================================== */}

        {showLogin && (

          <div
            className="login-overlay"
            onClick={closeAuth}
          >

            <div
              className="login-card"
              onClick={(e) =>
                e.stopPropagation()
              }
            >

              {/* CLOSE */}

              <button
                className="login-close"
                onClick={closeAuth}
                disabled={loginLoading}
              >
                ×
              </button>


              {/* LOGO */}

              <div className="login-logo">
                H
              </div>


              {/* TITLE */}

              <h2>
                {authMode === "login"
                  ? "Welcome to HOWDI 👋"
                  : "Join HOWDI 👋"}
              </h2>


              <p>
                {authMode === "login"
                  ? "Login to your account"
                  : "Create your HOWDI account"}
              </p>


              {/* =================================
                  SIGNUP NAME
              ================================= */}

              {authMode === "signup" && (

                <input
                  type="text"
                  placeholder="Full name"
                  value={loginName}
                  onChange={(e) =>
                    setLoginName(
                      e.target.value
                    )
                  }
                  disabled={loginLoading}
                  autoComplete="name"
                />

              )}


              {/* =================================
                  MOBILE
              ================================= */}

              <input
                type="tel"
                placeholder="Mobile number"
                value={loginPhone}
                onChange={(e) => {

                  const value =
                    e.target.value
                      .replace(
                        /\D/g,
                        ""
                      )
                      .slice(0, 10);

                  setLoginPhone(value);

                }}
                disabled={loginLoading}
                inputMode="numeric"
                autoComplete="tel"
              />


              {/* =================================
                  PASSWORD
              ================================= */}

              <input
                type="password"
                placeholder="Password"
                value={loginPassword}
                onChange={(e) =>
                  setLoginPassword(
                    e.target.value
                  )
                }
                disabled={loginLoading}
                autoComplete={
                  authMode === "login"
                    ? "current-password"
                    : "new-password"
                }
              />


              {/* =================================
                  SUBMIT
              ================================= */}

              <button
                className="login-submit"
                onClick={
                  authMode === "login"
                    ? handleLogin
                    : handleRegister
                }
                disabled={loginLoading}
              >

                {loginLoading
                  ? "Please wait..."
                  : authMode === "login"
                  ? "Login"
                  : "Create account"}

              </button>


              {/* =================================
                  MESSAGE
              ================================= */}

              {loginMessage && (

                <div
                  className={
                    loginMessage
                      .toLowerCase()
                      .includes(
                        "successful"
                      )
                      ? "login-message success"
                      : "login-message error"
                  }
                >
                  {loginMessage}
                </div>

              )}


              {/* =================================
                  SWITCH LOGIN / SIGNUP
              ================================= */}

              <div className="login-create">

                <span>
                  {authMode === "login"
                    ? "New to HOWDI?"
                    : "Already have an account?"}
                </span>


                <button
                  type="button"
                  disabled={loginLoading}
                  onClick={() => {

                    setAuthMode(
                      authMode === "login"
                        ? "signup"
                        : "login"
                    );

                    setLoginMessage("");

                  }}
                >

                  {authMode === "login"
                    ? "Create an account"
                    : "Login"}

                </button>

              </div>

            </div>

          </div>

        )}

      </main>

    </div>
  );
}

export default App;