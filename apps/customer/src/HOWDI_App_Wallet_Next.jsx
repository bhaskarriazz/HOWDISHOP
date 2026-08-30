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

  // ==============================
  // HOWDI WALLET (PROTOTYPE)
  // ==============================
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
      return JSON.parse(localStorage.getItem("howdiWalletTransactions")) || [
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
      return Number(localStorage.getItem("howdiRewardPoints")) || 2450;
    } catch {
      return 2450;
    }
  });
  const [walletRewards, setWalletRewards] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("howdiRewardHistory")) || [
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

  const openWalletSection = (section) => {
    setWalletSection(section);
    setProfileTab("wallet");
    setAddressFormOpen(false);
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
  };

  const addWalletMoney = () => {
    const amount = Number(walletAmount);
    if (!amount || amount <= 0) {
      setWalletMessage("Enter a valid amount.");
      return;
    }
    setWalletBalance((balance) => balance + amount);
    setWalletTransactions((items) => [
      { id: Date.now(), title: "Money added", type: "credit", amount, date: "Just now" },
      ...items,
    ]);
    setWalletAmount("");
    setWalletMessage(`₹${amount.toLocaleString("en-IN")} added to your wallet.`);
  };
  const [addresses, setAddresses] = useState([]);
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
                  ["cashback", "💸", "Cashback"],
                  ["rewards", "🎁", "Rewards"],
                  ["messages", "💬", "Messages"],
                  ["learning", "🎓", "My Learning"],
                  ["subscription", "⭐", "Subscription"],
                  ["support", "🆘", "Help & Support"],
                ].map(([tab, icon, label]) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => {
                      if (tab === "cashback" || tab === "rewards" || tab === "wallet") {
                        openWalletSection(tab === "cashback" ? "cashback" : tab === "rewards" ? "rewards" : "overview");
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
                        (((tab === "wallet" || tab === "cashback" || tab === "rewards")
                          ? profileTab === "wallet" && ((tab === "wallet" && walletSection === "overview") || tab === walletSection)
                          : profileTab === tab))
                          ? "#e2e8f0"
                          : "transparent",
                      fontWeight:
                        (((tab === "wallet" || tab === "cashback" || tab === "rewards")
                          ? profileTab === "wallet" && ((tab === "wallet" && walletSection === "overview") || tab === walletSection)
                          : profileTab === tab))
                          ? 800
                          : 600,
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
                          onClick={() => {
                            if (tab === "rewards") openWalletSection("rewards");
                            else if (tab === "wallet") openWalletSection("overview");
                            else setProfileTab(tab);
                          }}
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

                {profileTab === "wallet" && (
                  <div style={{ maxWidth: "900px", margin: "0 auto" }}>
                    <div style={{ marginBottom: "22px" }}>
                      <div style={{ fontSize: "12px", fontWeight: 800, letterSpacing: "1px", color: "#64748b" }}>HOWDI WALLET</div>
                      <h3 style={{ fontSize: "28px", margin: "6px 0" }}>Your money, cashback & rewards</h3>
                      <p style={{ color: "#64748b", margin: 0 }}>Manage your HOWDI balance, cashback and rewards in one place.</p>
                    </div>

                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "18px" }}>
                      {[['overview', '💰 Wallet'], ['cashback', '💸 Cashback'], ['rewards', '🎁 Rewards']].map(([section, label]) => (
                        <button key={section} type="button" onClick={() => setWalletSection(section)} style={{ border: walletSection === section ? 0 : "1px solid #dbe3ea", borderRadius: "999px", padding: "10px 16px", background: walletSection === section ? "#365947" : "#fff", color: walletSection === section ? "#fff" : "#24362d", fontWeight: 900, cursor: "pointer" }}>
                          {label}
                        </button>
                      ))}
                    </div>

                    {walletSection === "overview" && (
                      <>
                        <div style={{ display: "grid", gridTemplateColumns: "1.2fr .8fr", gap: "16px", marginBottom: "18px" }}>
                          <div style={{ borderRadius: "20px", padding: "24px", background: "linear-gradient(135deg,#365947,#193b2c)", color: "#fff", minHeight: "150px", boxSizing: "border-box" }}>
                            <div style={{ fontSize: "13px", fontWeight: 800, opacity: .82 }}>AVAILABLE BALANCE</div>
                            <div style={{ fontSize: "38px", fontWeight: 900, marginTop: "10px" }}>₹{walletBalance.toLocaleString("en-IN")}</div>
                            <div style={{ marginTop: "12px", fontSize: "12px", opacity: .8 }}>HOWDI Wallet • Ready to use</div>
                          </div>
                          <div style={{ border: "1px solid #e2e8f0", borderRadius: "20px", padding: "20px", background: "#f8fafc" }}>
                            <div style={{ fontWeight: 900, fontSize: "16px", marginBottom: "10px" }}>Add money</div>
                            <div style={{ display: "flex", gap: "8px" }}>
                              <input type="number" min="1" value={walletAmount} onChange={(e) => { setWalletAmount(e.target.value); setWalletMessage(""); }} placeholder="₹ Amount" style={{ flex: 1, minWidth: 0, border: "1px solid #cbd5e1", borderRadius: "10px", padding: "11px 12px", fontSize: "14px" }} />
                              <button type="button" onClick={addWalletMoney} style={{ border: 0, borderRadius: "10px", padding: "0 16px", background: "#0f172a", color: "#fff", fontWeight: 800, cursor: "pointer" }}>Add</button>
                            </div>
                            {walletMessage && <div style={{ marginTop: "9px", fontSize: "12px", fontWeight: 700, color: "#365947" }}>{walletMessage}</div>}
                          </div>
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "18px" }}>
                          <button type="button" onClick={() => setWalletSection("cashback")} style={{ textAlign: "left", border: "1px solid #e2e8f0", borderRadius: "18px", padding: "18px", background: "#fff", cursor: "pointer" }}>
                            <div style={{ fontSize: "25px" }}>💸</div><div style={{ marginTop: "8px", fontWeight: 900 }}>Cashback available</div><div style={{ fontSize: "24px", fontWeight: 900, color: "#24613d", marginTop: "4px" }}>₹{cashbackStats.available.toLocaleString("en-IN")}</div><div style={{ fontSize: "12px", color: "#64748b", marginTop: "3px" }}>₹{cashbackStats.pending} pending</div>
                          </button>
                          <button type="button" onClick={() => setWalletSection("rewards")} style={{ textAlign: "left", border: "1px solid #e2e8f0", borderRadius: "18px", padding: "18px", background: "#fff", cursor: "pointer" }}>
                            <div style={{ fontSize: "25px" }}>🎁</div><div style={{ marginTop: "8px", fontWeight: 900 }}>HOWDI Rewards</div><div style={{ fontSize: "24px", fontWeight: 900, color: "#9a5b1f", marginTop: "4px" }}>{rewardPoints.toLocaleString("en-IN")} pts</div><div style={{ fontSize: "12px", color: "#64748b", marginTop: "3px" }}>Redeem 500 pts = ₹50</div>
                          </button>
                        </div>

                        <div style={{ border: "1px solid #e2e8f0", borderRadius: "18px", overflow: "hidden", background: "#fff" }}>
                          <div style={{ padding: "18px 20px", borderBottom: "1px solid #e2e8f0", fontWeight: 900, fontSize: "17px" }}>Recent wallet activity</div>
                          {walletTransactions.map((transaction) => (
                            <div key={transaction.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", padding: "15px 20px", borderBottom: "1px solid #f1f5f9" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}><div style={{ width: "38px", height: "38px", borderRadius: "12px", display: "grid", placeItems: "center", background: transaction.type === "credit" ? "#e8f2e9" : "#fff1f2", fontSize: "18px" }}>{transaction.type === "credit" ? "↓" : "↑"}</div><div><div style={{ fontWeight: 800 }}>{transaction.title}</div><div style={{ fontSize: "12px", color: "#64748b", marginTop: "3px" }}>{transaction.date}</div></div></div>
                              <strong style={{ color: transaction.type === "credit" ? "#24613d" : "#be123c" }}>{transaction.type === "credit" ? "+" : "-"}₹{transaction.amount.toLocaleString("en-IN")}</strong>
                            </div>
                          ))}
                        </div>
                      </>
                    )}

                    {walletSection === "cashback" && (
                      <>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "12px", marginBottom: "18px" }}>
                          {[['Total earned', cashbackStats.total], ['Available', cashbackStats.available], ['Pending', cashbackStats.pending]].map(([label, amount]) => (
                            <div key={label} style={{ border: "1px solid #e2e8f0", borderRadius: "18px", padding: "18px", background: label === "Available" ? "#eef7f0" : "#fff" }}><div style={{ fontSize: "12px", fontWeight: 800, color: "#64748b" }}>{label.toUpperCase()}</div><div style={{ fontSize: "26px", fontWeight: 900, marginTop: "7px", color: "#24613d" }}>₹{Number(amount).toLocaleString("en-IN")}</div></div>
                          ))}
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", padding: "16px 18px", borderRadius: "16px", background: "#f7f4ec", border: "1px solid #e4dece", marginBottom: "18px" }}>
                          <div><strong>Use your available cashback</strong><div style={{ fontSize: "12px", color: "#64748b", marginTop: "3px" }}>Move ₹{cashbackStats.available} into your HOWDI Wallet.</div></div>
                          <button type="button" onClick={moveCashbackToWallet} disabled={!cashbackStats.available} style={{ border: 0, borderRadius: "11px", padding: "11px 15px", background: cashbackStats.available ? "#365947" : "#cbd5e1", color: "#fff", fontWeight: 900, cursor: cashbackStats.available ? "pointer" : "not-allowed" }}>Add to Wallet</button>
                        </div>
                        <div style={{ border: "1px solid #e2e8f0", borderRadius: "18px", overflow: "hidden", background: "#fff" }}>
                          <div style={{ padding: "18px 20px", borderBottom: "1px solid #e2e8f0", fontWeight: 900 }}>Cashback history</div>
                          {cashbackHistory.map((item) => (
                            <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", padding: "15px 20px", borderBottom: "1px solid #f1f5f9" }}><div><div style={{ fontWeight: 800 }}>{item.title}</div><div style={{ fontSize: "12px", color: "#64748b", marginTop: "3px" }}>{item.date} • {item.status}</div></div><strong style={{ color: item.status === "Pending" ? "#9a5b1f" : "#24613d" }}>+₹{item.amount}</strong></div>
                          ))}
                        </div>
                      </>
                    )}

                    {walletSection === "rewards" && (
                      <>
                        <div style={{ borderRadius: "20px", padding: "24px", background: "linear-gradient(135deg,#7b5b25,#b27a2c)", color: "#fff", marginBottom: "16px" }}><div style={{ fontSize: "13px", fontWeight: 800, opacity: .86 }}>HOWDI REWARD POINTS</div><div style={{ fontSize: "38px", fontWeight: 900, marginTop: "8px" }}>{rewardPoints.toLocaleString("en-IN")} pts</div><div style={{ marginTop: "6px", fontSize: "13px", opacity: .86 }}>Earn points from purchases, festivals and special HOWDI offers.</div></div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", padding: "16px 18px", borderRadius: "16px", background: "#f7f4ec", border: "1px solid #e4dece", marginBottom: "18px" }}><div><strong>Redeem 500 points</strong><div style={{ fontSize: "12px", color: "#64748b", marginTop: "3px" }}>Get ₹50 added to your HOWDI Wallet.</div></div><button type="button" onClick={redeemRewards} disabled={rewardPoints < 500} style={{ border: 0, borderRadius: "11px", padding: "11px 15px", background: rewardPoints >= 500 ? "#0f172a" : "#cbd5e1", color: "#fff", fontWeight: 900, cursor: rewardPoints >= 500 ? "pointer" : "not-allowed" }}>Redeem</button></div>
                        <div style={{ border: "1px solid #e2e8f0", borderRadius: "18px", overflow: "hidden", background: "#fff" }}><div style={{ padding: "18px 20px", borderBottom: "1px solid #e2e8f0", fontWeight: 900 }}>Reward activity</div>{walletRewards.map((item) => (<div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", padding: "15px 20px", borderBottom: "1px solid #f1f5f9" }}><div><div style={{ fontWeight: 800 }}>{item.title}</div><div style={{ fontSize: "12px", color: "#64748b", marginTop: "3px" }}>{item.date}</div></div><strong style={{ color: item.points >= 0 ? "#9a5b1f" : "#be123c" }}>{item.points >= 0 ? "+" : ""}{item.points} pts</strong></div>))}</div>
                      </>
                    )}

                    <div style={{ marginTop: "14px", padding: "12px 14px", borderRadius: "12px", background: "#f8fafc", color: "#64748b", fontSize: "12px", fontWeight: 700 }}>🔒 Prototype mode: cashback rules, rewards campaigns and payment settlement can be connected to the HOWDI backend later.</div>
                  </div>
                )}

                {!['overview', 'addresses', 'wallet'].includes(profileTab) && (
                  <div style={{ minHeight: "420px", display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
                    <div>
                      <div style={{ fontSize: "54px" }}>{{ orders: "📦", wishlist: "❤️", payments: "💳", cashback: "💸", rewards: "🎁", messages: "💬", learning: "🎓", subscription: "⭐", support: "🆘" }[profileTab] || "✨"}</div>
                      <h3 style={{ fontSize: "24px", margin: "14px 0 8px" }}>{profileTab === "orders" ? "My Orders" : profileTab === "wishlist" ? "Wishlist" : profileTab === "payments" ? "Payments" : profileTab === "cashback" ? "Cashback" : profileTab === "rewards" ? "Rewards" : profileTab === "messages" ? "Messages" : profileTab === "learning" ? "My Learning" : profileTab === "subscription" ? "Subscription" : "Help & Support"}</h3>
                      <p style={{ color: "#64748b", maxWidth: "440px" }}>This HOWDI module is ready for the next integration. We'll connect its real backend data next.</p>
                    </div>
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

                  <div className="product-image">
                    {product.icon}
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


                    <button>
                      Add to cart →
                    </button>

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