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
    icon: "👜",
    name: "Grandma's Crochet Flower Tote",
    shop: "HOWDI Grandma's Collection",
    price: "₹1,299",
    oldPrice: "₹1,699",
    category: "Handmade Crochet",
    handmade: true,
    stock: 7,
    rating: "4.9",
    reviews: 86,
    sizes: ["One Size"],
    colors: ["Sky Blue", "Rose Pink", "Cream", "Lavender"],
    material: "100% cotton yarn",
    dimensions: "32 × 28 cm",
    makingTime: "6–8 hours",
    artisan: "Lakshmi Amma",
    offerText: "Handmade week · Extra 10% off",
    offerEndsAt: "2026-08-30T23:59:59+05:30",
    badges: ["HANDMADE", "LIMITED"],
    story: "A one-of-a-kind crochet piece inspired by the little bags our grandmothers lovingly made by hand.",
    likes: 1284,
    recentReviews: [
      { name: "Priya", city: "Hyderabad", rating: 5, text: "Beautifully made. You can actually see the handwork.", time: "2 days ago", verified: true, helpful: 24, photo: "👜" },
      { name: "Anjali", city: "Bengaluru", rating: 5, text: "The colours and finishing are lovely. Feels special, not mass produced.", time: "5 days ago", verified: true, helpful: 18, photo: "🌸" },
      { name: "Meena", city: "Chennai", rating: 4, text: "Very cute and sturdy. Delivery was also quick.", time: "1 week ago", verified: true, helpful: 11, photo: "🧶" },
    ],
    makerExperience: "38 years of crochet",
    makerPieces: "1,240+ pieces crafted",
    deliveryDays: "3–5 days",
    weight: "280 g",
    questions: [
      { q: "Is this really handmade?", a: "Yes. Each piece is individually crocheted and finished by hand." },
      { q: "Can I request another colour?", a: "Yes, if the yarn is available. Add your request at checkout or contact the maker." },
    ],
    customerPhotos: ["👜", "🌸", "🧶", "👩‍🦰"],
    shippingNote: "Ships from the maker after final quality check.",
    returnPolicy: "7-day easy return on eligible ready-stock items.",
  },
  {
    icon: "👚",
    name: "Grandma's Crochet Summer Top",
    shop: "HOWDI Grandma's Collection",
    price: "₹1,899",
    oldPrice: "₹2,399",
    category: "Handmade Crochet Clothing",
    handmade: true,
    stock: 4,
    rating: "4.8",
    reviews: 54,
    sizes: ["XS", "S", "M", "L", "XL", "XXL", "Custom"],
    colors: ["Ivory", "Peach", "Mint", "Sky Blue", "Maroon"],
    material: "Soft cotton blend yarn",
    dimensions: "Custom fit available",
    makingTime: "10–14 hours",
    artisan: "Savitri Amma",
    offerText: "Limited handmade offer",
    offerEndsAt: "2026-08-31T20:00:00+05:30",
    badges: ["HANDMADE", "MADE TO ORDER"],
    story: "Every loop is made slowly and carefully, keeping the warmth and character of traditional hand-crochet alive.",
  },
  {
    icon: "🌸",
    name: "Grandma's Crochet Table Runner",
    shop: "HOWDI Grandma's Collection",
    price: "₹899",
    oldPrice: "₹1,199",
    category: "Handmade Home Decor",
    handmade: true,
    stock: 9,
    rating: "4.9",
    reviews: 112,
    sizes: ["Standard", "Custom"],
    colors: ["Cream", "Red", "Mustard", "Green"],
    material: "100% cotton yarn",
    dimensions: "150 × 35 cm",
    makingTime: "5–7 hours",
    artisan: "Anasuya Amma",
    offerText: "Festival special",
    offerEndsAt: "2026-09-01T23:59:59+05:30",
    badges: ["HANDMADE", "POPULAR"],
    story: "A classic floral crochet runner made to bring a little old-home warmth to today's dining table.",
  },
  {
    icon: "🪴",
    name: "Indoor Plant",
    shop: "Green Home Store",
    price: "₹299",
    oldPrice: "₹399",
    category: "Home & Garden",
    stock: 12,
    rating: "4.8",
    reviews: 124,
    sizes: ["One Size"],
    colors: ["Natural"],
    material: "Live indoor plant",
    dimensions: "Approx. 20–25 cm",
    makingTime: "Ready to ship",
    artisan: "Green Home Store",
    offerText: "Local store offer",
    offerEndsAt: "2026-08-30T18:00:00+05:30",
    badges: ["BEST SELLER"],
    story: "A simple local favourite from a trusted nearby shop.",
  },
  {
    icon: "💡",
    name: "LED Smart Light",
    shop: "Sri Lakshmi Electricals",
    price: "₹549",
    oldPrice: "₹699",
    category: "Electronics",
    stock: 18,
    rating: "4.7",
    reviews: 67,
    sizes: ["Standard"],
    colors: ["White"],
    material: "ABS + LED",
    dimensions: "Standard",
    makingTime: "Ready to ship",
    artisan: "Sri Lakshmi Electricals",
    offerText: "20% off",
    offerEndsAt: "2026-08-30T20:00:00+05:30",
    badges: ["20% OFF"],
    story: "A practical local product with transparent offer pricing.",
  },
  {
    icon: "🪑",
    name: "Wooden Stool",
    shop: "Local Wood Works",
    price: "₹899",
    oldPrice: "₹1,199",
    category: "Furniture",
    stock: 5,
    rating: "4.9",
    reviews: 47,
    sizes: ["Standard", "Custom"],
    colors: ["Natural Wood", "Walnut"],
    material: "Solid wood",
    dimensions: "40 × 30 × 45 cm",
    makingTime: "2–3 days",
    artisan: "Local Wood Works",
    offerText: "Value pick",
    offerEndsAt: "2026-09-02T23:59:59+05:30",
    badges: ["POPULAR"],
    story: "A sturdy locally made piece designed for everyday use.",
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
  const [profileEditOpen, setProfileEditOpen] = useState(false);
  const [profileNotice, setProfileNotice] = useState("");
  const [profileForm, setProfileForm] = useState({ full_name: "", phone: "" });
  const [profilePreferences, setProfilePreferences] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("howdiProfilePreferences") || "null");
      return saved && typeof saved === "object" ? { orderUpdates: true, offers: true, walletAlerts: true, learningUpdates: true, ...saved } : { orderUpdates: true, offers: true, walletAlerts: true, learningUpdates: true };
    } catch { return { orderUpdates: true, offers: true, walletAlerts: true, learningUpdates: true }; }
  });
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

  // ==============================
  // MY LEARNING
  // ==============================
  const [learningFilter, setLearningFilter] = useState("all");
  const [learningCourses, setLearningCourses] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("howdiLearningCourses") || "null");
      return Array.isArray(saved) && saved.length ? saved : [
        { id: 1, icon: "📱", category: "Digital Skills", title: "Smartphone Basics", instructor: "HOWDI Learning", progress: 72, lessons: "8 / 11 lessons", duration: "2h 20m", status: "in-progress" },
        { id: 2, icon: "💼", category: "Business", title: "Start Your Local Business", instructor: "HOWDI Learning", progress: 35, lessons: "4 / 12 lessons", duration: "3h 10m", status: "in-progress" },
        { id: 3, icon: "💰", category: "Finance", title: "Money Management Basics", instructor: "HOWDI Learning", progress: 100, lessons: "9 / 9 lessons", duration: "1h 45m", status: "completed" },
        { id: 4, icon: "🛒", category: "Shopping", title: "Sell Products Online", instructor: "HOWDI Learning", progress: 0, lessons: "0 / 10 lessons", duration: "2h 50m", status: "saved" },
      ];
    } catch {
      return [];
    }
  });
  const [learningNotice, setLearningNotice] = useState("");
  const [learningBrowseOpen, setLearningBrowseOpen] = useState(false);
  const [certificateCourse, setCertificateCourse] = useState(null);

  const learningCatalog = [
    { id: 101, icon: "💻", category: "Digital Skills", title: "Digital Payments & UPI", instructor: "HOWDI Learning", duration: "1h 40m", lessonsTotal: 8 },
    { id: 102, icon: "📣", category: "Business", title: "Marketing Your Local Business", instructor: "HOWDI Learning", duration: "2h 15m", lessonsTotal: 10 },
    { id: 103, icon: "📱", category: "Business", title: "Sell More With WhatsApp", instructor: "HOWDI Learning", duration: "1h 55m", lessonsTotal: 9 },
    { id: 104, icon: "🧾", category: "Finance", title: "Smart Budgeting for Families", instructor: "HOWDI Learning", duration: "1h 20m", lessonsTotal: 7 },
  ];

  // ==============================
  // SUBSCRIPTION
  // ==============================
  const [subscriptionPlan, setSubscriptionPlan] = useState(() => {
    try {
      return localStorage.getItem("howdiSubscriptionPlan") || "free";
    } catch {
      return "free";
    }
  });
  const [subscriptionAutoRenew, setSubscriptionAutoRenew] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("howdiSubscriptionAutoRenew") || "true");
    } catch {
      return true;
    }
  });
  const [subscriptionNotice, setSubscriptionNotice] = useState("");
  const [subscriptionBilling, setSubscriptionBilling] = useState("monthly");
  const [subscriptionCancelOpen, setSubscriptionCancelOpen] = useState(false);
  const [subscriptionPayment, setSubscriptionPayment] = useState("");
  const [subscriptionHistory, setSubscriptionHistory] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("howdiSubscriptionHistory") || "[]");
      return Array.isArray(saved) ? saved : [];
    } catch { return []; }
  });

  // ==============================
  // HELP & SUPPORT
  // ==============================
  const [supportSearch, setSupportSearch] = useState("");
  const [supportCategory, setSupportCategory] = useState("all");
  const [supportTicketOpen, setSupportTicketOpen] = useState(false);
  const [supportTicketSubject, setSupportTicketSubject] = useState("");
  const [supportTicketMessage, setSupportTicketMessage] = useState("");
  const [supportTickets, setSupportTickets] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("howdiSupportTickets") || "[]");
      return Array.isArray(saved) ? saved : [];
    } catch { return []; }
  });
  const supportFaqs = [
    { id: 1, category: "orders", icon: "📦", question: "Where is my order?", answer: "Open My Orders to view the latest status, shipment details and delivery updates." },
    { id: 2, category: "payments", icon: "💳", question: "How do I manage saved payments?", answer: "Open Payments from My HOWDI to add or remove your saved UPI, card or bank account details." },
    { id: 3, category: "wallet", icon: "💰", question: "How does HOWDI Wallet work?", answer: "Your wallet keeps balance, cashback transfers and reward redemptions together. Add money from the Wallet section." },
    { id: 4, category: "offers", icon: "🎁", question: "How do festival offers work?", answer: "Eligible offers can be configured by the HOWDI team. For example, buy 2 items for 5% off or buy 3 for 10% off." },
    { id: 5, category: "account", icon: "👤", question: "How do I update my profile?", answer: "Open Profile in My HOWDI and edit the available account details. Address Book can be managed separately." },
    { id: 6, category: "learning", icon: "🎓", question: "Where can I find my certificates?", answer: "Open My Learning and choose View certificate on a completed course." },
  ];
  const supportCategories = [
    ["all", "All help"], ["orders", "Orders"], ["payments", "Payments"], ["wallet", "Wallet"], ["offers", "Offers"], ["account", "Account"], ["learning", "Learning"],
  ];

  // ==============================
  // NOTIFICATIONS
  // ==============================
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notifications, setNotifications] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("howdiNotifications") || "null");
      return Array.isArray(saved) && saved.length ? saved : [
        { id: 1, icon: "📦", title: "Order shipped", text: "Your HOWDI order #HD10284 is on the way.", time: "Just now", unread: true, type: "order" },
        { id: 2, icon: "🎁", title: "Festival offer", text: "Buy 2 items for 5% off or buy 3 for 10% off.", time: "Today", unread: true, type: "offer" },
        { id: 3, icon: "💰", title: "Cashback added", text: "₹330 cashback has been transferred to your HOWDI Wallet.", time: "Yesterday", unread: false, type: "wallet" },
        { id: 4, icon: "⭐", title: "Rewards available", text: "You have reward points ready to redeem.", time: "Yesterday", unread: false, type: "reward" },
      ];
    } catch {
      return [];
    }
  });
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

  useEffect(() => {
    localStorage.setItem("howdiNotifications", JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    localStorage.setItem("howdiLearningCourses", JSON.stringify(learningCourses));
  }, [learningCourses]);

  useEffect(() => {
    localStorage.setItem("howdiSubscriptionHistory", JSON.stringify(subscriptionHistory));
  }, [subscriptionHistory]);

  useEffect(() => {
    localStorage.setItem("howdiProfilePreferences", JSON.stringify(profilePreferences));
  }, [profilePreferences]);

  const openLearningCatalog = () => {
    setLearningNotice("");
    setLearningBrowseOpen(true);
  };

  const startCatalogCourse = (course) => {
    setLearningCourses((items) => {
      if (items.some((item) => item.id === course.id)) return items;
      return [
        ...items,
        {
          id: course.id,
          icon: course.icon,
          category: course.category,
          title: course.title,
          instructor: course.instructor,
          progress: 0,
          lessons: `0 / ${course.lessonsTotal} lessons`,
          duration: course.duration,
          status: "in-progress",
        },
      ];
    });
    setLearningFilter("in-progress");
    setLearningBrowseOpen(false);
    setLearningNotice(`${course.title} has been added to My Learning.`);
  };

  const viewLearningCertificate = (course) => {
    setCertificateCourse(course);
  };

  const updateLearningCourse = (id) => {
    setLearningNotice("");
    setLearningCourses((items) => items.map((course) => {
      if (course.id !== id) return course;
      if (course.status === "completed") {
        setLearningNotice("Certificate is already available for this course.");
        return course;
      }
      const nextProgress = Math.min(100, Number(course.progress || 0) + 10);
      return {
        ...course,
        progress: nextProgress,
        lessons: `${Math.round((nextProgress / 100) * Number(String(course.lessons).split("/")[1]?.trim()?.split(" ")[0] || 10))} / ${String(course.lessons).split("/")[1]?.trim()?.split(" ")[0] || 10} lessons`,
        status: nextProgress >= 100 ? "completed" : "in-progress",
      };
    }));
  };

  const changeSubscriptionPlan = (plan) => {
    setSubscriptionPlan(plan);
    try {
      localStorage.setItem("howdiSubscriptionPlan", plan);
    } catch {}
    setSubscriptionNotice(plan === "free" ? "You are now on the HOWDI Free plan." : `${plan === "plus" ? "HOWDI Plus" : "HOWDI Pro"} is selected for this prototype.`);
  };

  const confirmSubscriptionCancellation = () => {
    const previousPlan = subscriptionPlan;
    if (previousPlan === "free") {
      setSubscriptionCancelOpen(false);
      return;
    }
    const entry = { id: Date.now(), action: "Cancelled", plan: previousPlan === "plus" ? "HOWDI Plus" : "HOWDI Pro", date: new Date().toLocaleDateString("en-IN") };
    setSubscriptionHistory((items) => [entry, ...items].slice(0, 10));
    setSubscriptionPlan("free");
    localStorage.setItem("howdiSubscriptionPlan", "free");
    setSubscriptionCancelOpen(false);
    setSubscriptionNotice("Your paid subscription has been cancelled. You are now on HOWDI Free.");
  };

  const chooseSubscriptionPlan = (plan) => {
    if (plan === subscriptionPlan) return;
    if (plan === "free") { setSubscriptionCancelOpen(true); return; }
    if (!subscriptionPayment && paymentMethods.length) setSubscriptionPayment(String(paymentMethods[0].id));
    const entry = { id: Date.now(), action: subscriptionPlan === "free" ? "Started" : "Changed", plan: plan === "plus" ? "HOWDI Plus" : "HOWDI Pro", date: new Date().toLocaleDateString("en-IN") };
    setSubscriptionHistory((items) => [entry, ...items].slice(0, 10));
    changeSubscriptionPlan(plan);
  };

  const toggleSubscriptionAutoRenew = () => {
    setSubscriptionAutoRenew((value) => {
      const next = !value;
      try {
        localStorage.setItem("howdiSubscriptionAutoRenew", JSON.stringify(next));
      } catch {}
      setSubscriptionNotice(next ? "Auto-renew is turned on." : "Auto-renew is turned off.");
      return next;
    });
  };

  useEffect(() => {
    localStorage.setItem("howdiSupportTickets", JSON.stringify(supportTickets));
  }, [supportTickets]);

  const submitSupportTicket = () => {
    const subject = supportTicketSubject.trim();
    const message = supportTicketMessage.trim();
    if (!subject || !message) return;
    const ticket = {
      id: `HD-${String(Date.now()).slice(-6)}`,
      subject, message, status: "Open", date: new Date().toLocaleDateString("en-IN"),
    };
    setSupportTickets((items) => [ticket, ...items].slice(0, 20));
    setSupportTicketSubject("");
    setSupportTicketMessage("");
    setSupportTicketOpen(false);
  };

  const filteredSupportFaqs = supportFaqs.filter((faq) => {
    const categoryMatch = supportCategory === "all" || faq.category === supportCategory;
    const q = supportSearch.trim().toLowerCase();
    const searchMatch = !q || `${faq.question} ${faq.answer}`.toLowerCase().includes(q);
    return categoryMatch && searchMatch;
  });

  const filteredLearningCourses = learningCourses.filter((course) => {
    if (learningFilter === "in-progress") return course.status === "in-progress";
    if (learningFilter === "completed") return course.status === "completed";
    if (learningFilter === "saved") return course.status === "saved";
    return true;
  });

  const unreadNotificationCount = notifications.filter((item) => item.unread).length;

  const markNotificationRead = (id) => {
    setNotifications((items) => items.map((item) => item.id === id ? { ...item, unread: false } : item));
  };

  const markAllNotificationsRead = () => {
    setNotifications((items) => items.map((item) => ({ ...item, unread: false })));
  };

  const deleteNotification = (id) => {
    setNotifications((items) => items.filter((item) => item.id !== id));
  };

  const openNotifications = () => {
    if (!currentUser) {
      openLogin();
      return;
    }
    setNotificationOpen((open) => !open);
  };

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
  const [productDetailOpen, setProductDetailOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedProductSize, setSelectedProductSize] = useState("");
  const [selectedProductColor, setSelectedProductColor] = useState("");
  const [selectedProductImage, setSelectedProductImage] = useState(0);
  const [customMeasurements, setCustomMeasurements] = useState("");
  const [productOfferTime, setProductOfferTime] = useState(0);
  const [likedProducts, setLikedProducts] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("howdiProductLikes") || "[]");
      return Array.isArray(saved) ? saved : [];
    } catch {
      return [];
    }
  });
  const [reviewFilter, setReviewFilter] = useState("recent");
  const [deliveryPincode, setDeliveryPincode] = useState("");
  const [deliveryChecked, setDeliveryChecked] = useState(false);
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);
  const [makerStoryOpen, setMakerStoryOpen] = useState(false);
  const [questionOpen, setQuestionOpen] = useState(false);
  const [productQuantity, setProductQuantityState] = useState(1);
  const [customerPhotoOpen, setCustomerPhotoOpen] = useState(false);
  const [shareMessage, setShareMessage] = useState("");
  const [questionText, setQuestionText] = useState("");
  const [questionSubmitted, setQuestionSubmitted] = useState(false);
  const [recentlyViewed, setRecentlyViewed] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("howdiRecentlyViewed") || "[]");
      return Array.isArray(saved) ? saved : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem("howdiProductLikes", JSON.stringify(likedProducts));
  }, [likedProducts]);

  useEffect(() => {
    localStorage.setItem("howdiCart", JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    localStorage.setItem("howdiRecentlyViewed", JSON.stringify(recentlyViewed));
  }, [recentlyViewed]);

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

  const openProductDetails = (product) => {
    setSelectedProduct(product);
    setSelectedProductSize(product.sizes?.[0] || "");
    setSelectedProductColor(product.colors?.[0] || "");
    setSelectedProductImage(0);
    setCustomMeasurements("");
    setProductQuantityState(1);
    setDeliveryPincode("");
    setDeliveryChecked(false);
    setQuestionOpen(false);
    setQuestionSubmitted(false);
    setQuestionText("");
    setShareMessage("");
    setProductDetailOpen(true);
    setRecentlyViewed((current) => [product.name, ...current.filter((name) => name !== product.name)].slice(0, 6));
  };

  useEffect(() => {
    if (!productDetailOpen || !selectedProduct?.offerEndsAt) return undefined;
    const updateOfferClock = () => {
      const remaining = Math.max(0, new Date(selectedProduct.offerEndsAt).getTime() - Date.now());
      setProductOfferTime(remaining);
    };
    updateOfferClock();
    const timer = window.setInterval(updateOfferClock, 1000);
    return () => window.clearInterval(timer);
  }, [productDetailOpen, selectedProduct]);

  useEffect(() => {
    if (!productDetailOpen || !selectedProduct) return undefined;
    const galleryTimer = window.setInterval(() => {
      setSelectedProductImage((current) => (current + 1) % 3);
    }, 3500);
    return () => window.clearInterval(galleryTimer);
  }, [productDetailOpen, selectedProduct]);

  const toggleProductLike = (product) => {
    setLikedProducts((current) =>
      current.includes(product.name)
        ? current.filter((name) => name !== product.name)
        : [...current, product.name]
    );
  };

  const checkDelivery = () => {
    setDeliveryChecked(/^[1-9][0-9]{5}$/.test(deliveryPincode));
  };

  const formatOfferTime = (ms) => {
    const total = Math.floor(ms / 1000);
    const days = Math.floor(total / 86400);
    const hours = Math.floor((total % 86400) / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const seconds = total % 60;
    return `${days ? `${days}d ` : ""}${String(hours).padStart(2, "0")}h ${String(minutes).padStart(2, "0")}m ${String(seconds).padStart(2, "0")}s`;
  };

  const shareSelectedProduct = async () => {
    if (!selectedProduct) return;
    const shareText = `${selectedProduct.name} · ${selectedProduct.price} · HOWDI Handmade Marketplace`;
    try {
      if (navigator.share) {
        await navigator.share({ title: selectedProduct.name, text: shareText });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}#${encodeURIComponent(selectedProduct.name)}`);
        setShareMessage("Product link copied");
      } else {
        setShareMessage("Share this product from your browser");
      }
    } catch {
      setShareMessage("");
    }
  };

  const getReviewList = () => {
    const reviews = [...(selectedProduct?.recentReviews || [])];
    if (reviewFilter === "helpful") return reviews.sort((a, b) => (b.helpful || 0) - (a.helpful || 0));
    if (reviewFilter === "photos") return reviews.filter((review) => review.photo);
    return reviews;
  };

  const addSelectedProductToCart = () => {
    if (!selectedProduct) return;
    const configuredProduct = {
      ...selectedProduct,
      selectedSize: selectedProductSize,
      selectedColor: selectedProductColor,
      customMeasurements: selectedProductSize === "Custom" ? customMeasurements : "",
    };
    addToCart(configuredProduct, productQuantity);
    setProductDetailOpen(false);
  };

  const buySelectedProductNow = () => {
    if (!selectedProduct) return;
    const configuredProduct = {
      ...selectedProduct,
      selectedSize: selectedProductSize,
      selectedColor: selectedProductColor,
      customMeasurements: selectedProductSize === "Custom" ? customMeasurements : "",
    };
    buyNow(configuredProduct, productQuantity);
    setProductDetailOpen(false);
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
    if (!currentUser) { openLogin(); return; }
    setProfileTab("overview");
    setProfileNotice("");
    setProfileForm({ full_name: currentUser?.full_name || currentUser?.name || "", phone: currentUser?.phone || "" });
    setProfileOpen(true);
  };

  const openProfileSettings = () => {
    setProfileForm({ full_name: currentUser?.full_name || currentUser?.name || "", phone: currentUser?.phone || "" });
    setProfileNotice("");
    setProfileTab("settings");
    setProfileOpen(true);
  };

  const saveProfileDetails = (event) => {
    event?.preventDefault();
    const full_name = profileForm.full_name.trim();
    const phone = String(profileForm.phone || "").replace(/\D/g, "");
    if (!full_name) { setProfileNotice("Please enter your full name."); return; }
    if (phone.length !== 10) { setProfileNotice("Please enter a valid 10-digit mobile number."); return; }
    const updatedUser = { ...currentUser, full_name, phone, name: full_name };
    setCurrentUser(updatedUser);
    localStorage.setItem("howdiUser", JSON.stringify(updatedUser));
    setProfileEditOpen(false);
    setProfileNotice("Profile details saved successfully. ✓");
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
    setProfileEditOpen(false);
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


            {currentUser && (
              <button
                type="button"
                onClick={openNotifications}
                title="Notifications"
                style={{
                  position: "relative",
                  width: "44px",
                  height: "44px",
                  borderRadius: "12px",
                  border: "1px solid #dbe3dc",
                  background: notificationOpen ? "#e7eee9" : "#fff",
                  cursor: "pointer",
                  fontSize: "20px",
                }}
              >
                🔔
                {unreadNotificationCount > 0 && (
                  <span style={{ position: "absolute", top: "-5px", right: "-5px", minWidth: "19px", height: "19px", padding: "0 4px", borderRadius: "999px", background: "#e11d48", color: "#fff", fontSize: "10px", fontWeight: 900, display: "inline-flex", alignItems: "center", justifyContent: "center", border: "2px solid #fff" }}>
                    {unreadNotificationCount > 9 ? "9+" : unreadNotificationCount}
                  </span>
                )}
              </button>
            )}

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

      {notificationOpen && currentUser && (
        <div style={{ position: "fixed", top: "88px", right: "24px", zIndex: 10001, width: "370px", maxWidth: "calc(100vw - 32px)", background: "#fff", border: "1px solid #dbe3dc", borderRadius: "18px", boxShadow: "0 20px 50px rgba(15,23,42,.18)", overflow: "hidden" }}>
          <div style={{ padding: "15px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #eef2f0" }}>
            <div><strong style={{ fontSize: "16px" }}>Notifications</strong>{unreadNotificationCount > 0 && <span style={{ marginLeft: "7px", fontSize: "11px", color: "#e11d48", fontWeight: 900 }}>{unreadNotificationCount} new</span>}</div>
            <button type="button" onClick={markAllNotificationsRead} disabled={!unreadNotificationCount} style={{ border: 0, background: "transparent", color: unreadNotificationCount ? "#365947" : "#94a3b8", fontWeight: 800, cursor: unreadNotificationCount ? "pointer" : "not-allowed" }}>Mark all read</button>
          </div>
          <div style={{ maxHeight: "420px", overflowY: "auto" }}>
            {notifications.length === 0 ? (
              <div style={{ padding: "34px 20px", textAlign: "center", color: "#64748b" }}>🔔<br />You're all caught up.</div>
            ) : notifications.slice(0, 5).map((item) => (
              <button key={item.id} type="button" onClick={() => markNotificationRead(item.id)} style={{ width: "100%", display: "flex", gap: "11px", alignItems: "flex-start", textAlign: "left", padding: "14px 16px", border: 0, borderBottom: "1px solid #f1f5f9", background: item.unread ? "#fff8fa" : "#fff", cursor: "pointer" }}>
                <span style={{ width: "38px", height: "38px", flex: "0 0 38px", borderRadius: "11px", display: "flex", alignItems: "center", justifyContent: "center", background: item.unread ? "#ffe9ee" : "#f1f5f9", fontSize: "19px" }}>{item.icon}</span>
                <span style={{ minWidth: 0, flex: 1 }}><span style={{ display: "block", fontWeight: item.unread ? 900 : 750, color: "#1e293b", fontSize: "13px" }}>{item.title}{item.unread && <span style={{ display: "inline-block", width: "6px", height: "6px", borderRadius: "50%", background: "#e11d48", marginLeft: "6px", verticalAlign: "middle" }} />}</span><span style={{ display: "block", marginTop: "3px", color: "#64748b", fontSize: "12px", lineHeight: 1.4 }}>{item.text}</span><span style={{ display: "block", marginTop: "5px", color: "#94a3b8", fontSize: "10px" }}>{item.time}</span></span>
              </button>
            ))}
          </div>
          <div style={{ padding: "11px 16px", borderTop: "1px solid #eef2f0", textAlign: "center" }}>
            <button type="button" onClick={() => { setNotificationOpen(false); setProfileTab("notifications"); setProfileOpen(true); }} style={{ border: 0, background: "transparent", color: "#365947", fontWeight: 900, cursor: "pointer" }}>View all notifications →</button>
          </div>
        </div>
      )}


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
                  ["notifications", "🔔", "Notifications"],
                  ["messages", "💬", "Messages"],
                  ["learning", "🎓", "My Learning"],
                  ["subscription", "⭐", "Subscription"],
                  ["settings", "⚙️", "Settings & Security"],
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
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "14px", flexWrap: "wrap" }}>
                        <p style={{ color: "#64748b", margin: 0 }}>
                          Manage your HOWDI account, addresses, orders and rewards.
                        </p>
                        <button type="button" onClick={() => setProfileEditOpen(true)} style={{ border: "1px solid #dbe3dc", borderRadius: "10px", padding: "9px 13px", background: "#fff", color: "#365947", fontWeight: 900, cursor: "pointer" }}>✏️ Edit profile</button>
                      </div>
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
                        ["🎁", "Rewards", "Points & benefits", "walletRewards"],
                        ["💬", "Messages", "Your HOWDI messages", "messages"],
                        ["⚙️", "Settings & Security", "Profile, alerts & account", "settings"],
                      ].map(([icon, title, textValue, tab]) => (
                        <button
                          key={title}
                          type="button"
                          onClick={() => {
                            if (tab === "walletRewards") openWalletSection("rewards");
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
                                onClick={(event) => { event.stopPropagation(); toggleWishlist(product); }}
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

                {profileTab === "notifications" && (
                  <div style={{ minHeight: "420px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "18px", flexWrap: "wrap", marginBottom: "22px" }}>
                      <div>
                        <div style={{ fontSize: "12px", fontWeight: 800, letterSpacing: "1px", color: "#64748b" }}>HOWDI NOTIFICATIONS</div>
                        <h3 style={{ fontSize: "28px", margin: "6px 0" }}>Your notifications {unreadNotificationCount > 0 && <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: "28px", height: "28px", padding: "0 7px", borderRadius: "999px", background: "#e11d48", color: "#fff", fontSize: "13px", verticalAlign: "middle" }}>{unreadNotificationCount}</span>}</h3>
                        <p style={{ color: "#64748b", margin: 0 }}>Important updates about your orders, offers, wallet and rewards.</p>
                      </div>
                      <button type="button" onClick={markAllNotificationsRead} disabled={!unreadNotificationCount} style={{ border: "1px solid #dbe3dc", borderRadius: "10px", padding: "10px 13px", background: "#fff", color: unreadNotificationCount ? "#365947" : "#94a3b8", fontWeight: 800, cursor: unreadNotificationCount ? "pointer" : "not-allowed" }}>✓ Mark all read</button>
                    </div>
                    {notifications.length === 0 ? (
                      <div style={{ minHeight: "250px", display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", border: "1px dashed #cbd5e1", borderRadius: "18px", background: "#f8fafc" }}>
                        <div><div style={{ fontSize: "48px" }}>🔔</div><h4 style={{ fontSize: "20px", margin: "10px 0 6px" }}>You're all caught up</h4><p style={{ color: "#64748b", margin: 0 }}>New HOWDI updates will appear here.</p></div>
                      </div>
                    ) : (
                      <div style={{ display: "grid", gap: "10px" }}>
                        {notifications.map((item) => (
                          <div key={item.id} style={{ display: "flex", alignItems: "flex-start", gap: "13px", padding: "16px", border: item.unread ? "1px solid #f2b8c4" : "1px solid #e2e8f0", borderRadius: "16px", background: item.unread ? "#fff9fa" : "#fff" }}>
                            <div style={{ width: "44px", height: "44px", flex: "0 0 44px", borderRadius: "13px", display: "flex", alignItems: "center", justifyContent: "center", background: item.unread ? "#fff0f3" : "#f1f5f9", fontSize: "22px" }}>{item.icon}</div>
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", alignItems: "flex-start" }}>
                                <div style={{ fontWeight: item.unread ? 900 : 800 }}>{item.title}{item.unread && <span style={{ display: "inline-block", width: "7px", height: "7px", borderRadius: "50%", background: "#e11d48", marginLeft: "7px", verticalAlign: "middle" }} />}</div>
                                <div style={{ color: "#94a3b8", fontSize: "11px", whiteSpace: "nowrap" }}>{item.time}</div>
                              </div>
                              <div style={{ color: "#64748b", fontSize: "13px", lineHeight: 1.5, marginTop: "5px" }}>{item.text}</div>
                              <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
                                {item.unread && <button type="button" onClick={() => markNotificationRead(item.id)} style={{ border: 0, borderRadius: "8px", padding: "7px 10px", background: "#e7f2eb", color: "#365947", fontWeight: 800, cursor: "pointer", fontSize: "12px" }}>Mark read</button>}
                                <button type="button" onClick={() => deleteNotification(item.id)} style={{ border: "1px solid #fecaca", borderRadius: "8px", padding: "7px 10px", background: "#fff", color: "#b91c1c", fontWeight: 800, cursor: "pointer", fontSize: "12px" }}>Delete</button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {profileTab === "learning" && (
                  <div style={{ minHeight: "420px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "18px", flexWrap: "wrap", marginBottom: "22px" }}>
                      <div>
                        <div style={{ fontSize: "12px", fontWeight: 800, letterSpacing: "1px", color: "#64748b" }}>HOWDI LEARNING</div>
                        <h3 style={{ fontSize: "28px", margin: "6px 0" }}>Learn. Grow. Earn. 🎓</h3>
                        <p style={{ color: "#64748b", margin: 0 }}>Build practical skills for work, business and everyday life.</p>
                      </div>
                      <button type="button" onClick={openLearningCatalog} style={{ border: 0, borderRadius: "10px", padding: "10px 15px", background: "#365947", color: "#fff", fontWeight: 900, cursor: "pointer" }}>Browse courses →</button>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "12px", marginBottom: "18px" }}>
                      {[
                        [learningCourses.filter(c => c.status === "in-progress").length, "In progress", "📚"],
                        [learningCourses.filter(c => c.status === "completed").length, "Completed", "🏆"],
                        [learningCourses.filter(c => c.status === "saved").length, "Saved", "🔖"],
                      ].map(([value, label, icon]) => (
                        <div key={label} style={{ border: "1px solid #e2e8f0", borderRadius: "16px", padding: "16px", background: "#fff" }}>
                          <div style={{ fontSize: "22px" }}>{icon}</div>
                          <div style={{ fontSize: "24px", fontWeight: 900, marginTop: "6px" }}>{value}</div>
                          <div style={{ color: "#64748b", fontSize: "12px", marginTop: "2px" }}>{label}</div>
                        </div>
                      ))}
                    </div>

                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "14px" }}>
                      {[
                        ["all", "All courses"],
                        ["in-progress", "Continue learning"],
                        ["completed", "Completed"],
                        ["saved", "Saved"],
                      ].map(([filter, label]) => (
                        <button key={filter} type="button" onClick={() => setLearningFilter(filter)} style={{ border: learningFilter === filter ? 0 : "1px solid #dbe3dc", borderRadius: "999px", padding: "9px 13px", background: learningFilter === filter ? "#365947" : "#fff", color: learningFilter === filter ? "#fff" : "#334155", fontWeight: 800, cursor: "pointer" }}>{label}</button>
                      ))}
                    </div>

                    {learningNotice && (
                      <div style={{ marginBottom: "14px", padding: "10px 12px", borderRadius: "10px", background: "#ecfdf3", color: "#166534", fontSize: "13px", fontWeight: 800 }}>{learningNotice}</div>
                    )}

                    {filteredLearningCourses.length === 0 ? (
                      <div style={{ minHeight: "220px", display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", border: "1px dashed #cbd5e1", borderRadius: "18px", background: "#f8fafc" }}>
                        <div><div style={{ fontSize: "48px" }}>🎓</div><h4 style={{ fontSize: "20px", margin: "10px 0 6px" }}>No courses here yet</h4><p style={{ color: "#64748b", margin: 0 }}>Your learning activity will appear here.</p></div>
                      </div>
                    ) : (
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "12px" }}>
                        {filteredLearningCourses.map((course) => (
                          <div key={course.id} style={{ border: "1px solid #e2e8f0", borderRadius: "18px", padding: "17px", background: "#fff", boxShadow: "0 6px 18px rgba(15,23,42,.04)" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px" }}>
                              <div style={{ width: "48px", height: "48px", borderRadius: "14px", background: "#eef5f0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "25px" }}>{course.icon}</div>
                              <span style={{ padding: "5px 8px", borderRadius: "999px", background: course.status === "completed" ? "#ecfdf3" : course.status === "saved" ? "#f8fafc" : "#fff7ed", color: course.status === "completed" ? "#166534" : course.status === "saved" ? "#475569" : "#9a3412", fontSize: "11px", fontWeight: 900 }}>{course.status === "completed" ? "COMPLETED" : course.status === "saved" ? "SAVED" : "IN PROGRESS"}</span>
                            </div>
                            <div style={{ color: "#8b6a2d", fontSize: "11px", fontWeight: 900, letterSpacing: ".8px", marginTop: "14px" }}>{course.category.toUpperCase()}</div>
                            <h4 style={{ fontSize: "18px", margin: "5px 0 4px" }}>{course.title}</h4>
                            <div style={{ color: "#64748b", fontSize: "12px" }}>{course.instructor} · {course.duration}</div>
                            <div style={{ marginTop: "15px" }}>
                              <div style={{ display: "flex", justifyContent: "space-between", color: "#64748b", fontSize: "12px", marginBottom: "6px" }}><span>{course.lessons}</span><strong style={{ color: "#365947" }}>{course.progress}%</strong></div>
                              <div style={{ height: "8px", borderRadius: "999px", background: "#e5e7eb", overflow: "hidden" }}><div style={{ width: `${course.progress}%`, height: "100%", background: "#365947", borderRadius: "999px" }} /></div>
                            </div>
                            <button type="button" onClick={() => course.status === "completed" ? viewLearningCertificate(course) : updateLearningCourse(course.id)} style={{ width: "100%", marginTop: "15px", border: course.status === "completed" ? "1px solid #b7cdbf" : 0, borderRadius: "10px", padding: "10px 12px", background: course.status === "completed" ? "#f8faf8" : "#365947", color: course.status === "completed" ? "#365947" : "#fff", fontWeight: 900, cursor: "pointer" }}>{course.status === "completed" ? "🏆 View certificate" : course.status === "saved" ? "▶ Start course" : "▶ Continue learning"}</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {learningBrowseOpen && (
                  <div style={{ position: "fixed", inset: 0, zIndex: 2000, background: "rgba(15,23,42,.58)", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }} onClick={() => setLearningBrowseOpen(false)}>
                    <div style={{ width: "min(900px, 100%)", maxHeight: "85vh", overflow: "auto", background: "#fff", borderRadius: "22px", padding: "24px", boxShadow: "0 25px 80px rgba(15,23,42,.25)" }} onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "15px", marginBottom: "18px" }}>
                        <div><div style={{ fontSize: "12px", fontWeight: 800, letterSpacing: "1px", color: "#64748b" }}>HOWDI LEARNING</div><h3 style={{ margin: "5px 0" }}>Browse courses 🎓</h3><p style={{ margin: 0, color: "#64748b" }}>Choose a course and add it to your learning dashboard.</p></div>
                        <button type="button" onClick={() => setLearningBrowseOpen(false)} style={{ width: "38px", height: "38px", borderRadius: "50%", border: "1px solid #dbe3dc", background: "#fff", cursor: "pointer", fontSize: "18px" }}>×</button>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "12px" }}>
                        {learningCatalog.map((course) => {
                          const alreadyAdded = learningCourses.some((item) => item.id === course.id);
                          return <div key={course.id} style={{ border: "1px solid #e2e8f0", borderRadius: "16px", padding: "17px", background: "#fff" }}>
                            <div style={{ width: "48px", height: "48px", borderRadius: "14px", background: "#eef5f0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "25px" }}>{course.icon}</div>
                            <div style={{ color: "#8b6a2d", fontSize: "11px", fontWeight: 900, letterSpacing: ".8px", marginTop: "13px" }}>{course.category.toUpperCase()}</div>
                            <h4 style={{ fontSize: "17px", margin: "5px 0" }}>{course.title}</h4>
                            <div style={{ color: "#64748b", fontSize: "12px" }}>{course.instructor} · {course.duration}</div>
                            <button type="button" disabled={alreadyAdded} onClick={() => startCatalogCourse(course)} style={{ width: "100%", marginTop: "14px", border: alreadyAdded ? "1px solid #cbd5e1" : 0, borderRadius: "10px", padding: "10px", background: alreadyAdded ? "#f8fafc" : "#365947", color: alreadyAdded ? "#64748b" : "#fff", fontWeight: 900, cursor: alreadyAdded ? "not-allowed" : "pointer" }}>{alreadyAdded ? "✓ Added to learning" : "Start course →"}</button>
                          </div>;
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {certificateCourse && (
                  <div style={{ position: "fixed", inset: 0, zIndex: 2100, background: "rgba(15,23,42,.58)", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }} onClick={() => setCertificateCourse(null)}>
                    <div style={{ width: "min(620px, 100%)", background: "#fff", borderRadius: "24px", padding: "32px", textAlign: "center", boxShadow: "0 25px 80px rgba(15,23,42,.25)" }} onClick={(e) => e.stopPropagation()}>
                      <div style={{ fontSize: "52px" }}>🏆</div>
                      <div style={{ fontSize: "12px", fontWeight: 900, letterSpacing: "2px", color: "#8b6a2d", marginTop: "8px" }}>HOWDI LEARNING</div>
                      <h2 style={{ margin: "8px 0" }}>Certificate of Completion</h2>
                      <p style={{ color: "#64748b", margin: "0 auto", maxWidth: "470px" }}>This certifies that</p>
                      <h3 style={{ fontSize: "24px", margin: "8px 0" }}>Bhaskar Badavath</h3>
                      <p style={{ color: "#64748b", margin: "0 auto", maxWidth: "470px" }}>has successfully completed</p>
                      <h3 style={{ fontSize: "21px", margin: "8px 0 18px" }}>{certificateCourse.title}</h3>
                      <div style={{ display: "flex", justifyContent: "center", gap: "10px", flexWrap: "wrap", color: "#475569", fontSize: "12px" }}><span>✓ 100% complete</span><span>•</span><span>HOWDI Learning</span></div>
                      <button type="button" onClick={() => setCertificateCourse(null)} style={{ marginTop: "24px", border: 0, borderRadius: "10px", padding: "11px 20px", background: "#365947", color: "#fff", fontWeight: 900, cursor: "pointer" }}>Done</button>
                    </div>
                  </div>
                )}

                {profileTab === "subscription" && (
                  <div style={{ minHeight: "420px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "18px", flexWrap: "wrap", marginBottom: "20px" }}>
                      <div>
                        <div style={{ fontSize: "12px", fontWeight: 800, letterSpacing: "1px", color: "#64748b" }}>HOWDI SUBSCRIPTION</div>
                        <h3 style={{ fontSize: "28px", margin: "6px 0" }}>Choose what works for you ⭐</h3>
                        <p style={{ color: "#64748b", margin: 0 }}>More value, better rewards and member-only benefits.</p>
                      </div>
                      <div style={{ padding: "9px 13px", borderRadius: "999px", background: subscriptionPlan === "free" ? "#f1f5f9" : "#ecfdf3", color: subscriptionPlan === "free" ? "#475569" : "#166534", fontSize: "12px", fontWeight: 900 }}>
                        {subscriptionPlan === "free" ? "FREE PLAN" : subscriptionPlan === "plus" ? "PLUS ACTIVE" : "PRO ACTIVE"}
                      </div>
                    </div>

                    {subscriptionNotice && <div style={{ marginBottom: "15px", padding: "11px 13px", borderRadius: "11px", background: "#ecfdf3", color: "#166534", fontSize: "13px", fontWeight: 800 }}>{subscriptionNotice}</div>}

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap", marginBottom: "14px" }}>
                      <div style={{ fontWeight: 900, color: "#334155" }}>Billing frequency</div>
                      <div style={{ display: "flex", gap: "5px", padding: "4px", border: "1px solid #dbe3dc", borderRadius: "12px", background: "#f8faf8" }}>
                        <button type="button" onClick={() => setSubscriptionBilling("monthly")} style={{ border: 0, borderRadius: "9px", padding: "8px 12px", background: subscriptionBilling === "monthly" ? "#365947" : "transparent", color: subscriptionBilling === "monthly" ? "#fff" : "#475569", fontWeight: 900, cursor: "pointer" }}>Monthly</button>
                        <button type="button" onClick={() => setSubscriptionBilling("yearly")} style={{ border: 0, borderRadius: "9px", padding: "8px 12px", background: subscriptionBilling === "yearly" ? "#365947" : "transparent", color: subscriptionBilling === "yearly" ? "#fff" : "#475569", fontWeight: 900, cursor: "pointer" }}>Yearly · Save more</button>
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "12px", marginBottom: "16px" }}>
                      {[
                        { id: "free", name: "HOWDI Free", monthly: 0, yearly: 0, icon: "🌱", features: ["Browse local services", "Shop local products", "Basic rewards"] },
                        { id: "plus", name: "HOWDI Plus", monthly: 99, yearly: 999, icon: "⭐", features: ["Extra cashback offers", "Priority support", "Member-only deals"] },
                        { id: "pro", name: "HOWDI Pro", monthly: 199, yearly: 1999, icon: "👑", features: ["Higher rewards", "Premium offers", "Priority access"] },
                      ].map((plan) => {
                        const active = subscriptionPlan === plan.id;
                        const price = subscriptionBilling === "yearly" ? plan.yearly : plan.monthly;
                        return (
                          <div key={plan.id} style={{ position: "relative", border: active ? "2px solid #365947" : "1px solid #e2e8f0", borderRadius: "18px", padding: "18px", background: active ? "#f8faf8" : "#fff", boxShadow: active ? "0 8px 24px rgba(54,89,71,.08)" : "none" }}>
                            {plan.id === "plus" && <div style={{ position: "absolute", top: "12px", right: "12px", padding: "4px 7px", borderRadius: "999px", background: "#fff7ed", color: "#9a3412", fontSize: "10px", fontWeight: 900 }}>POPULAR</div>}
                            <div style={{ fontSize: "28px" }}>{plan.icon}</div>
                            <h4 style={{ fontSize: "18px", margin: "10px 0 4px" }}>{plan.name}</h4>
                            <div style={{ display: "flex", alignItems: "baseline", gap: "5px" }}><strong style={{ fontSize: "27px" }}>₹{price}</strong><span style={{ color: "#64748b", fontSize: "12px" }}>{plan.id === "free" ? "forever" : subscriptionBilling === "yearly" ? "/ year" : "/ month"}</span></div>
                            {subscriptionBilling === "yearly" && plan.id !== "free" && <div style={{ color: "#166534", fontSize: "11px", fontWeight: 800, marginTop: "4px" }}>Save vs monthly billing</div>}
                            <div style={{ display: "grid", gap: "8px", margin: "16px 0" }}>{plan.features.map((feature) => <div key={feature} style={{ color: "#475569", fontSize: "13px" }}>✓ {feature}</div>)}</div>
                            <button type="button" onClick={() => chooseSubscriptionPlan(plan.id)} style={{ width: "100%", border: active ? "1px solid #b7cdbf" : 0, borderRadius: "10px", padding: "10px 12px", background: active ? "#fff" : "#365947", color: active ? "#365947" : "#fff", fontWeight: 900, cursor: active ? "default" : "pointer" }}>{active ? "Current plan" : plan.id === "free" ? "Cancel paid plan" : "Choose plan →"}</button>
                          </div>
                        );
                      })}
                    </div>

                    {subscriptionPlan !== "free" && (
                      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.15fr) minmax(260px, .85fr)", gap: "12px", marginBottom: "14px" }}>
                        <div style={{ border: "1px solid #e2e8f0", borderRadius: "18px", padding: "18px", background: "#fff" }}>
                          <div style={{ fontWeight: 900, fontSize: "17px" }}>💳 Payment method</div>
                          <p style={{ color: "#64748b", fontSize: "13px", margin: "7px 0 12px" }}>Choose one of your saved payment methods for subscription billing.</p>
                          {paymentMethods.length ? <select value={subscriptionPayment || String(paymentMethods[0].id)} onChange={(e) => setSubscriptionPayment(e.target.value)} style={{ width: "100%", height: "42px", border: "1px solid #cbd5e1", borderRadius: "10px", padding: "0 10px", background: "#fff", fontWeight: 700 }}>
                            {paymentMethods.map((method) => <option key={method.id} value={String(method.id)}>{method.type === "UPI" ? `UPI · ${method.value}` : `${method.type === "CARD" ? "Card" : "Bank"} · ${method.value}`}</option>)}
                          </select> : <div style={{ padding: "11px", borderRadius: "10px", background: "#fff7ed", color: "#9a3412", fontSize: "13px", fontWeight: 800 }}>Add a payment method in Payments before subscribing.</div>}
                        </div>
                        <div style={{ border: "1px solid #e2e8f0", borderRadius: "18px", padding: "18px", background: "#fff" }}>
                          <div style={{ fontWeight: 900, fontSize: "17px" }}>🔄 Auto-renew</div>
                          <p style={{ color: "#64748b", fontSize: "13px", lineHeight: 1.5, margin: "7px 0 12px" }}>Automatically renew your membership at the end of the billing period.</p>
                          <button type="button" onClick={toggleSubscriptionAutoRenew} style={{ width: "100%", border: "1px solid #dbe3dc", borderRadius: "10px", padding: "10px 12px", background: subscriptionAutoRenew ? "#365947" : "#fff", color: subscriptionAutoRenew ? "#fff" : "#334155", fontWeight: 900, cursor: "pointer" }}>{subscriptionAutoRenew ? "✓ Auto-renew on" : "Auto-renew off"}</button>
                        </div>
                      </div>
                    )}

                    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.1fr) minmax(0, .9fr)", gap: "12px" }}>
                      <div style={{ border: "1px solid #e2e8f0", borderRadius: "18px", padding: "18px", background: "#fff" }}>
                        <div style={{ fontWeight: 900, fontSize: "17px" }}>📅 Subscription details</div>
                        <div style={{ display: "grid", gap: "10px", marginTop: "14px", color: "#64748b", fontSize: "13px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", gap: "10px" }}><span>Current plan</span><strong style={{ color: "#0f172a" }}>{subscriptionPlan === "free" ? "HOWDI Free" : subscriptionPlan === "plus" ? "HOWDI Plus" : "HOWDI Pro"}</strong></div>
                          <div style={{ display: "flex", justifyContent: "space-between", gap: "10px" }}><span>Status</span><strong style={{ color: "#166534" }}>Active</strong></div>
                          <div style={{ display: "flex", justifyContent: "space-between", gap: "10px" }}><span>Billing</span><strong style={{ color: "#0f172a" }}>{subscriptionPlan === "free" ? "No billing" : subscriptionBilling === "yearly" ? "Yearly" : "Monthly"}</strong></div>
                          <div style={{ display: "flex", justifyContent: "space-between", gap: "10px" }}><span>Next billing</span><strong style={{ color: "#0f172a" }}>{subscriptionPlan === "free" ? "—" : "30 days from activation"}</strong></div>
                        </div>
                      </div>
                      <div style={{ border: "1px solid #e2e8f0", borderRadius: "18px", padding: "18px", background: "#fff" }}>
                        <div style={{ fontWeight: 900, fontSize: "17px" }}>🧾 Recent subscription activity</div>
                        {subscriptionHistory.length ? <div style={{ display: "grid", gap: "9px", marginTop: "12px" }}>{subscriptionHistory.slice(0, 4).map((item) => <div key={item.id} style={{ display: "flex", justifyContent: "space-between", gap: "8px", fontSize: "12px" }}><span><strong>{item.action}</strong> · {item.plan}</span><span style={{ color: "#64748b" }}>{item.date}</span></div>)}</div> : <p style={{ color: "#64748b", fontSize: "13px", marginBottom: 0 }}>No subscription activity yet.</p>}
                      </div>
                    </div>

                    {subscriptionCancelOpen && (
                      <div style={{ position: "fixed", inset: 0, zIndex: 2200, background: "rgba(15,23,42,.58)", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }} onClick={() => setSubscriptionCancelOpen(false)}>
                        <div style={{ width: "min(430px,100%)", background: "#fff", borderRadius: "20px", padding: "24px", boxShadow: "0 25px 70px rgba(15,23,42,.25)" }} onClick={(e) => e.stopPropagation()}>
                          <div style={{ fontSize: "32px" }}>⚠️</div>
                          <h3 style={{ margin: "8px 0" }}>Cancel paid subscription?</h3>
                          <p style={{ color: "#64748b", lineHeight: 1.5, fontSize: "14px" }}>You'll switch to HOWDI Free. This is a prototype, so no real payment will be charged or refunded.</p>
                          <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "18px" }}><button type="button" onClick={() => setSubscriptionCancelOpen(false)} style={{ border: "1px solid #dbe3dc", borderRadius: "10px", padding: "10px 14px", background: "#fff", fontWeight: 800, cursor: "pointer" }}>Keep plan</button><button type="button" onClick={confirmSubscriptionCancellation} style={{ border: 0, borderRadius: "10px", padding: "10px 14px", background: "#b91c1c", color: "#fff", fontWeight: 900, cursor: "pointer" }}>Yes, cancel</button></div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {profileTab === "settings" && (
                  <div style={{ minHeight: "420px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "18px", flexWrap: "wrap", marginBottom: "22px" }}>
                      <div><div style={{ fontSize: "12px", fontWeight: 800, letterSpacing: "1px", color: "#64748b" }}>ACCOUNT SETTINGS</div><h3 style={{ fontSize: "28px", margin: "6px 0" }}>Settings & Security ⚙️</h3><p style={{ color: "#64748b", margin: 0 }}>Keep your profile details and HOWDI alerts under your control.</p></div>
                      <button type="button" onClick={() => setProfileEditOpen(true)} style={{ border: 0, borderRadius: "11px", padding: "12px 16px", background: "#365947", color: "#fff", fontWeight: 900, cursor: "pointer" }}>✏️ Edit profile</button>
                    </div>
                    {profileNotice && <div style={{ marginBottom: "16px", padding: "12px 14px", borderRadius: "12px", background: profileNotice.includes("successfully") ? "#ecfdf3" : "#fff7ed", color: profileNotice.includes("successfully") ? "#166534" : "#9a3412", fontWeight: 700, fontSize: "13px" }}>{profileNotice}</div>}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "14px" }}>
                      <div style={{ padding: "18px", border: "1px solid #e2e8f0", borderRadius: "16px", background: "#fff" }}><div style={{ fontSize: "12px", color: "#64748b", fontWeight: 800 }}>PROFILE</div><div style={{ fontWeight: 900, fontSize: "18px", marginTop: "8px" }}>{currentUser?.full_name || currentUser?.name || "Customer"}</div><div style={{ color: "#64748b", fontSize: "13px", marginTop: "5px" }}>{currentUser?.phone || "Mobile number not set"}</div><div style={{ color: "#64748b", fontSize: "13px", marginTop: "3px" }}>{currentUser?.email || "Email not set"}</div></div>
                      <div style={{ padding: "18px", border: "1px solid #e2e8f0", borderRadius: "16px", background: "#fff" }}><div style={{ fontSize: "12px", color: "#64748b", fontWeight: 800 }}>SECURITY</div><div style={{ fontWeight: 900, fontSize: "17px", marginTop: "8px" }}>🔐 Password protected</div><div style={{ color: "#64748b", fontSize: "13px", lineHeight: 1.5, marginTop: "5px" }}>Your password remains managed by the HOWDI login system and is not displayed here.</div></div>
                    </div>
                    <div style={{ marginTop: "18px", padding: "18px", border: "1px solid #e2e8f0", borderRadius: "16px", background: "#fff" }}>
                      <div style={{ fontWeight: 900, fontSize: "18px", marginBottom: "5px" }}>🔔 Notification preferences</div><div style={{ color: "#64748b", fontSize: "13px", marginBottom: "12px" }}>Choose which types of updates you want to receive.</div>
                      <div style={{ display: "grid", gap: "10px" }}>{[["orderUpdates","📦 Order updates","Shipping and delivery changes"],["offers","🎁 Offers & deals","Festival offers, discounts and rewards"],["walletAlerts","💰 Wallet alerts","Cashback, wallet and reward activity"],["learningUpdates","🎓 Learning updates","Course progress and certificate reminders"]].map(([key,title,text]) => <label key={key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "14px", padding: "12px 13px", border: "1px solid #eef2f4", borderRadius: "12px", background: "#f8fafc", cursor: "pointer" }}><span><strong style={{ display: "block", fontSize: "14px" }}>{title}</strong><span style={{ display: "block", marginTop: "3px", color: "#64748b", fontSize: "12px" }}>{text}</span></span><input type="checkbox" checked={!!profilePreferences[key]} onChange={(e) => setProfilePreferences((current) => ({ ...current, [key]: e.target.checked }))} style={{ width: "18px", height: "18px", accentColor: "#365947" }} /></label>)}</div>
                    </div>
                    <div style={{ marginTop: "18px", padding: "18px", border: "1px solid #e2e8f0", borderRadius: "16px", background: "#f8fafc" }}><div style={{ fontWeight: 900, fontSize: "17px" }}>🚪 Account session</div><p style={{ color: "#64748b", fontSize: "13px", margin: "6px 0 12px" }}>Sign out of this HOWDI account on this device.</p><button type="button" onClick={() => { localStorage.removeItem("howdiUser"); setCurrentUser(null); closeProfile(); }} style={{ border: "1px solid #fecaca", borderRadius: "10px", padding: "10px 14px", background: "#fff1f2", color: "#b91c1c", fontWeight: 900, cursor: "pointer" }}>Log out</button></div>
                  </div>
                )}

                {profileTab === "support" && (
                  <div style={{ minHeight: "420px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "18px", flexWrap: "wrap", marginBottom: "22px" }}>
                      <div>
                        <div style={{ fontSize: "12px", fontWeight: 800, letterSpacing: "1px", color: "#64748b" }}>HOWDI SUPPORT</div>
                        <h3 style={{ fontSize: "28px", margin: "6px 0" }}>How can we help? 🆘</h3>
                        <p style={{ color: "#64748b", margin: 0 }}>Find quick answers or contact the HOWDI support team.</p>
                      </div>
                      <button type="button" onClick={() => setSupportTicketOpen((open) => !open)} style={{ border: 0, borderRadius: "11px", padding: "12px 16px", background: "#365947", color: "#fff", fontWeight: 900, cursor: "pointer" }}>{supportTicketOpen ? "✕ Close" : "+ Contact support"}</button>
                    </div>

                    {supportTicketOpen && (
                      <div style={{ padding: "18px", border: "1px solid #dbe3dc", borderRadius: "18px", background: "#f8faf8", marginBottom: "18px" }}>
                        <div style={{ fontWeight: 900, fontSize: "17px", marginBottom: "10px" }}>Create a support request</div>
                        <div style={{ display: "grid", gap: "10px" }}>
                          <input value={supportTicketSubject} onChange={(e) => setSupportTicketSubject(e.target.value)} placeholder="What do you need help with?" style={{ width: "100%", height: "44px", boxSizing: "border-box", border: "1px solid #cbd5e1", borderRadius: "10px", padding: "0 12px", background: "#fff" }} />
                          <textarea value={supportTicketMessage} onChange={(e) => setSupportTicketMessage(e.target.value)} placeholder="Describe your issue..." rows={4} style={{ width: "100%", boxSizing: "border-box", border: "1px solid #cbd5e1", borderRadius: "10px", padding: "12px", background: "#fff", resize: "vertical", fontFamily: "inherit" }} />
                          <div style={{ display: "flex", justifyContent: "flex-end" }}><button type="button" onClick={submitSupportTicket} style={{ border: 0, borderRadius: "10px", padding: "10px 18px", background: "#0f172a", color: "#fff", fontWeight: 900, cursor: "pointer" }}>Submit request →</button></div>
                        </div>
                      </div>
                    )}

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 220px", gap: "12px", marginBottom: "16px" }}>
                      <input value={supportSearch} onChange={(e) => setSupportSearch(e.target.value)} placeholder="🔎 Search help" style={{ width: "100%", height: "44px", boxSizing: "border-box", border: "1px solid #dbe3dc", borderRadius: "12px", padding: "0 13px", background: "#fff" }} />
                      <select value={supportCategory} onChange={(e) => setSupportCategory(e.target.value)} style={{ height: "44px", border: "1px solid #dbe3dc", borderRadius: "12px", padding: "0 12px", background: "#fff", fontWeight: 700, color: "#334155" }}>
                        {supportCategories.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                      </select>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1.2fr .8fr", gap: "14px", alignItems: "start" }}>
                      <div>
                        <div style={{ fontWeight: 900, fontSize: "18px", marginBottom: "10px" }}>Frequently asked questions</div>
                        <div style={{ display: "grid", gap: "9px" }}>
                          {filteredSupportFaqs.length ? filteredSupportFaqs.map((faq) => (
                            <details key={faq.id} style={{ border: "1px solid #e2e8f0", borderRadius: "13px", background: "#fff", padding: "13px 15px" }}>
                              <summary style={{ cursor: "pointer", fontWeight: 800 }}>{faq.icon} {faq.question}</summary>
                              <div style={{ color: "#64748b", lineHeight: 1.55, fontSize: "13px", marginTop: "9px" }}>{faq.answer}</div>
                            </details>
                          )) : <div style={{ padding: "22px", border: "1px dashed #cbd5e1", borderRadius: "14px", color: "#64748b", textAlign: "center" }}>No help articles found.</div>}
                        </div>
                      </div>

                      <div>
                        <div style={{ fontWeight: 900, fontSize: "18px", marginBottom: "10px" }}>Your support requests</div>
                        <div style={{ border: "1px solid #e2e8f0", borderRadius: "15px", overflow: "hidden", background: "#fff" }}>
                          {supportTickets.length ? supportTickets.map((ticket) => (
                            <div key={ticket.id} style={{ padding: "13px 14px", borderBottom: "1px solid #eef2f4" }}>
                              <div style={{ display: "flex", justifyContent: "space-between", gap: "8px" }}><strong>{ticket.subject}</strong><span style={{ fontSize: "11px", color: "#365947", fontWeight: 900 }}>{ticket.status}</span></div>
                              <div style={{ color: "#64748b", fontSize: "12px", marginTop: "5px" }}>{ticket.id} · {ticket.date}</div>
                              <div style={{ color: "#64748b", fontSize: "13px", marginTop: "6px" }}>{ticket.message}</div>
                            </div>
                          )) : <div style={{ padding: "24px 15px", color: "#64748b", textAlign: "center", fontSize: "13px" }}>No support requests yet.</div>}
                        </div>
                        <div style={{ marginTop: "12px", padding: "14px", borderRadius: "14px", background: "#f8fafc", color: "#64748b", fontSize: "12px", lineHeight: 1.5 }}>💡 For urgent order issues, include your order number in the support request.</div>
                      </div>
                    </div>
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

            {profileEditOpen && (
              <div onMouseDown={(event) => { if (event.target === event.currentTarget) setProfileEditOpen(false); }} style={{ position: "absolute", inset: 0, zIndex: 5, background: "rgba(15,23,42,.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
                <form onSubmit={saveProfileDetails} style={{ width: "min(520px, 100%)", background: "#fff", borderRadius: "20px", padding: "24px", boxShadow: "0 30px 80px rgba(15,23,42,.25)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" }}><div><div style={{ fontSize: "12px", fontWeight: 800, letterSpacing: "1px", color: "#64748b" }}>EDIT PROFILE</div><h3 style={{ margin: "6px 0 0", fontSize: "24px" }}>Update your details</h3></div><button type="button" onClick={() => setProfileEditOpen(false)} style={{ width: "38px", height: "38px", borderRadius: "50%", border: "1px solid #e2e8f0", background: "#f8fafc", cursor: "pointer" }}>×</button></div>
                  <div style={{ display: "grid", gap: "14px", marginTop: "20px" }}><label style={{ display: "grid", gap: "7px", fontSize: "13px", fontWeight: 800 }}>Full name<input value={profileForm.full_name} onChange={(e) => setProfileForm((v) => ({ ...v, full_name: e.target.value }))} required style={{ height: "44px", border: "1px solid #cbd5e1", borderRadius: "10px", padding: "0 12px", fontSize: "14px" }} /></label><label style={{ display: "grid", gap: "7px", fontSize: "13px", fontWeight: 800 }}>Mobile number<input value={profileForm.phone} onChange={(e) => setProfileForm((v) => ({ ...v, phone: e.target.value.replace(/\D/g, "").slice(0, 10) }))} inputMode="numeric" maxLength={10} required style={{ height: "44px", border: "1px solid #cbd5e1", borderRadius: "10px", padding: "0 12px", fontSize: "14px" }} /></label><label style={{ display: "grid", gap: "7px", fontSize: "13px", fontWeight: 800 }}>Email address<input value={currentUser?.email || ""} readOnly style={{ height: "44px", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "0 12px", fontSize: "14px", background: "#f8fafc", color: "#64748b" }} /></label></div>
                  <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "22px" }}><button type="button" onClick={() => setProfileEditOpen(false)} style={{ border: "1px solid #cbd5e1", borderRadius: "10px", padding: "10px 15px", background: "#fff", fontWeight: 800, cursor: "pointer" }}>Cancel</button><button type="submit" style={{ border: 0, borderRadius: "10px", padding: "10px 17px", background: "#365947", color: "#fff", fontWeight: 900, cursor: "pointer" }}>Save changes</button></div>
                </form>
              </div>
            )}

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
                  onClick={() => openProductDetails(product)}
                  style={{ cursor: "pointer" }}
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

                                        <button
                      type="button"
                      onClick={(event) => { event.stopPropagation(); openProductDetails(product); }}
                      style={{ width: "100%", marginTop: "10px", minHeight: "42px", border: "1px solid #b8c9bd", borderRadius: "12px", background: "#fff", color: "#365947", fontWeight: 900, cursor: "pointer" }}
                    >
                      View handmade details →
                    </button>

</div>
</article>

              )
            )}

          </div>

        </section>


        {productDetailOpen && selectedProduct && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`${selectedProduct.name} product details`}
            onClick={() => setProductDetailOpen(false)}
            style={{ position: "fixed", inset: 0, zIndex: 2000, background: "rgba(15,23,42,.62)", display: "flex", alignItems: "center", justifyContent: "center", padding: "18px", backdropFilter: "blur(4px)" }}
          >
            <div
              onClick={(event) => event.stopPropagation()}
              style={{ width: "min(1080px, 100%)", maxHeight: "92vh", overflowY: "auto", background: "#fff", borderRadius: "24px", boxShadow: "0 30px 80px rgba(0,0,0,.28)", padding: "22px" }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", marginBottom: "14px" }}>
                <div>
                  <div style={{ fontSize: "11px", fontWeight: 900, letterSpacing: ".12em", color: "#6b806f" }}>HOWDI • HANDMADE MARKETPLACE</div>
                  <div style={{ fontSize: "13px", color: "#64748b", marginTop: "4px" }}>Every handmade piece carries the hands and story behind it. ❤️</div>
                </div>
                <button type="button" onClick={() => setProductDetailOpen(false)} style={{ width: "42px", height: "42px", borderRadius: "50%", border: "1px solid #d8dee4", background: "#fff", fontSize: "20px", cursor: "pointer" }}>×</button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "minmax(320px, .95fr) minmax(360px, 1.05fr)", gap: "24px" }}>
                <div>
                  <div style={{ minHeight: "360px", borderRadius: "20px", background: "linear-gradient(145deg,#f8f5ed,#edf5ef)", border: "1px solid #e0e7e2", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" }}>
                    <div style={{ fontSize: "150px", lineHeight: 1, transform: `scale(${selectedProductImage === 1 ? 1.08 : selectedProductImage === 2 ? .92 : 1})`, transition: "transform .35s ease" }}>{selectedProduct.icon}</div>
                    <span style={{ position: "absolute", top: "14px", left: "14px", padding: "7px 10px", borderRadius: "999px", background: "#365947", color: "#fff", fontSize: "11px", fontWeight: 900 }}>{selectedProduct.badges?.[selectedProductImage % (selectedProduct.badges?.length || 1)] || "HANDMADE"}</span>
                    <span style={{ position: "absolute", bottom: "14px", right: "14px", padding: "7px 10px", borderRadius: "999px", background: "rgba(255,255,255,.9)", color: "#365947", fontSize: "11px", fontWeight: 900 }}>View {selectedProductImage + 1} / 3</span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "10px", marginTop: "10px" }}>
                    {["Front / hero", "Texture close-up", "Craft detail"].map((label, index) => (
                      <button key={label} type="button" onClick={() => setSelectedProductImage(index)} style={{ minHeight: "72px", borderRadius: "14px", border: selectedProductImage === index ? "2px solid #365947" : "1px solid #d8e0da", background: index === 0 ? "#f8f5ed" : index === 1 ? "#eef6f0" : "#f6eff6", cursor: "pointer" }}>
                        <div style={{ fontSize: "26px" }}>{index === 0 ? selectedProduct.icon : index === 1 ? "🧶" : "🪡"}</div>
                        <div style={{ fontSize: "10px", fontWeight: 800, color: "#475569" }}>{label}</div>
                      </button>
                    ))}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px", marginTop: "10px" }}>
                    <div style={{ fontSize: "11px", color: "#64748b" }}>Auto-rotates every few seconds</div>
                    <button type="button" onClick={() => setCustomerPhotoOpen(true)} style={{ border: 0, background: "transparent", color: "#365947", fontWeight: 900, cursor: "pointer" }}>📸 Customer photos</button>
                  </div>
                  <div style={{ marginTop: "14px", padding: "14px", borderRadius: "16px", background: "#fffaf0", border: "1px solid #eee2c5" }}>
                    <div style={{ fontWeight: 900, color: "#7a531d" }}>❤️ The hands behind your product</div>
                    <div style={{ marginTop: "5px", fontSize: "13px", color: "#5f665f", lineHeight: 1.55 }}><strong>{selectedProduct.artisan}</strong> · {selectedProduct.makingTime} of careful handwork.</div>
                    <div style={{ marginTop: "6px", fontSize: "13px", color: "#5f665f", lineHeight: 1.55 }}>{selectedProduct.story}</div>
                  </div>

                  <div style={{ marginTop: "12px", display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "9px" }}>
                    <div style={{ padding: "12px", borderRadius: "14px", background: "#f7faf8", border: "1px solid #dfe9e2" }}>
                      <div style={{ fontSize: "18px" }}>🧶</div>
                      <strong style={{ display: "block", marginTop: "4px", color: "#24362d", fontSize: "13px" }}>Hand-finished</strong>
                      <div style={{ marginTop: "3px", fontSize: "11px", color: "#64748b", lineHeight: 1.4 }}>Every piece is checked before dispatch.</div>
                    </div>
                    <div style={{ padding: "12px", borderRadius: "14px", background: "#fffaf0", border: "1px solid #eee2c5" }}>
                      <div style={{ fontSize: "18px" }}>❤️</div>
                      <strong style={{ display: "block", marginTop: "4px", color: "#24362d", fontSize: "13px" }}>Made with care</strong>
                      <div style={{ marginTop: "3px", fontSize: "11px", color: "#64748b", lineHeight: 1.4 }}>Not factory-made. Small-batch handmade work.</div>
                    </div>
                    <div style={{ padding: "12px", borderRadius: "14px", background: "#f7faf8", border: "1px solid #dfe9e2" }}>
                      <div style={{ fontSize: "18px" }}>📦</div>
                      <strong style={{ display: "block", marginTop: "4px", color: "#24362d", fontSize: "13px" }}>Quality checked</strong>
                      <div style={{ marginTop: "3px", fontSize: "11px", color: "#64748b", lineHeight: 1.4 }}>{selectedProduct.shippingNote || "Packed carefully for you."}</div>
                    </div>
                    <div style={{ padding: "12px", borderRadius: "14px", background: "#f7faf8", border: "1px solid #dfe9e2" }}>
                      <div style={{ fontSize: "18px" }}>♻️</div>
                      <strong style={{ display: "block", marginTop: "4px", color: "#24362d", fontSize: "13px" }}>Thoughtful choice</strong>
                      <div style={{ marginTop: "3px", fontSize: "11px", color: "#64748b", lineHeight: 1.4 }}>Made slowly, designed to be loved longer.</div>
                    </div>
                  </div>

                  <div style={{ marginTop: "12px", padding: "14px", borderRadius: "16px", background: "linear-gradient(135deg,#f8f5ed,#f1f7f3)", border: "1px solid #dfe7e1" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" }}>
                      <div>
                        <div style={{ fontSize: "11px", fontWeight: 900, letterSpacing: ".08em", color: "#a36a2a" }}>REAL CUSTOMER LOVE</div>
                        <div style={{ marginTop: "3px", fontWeight: 900, color: "#24362d" }}>⭐ {selectedProduct.rating} · {selectedProduct.reviewCount || selectedProduct.reviews || 86} reviews</div>
                      </div>
                      <div style={{ fontSize: "25px" }}>💚</div>
                    </div>
                    <div style={{ marginTop: "9px", display: "flex", gap: "6px" }}>
                      {(selectedProduct.customerPhotos || []).slice(0, 4).map((photo, index) => (
                        <button key={`left-photo-${photo}-${index}`} type="button" onClick={() => setCustomerPhotoOpen(true)} aria-label="View customer photo" style={{ width: "48px", height: "48px", borderRadius: "11px", border: "1px solid #dbe4de", background: index % 2 ? "#fffaf0" : "#eef6f0", fontSize: "22px", cursor: "pointer" }}>{photo}</button>
                      ))}
                      <button type="button" onClick={() => setCustomerPhotoOpen(true)} style={{ flex: 1, borderRadius: "11px", border: "1px solid #dbe4de", background: "#fff", color: "#365947", fontWeight: 900, fontSize: "11px", cursor: "pointer" }}>View customer photos →</button>
                    </div>
                  </div>
                </div>

                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "flex-start" }}>
                    <div>
                      <div style={{ fontSize: "12px", fontWeight: 900, color: "#a36a2a", letterSpacing: ".08em" }}>{selectedProduct.category}</div>
                      <h2 style={{ margin: "7px 0 6px", fontSize: "30px", lineHeight: 1.12, color: "#24362d" }}>{selectedProduct.name}</h2>
                    </div>
                    <div style={{ display: "flex", gap: "7px" }}>
                      <button type="button" onClick={() => toggleProductLike(selectedProduct)} aria-label={likedProducts.includes(selectedProduct.name) ? "Remove from wishlist" : "Add to wishlist"} style={{ minWidth: "74px", padding: "9px 10px", borderRadius: "14px", border: "1px solid #d9e1dc", background: likedProducts.includes(selectedProduct.name) ? "#fff0f3" : "#fff", color: likedProducts.includes(selectedProduct.name) ? "#e11d48" : "#475569", fontWeight: 900, cursor: "pointer" }}>
                        {likedProducts.includes(selectedProduct.name) ? "♥" : "♡"} {Number(selectedProduct.likes || 0) + (likedProducts.includes(selectedProduct.name) ? 1 : 0)}
                      </button>
                      <button type="button" onClick={shareSelectedProduct} aria-label="Share product" style={{ width: "42px", padding: "9px", borderRadius: "14px", border: "1px solid #d9e1dc", background: "#fff", color: "#365947", fontWeight: 900, cursor: "pointer" }}>↗</button>
                    </div>
                  </div>
                  <div style={{ color: "#64748b", fontSize: "14px" }}>⭐ {selectedProduct.rating} ({selectedProduct.reviews} reviews) · {selectedProduct.shop}</div>
                  <div style={{ marginTop: "7px", fontSize: "12px", color: "#64748b" }}>❤️ {Number(selectedProduct.likes || 0) + (likedProducts.includes(selectedProduct.name) ? 1 : 0)} people saved this · 🧶 Handmade by {selectedProduct.artisan}</div>
                  {shareMessage && <div style={{ marginTop: "5px", fontSize: "11px", color: "#24613d", fontWeight: 800 }}>✓ {shareMessage}</div>}

                  <div style={{ display: "flex", alignItems: "baseline", gap: "10px", marginTop: "15px" }}>
                    <strong style={{ fontSize: "30px", color: "#153b2b" }}>{selectedProduct.price}</strong>
                    <del style={{ color: "#8b8b83" }}>{selectedProduct.oldPrice}</del>
                    <span style={{ padding: "5px 9px", borderRadius: "999px", background: "#e9f5eb", color: "#24613d", fontSize: "11px", fontWeight: 900 }}>SAVE ₹{Number(String(selectedProduct.oldPrice).replace(/[^0-9]/g, "")) - Number(String(selectedProduct.price).replace(/[^0-9]/g, ""))}</span>
                  </div>

                  <div style={{ marginTop: "14px", padding: "13px", borderRadius: "15px", background: "#fff6e8", border: "1px solid #f0dfbf" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", fontWeight: 900, color: "#7c511b" }}><span>🔥 {selectedProduct.offerText}</span><span>{productOfferTime ? formatOfferTime(productOfferTime) : "Offer ended"}</span></div>
                    <div style={{ marginTop: "7px", fontSize: "12px", color: "#725e40" }}>Limited-time pricing — don't wait if you love a one-of-a-kind handmade piece.</div>
                  </div>

                  <div style={{ marginTop: "14px", padding: "12px 14px", borderRadius: "14px", background: selectedProduct.stock <= 5 ? "#fff1f2" : "#f1f8f2", color: selectedProduct.stock <= 5 ? "#be123c" : "#24613d", fontWeight: 900 }}>
                    {selectedProduct.stock <= 5 ? `🔥 Only ${selectedProduct.stock} left in stock` : `✓ ${selectedProduct.stock} pieces available`} · Handmade stock is limited.
                  </div>

                  <div style={{ marginTop: "16px" }}>
                    <div style={{ fontWeight: 900, color: "#24362d", marginBottom: "8px" }}>Choose size</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                      {selectedProduct.sizes?.map((size) => <button key={size} type="button" onClick={() => setSelectedProductSize(size)} style={{ padding: "10px 14px", borderRadius: "10px", border: selectedProductSize === size ? "2px solid #365947" : "1px solid #cfd8d1", background: selectedProductSize === size ? "#edf6ef" : "#fff", fontWeight: 800, cursor: "pointer" }}>{size}</button>)}
                    </div>
                    {selectedProductSize === "Custom" && <textarea value={customMeasurements} onChange={(event) => setCustomMeasurements(event.target.value)} placeholder={"Example: bust 38, waist 32, hip 40, height 5'4\""} rows={3} style={{ width: "100%", boxSizing: "border-box", marginTop: "10px", padding: "11px", borderRadius: "12px", border: "1px solid #cfd8d1", resize: "vertical" }} />}
                    <button type="button" onClick={() => setSizeGuideOpen(true)} style={{ marginTop: "8px", border: 0, background: "transparent", color: "#365947", fontWeight: 900, cursor: "pointer", padding: 0 }}>📏 View size guide</button>
                  </div>

                  <div style={{ marginTop: "15px" }}>
                    <div style={{ fontWeight: 900, color: "#24362d", marginBottom: "8px" }}>Choose colour</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                      {selectedProduct.colors?.map((color) => <button key={color} type="button" onClick={() => setSelectedProductColor(color)} style={{ padding: "9px 12px", borderRadius: "999px", border: selectedProductColor === color ? "2px solid #365947" : "1px solid #cfd8d1", background: "#fff", fontWeight: 800, cursor: "pointer" }}>{color}</button>)}
                    </div>
                  </div>

                  <div style={{ marginTop: "16px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", padding: "10px 12px", borderRadius: "13px", background: "#f7faf8", border: "1px solid #dce7df" }}>
                    <div><strong style={{ color: "#24362d" }}>Quantity</strong><div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>Up to 10 per order</div></div>
                    <div style={{ display: "flex", alignItems: "center", border: "1px solid #ccd8d0", borderRadius: "10px", overflow: "hidden", background: "#fff" }}>
                      <button type="button" onClick={() => setProductQuantityState((value) => Math.max(1, value - 1))} style={{ width: "36px", height: "36px", border: 0, background: "#fff", fontSize: "18px", cursor: "pointer" }}>−</button>
                      <span style={{ minWidth: "32px", textAlign: "center", fontWeight: 900 }}>{productQuantity}</span>
                      <button type="button" onClick={() => setProductQuantityState((value) => Math.min(10, value + 1, selectedProduct.stock || 10))} style={{ width: "36px", height: "36px", border: 0, background: "#fff", fontSize: "18px", cursor: "pointer" }}>+</button>
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginTop: "12px" }}>
                    <button type="button" onClick={buySelectedProductNow} style={{ minHeight: "52px", border: 0, borderRadius: "13px", background: "#0f172a", color: "#fff", fontWeight: 900, fontSize: "16px", cursor: "pointer" }}>Buy Now</button>
                    <button type="button" onClick={addSelectedProductToCart} style={{ minHeight: "52px", border: 0, borderRadius: "13px", background: "#365947", color: "#fff", fontWeight: 900, fontSize: "16px", cursor: "pointer" }}>Add to Cart</button>
                  </div>

                  <div style={{ marginTop: "12px", padding: "12px", borderRadius: "14px", background: "#f7faf8", border: "1px solid #dce7df" }}>
                    <div style={{ fontWeight: 900, color: "#24362d", marginBottom: "7px" }}>📍 Check delivery to your pincode</div>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <input value={deliveryPincode} onChange={(event) => { setDeliveryPincode(event.target.value.replace(/\D/g, "").slice(0, 6)); setDeliveryChecked(false); }} placeholder="6-digit pincode" inputMode="numeric" style={{ flex: 1, minWidth: 0, padding: "10px 12px", borderRadius: "10px", border: "1px solid #cfd8d1" }} />
                      <button type="button" onClick={checkDelivery} style={{ padding: "10px 14px", borderRadius: "10px", border: 0, background: "#365947", color: "#fff", fontWeight: 900, cursor: "pointer" }}>Check</button>
                    </div>
                    {deliveryChecked && <div style={{ marginTop: "7px", fontSize: "12px", color: "#24613d", fontWeight: 800 }}>✓ Delivery available · Estimated arrival in {selectedProduct.deliveryDays || "3–5 days"} · COD available</div>}
                    {deliveryPincode.length === 6 && !deliveryChecked && <div style={{ marginTop: "7px", fontSize: "12px", color: "#64748b" }}>Enter Check to see delivery estimate.</div>}
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "7px", marginTop: "11px" }}>
                    <div style={{ padding: "9px", borderRadius: "12px", background: "#f7faf8", textAlign: "center", fontSize: "11px", color: "#365947", fontWeight: 900 }}>🔒 Secure checkout</div>
                    <div style={{ padding: "9px", borderRadius: "12px", background: "#f7faf8", textAlign: "center", fontSize: "11px", color: "#365947", fontWeight: 900 }}>↩ Easy returns</div>
                    <div style={{ padding: "9px", borderRadius: "12px", background: "#f7faf8", textAlign: "center", fontSize: "11px", color: "#365947", fontWeight: 900 }}>🧵 Handmade checked</div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: "9px", marginTop: "13px" }}>
                    <div style={{ padding: "11px", borderRadius: "13px", background: "#f7f8f7" }}><strong>🧵 Material</strong><div style={{ fontSize: "12px", color: "#64748b", marginTop: "3px" }}>{selectedProduct.material}</div></div>
                    <div style={{ padding: "11px", borderRadius: "13px", background: "#f7f8f7" }}><strong>📐 Details</strong><div style={{ fontSize: "12px", color: "#64748b", marginTop: "3px" }}>{selectedProduct.dimensions}</div></div>
                    <div style={{ padding: "11px", borderRadius: "13px", background: "#f7f8f7" }}><strong>🪡 Making time</strong><div style={{ fontSize: "12px", color: "#64748b", marginTop: "3px" }}>{selectedProduct.makingTime}</div></div>
                    <div style={{ padding: "11px", borderRadius: "13px", background: "#f7f8f7" }}><strong>🧼 Care</strong><div style={{ fontSize: "12px", color: "#64748b", marginTop: "3px" }}>Gentle wash · Dry flat</div></div>
                  </div>

                  <div style={{ marginTop: "14px", padding: "13px", borderRadius: "14px", border: "1px dashed #b9c9bd", color: "#52635a", fontSize: "13px", lineHeight: 1.5 }}>
                    🚚 <strong>Estimated delivery:</strong> ready-stock items usually leave quickly; made-to-order pieces need the stated making time before dispatch.<br />🎁 Gift wrapping and a personal message can be added at checkout.{selectedProduct.shippingNote ? ` ${selectedProduct.shippingNote}` : ""} {selectedProduct.returnPolicy || ""}
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "9px", marginTop: "12px" }}>
                    <button type="button" onClick={() => setMakerStoryOpen(true)} style={{ padding: "12px", borderRadius: "13px", border: "1px solid #e4d7bb", background: "#fffaf0", color: "#7a531d", fontWeight: 900, cursor: "pointer" }}>👵 Meet the maker</button>
                    <button type="button" onClick={() => setQuestionOpen((value) => !value)} style={{ padding: "12px", borderRadius: "13px", border: "1px solid #d8e2dc", background: "#f7faf8", color: "#365947", fontWeight: 900, cursor: "pointer" }}>❓ Product Q&A</button>
                  </div>

                  {questionOpen && selectedProduct.questions?.length > 0 && (
                    <div style={{ marginTop: "10px", padding: "13px", borderRadius: "14px", background: "#f8faf9", border: "1px solid #e0e8e2" }}>
                      {selectedProduct.questions.map((item) => (
                        <div key={item.q} style={{ marginBottom: "10px" }}>
                          <div style={{ fontWeight: 900, color: "#24362d" }}>Q. {item.q}</div>
                          <div style={{ marginTop: "3px", fontSize: "12px", color: "#64748b", lineHeight: 1.5 }}>A. {item.a}</div>
                        </div>
                      ))}
                      <div style={{ borderTop: "1px solid #e5ebe7", paddingTop: "10px" }}>
                        <div style={{ fontWeight: 900, color: "#24362d", fontSize: "12px" }}>Ask about this product</div>
                        <div style={{ display: "flex", gap: "7px", marginTop: "6px" }}>
                          <input value={questionText} onChange={(event) => { setQuestionText(event.target.value); setQuestionSubmitted(false); }} placeholder="Size, yarn, colour, delivery..." style={{ flex: 1, minWidth: 0, padding: "9px 10px", borderRadius: "10px", border: "1px solid #cfd8d1" }} />
                          <button type="button" onClick={() => { if (questionText.trim()) setQuestionSubmitted(true); }} style={{ padding: "9px 11px", borderRadius: "10px", border: 0, background: "#365947", color: "#fff", fontWeight: 900, cursor: "pointer" }}>Ask</button>
                        </div>
                        {questionSubmitted && <div style={{ marginTop: "5px", fontSize: "11px", color: "#24613d", fontWeight: 800 }}>✓ Question saved for the maker/support team.</div>}
                      </div>
                    </div>
                  )}

                  <div style={{ marginTop: "16px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                      <div style={{ fontWeight: 900, color: "#24362d" }}>⭐ Recent reviews</div>
                      <div style={{ display: "flex", gap: "5px" }}>
                        {["recent", "helpful", "photos"].map((filter) => (
                          <button key={filter} type="button" onClick={() => setReviewFilter(filter)} style={{ padding: "5px 8px", borderRadius: "999px", border: reviewFilter === filter ? "1px solid #365947" : "1px solid #dbe3dd", background: reviewFilter === filter ? "#edf6ef" : "#fff", color: "#365947", fontSize: "10px", fontWeight: 900, cursor: "pointer" }}>{filter === "recent" ? "Recent" : filter === "helpful" ? "Helpful" : "With photos"}</button>
                        ))}
                      </div>
                    </div>
                    {getReviewList().slice(0, 3).map((review) => (
                      <div key={`${review.name}-${review.time}`} style={{ padding: "11px", marginBottom: "7px", borderRadius: "13px", border: "1px solid #e2e8e4", background: "#fff" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: "8px" }}>
                          <strong style={{ color: "#24362d" }}>{review.name} · {review.city}</strong>
                          <span style={{ fontSize: "11px", color: "#64748b" }}>{review.time}</span>
                        </div>
                        <div style={{ marginTop: "3px", fontSize: "12px" }}>⭐ {"★".repeat(review.rating)} {review.verified && <span style={{ color: "#24613d", fontWeight: 800 }}>✓ Verified</span>}</div>
                        <div style={{ marginTop: "4px", fontSize: "12px", color: "#52635a", lineHeight: 1.45 }}>{review.text}</div>
                        <div style={{ marginTop: "5px", fontSize: "11px", color: "#64748b" }}>{review.photo} · 👍 {review.helpful} found this helpful</div>
                      </div>
                    ))}
                    {selectedProduct.customerPhotos?.length > 0 && (
                      <div style={{ marginTop: "10px", padding: "11px", borderRadius: "13px", background: "#fffaf0", border: "1px solid #eee2c5" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "7px" }}><strong style={{ color: "#7a531d" }}>📸 Loved by customers</strong><button type="button" onClick={() => setCustomerPhotoOpen(true)} style={{ border: 0, background: "transparent", color: "#365947", fontWeight: 900, cursor: "pointer", fontSize: "11px" }}>View all →</button></div>
                        <div style={{ display: "flex", gap: "7px" }}>{selectedProduct.customerPhotos.map((photo, index) => <button key={`${photo}-${index}`} type="button" onClick={() => setCustomerPhotoOpen(true)} style={{ width: "58px", height: "58px", borderRadius: "11px", border: "1px solid #e4d7bb", background: index % 2 ? "#f4efe5" : "#eef6f0", fontSize: "24px", cursor: "pointer" }}>{photo}</button>)}</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {products.filter((product) => product.name !== selectedProduct.name && product.handmade).slice(0, 3).length > 0 && (
                <div style={{ marginTop: "20px", paddingTop: "18px", borderTop: "1px solid #e5ebe7" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px" }}>
                    <div><div style={{ fontSize: "11px", fontWeight: 900, letterSpacing: ".08em", color: "#a36a2a" }}>HOWDI HANDMADE</div><h3 style={{ margin: "4px 0", color: "#24362d" }}>🧺 Complete the look</h3><div style={{ fontSize: "12px", color: "#64748b" }}>More pieces from our Grandma's Collection</div></div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "10px", marginTop: "10px" }}>
                    {products.filter((product) => product.name !== selectedProduct.name && product.handmade).slice(0, 3).map((product) => (
                      <button key={product.name} type="button" onClick={() => openProductDetails(product)} style={{ textAlign: "left", padding: "12px", borderRadius: "15px", border: "1px solid #e1e8e3", background: "#fff", cursor: "pointer" }}>
                        <div style={{ height: "76px", borderRadius: "11px", background: "linear-gradient(145deg,#f8f5ed,#edf5ef)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "42px" }}>{product.icon}</div>
                        <div style={{ marginTop: "7px", fontWeight: 900, color: "#24362d", fontSize: "12px" }}>{product.name}</div>
                        <div style={{ marginTop: "3px", fontSize: "11px", color: "#365947", fontWeight: 900 }}>{product.price} · ⭐ {product.rating}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {customerPhotoOpen && selectedProduct && (
          <div role="dialog" aria-modal="true" onClick={() => setCustomerPhotoOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 2250, background: "rgba(15,23,42,.58)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
            <div onClick={(event) => event.stopPropagation()} style={{ width: "min(620px,100%)", background: "#fff", borderRadius: "22px", padding: "22px", boxShadow: "0 25px 70px rgba(0,0,0,.25)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><div><div style={{ fontSize: "11px", fontWeight: 900, letterSpacing: ".1em", color: "#a36a2a" }}>CUSTOMER COMMUNITY</div><h3 style={{ margin: "5px 0", color: "#24362d" }}>📸 Customers with their HOWDI pieces</h3></div><button type="button" onClick={() => setCustomerPhotoOpen(false)} style={{ border: 0, background: "#f4f6f4", borderRadius: "50%", width: "36px", height: "36px", cursor: "pointer" }}>×</button></div>
              <p style={{ color: "#64748b", fontSize: "13px" }}>Real customer photos can be connected to verified reviews from the HOWDI backend.</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "9px" }}>{(selectedProduct.customerPhotos || [selectedProduct.icon]).map((photo, index) => <div key={`${photo}-${index}`} style={{ minHeight: "105px", borderRadius: "14px", background: index % 2 ? "#eef6f0" : "#f8f5ed", border: "1px solid #e2e8e4", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "44px" }}>{photo}</div>)}</div>
              <div style={{ marginTop: "12px", padding: "11px", borderRadius: "12px", background: "#fffaf0", color: "#7a531d", fontSize: "12px" }}>❤️ Love your piece? Customers will be able to upload a photo after a verified HOWDI purchase.</div>
            </div>
          </div>
        )}

        {sizeGuideOpen && selectedProduct && (
          <div role="dialog" aria-modal="true" onClick={() => setSizeGuideOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 2200, background: "rgba(15,23,42,.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
            <div onClick={(event) => event.stopPropagation()} style={{ width: "min(520px,100%)", background: "#fff", borderRadius: "20px", padding: "22px", boxShadow: "0 25px 70px rgba(0,0,0,.25)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><h3 style={{ margin: 0, color: "#24362d" }}>📏 Size guide</h3><button type="button" onClick={() => setSizeGuideOpen(false)} style={{ border: 0, background: "#f4f6f4", borderRadius: "50%", width: "36px", height: "36px", cursor: "pointer" }}>×</button></div>
              <p style={{ color: "#64748b", fontSize: "13px" }}>For clothing, measure over a comfortable layer. Handmade sizing can vary slightly by design.</p>
              <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}><thead><tr><th style={{ textAlign: "left", padding: "8px", borderBottom: "1px solid #e2e8e4" }}>Size</th><th style={{ padding: "8px", borderBottom: "1px solid #e2e8e4" }}>Bust</th><th style={{ padding: "8px", borderBottom: "1px solid #e2e8e4" }}>Waist</th><th style={{ padding: "8px", borderBottom: "1px solid #e2e8e4" }}>Hip</th></tr></thead><tbody>{[["XS","32–34","26–28","34–36"],["S","34–36","28–30","36–38"],["M","36–38","30–32","38–40"],["L","38–40","32–34","40–42"],["XL","40–42","34–36","42–44"],["XXL","42–44","36–38","44–46"]].map((row) => <tr key={row[0]}>{row.map((cell,index)=><td key={cell} style={{ padding: "8px", textAlign: index === 0 ? "left" : "center", borderBottom: "1px solid #eef2ef", fontWeight: index === 0 ? 900 : 500 }}>{cell}{index > 0 ? ' in' : ''}</td>)}</tr>)}</tbody></table></div>
              <div style={{ marginTop: "12px", padding: "10px", borderRadius: "12px", background: "#fffaf0", color: "#7a531d", fontSize: "12px" }}>✨ Custom size is available on eligible handmade clothing. Add your measurements before checkout.</div>
            </div>
          </div>
        )}

        {makerStoryOpen && selectedProduct && (
          <div role="dialog" aria-modal="true" onClick={() => setMakerStoryOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 2200, background: "rgba(15,23,42,.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
            <div onClick={(event) => event.stopPropagation()} style={{ width: "min(560px,100%)", background: "#fff", borderRadius: "22px", padding: "24px", boxShadow: "0 25px 70px rgba(0,0,0,.25)" }}>
              <div style={{ fontSize: "12px", letterSpacing: ".1em", fontWeight: 900, color: "#a36a2a" }}>HOWDI GRANDMA'S COLLECTION</div>
              <h3 style={{ margin: "7px 0", color: "#24362d", fontSize: "28px" }}>👵 Meet {selectedProduct.artisan}</h3>
              <p style={{ color: "#52635a", lineHeight: 1.6 }}>Every piece is made slowly, one stitch at a time. {selectedProduct.artisan} brings {selectedProduct.makerExperience || "years of handmade craft"} to each HOWDI creation.</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: "10px" }}><div style={{ padding: "13px", borderRadius: "14px", background: "#fffaf0" }}><strong>🧶 Experience</strong><div style={{ fontSize: "12px", color: "#64748b", marginTop: "3px" }}>{selectedProduct.makerExperience || "Traditional craft"}</div></div><div style={{ padding: "13px", borderRadius: "14px", background: "#f2f8f3" }}><strong>❤️ Crafted</strong><div style={{ fontSize: "12px", color: "#64748b", marginTop: "3px" }}>{selectedProduct.makerPieces || "Handmade pieces"}</div></div></div>
              <div style={{ marginTop: "13px", padding: "14px", borderRadius: "15px", background: "#f8faf9", color: "#52635a", fontSize: "13px", lineHeight: 1.55 }}>“A handmade piece should feel like someone took time to make something just for you.”<br /><strong style={{ color: "#24362d" }}>— HOWDI Grandma's Collection</strong></div>
              <button type="button" onClick={() => setMakerStoryOpen(false)} style={{ marginTop: "16px", width: "100%", minHeight: "46px", border: 0, borderRadius: "12px", background: "#365947", color: "#fff", fontWeight: 900, cursor: "pointer" }}>Back to product</button>
            </div>
          </div>
        )}

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