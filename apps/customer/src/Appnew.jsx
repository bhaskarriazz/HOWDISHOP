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
                <span className="user-welcome">
                  👋 {currentUser.full_name || currentUser.name || "Customer"}
                </span>

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