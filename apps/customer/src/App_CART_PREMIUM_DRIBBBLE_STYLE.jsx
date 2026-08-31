import { useEffect, useRef, useState } from "react";
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
  // CUSTOMER HOME / DISCOVERY
  // ==============================
  const [homeSearch, setHomeSearch] = useState("");
  const [shopSearch, setShopSearch] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchType, setSearchType] = useState("all");
  const [searchCategory, setSearchCategory] = useState("All");
  const [searchSort, setSearchSort] = useState("relevance");
  const [locationPickerOpen, setLocationPickerOpen] = useState(false);
  const [locationQuery, setLocationQuery] = useState("");
  const [customerLocation, setCustomerLocation] = useState(() => {
    try {
      return localStorage.getItem("howdiCustomerLocation") || "Khammam";
    } catch {
      return "Khammam";
    }
  });

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
  const [profileAvatar, setProfileAvatar] = useState("");
  const [profileStatus, setProfileStatus] = useState("Available");
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

  useEffect(() => {
    if (!currentUser?.id) {
      setProfileAvatar(currentUser?.profile_image || currentUser?.avatar || "");
      setProfileStatus(currentUser?.profile_status || currentUser?.status || "Available");
      return;
    }
    try {
      const saved = JSON.parse(localStorage.getItem(`howdiProfileMedia_${currentUser.id}`) || "null");
      setProfileAvatar(saved?.avatar || currentUser?.profile_image || currentUser?.avatar || "");
      setProfileStatus(saved?.status || currentUser?.profile_status || currentUser?.status || "Available");
    } catch {
      setProfileAvatar(currentUser?.profile_image || currentUser?.avatar || "");
      setProfileStatus(currentUser?.profile_status || currentUser?.status || "Available");
    }
  }, [currentUser]);

  const saveProfileMedia = (avatar, status) => {
    setProfileAvatar(avatar || "");
    setProfileStatus(status || "Available");
    if (currentUser?.id) {
      localStorage.setItem(`howdiProfileMedia_${currentUser.id}`, JSON.stringify({ avatar: avatar || "", status: status || "Available" }));
    }
  };

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

const [cancellationReason, setCancellationReason] = useState("");
const [cancellationDetails, setCancellationDetails] = useState("");
const [cancellationActor, setCancellationActor] = useState("Customer");
const [showCancellationModal, setShowCancellationModal] = useState(false);
const [selectedCancellationOrder, setSelectedCancellationOrder] = useState(null);
  const [orderFilter, setOrderFilter] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [savedForLater, setSavedForLater] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("howdiSavedForLater") || "[]");
      return Array.isArray(saved) ? saved : [];
    } catch {
      return [];
    }
  });
  const [reviewOrder, setReviewOrder] = useState(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [reviewMessage, setReviewMessage] = useState("");

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
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState(1);
  const [selectedCheckoutAddress, setSelectedCheckoutAddress] = useState(null);
  const [checkoutPayment, setCheckoutPayment] = useState("COD");
  const [checkoutCoupon, setCheckoutCoupon] = useState("");
  const [checkoutCouponApplied, setCheckoutCouponApplied] = useState(false);
  const [checkoutMessage, setCheckoutMessage] = useState("");

  const [giftWrap, setGiftWrap] = useState(false);
  const [giftMessage, setGiftMessage] = useState("");
  const [giftMessageSaved, setGiftMessageSaved] = useState(false);
  const [cartCoupon, setCartCoupon] = useState("");
  const [cartCouponApplied, setCartCouponApplied] = useState(false);
  const [cartPincode, setCartPincode] = useState("");
  const [cartPincodeChecked, setCartPincodeChecked] = useState(false);
  const [cartNotice, setCartNotice] = useState("");

  // Lock the page behind the cart/checkout drawer so only the drawer scrolls.
  useEffect(() => {
    const drawerOpen = cartOpen || checkoutOpen;

    if (drawerOpen && notificationOpen) {
      setNotificationOpen(false);
    }
    if (!drawerOpen) return;

    const previousOverflow = document.body.style.overflow;
    const previousTouchAction = document.body.style.touchAction;
    const previousOverscroll = document.body.style.overscrollBehavior;

    document.body.style.overflow = "hidden";
    document.body.style.touchAction = "none";
    document.body.style.overscrollBehavior = "none";

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.touchAction = previousTouchAction;
      document.body.style.overscrollBehavior = previousOverscroll;
    };
  }, [cartOpen, checkoutOpen]);

  const [orderSuccess, setOrderSuccess] = useState(null);
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
  const [fitStudioOpen, setFitStudioOpen] = useState(false);
  const [fitCameraStream, setFitCameraStream] = useState(null);
  const [fitPhoto, setFitPhoto] = useState("");
  const [fitCameraMessage, setFitCameraMessage] = useState("");
  const [fitCaptureConsentOpen, setFitCaptureConsentOpen] = useState(false);
  const [fitCaptureAllowed, setFitCaptureAllowed] = useState(false);
  const [fitMeasurements, setFitMeasurements] = useState({ height: "", bust: "", waist: "", hip: "" });
  const [fitSizeResult, setFitSizeResult] = useState("");
  const [fitPreviewRotation, setFitPreviewRotation] = useState(0);
  const fitVideoRef = useRef(null);
  const fitCanvasRef = useRef(null);
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
    localStorage.setItem("howdiSavedForLater", JSON.stringify(savedForLater));
  }, [savedForLater]);

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
    setNotificationOpen(false);
    setCartOpen(true);
  };

  const buyNow = (product, quantity = 1) => {
    const qty = Math.max(1, Number(quantity) || 1);
    setCart([{ ...product, quantity: qty }]);
    setNotificationOpen(false);
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

  const cancellationReasons = {
    Customer: [
      "Changed my mind",
      "Ordered by mistake",
      "Found another product",
      "Delivery taking too long",
      "Size or colour issue",
      "Want a different product",
      "Price issue",
      "Other",
    ],
    "HOWDI / Seller": [
      "Product out of stock",
      "Artisan unable to complete order",
      "Material unavailable",
      "Quality check failed",
      "Delivery/service unavailable",
      "Payment issue",
      "Seller cancelled",
      "Other",
    ],
  };

  const openCancellation = (order) => {
    setSelectedCancellationOrder(order);
    setCancellationActor("Customer");
    setCancellationReason("");
    setCancellationDetails("");
    setShowCancellationModal(true);
  };

  const confirmCancellation = () => {
    if (!selectedCancellationOrder || !cancellationReason) return;

    const now = new Date();
    const orderId = selectedCancellationOrder.id || selectedCancellationOrder.order_id;
    const event = {
      status: "Cancelled",
      actor: cancellationActor,
      reason: cancellationReason,
      details:
        cancellationDetails.trim() ||
        `Order cancelled by ${cancellationActor.toLowerCase()} because: ${cancellationReason}.`,
      date: now.toISOString(),
      refundStatus: cancellationActor === "Customer" ? "Refund initiated" : "Refund to be initiated",
    };

    setOrders((current) => {
      const nextOrders = current.map((order) =>
        String(order.id || order.order_id) === String(orderId)
          ? {
              ...order,
              status: "cancelled",
              cancellation: event,
              timeline: [
                ...(order.timeline || getOrderTimeline(order)),
                { label: "Cancelled", date: now.toISOString(), note: event.details },
              ],
            }
          : order
      );
      if (currentUser?.id) {
        localStorage.setItem(`howdiOrders_${currentUser.id}`, JSON.stringify(nextOrders));
      }
      return nextOrders;
    });

    setSelectedOrder((current) =>
      current && String(current.id || current.order_id) === String(orderId)
        ? {
            ...current,
            status: "cancelled",
            cancellation: event,
            timeline: [
              ...(current.timeline || getOrderTimeline(current)),
              { label: "Cancelled", date: now.toISOString(), note: event.details },
            ],
          }
        : current
    );
    setShowCancellationModal(false);
    setSelectedCancellationOrder(null);
    setCancellationReason("");
    setCancellationDetails("");
  };

  const getCancellationDescription = (order) => {
    if (!order?.cancellation) {
      return "No cancellation information has been recorded for this order.";
    }
    const c = order.cancellation;
    return `${c.actor} cancelled this order because: ${c.reason}.`;
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
    toggleWishlist(product);
  };

  const addWishlistItemToCart = (product) => {
    addToCart(product, 1);
    setCartOpen(true);
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

  const stopFitCamera = () => {
    if (fitCameraStream) {
      fitCameraStream.getTracks().forEach((track) => track.stop());
    }
    if (fitVideoRef.current) fitVideoRef.current.srcObject = null;
    setFitCameraStream(null);
  };

  const startFitCamera = async () => {
    setFitCameraMessage("");
    if (!navigator.mediaDevices?.getUserMedia) {
      setFitCameraMessage("Camera access is not supported by this browser. You can still enter measurements manually.");
      return;
    }
    try {
      stopFitCamera();
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
      setFitCameraStream(stream);
      window.setTimeout(() => {
        if (fitVideoRef.current) {
          fitVideoRef.current.srcObject = stream;
          fitVideoRef.current.play().catch(() => {});
        }
      }, 0);
    } catch {
      setFitCameraMessage("Camera permission was not granted. Enter your measurements manually for the most reliable fit.");
    }
  };

  const captureFitPhoto = () => {
    const video = fitVideoRef.current;
    if (!video || !video.videoWidth) {
      setFitCameraMessage("Start the camera first, then click Capture photo.");
      return;
    }
    setFitCaptureAllowed(false);
    setFitCaptureConsentOpen(true);
  };

  const confirmFitPhotoCapture = () => {
    const video = fitVideoRef.current;
    const canvas = fitCanvasRef.current;
    if (!fitCaptureAllowed) {
      setFitCameraMessage("Please select “I Allow Photo Capture” before continuing.");
      return;
    }
    if (!video || !canvas || !video.videoWidth) {
      setFitCameraMessage("Please start the camera again before capturing.");
      setFitCaptureConsentOpen(false);
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) {
      setFitCameraMessage("Photo capture is unavailable in this browser.");
      setFitCaptureConsentOpen(false);
      return;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    setFitPhoto(canvas.toDataURL("image/jpeg", 0.82));
    setFitCameraMessage("🔒 Photo captured with your permission. This demo does not upload or share it.");
    setFitCaptureConsentOpen(false);
    setFitCaptureAllowed(false);
    stopFitCamera();
  };

  const calculateFitSize = () => {
    const bust = Number(fitMeasurements.bust);
    const waist = Number(fitMeasurements.waist);
    const hip = Number(fitMeasurements.hip);
    if (![bust, waist, hip].every((value) => value > 0)) {
      setFitSizeResult("Enter bust, waist and hip measurements in inches to calculate a size.");
      return;
    }
    const chart = [
      { size: "XS", bust: 32, waist: 26, hip: 35 },
      { size: "S", bust: 34, waist: 28, hip: 37 },
      { size: "M", bust: 36, waist: 30, hip: 39 },
      { size: "L", bust: 38, waist: 32, hip: 41 },
      { size: "XL", bust: 40, waist: 34, hip: 43 },
      { size: "XXL", bust: 42, waist: 36, hip: 45 },
    ];
    const closest = chart.reduce((best, row) => {
      const score = Math.abs(bust - row.bust) + Math.abs(waist - row.waist) + Math.abs(hip - row.hip);
      return !best || score < best.score ? { ...row, score } : best;
    }, null);
    const beyond = bust > 42 || waist > 36 || hip > 45;
    setFitSizeResult(beyond ? "Custom fit recommended — your measurements are outside the standard chart." : `Suggested size: ${closest.size}. We recommend confirming the maker's size chart before ordering.`);
    if (!beyond && selectedProduct?.sizes?.includes(closest.size)) setSelectedProductSize(closest.size);
    if (beyond && selectedProduct?.sizes?.includes("Custom")) setSelectedProductSize("Custom");
  };

  const openFitStudio = () => {
    setFitStudioOpen(true);
    setFitCameraMessage("");
    setFitSizeResult("");
  };

  const closeFitStudio = () => {
    stopFitCamera();
    setFitStudioOpen(false);
  };

  useEffect(() => {
    if (!fitStudioOpen) return undefined;
    const timer = window.setInterval(() => setFitPreviewRotation((value) => (value + 3) % 360), 80);
    return () => window.clearInterval(timer);
  }, [fitStudioOpen]);

  useEffect(() => () => {
    if (fitCameraStream) fitCameraStream.getTracks().forEach((track) => track.stop());
  }, [fitCameraStream]);

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

  // Checkout totals — keep every value used by Place Order defined in one place.
  const checkoutDiscount = checkoutCouponApplied
    ? Math.min(Math.round(cartSubtotal * 0.10), 500)
    : 0;
  const checkoutDelivery = cartSubtotal - checkoutDiscount >= 999 ? 0 : 49;
  const checkoutTax = 0;
  const checkoutWalletCredit = 0;
  const checkoutRewardsCredit = 0;
  const checkoutDeliveryOption = "STANDARD";
  const checkoutTotal = Math.max(
    0,
    cartSubtotal -
      checkoutDiscount +
      checkoutDelivery +
      checkoutTax -
      checkoutWalletCredit -
      checkoutRewardsCredit
  );


  const applyCartCoupon = () => {
    const code = cartCoupon.trim().toUpperCase();
    if (code === "HOWDI10") {
      setCartCouponApplied(true);
      setCartNotice("🎉 HOWDI10 applied — 10% demo discount added.");
    } else {
      setCartCouponApplied(false);
      setCartNotice(code ? "Coupon not available in this frontend demo." : "Enter a coupon code first.");
    }
  };

  const checkCartPincode = () => {
    const value = cartPincode.replace(/\D/g, "").slice(0, 6);
    setCartPincode(value);
    setCartPincodeChecked(value.length === 6);
    setCartNotice(value.length === 6
      ? "📦 Delivery estimate checked. Final promise will come from the backend later."
      : "Please enter a valid 6-digit pincode.");
  };

  const openCheckout = () => {
    if (!cart.length) return;
    if (!currentUser) {
      openLogin();
      return;
    }
    const defaultAddress = addresses.find((item) => item.is_default) || addresses[0] || null;
    setSelectedCheckoutAddress(defaultAddress);
    // Always show Delivery first. A default address may be preselected,
    // but the customer must still see and be able to change it.
    setCheckoutStep(1);
    setCheckoutPayment(paymentMethods.length ? "SAVED" : "COD");
    setCheckoutCoupon("");
    setCheckoutCouponApplied(false);
    setCheckoutMessage("");
    setOrderSuccess(null);
    setCartOpen(false);
    setCheckoutOpen(true);
  };

  const applyCheckoutCoupon = () => {
    const code = checkoutCoupon.trim().toUpperCase();
    if (code === "HOWDI10") {
      setCheckoutCouponApplied(true);
      setCheckoutMessage("🎉 HOWDI10 applied — 10% off, up to ₹500.");
    } else {
      setCheckoutCouponApplied(false);
      setCheckoutMessage("Try HOWDI10 for a demo offer.");
    }
  };

  const placeCheckoutOrder = async () => {
    if (!cart.length) {
      setCheckoutMessage("Your cart is empty.");
      return;
    }

    if (!currentUser?.id) {
      setCheckoutMessage("Please login again before placing the order.");
      openLogin();
      return;
    }

    if (!selectedCheckoutAddress) {
      setCheckoutStep(1);
      setCheckoutMessage("Please select or add a delivery address.");
      return;
    }

    const pin = String(selectedCheckoutAddress.pincode || "").replace(/\D/g, "");
    if (!/^[1-9][0-9]{5}$/.test(pin)) {
      setCheckoutStep(1);
      setCheckoutMessage("Please select an address with a valid 6-digit pincode.");
      return;
    }

    if (!checkoutPayment) {
      setCheckoutStep(2);
      setCheckoutMessage("Please select a payment method.");
      return;
    }

    const orderNumber = `HD${String(Date.now()).slice(-8)}`;
    const trackingNumber = `HOWDI${String(Date.now()).slice(-10)}`;
    const walletUsed = Math.round(Number(checkoutWalletCredit) || 0);
    const rewardsUsed = Math.round(Number(checkoutRewardsCredit) || 0);
    const rewardPointsUsed = rewardsUsed * 10;

    const orderPayload = {
      customer_id: currentUser.id,
      order_number: orderNumber,
      title: cart.length === 1
        ? cart[0]?.name || "HOWDI Order"
        : `${cart[0]?.name || "HOWDI"} + ${cart.length - 1} more`,
      shop: cart[0]?.shop || "HOWDI Marketplace",
      total: `₹${checkoutTotal.toLocaleString("en-IN")}`,
      amount: Number(checkoutTotal) || 0,
      subtotal: Number(cartSubtotal) || 0,
      discount: Number(checkoutDiscount) || 0,
      delivery_charge: Number(checkoutDelivery) || 0,
      tax: Number(checkoutTax) || 0,
      wallet_used: walletUsed,
      rewards_used: rewardPointsUsed,
      item_count: cart.reduce((sum, item) => sum + (Number(item?.quantity) || 1), 0),
      items: cart,
      status: "confirmed",
      payment_method: checkoutPayment,
      payment_status: "pending",
      delivery_option: checkoutDeliveryOption,
      address: selectedCheckoutAddress,
      estimated_delivery: checkoutDeliveryOption === "EXPRESS" ? "1–3 days" : "3–6 days",
      tracking_number: trackingNumber,
      coupon: checkoutCouponApplied ? checkoutCoupon.trim().toUpperCase() : "",
      maker_note: "Your piece will receive a final handmade quality check before dispatch.",
    };

    try {
      setCheckoutMessage("Creating your HOWDI order...");

      const response = await fetch("http://localhost:5000/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(orderPayload),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || data.status !== "success" || !data.order) {
        throw new Error(data.message || "Unable to create order.");
      }

      const createdOrder = data.order;

      // Update wallet/rewards only after the backend has successfully created the order.
      if (walletUsed > 0) {
        setWalletBalance((current) =>
          Math.max(0, Number(current || 0) - walletUsed)
        );
        setWalletTransactions((current) => [
          {
            id: Date.now(),
            title: `Order ${createdOrder.order_number || orderNumber}`,
            type: "debit",
            amount: walletUsed,
            date: new Date().toLocaleDateString("en-IN"),
          },
          ...current,
        ]);
      }

      if (rewardPointsUsed > 0) {
        setRewardPoints((current) =>
          Math.max(0, Number(current || 0) - rewardPointsUsed)
        );
        setWalletRewards((current) => [
          {
            id: Date.now() + 1,
            title: `Used for order ${createdOrder.order_number || orderNumber}`,
            points: -rewardPointsUsed,
            date: new Date().toLocaleDateString("en-IN"),
          },
          ...current,
        ]);
      }

      setOrders((current) => [
        createdOrder,
        ...current.filter(
          (order) => String(order.id || order.order_id) !== String(createdOrder.id)
        ),
      ]);

      // Keep a local cache for graceful UI fallback, but backend is the source of truth.
      try {
        const cached = [
          createdOrder,
          ...orders.filter(
            (order) => String(order.id || order.order_id) !== String(createdOrder.id)
          ),
        ];
        localStorage.setItem(
          `howdiOrders_${currentUser.id}`,
          JSON.stringify(cached)
        );
      } catch {}

      setCart([]);
      localStorage.setItem("howdiCart", "[]");
      setCheckoutOpen(false);
      setCheckoutMessage("");
      setOrderSuccess(createdOrder);
    } catch (error) {
      console.error("HOWDI CREATE ORDER ERROR:", error);
      setCheckoutMessage(
        error?.message ||
        "Unable to place the order. Please try again."
      );
    }
  };


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
  // CUSTOMER HOME / LOCATION HELPERS
  // ==============================
  const getAvailableLocations = () => {
    const configured = (() => {
      try {
        const saved = JSON.parse(localStorage.getItem("howdiServiceLocations") || "[]");
        return Array.isArray(saved) ? saved : [];
      } catch {
        return [];
      }
    })();

    const normalized = configured
      .map((item) => {
        if (typeof item === "string") return item.trim();
        if (!item || item.enabled === false) return "";
        return String(item.city || item.name || "").trim();
      })
      .filter(Boolean);

    // Keep a safe prototype fallback until the Admin Location List is connected.
    return [...new Set(["Khammam", "Hyderabad", "Warangal", ...normalized])];
  };

  const availableLocations = getAvailableLocations();
  const filteredLocations = availableLocations.filter((location) =>
    location.toLowerCase().includes(locationQuery.trim().toLowerCase())
  );

  const chooseCustomerLocation = (location) => {
    const value = String(location || "").trim();
    if (!value) return;
    setCustomerLocation(value);
    try {
      localStorage.setItem("howdiCustomerLocation", value);
    } catch {}
    setLocationPickerOpen(false);
    setLocationQuery("");
  };

  const submitHomeSearch = (event) => {
    event?.preventDefault();
    const query = homeSearch.trim();
    setSearchQuery(query);
    setShopSearch(query);
    setSearchCategory("All");
    setSearchType("all");
    navigate("search");
  };

  const runDiscoverySearch = (event) => {
    event?.preventDefault();
    setSearchQuery(homeSearch.trim());
  };

  const discoveryResults = (() => {
    const q = searchQuery.trim().toLowerCase();
    const category = searchCategory.toLowerCase();
    const matches = [];

    if (searchType === "all" || searchType === "products") {
      products.forEach((product) => {
        const haystack = `${product.name} ${product.shop} ${product.category} ${product.artisan || ""}`.toLowerCase();
        const categoryMatch = searchCategory === "All" || String(product.category || "").toLowerCase() === category;
        if ((!q || haystack.includes(q)) && categoryMatch) {
          matches.push({ type: "product", title: product.name, subtitle: `${product.shop} · ${product.category}`, meta: `${product.price} · ⭐ ${product.rating}`, icon: product.icon, item: product });
        }
      });
    }

    if (searchType === "all" || searchType === "workers") {
      workers.forEach((worker) => {
        const haystack = `${worker.name} ${worker.service}`.toLowerCase();
        const categoryMatch = searchCategory === "All" || worker.service.toLowerCase() === category;
        if ((!q || haystack.includes(q)) && categoryMatch) {
          matches.push({ type: "worker", title: worker.name, subtitle: `${worker.service} · ${customerLocation}`, meta: `${worker.price} starting · ⭐ ${worker.rating}`, icon: "👷", item: worker });
        }
      });
    }

    if (searchType === "all" || searchType === "shops") {
      [...new Set(products.map((product) => product.shop))].forEach((shop) => {
        if (!q || shop.toLowerCase().includes(q)) {
          const sample = products.find((product) => product.shop === shop);
          matches.push({ type: "shop", title: shop, subtitle: `Local shop · ${customerLocation}`, meta: `${products.filter((product) => product.shop === shop).length} products`, icon: "🏪", item: sample });
        }
      });
    }

    if (searchSort === "price-low" && searchType !== "workers" && searchType !== "shops") {
      return matches.sort((a, b) => Number(String(a.item?.price || "").replace(/[^0-9]/g, "")) - Number(String(b.item?.price || "").replace(/[^0-9]/g, "")));
    }
    if (searchSort === "rating") {
      return matches.sort((a, b) => Number(b.item?.rating || 0) - Number(a.item?.rating || 0));
    }
    return matches;
  })();

  const discoveryCategories = ["All", ...new Set(products.map((product) => product.category))];

  const clearShopSearch = () => {
    setShopSearch("");
    setHomeSearch("");
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
  // Backend is the source of truth. LocalStorage is kept only as a temporary offline cache.
  // ==============================

  const ADDRESS_API = "http://localhost:5000/api/addresses";

  useEffect(() => {
    let cancelled = false;

    const loadCustomerAddresses = async () => {
      if (!currentUser?.id) {
        setAddresses([]);
        setSelectedCheckoutAddress(null);
        return;
      }

      const cacheKey = `howdiAddresses_${currentUser.id}`;
      let cachedAddresses = [];
      try {
        const saved = JSON.parse(localStorage.getItem(cacheKey) || "[]");
        cachedAddresses = Array.isArray(saved) ? saved : [];
      } catch {}

      try {
        const response = await fetch(
          `${ADDRESS_API}?customer_id=${encodeURIComponent(currentUser.id)}`,
          { cache: "no-store" }
        );
        const data = await response.json().catch(() => ({}));

        if (!response.ok || data.status !== "success") {
          throw new Error(data.message || "Unable to load addresses.");
        }

        let backendAddresses = Array.isArray(data.addresses) ? data.addresses : [];

        // One-time migration of addresses created by the earlier local-only version.
        if (!backendAddresses.length && cachedAddresses.length) {
          for (const cachedAddress of cachedAddresses) {
            try {
              const migrationResponse = await fetch(ADDRESS_API, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  customer_id: currentUser.id,
                  ...cachedAddress,
                }),
              });
              const migrationData = await migrationResponse.json().catch(() => ({}));
              if (migrationResponse.ok && migrationData.address) {
                backendAddresses.push(migrationData.address);
              }
            } catch {}
          }
        }

        if (cancelled) return;
        setAddresses(backendAddresses);
        localStorage.setItem(cacheKey, JSON.stringify(backendAddresses));

        const defaultAddress = backendAddresses.find((item) => item.is_default) || backendAddresses[0] || null;
        setSelectedCheckoutAddress((current) => current && backendAddresses.some((item) => item.id === current.id) ? current : defaultAddress);
      } catch (error) {
        console.error("HOWDI LOAD ADDRESSES ERROR:", error);
        if (!cancelled) {
          setAddresses(cachedAddresses);
          setSelectedCheckoutAddress(cachedAddresses.find((item) => item.is_default) || cachedAddresses[0] || null);
        }
      }
    };

    loadCustomerAddresses();

    return () => {
      cancelled = true;
    };
  }, [currentUser]);

  const cacheAddresses = (nextAddresses) => {
    setAddresses(nextAddresses);
    if (currentUser?.id) {
      localStorage.setItem(`howdiAddresses_${currentUser.id}`, JSON.stringify(nextAddresses));
    }
    const defaultAddress = nextAddresses.find((item) => item.is_default) || nextAddresses[0] || null;
    setSelectedCheckoutAddress((current) => current && nextAddresses.some((item) => item.id === current.id) ? { ...current, ...nextAddresses.find((item) => item.id === current.id) } : defaultAddress);
  };

  const saveAddress = async (event) => {
    event.preventDefault();

    if (!currentUser?.id) {
      openLogin();
      return;
    }

    const pincode = String(addressForm.pincode ?? "").replace(/\D/g, "").slice(0, 6);
    const phone = String(addressForm.phone ?? "").replace(/\D/g, "").slice(0, 10);

    if (!/^[1-9][0-9]{5}$/.test(pincode)) {
      alert("Please enter a valid 6-digit pincode.");
      return;
    }

    if (phone.length !== 10) {
      alert("Please enter a valid 10-digit mobile number.");
      return;
    }

    if (!addressForm.full_name.trim() || !addressForm.address_line1.trim() || !addressForm.city.trim() || !addressForm.state.trim()) {
      alert("Please complete all required address fields.");
      return;
    }

    const payload = {
      customer_id: currentUser.id,
      label: addressForm.label.trim() || "Other",
      full_name: addressForm.full_name.trim(),
      phone,
      address_line1: addressForm.address_line1.trim(),
      address_line2: addressForm.address_line2.trim(),
      city: addressForm.city.trim(),
      state: addressForm.state.trim(),
      pincode,
      is_default: !editingAddressId && addresses.length === 0,
    };

    try {
      const response = await fetch(
        editingAddressId ? `${ADDRESS_API}/${encodeURIComponent(editingAddressId)}` : ADDRESS_API,
        {
          method: editingAddressId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.address) {
        throw new Error(data.message || "Unable to save address.");
      }

      const savedAddress = data.address;
      const nextAddresses = editingAddressId
        ? addresses.map((item) => item.id === editingAddressId ? savedAddress : item)
        : [savedAddress, ...addresses];

      cacheAddresses(nextAddresses);
      setAddressFormOpen(false);
      setEditingAddressId(null);
    } catch (error) {
      console.error("HOWDI SAVE ADDRESS ERROR:", error);
      alert(error?.message || "Unable to save address. Please try again.");
    }
  };

  const deleteAddress = async (addressId) => {
    const address = addresses.find((item) => item.id === addressId);
    if (!address) return;
    if (!window.confirm(`Delete your ${address.label || "address"}?`)) return;

    try {
      const response = await fetch(
        `${ADDRESS_API}/${encodeURIComponent(addressId)}?customer_id=${encodeURIComponent(currentUser.id)}`,
        { method: "DELETE" }
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "Unable to delete address.");

      const nextAddresses = addresses.filter((item) => item.id !== addressId);
      cacheAddresses(nextAddresses);
    } catch (error) {
      console.error("HOWDI DELETE ADDRESS ERROR:", error);
      alert(error?.message || "Unable to delete address. Please try again.");
    }
  };

  const setDefaultAddress = async (addressId) => {
    if (!currentUser?.id) return;

    try {
      const response = await fetch(`${ADDRESS_API}/${encodeURIComponent(addressId)}/default`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customer_id: currentUser.id }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "Unable to set default address.");

      const nextAddresses = addresses.map((item) => ({ ...item, is_default: item.id === addressId }));
      cacheAddresses(nextAddresses);
    } catch (error) {
      console.error("HOWDI DEFAULT ADDRESS ERROR:", error);
      alert(error?.message || "Unable to set default address. Please try again.");
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

      setLikedProducts((currentLikes) =>
        next.some((item) => item.name === product.name)
          ? (currentLikes.includes(product.name) ? currentLikes : [...currentLikes, product.name])
          : currentLikes.filter((name) => name !== product.name)
      );

      return next;
    });
  };

  // ==============================
  // ORDERS HELPERS
  // ==============================
  useEffect(() => {
    let cancelled = false;

    const loadCustomerOrders = async () => {
      if (!currentUser?.id) {
        setOrders([]);
        setSelectedOrder(null);
        return;
      }

      try {
        const response = await fetch(
          `http://localhost:5000/api/orders?customer_id=${encodeURIComponent(currentUser.id)}`,
          { cache: "no-store" }
        );

        const data = await response.json().catch(() => ({}));

        if (!response.ok || data.status !== "success") {
          throw new Error(data.message || "Unable to load orders.");
        }

        const backendOrders = Array.isArray(data.orders) ? data.orders : [];

        if (cancelled) return;

        setOrders(backendOrders);

        try {
          localStorage.setItem(
            `howdiOrders_${currentUser.id}`,
            JSON.stringify(backendOrders)
          );
        } catch {}
      } catch (error) {
        console.error("HOWDI LOAD ORDERS ERROR:", error);

        // Keep the existing local cache as a temporary offline fallback.
        try {
          const saved = JSON.parse(
            localStorage.getItem(`howdiOrders_${currentUser.id}`) || "[]"
          );
          if (!cancelled) {
            setOrders(Array.isArray(saved) ? saved : []);
          }
        } catch {
          if (!cancelled) setOrders([]);
        }
      }
    };

    loadCustomerOrders();

    return () => {
      cancelled = true;
    };
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
    if (value === "out_for_delivery") return "Out for delivery";
    if (value === "shipped") return "Shipped";
    if (value === "preparing" || value === "handmade") return "Being handmade";
    if (value === "confirmed") return "Confirmed";
    return "Processing";
  };

  const getOrderTimeline = (order) => {
    const status = String(order?.status || "confirmed").toLowerCase();
    const cancelled = ["cancelled", "canceled"].includes(status);
    const activeIndex = cancelled ? -1 : status === "delivered" ? 4 : status === "out_for_delivery" ? 3 : status === "shipped" ? 2 : ["preparing", "handmade"].includes(status) ? 1 : 0;
    const steps = [
      { key: "confirmed", icon: "✓", title: "Order confirmed", text: "Your order has been received." },
      { key: "handmade", icon: "🧶", title: "Being handmade", text: "The maker is preparing your piece." },
      { key: "shipped", icon: "📦", title: "Shipped", text: "Your parcel is on the way." },
      { key: "out_for_delivery", icon: "🚚", title: "Out for delivery", text: "Your delivery partner is nearby." },
      { key: "delivered", icon: "❤️", title: "Delivered", text: "Enjoy your HOWDI handmade piece." },
    ];
    return steps.map((step, index) => ({ ...step, active: index <= activeIndex, current: index === activeIndex }));
  };

  const cancelOrder = (orderId) => {
    const order = orders.find((item) => String(item.id || item.order_id) === String(orderId));
    if (order) openCancellation(order);
  };

  const reorderOrder = (order) => {
    const items = Array.isArray(order?.items) ? order.items : [];
    if (!items.length) return;
    setCart(items.map((item) => ({ ...item, quantity: Math.max(1, Number(item.quantity) || 1) })));
    setSelectedOrder(null);
    setProfileOpen(false);
    setCartOpen(true);
  };

  const saveCartItemForLater = (item) => {
    setSavedForLater((current) => current.some((saved) => saved.name === item.name) ? current : [...current, { ...item, quantity: 1 }]);
    setCart((current) => current.filter((cartItem) => cartItem.name !== item.name));
  };

  const moveSavedToCart = (item) => {
    addToCart(item, item.quantity || 1);
    setSavedForLater((current) => current.filter((saved) => saved.name !== item.name));
  };

  const submitOrderReview = () => {
    if (!reviewOrder) return;
    const reviewedId = reviewOrder.id || reviewOrder.order_id;
    const review = { rating: reviewRating, text: reviewText.trim(), created_at: new Date().toISOString() };
    const nextOrders = orders.map((order) => (order.id || order.order_id) === reviewedId ? { ...order, review } : order);
    setOrders(nextOrders);
    if (currentUser?.id) localStorage.setItem(`howdiOrders_${currentUser.id}`, JSON.stringify(nextOrders));
    setReviewMessage("Thank you! Your review has been saved.");
    window.setTimeout(() => {
      setReviewOrder(null);
      setReviewMessage("");
      setReviewText("");
      setReviewRating(5);
    }, 900);
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
    const updatedUser = { ...currentUser, full_name, phone, name: full_name, profile_status: profileStatus, profile_image: profileAvatar };
    setCurrentUser(updatedUser);
    localStorage.setItem("howdiUser", JSON.stringify(updatedUser));
    saveProfileMedia(profileAvatar, profileStatus);
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
              type="button"
              className="location-button"
              onClick={() => setLocationPickerOpen(true)}
              title="Choose your HOWDI location"
            >
              📍
              <span>
                {customerLocation}
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
              onClick={() => { setNotificationOpen(false); setCartOpen(true); }}
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

      {locationPickerOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Choose your location"
          style={{ position: "fixed", inset: 0, zIndex: 10005, background: "rgba(15,23,42,.55)", display: "grid", placeItems: "center", padding: "18px" }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setLocationPickerOpen(false);
              setLocationQuery("");
            }
          }}
        >
          <div style={{ width: "min(480px, 100%)", background: "#fff", color: "#172033", borderRadius: "20px", padding: "22px", boxShadow: "0 24px 80px rgba(0,0,0,.28)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontSize: "11px", fontWeight: 900, letterSpacing: ".08em", color: "#9a5b1f" }}>HOWDI LOCATION</div>
                <h2 style={{ margin: "5px 0 4px", fontSize: "24px" }}>📍 Choose your location</h2>
                <p style={{ margin: 0, color: "#64748b", fontSize: "13px", lineHeight: 1.45 }}>
                  We’ll use this location to show nearby services, shops, products and offers.
                </p>
              </div>
              <button type="button" onClick={() => { setLocationPickerOpen(false); setLocationQuery(""); }} style={{ width: "36px", height: "36px", border: "1px solid #e2e8f0", borderRadius: "10px", background: "#f8fafc", color: "#475569", cursor: "pointer", fontSize: "18px" }}>×</button>
            </div>

            <input
              value={locationQuery}
              onChange={(event) => setLocationQuery(event.target.value)}
              placeholder="Search city or location"
              autoFocus
              style={{ width: "100%", boxSizing: "border-box", marginTop: "18px", height: "46px", border: "1px solid #cbd5e1", borderRadius: "12px", padding: "0 13px", background: "#fff", color: "#172033", fontSize: "14px" }}
            />

            <div style={{ marginTop: "14px", display: "grid", gap: "8px", maxHeight: "280px", overflowY: "auto" }}>
              {filteredLocations.length ? filteredLocations.map((location) => (
                <button
                  key={location}
                  type="button"
                  onClick={() => chooseCustomerLocation(location)}
                  style={{ width: "100%", textAlign: "left", border: location === customerLocation ? "2px solid #365947" : "1px solid #e2e8f0", borderRadius: "12px", padding: "12px 13px", background: location === customerLocation ? "#f0f7f2" : "#fff", color: "#172033", cursor: "pointer", fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "space-between" }}
                >
                  <span>📍 {location}</span>
                  {location === customerLocation && <span style={{ color: "#365947" }}>✓ Selected</span>}
                </button>
              )) : (
                <div style={{ padding: "22px 12px", textAlign: "center", color: "#64748b", border: "1px dashed #cbd5e1", borderRadius: "12px" }}>
                  No available HOWDI location found.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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
            background: "rgba(18, 27, 24, 0.46)",
            backdropFilter: "blur(6px)",
            display: "flex",
            justifyContent: "flex-end",
          }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setCartOpen(false);
          }}
        >
          <div
            style={{
              width: "min(720px, 100vw)",
              height: "100%",
              background: "#f7f8f5",
              display: "flex",
              flexDirection: "column",
              minHeight: 0,
              boxShadow: "-30px 0 80px rgba(0,0,0,.18)",
            }}
          >
            {/* Premium cart header */}
            <div
              style={{
                padding: "22px 26px 18px",
                background: "#ffffff",
                borderBottom: "1px solid #e7ebe5",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px" }}>
                <div>
                  <div style={{ color: "#6b7b70", fontSize: "10px", fontWeight: 900, letterSpacing: "1.7px", textTransform: "uppercase" }}>
                    HOWDI SHOPPING
                  </div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: "9px", marginTop: "5px" }}>
                    <h2 style={{ margin: 0, color: "#17221d", fontSize: "29px", lineHeight: 1.05, fontWeight: 900, letterSpacing: "-.7px", WebkitTextFillColor: "#17221d" }}>
                      Your Cart
                    </h2>
                    <span style={{ color: "#6b7b70", fontSize: "13px", fontWeight: 800 }}>
                      {cart.length} {cart.length === 1 ? "item" : "items"}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  aria-label="Close cart"
                  onClick={() => setCartOpen(false)}
                  style={{
                    width: "42px",
                    height: "42px",
                    borderRadius: "50%",
                    border: "1px solid #dfe6df",
                    background: "#f8faf8",
                    color: "#314139",
                    fontSize: "21px",
                    cursor: "pointer",
                    flex: "0 0 auto",
                  }}
                >
                  ×
                </button>
              </div>

              {cart.length > 0 && (
                <div style={{ marginTop: "16px", display: "flex", alignItems: "center", gap: "10px" }}>
                  <div style={{ flex: 1, height: "5px", borderRadius: "99px", background: "#e9eee9", overflow: "hidden" }}>
                    <div style={{ width: "68%", height: "100%", borderRadius: "99px", background: "#365947" }} />
                  </div>
                  <span style={{ color: "#64746b", fontSize: "11px", fontWeight: 800 }}>Ready to checkout</span>
                </div>
              )}
            </div>

            <div
              style={{
                flex: 1,
                minHeight: 0,
                overflowY: "auto",
                padding: "18px 20px 170px",
                WebkitOverflowScrolling: "touch",
              }}
            >
              {cart.length === 0 ? (
                <div
                  style={{
                    minHeight: "430px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    textAlign: "center",
                  }}
                >
                  <div style={{ maxWidth: "360px" }}>
                    <div style={{ width: "82px", height: "82px", margin: "0 auto", borderRadius: "28px", background: "#eaf0ea", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "38px" }}>
                      🛒
                    </div>
                    <h3 style={{ color: "#17221d", fontSize: "24px", margin: "18px 0 8px", fontWeight: 900 }}>
                      Your cart is empty
                    </h3>
                    <p style={{ color: "#718078", fontSize: "14px", lineHeight: 1.6, margin: "0 0 20px" }}>
                      Discover products from local businesses and add something you love.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setCartOpen(false);
                        navigate("shop");
                      }}
                      style={{
                        border: 0,
                        borderRadius: "14px",
                        padding: "13px 20px",
                        background: "#365947",
                        color: "#fff",
                        fontWeight: 900,
                        cursor: "pointer",
                      }}
                    >
                      Continue Shopping →
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ display: "grid", gap: "12px" }}>
                    {cart.map((item) => (
                      <div
                        key={item.name}
                        style={{
                          background: "#ffffff",
                          border: "1px solid #e4e9e4",
                          borderRadius: "22px",
                          padding: "13px",
                          boxShadow: "0 8px 26px rgba(35,54,44,.055)",
                        }}
                      >
                        <div style={{ display: "grid", gridTemplateColumns: "94px minmax(0,1fr)", gap: "14px" }}>
                          <div
                            style={{
                              width: "94px",
                              height: "94px",
                              borderRadius: "18px",
                              background: "linear-gradient(145deg,#f0eadc,#e5ddcb)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: "36px",
                              overflow: "hidden",
                            }}
                          >
                            {item.icon}
                          </div>

                          <div style={{ minWidth: 0 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", alignItems: "flex-start" }}>
                              <div style={{ minWidth: 0 }}>
                                <div style={{ color: "#9b6b25", fontSize: "9.5px", letterSpacing: "1.2px", textTransform: "uppercase", fontWeight: 900 }}>
                                  {item.shop}
                                </div>
                                <div style={{ color: "#17221d", fontSize: "17px", fontWeight: 900, lineHeight: 1.25, marginTop: "4px" }}>
                                  {item.name}
                                </div>
                              </div>
                              <div style={{ color: "#17221d", fontSize: "17px", fontWeight: 900, whiteSpace: "nowrap" }}>
                                {item.price}
                              </div>
                            </div>

                            {(item.selectedSize || item.size || item.selectedColor || item.color || item.customMeasurements || item.fitSizeResult) && (
                              <div
                                style={{
                                  marginTop: "9px",
                                  display: "flex",
                                  flexWrap: "wrap",
                                  gap: "6px",
                                }}
                              >
                                {(item.selectedSize || item.size) && (
                                  <span style={{ padding: "5px 8px", borderRadius: "99px", background: "#f0f5f1", color: "#365947", fontSize: "10px", fontWeight: 800 }}>
                                    Size · {item.selectedSize || item.size}
                                  </span>
                                )}
                                {(item.selectedColor || item.color) && (
                                  <span style={{ padding: "5px 8px", borderRadius: "99px", background: "#f8f2e8", color: "#785a2c", fontSize: "10px", fontWeight: 800 }}>
                                    Colour · {item.selectedColor || item.color}
                                  </span>
                                )}
                                {item.fitSizeResult && (
                                  <span style={{ padding: "5px 8px", borderRadius: "99px", background: "#eef3f7", color: "#4d6272", fontSize: "10px", fontWeight: 800 }}>
                                    Fit · {item.fitSizeResult}
                                  </span>
                                )}
                                {item.customMeasurements && (
                                  <span style={{ padding: "5px 8px", borderRadius: "99px", background: "#f4eff7", color: "#6b5275", fontSize: "10px", fontWeight: 800 }}>
                                    📏 Custom fit
                                  </span>
                                )}
                              </div>
                            )}

                            {item.makingTime && (
                              <div style={{ marginTop: "8px", color: "#78857e", fontSize: "10.5px", fontWeight: 700 }}>
                                🧵 Made to order · {item.makingTime}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Dedicated action row — no overlap */}
                        <div
                          style={{
                            marginTop: "12px",
                            paddingTop: "11px",
                            borderTop: "1px solid #edf0ec",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: "10px",
                            flexWrap: "wrap",
                          }}
                        >
                          <div style={{ display: "inline-flex", alignItems: "center", gap: "2px", padding: "3px", borderRadius: "12px", background: "#f2f5f2", border: "1px solid #e1e7e1" }}>
                            <button
                              type="button"
                              aria-label="Decrease quantity"
                              onClick={() => updateCartQuantity(item.name, -1)}
                              style={{ width: "30px", height: "30px", border: 0, borderRadius: "9px", background: "#fff", color: "#365947", fontSize: "17px", fontWeight: 900, cursor: "pointer" }}
                            >
                              −
                            </button>
                            <span style={{ minWidth: "30px", textAlign: "center", color: "#17221d", fontSize: "12px", fontWeight: 900 }}>
                              {item.quantity || 1}
                            </span>
                            <button
                              type="button"
                              aria-label="Increase quantity"
                              onClick={() => updateCartQuantity(item.name, 1)}
                              style={{ width: "30px", height: "30px", border: 0, borderRadius: "9px", background: "#365947", color: "#fff", fontSize: "17px", fontWeight: 900, cursor: "pointer" }}
                            >
                              +
                            </button>
                          </div>

                          <div style={{ display: "flex", alignItems: "center", gap: "7px", flexWrap: "wrap" }}>
                            <button
                              type="button"
                              onClick={() => saveForLater(item)}
                              style={{ border: "1px solid #dfe6df", borderRadius: "11px", padding: "8px 11px", background: "#fff", color: "#365947", fontSize: "10.5px", fontWeight: 900, cursor: "pointer" }}
                            >
                              ♡ Save for later
                            </button>
                            <button
                              type="button"
                              onClick={() => removeFromCart(item.name)}
                              style={{ border: "1px solid #f0d7d7", borderRadius: "11px", padding: "8px 11px", background: "#fffafa", color: "#a14b4b", fontSize: "10.5px", fontWeight: 900, cursor: "pointer" }}
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {savedForLater.length > 0 && (
                    <section style={{ marginTop: "18px" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                        <div>
                          <div style={{ color: "#17221d", fontSize: "16px", fontWeight: 900 }}>Saved for later</div>
                          <div style={{ color: "#78857e", fontSize: "11px", marginTop: "2px" }}>Keep favourites here without losing them.</div>
                        </div>
                        <span style={{ minWidth: "28px", height: "28px", padding: "0 8px", borderRadius: "99px", background: "#edf3ee", color: "#365947", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: 900 }}>
                          {savedForLater.length}
                        </span>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: "9px" }}>
                        {savedForLater.map((item) => (
                          <div
                            key={item.name}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "10px",
                              padding: "10px",
                              borderRadius: "16px",
                              background: "#fff",
                              border: "1px solid #e6e9e4",
                            }}
                          >
                            <div style={{ width: "46px", height: "46px", flex: "0 0 46px", borderRadius: "13px", background: "#f0eadc", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px" }}>
                              {item.icon}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ color: "#26342d", fontSize: "12px", fontWeight: 900, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.name}</div>
                              <div style={{ color: "#718078", fontSize: "11px", marginTop: "2px" }}>{item.price}</div>
                            </div>
                            <button
                              type="button"
                              onClick={() => moveSavedToCart(item)}
                              style={{ border: 0, borderRadius: "10px", padding: "8px 10px", background: "#365947", color: "#fff", fontSize: "10px", fontWeight: 900, cursor: "pointer", whiteSpace: "nowrap" }}
                            >
                              Move to cart
                            </button>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Optional extras are visually grouped, not mixed with product actions */}
                  <section style={{ marginTop: "18px", display: "grid", gap: "9px" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "9px" }}>
                      <div style={{ padding: "12px", borderRadius: "16px", background: "#eef6f0", border: "1px solid #d7e7da" }}>
                        <div style={{ color: "#365947", fontSize: "11px", fontWeight: 900 }}>🧶 Handmade</div>
                        <div style={{ color: "#718078", fontSize: "10px", marginTop: "4px", lineHeight: 1.4 }}>Making time is shown per item.</div>
                      </div>
                      <div style={{ padding: "12px", borderRadius: "16px", background: "#f3f6f8", border: "1px solid #e1e7ea" }}>
                        <div style={{ color: "#435865", fontSize: "11px", fontWeight: 900 }}>🔒 Fit privacy</div>
                        <div style={{ color: "#718078", fontSize: "10px", marginTop: "4px", lineHeight: 1.4 }}>Your photo isn't shown to the seller.</div>
                      </div>
                    </div>

                    <div style={{ padding: "13px", borderRadius: "16px", background: "#fff", border: "1px solid #e4e9e4" }}>
                      <div style={{ color: "#26342d", fontSize: "11px", fontWeight: 900 }}>🏷️ Have a coupon?</div>
                      <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                        <input
                          value={cartCoupon}
                          onChange={(e) => setCartCoupon(e.target.value.toUpperCase())}
                          placeholder="Enter code"
                          style={{ flex: 1, minWidth: 0, padding: "11px 12px", borderRadius: "11px", border: "1px solid #dce3dd", background: "#f8faf8", color: "#17221d", outline: "none" }}
                        />
                        <button
                          type="button"
                          onClick={applyCartCoupon}
                          style={{ padding: "0 15px", border: 0, borderRadius: "11px", background: "#365947", color: "#fff", fontWeight: 900, cursor: "pointer" }}
                        >
                          Apply
                        </button>
                      </div>
                      {cartNotice && <div style={{ marginTop: "6px", fontSize: "10px", color: cartCouponApplied ? "#166534" : "#64746b" }}>{cartNotice}</div>}
                    </div>

                    <div style={{ padding: "13px", borderRadius: "16px", background: "#fff", border: "1px solid #e4e9e4" }}>
                      <div style={{ color: "#26342d", fontSize: "11px", fontWeight: 900 }}>📍 Check delivery</div>
                      <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                        <input
                          value={cartPincode}
                          onChange={(e) => { setCartPincode(e.target.value.replace(/\D/g, "").slice(0, 6)); setCartPincodeChecked(false); }}
                          placeholder="6-digit pincode"
                          inputMode="numeric"
                          style={{ flex: 1, minWidth: 0, padding: "11px 12px", borderRadius: "11px", border: "1px solid #dce3dd", background: "#f8faf8", color: "#17221d", outline: "none" }}
                        />
                        <button
                          type="button"
                          onClick={checkCartPincode}
                          style={{ padding: "0 14px", border: "1px solid #dce3dd", borderRadius: "11px", background: "#fff", color: "#365947", fontWeight: 900, cursor: "pointer" }}
                        >
                          Check
                        </button>
                      </div>
                      {cartPincodeChecked && <div style={{ marginTop: "6px", fontSize: "10px", color: "#166534", fontWeight: 800 }}>✓ Delivery available for this pincode.</div>}
                    </div>

                    <label style={{ display: "flex", alignItems: "center", gap: "9px", padding: "4px 2px", color: "#46564d", fontSize: "11px", fontWeight: 700, cursor: "pointer" }}>
                      <input type="checkbox" checked={giftWrap} onChange={(e) => { setGiftWrap(e.target.checked); if (!e.target.checked) setGiftMessageSaved(false); }} />
                      🎁 Add handmade gift wrapping <strong>+₹49</strong>
                    </label>

                    {giftWrap && (
                      <div style={{ padding: "12px", borderRadius: "16px", background: "#fff", border: "1px solid #e4e9e4" }}>
                        <textarea
                          value={giftMessage}
                          onChange={(e) => { setGiftMessage(e.target.value); setGiftMessageSaved(false); }}
                          rows={2}
                          placeholder="Gift message (optional)"
                          style={{ width: "100%", boxSizing: "border-box", padding: "10px 11px", borderRadius: "11px", border: "1px solid #dce3dd", background: "#f8faf8", resize: "vertical", color: "#17221d" }}
                        />
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", marginTop: "8px" }}>
                          <span style={{ color: giftMessageSaved ? "#166534" : "#718078", fontSize: "10px" }}>
                            {giftMessageSaved ? "✓ Gift message saved." : "Save your message before checkout."}
                          </span>
                          <button
                            type="button"
                            onClick={() => { setGiftMessageSaved(true); setCartNotice("🎁 Gift message saved."); }}
                            disabled={!giftMessage.trim()}
                            style={{ padding: "8px 12px", border: 0, borderRadius: "10px", background: giftMessage.trim() ? "#365947" : "#cbd5d0", color: "#fff", fontWeight: 900, cursor: giftMessage.trim() ? "pointer" : "not-allowed" }}
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    )}

                    <div style={{ padding: "12px 13px", borderRadius: "16px", background: "#fff8ec", border: "1px solid #f0dfbd", color: "#735727", fontSize: "10.5px", lineHeight: 1.55 }}>
                      <strong>👵 Made-to-order note</strong><br />
                      Please confirm size, colour and custom-fit details before checkout. Preparation begins after order confirmation.
                    </div>
                  </section>
                </>
              )}
            </div>

            {/* Premium sticky summary */}
            {cart.length > 0 && (
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  bottom: 0,
                  padding: "15px 20px 18px",
                  background: "rgba(255,255,255,.97)",
                  borderTop: "1px solid #e2e8e2",
                  boxShadow: "0 -18px 42px rgba(31,48,39,.12)",
                  backdropFilter: "blur(14px)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
                  <div>
                    <div style={{ color: "#718078", fontSize: "10px", fontWeight: 800 }}>CART TOTAL</div>
                    <div style={{ color: "#17221d", fontSize: "24px", lineHeight: 1.1, fontWeight: 900, marginTop: "2px" }}>
                      ₹{Math.max(0, cartSubtotal - (cartCouponApplied ? Math.min(Math.round(cartSubtotal * 0.10), 500) : 0) + (giftWrap ? 49 : 0)).toLocaleString("en-IN")}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => { setNotificationOpen(false); openCheckout(); }}
                    style={{
                      minWidth: "230px",
                      border: 0,
                      borderRadius: "15px",
                      padding: "15px 20px",
                      background: "#17221d",
                      color: "#fff",
                      fontWeight: 900,
                      fontSize: "14px",
                      cursor: "pointer",
                      boxShadow: "0 9px 22px rgba(23,34,29,.20)",
                    }}
                  >
                    Proceed to Checkout →
                  </button>
                </div>
                <div style={{ marginTop: "7px", color: "#7b887f", fontSize: "10px", lineHeight: 1.4 }}>
                  Final delivery charges and payment details are confirmed at checkout.
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {checkoutOpen && currentUser && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 10010, background: "rgba(15,23,42,.62)", padding: "18px", overflowY: "auto" }}
          onMouseDown={(event) => event.target === event.currentTarget && setCheckoutOpen(false)}
        >
          <div style={{ maxWidth: "980px", margin: "28px auto", background: "#fff", borderRadius: "26px", boxShadow: "0 30px 90px rgba(15,23,42,.28)", overflow: "hidden" }}>
            <div style={{ padding: "22px 26px", borderBottom: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px" }}>
              <div>
                <div style={{ fontSize: "12px", letterSpacing: "1.2px", fontWeight: 900, color: "#64748b" }}>HOWDI CHECKOUT</div>
                <h2 style={{ margin: "5px 0 0", fontSize: "28px" }}>🛍️ Complete your order</h2>
              </div>
              <button type="button" onClick={() => setCheckoutOpen(false)} style={{ width: "42px", height: "42px", borderRadius: "50%", border: "1px solid #e2e8f0", background: "#f8fafc", cursor: "pointer", fontSize: "20px" }}>×</button>
            </div>

            <div style={{ padding: "18px 26px", background: "#f8fafc", display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "10px" }}>
              {["Delivery", "Payment", "Review"].map((label, index) => {
                const step = index + 1;
                return <div key={label} style={{ padding: "11px 12px", borderRadius: "12px", background: checkoutStep === step ? "#365947" : "#fff", color: checkoutStep === step ? "#fff" : "#64748b", textAlign: "center", fontWeight: 900, fontSize: "13px" }}>{step}. {label}</div>;
              })}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.5fr) minmax(300px,.8fr)", gap: "24px", padding: "28px" }}>
              <div>
                {checkoutStep === 1 && (
                  <div>
                    <h3 style={{ margin: "0 0 8px", fontSize: "22px" }}>📍 Choose delivery address</h3>
                    <p style={{ margin: "0 0 18px", color: "#64748b" }}>Select a saved address or add a new one before placing your handmade order.</p>
                    <div style={{ display: "grid", gap: "12px" }}>
                      {addresses.map((address) => (
                        <button key={address.id} type="button" onClick={() => setSelectedCheckoutAddress(address)} style={{ textAlign: "left", padding: "16px", borderRadius: "16px", border: selectedCheckoutAddress?.id === address.id ? "2px solid #365947" : "1px solid #dbe3dc", background: selectedCheckoutAddress?.id === address.id ? "#f1f8f3" : "#fff", cursor: "pointer" }}>
                          <strong>{address.label || "Address"} {address.is_default ? "· Default" : ""}</strong>
                          <div style={{ marginTop: "5px", color: "#475569", lineHeight: 1.5 }}>{address.full_name} · {address.phone}<br />{address.address_line1}{address.address_line2 ? `, ${address.address_line2}` : ""}, {address.city}, {address.state} - {address.pincode}</div>
                        </button>
                      ))}
                    </div>
                    <button type="button" onClick={openNewAddress} style={{ marginTop: "14px", width: "100%", padding: "13px", borderRadius: "13px", border: "1px dashed #365947", background: "#fff", color: "#365947", fontWeight: 900, cursor: "pointer" }}>＋ Add new address</button>
                    <button type="button" disabled={!selectedCheckoutAddress} onClick={() => setCheckoutStep(2)} style={{ marginTop: "18px", width: "100%", padding: "15px", borderRadius: "13px", border: 0, background: selectedCheckoutAddress ? "#0f172a" : "#cbd5e1", color: "#fff", fontWeight: 900, cursor: selectedCheckoutAddress ? "pointer" : "not-allowed" }}>Continue to Payment →</button>
                  </div>
                )}

                {checkoutStep === 2 && (
                  <div>
                    <h3 style={{ margin: "0 0 8px", fontSize: "22px" }}>💳 Choose payment method</h3>
                    <p style={{ margin: "0 0 18px", color: "#64748b" }}>Your real payment gateway can be connected later. For now this completes the frontend checkout flow.</p>
                    <div style={{ display: "grid", gap: "10px" }}>
                      {[
                        ["COD", "💵 Cash on Delivery", "Pay when your order arrives"],
                        ["UPI", "📱 UPI", "Fast digital payment"],
                        ["CARD", "💳 Card", "Debit or credit card"],
                        ...(paymentMethods.length ? [["SAVED", "🔐 Saved payment method", "Use a payment method from your HOWDI profile"]] : []),
                      ].map(([value, title, text]) => (
                        <button key={value} type="button" onClick={() => setCheckoutPayment(value)} style={{ textAlign: "left", padding: "15px", borderRadius: "15px", border: checkoutPayment === value ? "2px solid #365947" : "1px solid #dbe3dc", background: checkoutPayment === value ? "#f1f8f3" : "#fff", cursor: "pointer" }}>
                          <strong>{title}</strong><div style={{ color: "#64748b", fontSize: "13px", marginTop: "4px" }}>{text}</div>
                        </button>
                      ))}
                    </div>
                    <div style={{ display: "flex", gap: "10px", marginTop: "18px" }}>
                      <button type="button" onClick={() => setCheckoutStep(1)} style={{ flex: 1, padding: "14px", borderRadius: "13px", border: "1px solid #cbd5e1", background: "#fff", fontWeight: 900, cursor: "pointer" }}>← Back</button>
                      <button type="button" onClick={() => setCheckoutStep(3)} style={{ flex: 2, padding: "14px", borderRadius: "13px", border: 0, background: "#0f172a", color: "#fff", fontWeight: 900, cursor: "pointer" }}>Review Order →</button>
                    </div>
                  </div>
                )}

                {checkoutStep === 3 && (
                  <div>
                    <h3 style={{ margin: "0 0 8px", fontSize: "22px" }}>✅ Review & place order</h3>
                    <div style={{ padding: "15px", borderRadius: "16px", background: "#f8fafc", marginBottom: "12px" }}><strong>Deliver to</strong><div style={{ color: "#475569", marginTop: "5px", lineHeight: 1.5 }}>{selectedCheckoutAddress?.full_name}<br />{selectedCheckoutAddress?.address_line1}, {selectedCheckoutAddress?.city}, {selectedCheckoutAddress?.state} - {selectedCheckoutAddress?.pincode}</div></div>
                    <div style={{ padding: "15px", borderRadius: "16px", background: "#f8fafc", marginBottom: "12px" }}><strong>Payment</strong><div style={{ color: "#475569", marginTop: "5px" }}>{checkoutPayment === "COD" ? "Cash on Delivery" : checkoutPayment === "UPI" ? "UPI" : checkoutPayment === "CARD" ? "Debit / Credit Card" : "Saved payment method"}</div></div>
                    <div style={{
                      marginTop: "14px",
                      padding: "12px 14px",
                      borderRadius: "13px",
                      background: "#fff7ed",
                      border: "1px solid #fed7aa",
                      color: "#7c4a13",
                      fontSize: "11.5px",
                      lineHeight: 1.5
                    }}>
                      ⚠️ <strong>Before you place the order:</strong> check your size/colour/custom-fit details carefully. If a handmade order is cancelled, HOWDI will record <strong>who cancelled, why, when, and the refund status</strong> in the order history.
                    </div>

                    <div style={{ display: "flex", gap: "10px", marginTop: "18px" }}>
                      <button type="button" onClick={() => setCheckoutStep(2)} style={{ flex: 1, padding: "14px", borderRadius: "13px", border: "1px solid #cbd5e1", background: "#fff", fontWeight: 900, cursor: "pointer" }}>← Back</button>
                      <button type="button" onClick={placeCheckoutOrder} style={{ flex: 2, padding: "14px", borderRadius: "13px", border: 0, background: "#365947", color: "#fff", fontWeight: 900, cursor: "pointer" }}>🎉 Place Order · ₹{checkoutTotal.toLocaleString("en-IN")}</button>
                    </div>
                  </div>
                )}
                {checkoutMessage && <div style={{ marginTop: "14px", padding: "12px 14px", borderRadius: "12px", background: "#fff8e8", color: "#7a531d", fontWeight: 800, fontSize: "13px" }}>{checkoutMessage}</div>}
              </div>

              <aside style={{ alignSelf: "start", border: "1px solid #dbe3dc", borderRadius: "20px", padding: "18px", background: "#fbfdfb", position: "sticky", top: "10px" }}>
                <h3 style={{ margin: "0 0 14px", fontSize: "20px" }}>🛒 Order summary</h3>

                <div style={{
                  marginBottom: "13px",
                  padding: "13px",
                  borderRadius: "15px",
                  background: "#fffaf0",
                  border: "1px solid #eadfca",
                  color: "#684c20",
                  fontSize: "12px",
                  lineHeight: 1.55
                }}>
                  <strong>👵 Made with hands, not mass-produced</strong>
                  <div style={{ marginTop: "5px" }}>
                    Every handmade/custom-fit item may have tiny natural variations. Made-to-order pieces begin preparation after the order is confirmed.
                  </div>
                </div>

                <div style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "8px",
                  marginBottom: "13px"
                }}>
                  <div style={{ padding: "10px", borderRadius: "12px", background: "#f1f8f3", color: "#365947", fontSize: "11px", fontWeight: 800 }}>
                    🔒 Privacy<br /><span style={{ fontWeight: 600, color: "#64748b" }}>Fit image stays protected</span>
                  </div>
                  <div style={{ padding: "10px", borderRadius: "12px", background: "#f8fafc", color: "#334155", fontSize: "11px", fontWeight: 800 }}>
                    🧵 Crafting<br /><span style={{ fontWeight: 600, color: "#64748b" }}>Maker time shown</span>
                  </div>
                  <div style={{ padding: "10px", borderRadius: "12px", background: "#f8fafc", color: "#334155", fontSize: "11px", fontWeight: 800 }}>
                    📦 Dispatch<br /><span style={{ fontWeight: 600, color: "#64748b" }}>After making / QC</span>
                  </div>
                  <div style={{ padding: "10px", borderRadius: "12px", background: "#f8fafc", color: "#334155", fontSize: "11px", fontWeight: 800 }}>
                    ↩️ Returns<br /><span style={{ fontWeight: 600, color: "#64748b" }}>Policy before payment</span>
                  </div>
                </div>

                <div style={{ display: "grid", gap: "11px", maxHeight: "260px", overflowY: "auto" }}>
                  {cart.map((item) => <div key={item.name} style={{ display: "flex", justifyContent: "space-between", gap: "10px", fontSize: "13px" }}><span>{item.name} × {item.quantity || 1}</span><strong>{item.price}</strong></div>)}
                </div>
                <div style={{ marginTop: "16px", paddingTop: "14px", borderTop: "1px solid #e2e8f0", display: "grid", gap: "9px", fontSize: "14px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}><span>Subtotal</span><strong>₹{cartSubtotal.toLocaleString("en-IN")}</strong></div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}><span>Delivery</span><strong>{checkoutDelivery ? `₹${checkoutDelivery}` : "FREE"}</strong></div>
                  {checkoutDiscount > 0 && <div style={{ display: "flex", justifyContent: "space-between", color: "#16803c" }}><span>HOWDI10</span><strong>-₹{checkoutDiscount}</strong></div>}
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "20px", paddingTop: "8px", borderTop: "1px solid #e2e8f0" }}><strong>Total</strong><strong>₹{checkoutTotal.toLocaleString("en-IN")}</strong></div>
                </div>
                <div style={{ display: "flex", gap: "8px", marginTop: "16px" }}>
                  <input value={checkoutCoupon} onChange={(e) => setCheckoutCoupon(e.target.value)} placeholder="Coupon code" style={{ flex: 1, minWidth: 0, height: "42px", border: "1px solid #cbd5e1", borderRadius: "10px", padding: "0 11px" }} />
                  <button type="button" onClick={applyCheckoutCoupon} style={{ height: "42px", padding: "0 12px", borderRadius: "10px", border: "1px solid #365947", background: "#fff", color: "#365947", fontWeight: 900, cursor: "pointer" }}>Apply</button>
                </div>
                <div style={{ marginTop: "12px", fontSize: "12px", color: "#64748b", lineHeight: 1.5 }}>🔒 Secure checkout · 🎁 Gift message available · ↩ Easy returns</div>
              </aside>
            </div>
          </div>
        </div>
      )}

      {orderSuccess && (
        <div style={{ position: "fixed", inset: 0, zIndex: 10020, background: "rgba(15,23,42,.62)", display: "grid", placeItems: "center", padding: "20px" }}>
          <div style={{ width: "min(520px, 100%)", background: "#fff", borderRadius: "26px", padding: "34px", textAlign: "center", boxShadow: "0 30px 90px rgba(15,23,42,.3)" }}>
            <div style={{ fontSize: "64px" }}>🎉</div>
            <div style={{ fontSize: "12px", letterSpacing: "1.2px", fontWeight: 900, color: "#365947" }}>ORDER CONFIRMED</div>
            <h2 style={{ margin: "8px 0", fontSize: "30px" }}>Thank you for supporting handmade. ❤️</h2>
            <p style={{ color: "#64748b", lineHeight: 1.6 }}>Your HOWDI order <strong>#{orderSuccess.order_number}</strong> has been placed. The maker's hands are now part of your story.</p>
            <div style={{ padding: "14px", borderRadius: "15px", background: "#f1f8f3", color: "#365947", fontWeight: 900, margin: "18px 0" }}>Total paid / payable: {orderSuccess.total}</div>
            <div style={{ display: "flex", gap: "10px" }}>
              <button type="button" onClick={() => { setOrderSuccess(null); openOrders(); }} style={{ flex: 1, padding: "13px", borderRadius: "12px", border: "1px solid #cbd5e1", background: "#fff", fontWeight: 900, cursor: "pointer" }}>View Orders</button>
              <button type="button" onClick={() => { setOrderSuccess(null); navigate("shop"); }} style={{ flex: 1, padding: "13px", borderRadius: "12px", border: 0, background: "#365947", color: "#fff", fontWeight: 900, cursor: "pointer" }}>Continue Shopping</button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================
          CUSTOMER PROFILE
      ====================================== */}
      {profileOpen && currentUser && (
        <div
          className="howdi-profile-overlay"
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
            className="howdi-profile-modal"
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
              className="howdi-profile-header"
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
                className="howdi-profile-close"
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
                                {order.status !== "delivered" && !["cancelled", "canceled"].includes(String(order.status || "").toLowerCase()) && (
                                  <button type="button" onClick={() => setSelectedOrder(order)} style={{ border: "1px solid #365947", background: "#f1f8f3", color: "#365947", borderRadius: "10px", padding: "9px 13px", fontWeight: 800, cursor: "pointer" }}>🚚 Track</button>
                                )}
                              </div>
                            </article>
                          );
                        })}
                      </div>
                    )}

                    {orders.some((order) => ["cancelled", "canceled"].includes(String(order.status || "").toLowerCase())) && (
                      <section style={{ marginTop: "24px", padding: "20px", borderRadius: "18px", border: "1px solid #eadfd5", background: "#fffaf6" }}>
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: "0.08em", color: "#9a5b1f" }}>ORDER TRANSPARENCY</div>
                          <h3 style={{ margin: "5px 0 0", fontSize: 22, color: "#172033" }}>Cancellation history</h3>
                          <p style={{ margin: "6px 0 0", color: "#64748b", fontSize: 13 }}>See who cancelled the order, why it happened, when it happened and what happens to your refund.</p>
                        </div>
                        <div style={{ display: "grid", gap: 12, marginTop: 14 }}>
                          {orders.filter((order) => ["cancelled", "canceled"].includes(String(order.status || "").toLowerCase())).map((order) => {
                            const c = order.cancellation;
                            return (
                              <article key={`cancel-history-${order.id || order.order_id}`} style={{ padding: 15, borderRadius: 14, background: "#fff", border: "1px solid #eadfd5" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "flex-start" }}>
                                  <div>
                                    <strong style={{ color: "#172033" }}>Order #{order.order_number || order.id || order.order_id || "—"}</strong>
                                    <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>Cancelled {c?.date ? new Date(c.date).toLocaleString("en-IN") : "—"}</div>
                                  </div>
                                  <span style={{ padding: "6px 10px", borderRadius: 999, background: "#fff1f2", color: "#be123c", fontSize: 11, fontWeight: 900 }}>CANCELLED</span>
                                </div>
                                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 10, marginTop: 12 }}>
                                  <div><small style={{ color: "#94a3b8" }}>Cancelled by</small><div style={{ fontWeight: 800, color: "#172033" }}>{c?.actor || "—"}</div></div>
                                  <div><small style={{ color: "#94a3b8" }}>Reason</small><div style={{ fontWeight: 800, color: "#172033" }}>{c?.reason || "—"}</div></div>
                                  <div><small style={{ color: "#94a3b8" }}>Refund</small><div style={{ fontWeight: 800, color: "#172033" }}>{c?.refundStatus || "—"}</div></div>
                                </div>
                                <div style={{ marginTop: 11, padding: 11, borderRadius: 11, background: "#f8fafc", color: "#172033" }}>
                                  <div style={{ fontSize: 11, fontWeight: 900, color: "#64748b" }}>WHAT HAPPENED?</div>
                                  <div style={{ marginTop: 5, fontSize: 13, lineHeight: 1.5, color: "#334155" }}>{getCancellationDescription(order)}</div>
                                  {c?.details && c.details !== `Order cancelled by ${String(c.actor || "").toLowerCase()} because: ${c.reason}.` && (
                                    <div style={{ marginTop: 7, fontSize: 13, color: "#475569" }}>{c.details}</div>
                                  )}
                                </div>
                                <div style={{ marginTop: 10 }}>
                                  <div style={{ fontSize: 11, fontWeight: 900, color: "#64748b" }}>ORDER JOURNEY</div>
                                  <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 7 }}>
                                    {(order.timeline || []).map((step, i) => (
                                      <span key={i} style={{ padding: "6px 8px", borderRadius: 9, background: step.label === "Cancelled" ? "#fff1f2" : "#f1f5f9", color: step.label === "Cancelled" ? "#be123c" : "#475569", fontSize: 11, fontWeight: 800 }}>{step.label}</span>
                                    ))}
                                  </div>
                                </div>
                              </article>
                            );
                          })}
                        </div>
                      </section>
                    )}

                    {selectedOrder && (
                      <div style={{ position: "fixed", inset: 0, zIndex: 10002, background: "rgba(15,23,42,.58)", padding: "20px", overflowY: "auto" }} onMouseDown={(e) => e.target === e.currentTarget && setSelectedOrder(null)}>
                        <div style={{ maxWidth: "720px", margin: "35px auto", background: "#fff", borderRadius: "24px", padding: "26px", boxShadow: "0 30px 80px rgba(15,23,42,.25)" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px" }}>
                            <div>
                              <div style={{ fontSize: "12px", fontWeight: 800, color: "#64748b" }}>ORDER DETAILS</div>
                              <h3 style={{ margin: "6px 0", fontSize: "24px" }}>#{selectedOrder.order_number || selectedOrder.id || "—"}</h3>
                              <div style={{ color: "#64748b", fontSize: "13px" }}>{formatOrderDate(selectedOrder.created_at || selectedOrder.date)} · {orderStatusLabel(selectedOrder.status)}</div>
                            </div>
                            <button type="button" onClick={() => setSelectedOrder(null)} style={{ width: "40px", height: "40px", borderRadius: "50%", border: "1px solid #e2e8f0", background: "#f8fafc", cursor: "pointer", fontSize: "18px" }}>×</button>
                          </div>

                          <div style={{ marginTop: "18px", padding: "16px", borderRadius: "16px", background: "#f8fafc" }}>
                            <strong>{selectedOrder.title || selectedOrder.shop || "HOWDI Order"}</strong>
                            <div style={{ marginTop: "7px", color: "#64748b" }}>{selectedOrder.item_count || 1} {(selectedOrder.item_count || 1) === 1 ? "item" : "items"} · Total {selectedOrder.total || `₹${selectedOrder.amount || 0}`}</div>
                          </div>

                          {selectedOrder.status !== "cancelled" && selectedOrder.status !== "canceled" && (
                            <div style={{ marginTop: "20px", padding: "18px", border: "1px solid #e2e8f0", borderRadius: "18px" }}>
                              <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", alignItems: "center", marginBottom: "16px" }}>
                                <strong>🚚 Track your handmade order</strong>
                                <span style={{ fontSize: "12px", color: "#64748b" }}>ETA: {selectedOrder.estimated_delivery || "3–6 days"}</span>
                              </div>
                              <div>
                                {getOrderTimeline(selectedOrder).map((step, index) => (
                                  <div key={step.key} style={{ display: "grid", gridTemplateColumns: "34px 1fr", gap: "10px", minHeight: index === 4 ? "42px" : "58px" }}>
                                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                                      <div style={{ width: "28px", height: "28px", borderRadius: "50%", display: "grid", placeItems: "center", background: step.active ? "#365947" : "#e2e8f0", color: step.active ? "#fff" : "#94a3b8", fontSize: "13px", fontWeight: 900 }}>{step.icon}</div>
                                      {index < 4 && <div style={{ width: "2px", flex: 1, background: step.active ? "#cfe2d5" : "#e2e8f0", margin: "4px 0" }} />}
                                    </div>
                                    <div style={{ paddingBottom: "10px" }}>
                                      <div style={{ fontWeight: step.current ? 900 : 800, color: step.active ? "#1f2937" : "#94a3b8" }}>{step.title}{step.current ? " · Current" : ""}</div>
                                      <div style={{ color: step.active ? "#64748b" : "#a1a1aa", fontSize: "12px", marginTop: "3px" }}>{step.text}</div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                              {selectedOrder.tracking_number && <div style={{ marginTop: "8px", fontSize: "12px", color: "#64748b" }}>Tracking reference: <strong>{selectedOrder.tracking_number}</strong></div>}
                            </div>
                          )}

                          {String(selectedOrder.status || "").toLowerCase() === "cancelled" && (
                            <div style={{ marginTop: "16px", padding: "17px", borderRadius: "16px", border: "1px solid #fecaca", background: "#fff7f7" }}>
                              <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
                                <strong style={{ color: "#991b1b", fontSize: "16px" }}>❌ Cancellation record</strong>
                                <span style={{ padding: "5px 9px", borderRadius: "999px", background: "#fee2e2", color: "#991b1b", fontSize: "11px", fontWeight: 900 }}>CANCELLED</span>
                              </div>
                              <div style={{ marginTop: "10px", color: "#475569", fontSize: "13px", lineHeight: 1.6 }}>
                                <strong>Who cancelled:</strong> {selectedOrder.cancellation?.actor || "Customer"}<br />
                                <strong>Why:</strong> {selectedOrder.cancellation?.reason || "Reason not recorded"}<br />
                                <strong>What happened:</strong> {selectedOrder.cancellation?.details || "No additional details provided."}<br />
                                <strong>When:</strong> {selectedOrder.cancellation?.date ? new Date(selectedOrder.cancellation.date).toLocaleString("en-IN") : "—"}<br />
                                <strong>Refund:</strong> {selectedOrder.cancellation?.refundStatus || "To be confirmed"}
                              </div>
                              <div style={{ marginTop: "10px", paddingTop: "10px", borderTop: "1px solid #fee2e2", color: "#7f1d1d", fontSize: "11.5px", lineHeight: 1.45 }}>This record is attached to the order history for transparency. It does not by itself confirm that a refund has reached the customer's bank or payment provider.</div>
                            </div>
                          )}

                          {selectedOrder.address && (
                            <div style={{ marginTop: "14px", padding: "14px 16px", borderRadius: "15px", background: "#f8fafc" }}>
                              <strong>📍 Delivery address</strong>
                              <div style={{ marginTop: "6px", color: "#64748b", lineHeight: 1.5 }}>
                                {selectedOrder.address.full_name || ""}{selectedOrder.address.phone ? ` · ${selectedOrder.address.phone}` : ""}<br />
                                {selectedOrder.address.address_line1 || ""}{selectedOrder.address.address_line2 ? `, ${selectedOrder.address.address_line2}` : ""}<br />
                                {selectedOrder.address.city || ""}{selectedOrder.address.state ? `, ${selectedOrder.address.state}` : ""} {selectedOrder.address.pincode || ""}
                              </div>
                            </div>
                          )}

                          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "18px" }}>
                            <button type="button" onClick={() => reorderOrder(selectedOrder)} style={{ flex: 1, minWidth: "145px", border: 0, borderRadius: "11px", padding: "12px", background: "#365947", color: "#fff", fontWeight: 900, cursor: "pointer" }}>🔁 Reorder</button>
                            {String(selectedOrder.status || "").toLowerCase() === "delivered" && (
                              <button type="button" onClick={() => { setReviewOrder(selectedOrder); setSelectedOrder(null); setReviewRating(selectedOrder.review?.rating || 5); setReviewText(selectedOrder.review?.text || ""); }} style={{ flex: 1, minWidth: "145px", border: "1px solid #d9c28c", borderRadius: "11px", padding: "12px", background: "#fffaf0", color: "#8a5a10", fontWeight: 900, cursor: "pointer" }}>⭐ {selectedOrder.review ? "Edit review" : "Review product"}</button>
                            )}
                            {!["delivered", "cancelled", "canceled", "shipped", "out_for_delivery"].includes(String(selectedOrder.status || "").toLowerCase()) && (
                              <button type="button" onClick={() => cancelOrder(selectedOrder.id || selectedOrder.order_id)} style={{ border: "1px solid #fecaca", borderRadius: "11px", padding: "12px", background: "#fff", color: "#b91c1c", fontWeight: 900, cursor: "pointer" }}>Cancel order</button>
                            )}
                          </div>

                          {selectedOrder.maker_note && (
                            <div style={{ marginTop: "16px", padding: "13px 15px", borderRadius: "14px", background: "#fffaf0", color: "#7c5a20", fontSize: "13px", lineHeight: 1.5 }}>
                              👵 <strong>From the maker:</strong> {selectedOrder.maker_note}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {reviewOrder && (
                      <div style={{ position: "fixed", inset: 0, zIndex: 10003, background: "rgba(15,23,42,.58)", padding: "20px", display: "grid", placeItems: "center" }} onMouseDown={(e) => e.target === e.currentTarget && setReviewOrder(null)}>
                        <div style={{ width: "min(500px, 100%)", background: "#fff", borderRadius: "22px", padding: "25px", boxShadow: "0 30px 80px rgba(15,23,42,.25)" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div><div style={{ fontSize: "12px", fontWeight: 800, color: "#64748b" }}>CUSTOMER REVIEW</div><h3 style={{ margin: "5px 0" }}>How was your handmade piece?</h3></div>
                            <button type="button" onClick={() => setReviewOrder(null)} style={{ width: "38px", height: "38px", borderRadius: "50%", border: "1px solid #e2e8f0", background: "#f8fafc", cursor: "pointer" }}>×</button>
                          </div>
                          <div style={{ marginTop: "18px", fontWeight: 800 }}>{reviewOrder.title}</div>
                          <div style={{ display: "flex", gap: "5px", marginTop: "12px" }}>
                            {[1,2,3,4,5].map((star) => (
                              <button key={star} type="button" onClick={() => setReviewRating(star)} style={{ border: 0, background: "transparent", cursor: "pointer", fontSize: "28px", opacity: star <= reviewRating ? 1 : .25 }}>⭐</button>
                            ))}
                          </div>
                          <textarea value={reviewText} onChange={(e) => setReviewText(e.target.value)} placeholder="Tell other HOWDI customers what you loved..." rows={5} style={{ width: "100%", boxSizing: "border-box", marginTop: "14px", border: "1px solid #cbd5e1", borderRadius: "13px", padding: "12px", resize: "vertical", fontFamily: "inherit" }} />
                          {reviewMessage && <div style={{ marginTop: "10px", color: "#365947", fontWeight: 800 }}>{reviewMessage}</div>}
                          <button type="button" onClick={submitOrderReview} style={{ width: "100%", marginTop: "14px", border: 0, borderRadius: "12px", padding: "13px", background: "#365947", color: "#fff", fontWeight: 900, cursor: "pointer" }}>Submit review →</button>
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
                      <div style={{ display: "flex", justifyContent: "space-between", gap: "16px", alignItems: "flex-start", flexWrap: "wrap" }}>
                        <div>
                          <h3 style={{ fontSize: "28px", margin: "6px 0" }}>Saved for later <span style={{ fontSize: "15px", color: "#64748b", fontWeight: 700 }}>({wishlist.length})</span></h3>
                          <p style={{ color: "#64748b", marginTop: 0 }}>
                            Keep the handmade pieces you love in one place.
                          </p>
                        </div>
                        {wishlist.length > 0 && (
                          <div style={{
                            padding: "10px 13px",
                            borderRadius: "13px",
                            background: "#fffaf0",
                            border: "1px solid #eadfca",
                            color: "#7c5a20",
                            fontSize: "11.5px",
                            lineHeight: 1.45
                          }}>
                            🧶 <strong>Handmade note</strong><br />
                            Saved items can sell out or take longer to remake.
                          </div>
                        )}
                      </div>
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
                          <article
                            key={product.name}
                            style={{
                              border: "1px solid #e2e8f0",
                              borderRadius: "18px",
                              overflow: "hidden",
                              background: "#fff",
                              boxShadow: "0 8px 24px rgba(15,23,42,.06)"
                            }}
                          >
                            <div
                              onClick={() => openProductDetails(product)}
                              style={{
                                height: "160px",
                                background: "linear-gradient(135deg,#f5f1e8,#edf5ef)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "64px",
                                position: "relative",
                                cursor: "pointer"
                              }}
                            >
                              {product.icon}

                              <span style={{
                                position: "absolute",
                                left: "11px",
                                top: "11px",
                                padding: "6px 9px",
                                borderRadius: "999px",
                                background: "#365947",
                                color: "#fff",
                                fontSize: "10px",
                                fontWeight: 900
                              }}>
                                🧶 SAVED
                              </span>

                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  toggleWishlist(product);
                                }}
                                aria-label={`Remove ${product.name} from wishlist`}
                                title="Remove from Wishlist"
                                style={{
                                  position: "absolute",
                                  top: "11px",
                                  right: "11px",
                                  width: "42px",
                                  height: "42px",
                                  border: "1px solid #fecdd3",
                                  borderRadius: "50%",
                                  background: "#fff1f2",
                                  color: "#e11d48",
                                  fontSize: "21px",
                                  fontWeight: 900,
                                  cursor: "pointer",
                                  boxShadow: "0 5px 14px rgba(15,23,42,.12)"
                                }}
                              >
                                ♥
                              </button>
                            </div>

                            <div style={{ padding: "16px" }}>
                              <div style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "1px", color: "#9a6b25", fontWeight: 800 }}>
                                {product.shop}
                              </div>

                              <h4 style={{ margin: "7px 0 6px", fontSize: "18px" }}>{product.name}</h4>

                              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
                                <strong style={{ fontSize: "18px" }}>{product.price}</strong>
                                <span style={{ fontSize: "11px", color: "#64748b" }}>❤️ Saved</span>
                              </div>

                              <div style={{
                                marginTop: "11px",
                                padding: "9px 10px",
                                borderRadius: "11px",
                                background: "#f8fafc",
                                color: "#64748b",
                                fontSize: "11px",
                                lineHeight: 1.45
                              }}>
                                👵 Handmade piece · availability may change as makers create each item.
                              </div>

                              <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
                                <button
                                  type="button"
                                  onClick={() => addWishlistItemToCart(product)}
                                  style={{
                                    flex: 1,
                                    border: 0,
                                    borderRadius: "10px",
                                    padding: "10px 8px",
                                    background: "#365947",
                                    color: "#fff",
                                    fontWeight: 900,
                                    cursor: "pointer"
                                  }}
                                >
                                  🛒 Add to cart
                                </button>

                                <button
                                  type="button"
                                  onClick={() => openProductDetails(product)}
                                  style={{
                                    flex: 1,
                                    border: "1px solid #cbd5e1",
                                    borderRadius: "10px",
                                    padding: "10px 8px",
                                    background: "#fff",
                                    color: "#334155",
                                    fontWeight: 900,
                                    cursor: "pointer"
                                  }}
                                >
                                  View product
                                </button>
                              </div>
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
                    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.35fr) minmax(260px, .65fr)", gap: "16px" }}>
                      <div style={{ padding: "22px", border: "1px solid #dbe7df", borderRadius: "18px", background: "linear-gradient(135deg,#f7fbf8,#fff)", minWidth: 0 }}>
                        <div style={{ fontSize: "12px", color: "#64748b", fontWeight: 800, letterSpacing: "1px" }}>YOUR PROFILE</div>
                        <div style={{ display: "flex", alignItems: "center", gap: "18px", marginTop: "12px", flexWrap: "wrap" }}>
                          <div style={{ width: "86px", height: "86px", flex: "0 0 86px", borderRadius: "50%", padding: "3px", background: "linear-gradient(135deg,#365947,#d8b34a)", position: "relative", boxSizing: "border-box" }}>
                            <div style={{ width: "100%", height: "100%", borderRadius: "50%", overflow: "hidden", background: "#e8f0ea", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "36px", fontWeight: 900, color: "#365947" }}>
                              {profileAvatar ? <img src={profileAvatar} alt="Profile" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : (currentUser?.full_name || currentUser?.name || "C").charAt(0).toUpperCase()}
                            </div>
                            <span style={{ position: "absolute", right: 1, bottom: 3, width: "15px", height: "15px", borderRadius: "50%", background: profileStatus === "Available" ? "#22c55e" : profileStatus === "Busy" ? "#f59e0b" : "#94a3b8", border: "3px solid #fff", boxSizing: "content-box" }} />
                          </div>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ fontWeight: 900, fontSize: "24px", color: "#0f172a", overflowWrap: "anywhere" }}>{currentUser?.full_name || currentUser?.name || "Customer"}</div>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginTop: "7px" }}>
                              <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "5px 9px", borderRadius: "999px", background: profileStatus === "Available" ? "#e8f7ed" : profileStatus === "Busy" ? "#fff7e6" : "#f1f5f9", color: profileStatus === "Available" ? "#166534" : profileStatus === "Busy" ? "#92400e" : "#475569", fontWeight: 800, fontSize: "12px" }}>● {profileStatus}</span>
                              <span style={{ color: "#64748b", fontSize: "13px" }}>HOWDI member</span>
                            </div>
                          </div>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: "10px", marginTop: "20px" }}>
                          <div style={{ padding: "13px", border: "1px solid #e2e8f0", borderRadius: "12px", background: "#fff" }}><div style={{ fontSize: "11px", color: "#64748b", fontWeight: 800 }}>MOBILE</div><div style={{ fontWeight: 800, marginTop: "6px", overflowWrap: "anywhere" }}>{currentUser?.phone || "Not set"}</div></div>
                          <div style={{ padding: "13px", border: "1px solid #e2e8f0", borderRadius: "12px", background: "#fff" }}><div style={{ fontSize: "11px", color: "#64748b", fontWeight: 800 }}>EMAIL</div><div style={{ fontWeight: 800, marginTop: "6px", overflowWrap: "anywhere" }}>{currentUser?.email || "Not set"}</div></div>
                        </div>
                      </div>
                      <div style={{ padding: "22px", border: "1px solid #e2e8f0", borderRadius: "18px", background: "#fff", minWidth: 0 }}>
                        <div style={{ fontSize: "12px", color: "#64748b", fontWeight: 800, letterSpacing: "1px" }}>SECURITY</div>
                        <div style={{ fontWeight: 900, fontSize: "17px", marginTop: "12px" }}>🔐 Password protected</div>
                        <div style={{ color: "#64748b", fontSize: "13px", lineHeight: 1.5, marginTop: "7px" }}>Your password remains managed by the HOWDI login system and is not displayed here.</div>
                        <div style={{ marginTop: "18px", padding: "13px", borderRadius: "12px", background: "#f8fafc", color: "#475569", fontSize: "12px", lineHeight: 1.5, fontWeight: 700 }}>🛡️ Your account details are private.</div>
                      </div>
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
                  <div style={{ display: "grid", gap: "14px", marginTop: "20px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "14px", padding: "14px", border: "1px solid #e2e8f0", borderRadius: "14px", background: "#f8fafc", flexWrap: "wrap" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
                        <div style={{ width: "58px", height: "58px", borderRadius: "50%", overflow: "hidden", background: "#e8f0ea", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px", fontWeight: 900, color: "#365947", flex: "0 0 58px" }}>{profileAvatar ? <img src={profileAvatar} alt="Profile" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : (currentUser?.full_name || currentUser?.name || "C").charAt(0).toUpperCase()}</div>
                        <div><div style={{ fontWeight: 900, fontSize: "16px" }}>Profile picture</div><div style={{ color: "#64748b", fontSize: "12px", marginTop: "3px" }}>Add a photo like a social profile.</div></div>
                      </div>
                      <label style={{ border: "1px solid #cbd5e1", borderRadius: "10px", padding: "10px 13px", background: "#fff", fontWeight: 800, cursor: "pointer", whiteSpace: "nowrap" }}>📷 {profileAvatar ? "Change photo" : "Add photo"}<input type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => { const file = e.target.files?.[0]; if (!file) return; if (!file.type.startsWith("image/")) return; if (file.size > 3 * 1024 * 1024) { alert("Please choose an image smaller than 3 MB."); return; } const reader = new FileReader(); reader.onload = () => saveProfileMedia(String(reader.result || ""), profileStatus); reader.readAsDataURL(file); }} /></label>
                    </div>
                    <label style={{ display: "grid", gap: "7px", fontSize: "13px", fontWeight: 800 }}>Full name<input value={profileForm.full_name} onChange={(e) => setProfileForm((v) => ({ ...v, full_name: e.target.value }))} required style={{ height: "44px", border: "1px solid #cbd5e1", borderRadius: "10px", padding: "0 12px", fontSize: "14px", color: "#0f172a", background: "#fff" }} /></label>
                    <label style={{ display: "grid", gap: "7px", fontSize: "13px", fontWeight: 800 }}>Mobile number<input value={profileForm.phone} onChange={(e) => setProfileForm((v) => ({ ...v, phone: e.target.value.replace(/\D/g, "").slice(0, 10) }))} inputMode="numeric" maxLength={10} required style={{ height: "44px", border: "1px solid #cbd5e1", borderRadius: "10px", padding: "0 12px", fontSize: "14px", color: "#0f172a", background: "#fff" }} /></label>
                    <label style={{ display: "grid", gap: "7px", fontSize: "13px", fontWeight: 800 }}>Email address<input value={currentUser?.email || ""} readOnly style={{ height: "44px", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "0 12px", fontSize: "14px", background: "#f8fafc", color: "#64748b" }} /></label>
                    <label style={{ display: "grid", gap: "7px", fontSize: "13px", fontWeight: 800 }}>Profile status<select value={profileStatus} onChange={(e) => { setProfileStatus(e.target.value); saveProfileMedia(profileAvatar, e.target.value); }} style={{ height: "44px", border: "1px solid #cbd5e1", borderRadius: "10px", padding: "0 12px", fontSize: "14px", color: "#0f172a", background: "#fff", fontWeight: 700 }}><option>Available</option><option>Busy</option><option>Away</option></select></label>
                  </div>
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
            CUSTOMER HOME DASHBOARD
        ==================================== */}

        {currentUser && (
          <section style={{ padding: "24px", margin: "0 0 10px", borderBottom: "1px solid #edf1ee", background: "#fff" }}>
            <div style={{ maxWidth: "1180px", margin: "0 auto" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "14px", alignItems: "flex-start", flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontSize: "11px", fontWeight: 900, letterSpacing: ".08em", color: "#9a5b1f" }}>YOUR HOWDI</div>
                  <h2 style={{ margin: "5px 0 4px", fontSize: "26px", color: "#172033" }}>Welcome back, {currentUser.full_name || currentUser.name || "Customer"}! 👋</h2>
                  <p style={{ margin: 0, color: "#64748b", fontSize: "13px" }}>Showing nearby experiences for <strong style={{ color: "#365947" }}>📍 {customerLocation}</strong></p>
                </div>
                <button type="button" onClick={() => setLocationPickerOpen(true)} style={{ border: "1px solid #d9e3dc", borderRadius: "11px", background: "#f7faf8", color: "#365947", padding: "10px 13px", fontWeight: 900, cursor: "pointer" }}>Change location</button>
              </div>

              <form onSubmit={submitHomeSearch} style={{ display: "flex", gap: "10px", marginTop: "18px", maxWidth: "820px" }}>
                <input
                  value={homeSearch}
                  onChange={(event) => setHomeSearch(event.target.value)}
                  placeholder={`Search products, shops or services in ${customerLocation}`}
                  style={{ flex: 1, minWidth: 0, height: "48px", boxSizing: "border-box", border: "1px solid #cbd5e1", borderRadius: "12px", padding: "0 14px", background: "#fff", color: "#172033", fontSize: "14px" }}
                />
                <button type="submit" style={{ minWidth: "112px", border: 0, borderRadius: "12px", background: "#365947", color: "#fff", fontWeight: 900, cursor: "pointer" }}>🔎 Search</button>
              </form>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: "10px", marginTop: "16px" }}>
                {[
                  ["🛍️", "Shop nearby", "Products from local shops", "shop"],
                  ["👷", "Find a worker", "Trusted help near you", "work"],
                  ["🏷️", "Local offers", "Deals available around you", "shop"],
                  ["🎓", "Learn & Earn", "Skills and opportunities", "learn"],
                ].map(([icon, title, text, target]) => (
                  <button key={title} type="button" onClick={() => navigate(target)} style={{ textAlign: "left", border: "1px solid #e2e8f0", borderRadius: "14px", background: "#fff", padding: "13px", cursor: "pointer" }}>
                    <div style={{ fontSize: "22px" }}>{icon}</div>
                    <strong style={{ display: "block", marginTop: "6px", color: "#172033" }}>{title}</strong>
                    <span style={{ display: "block", marginTop: "3px", color: "#64748b", fontSize: "12px" }}>{text}</span>
                  </button>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ====================================
            SEARCH & DISCOVERY
        ==================================== */}

        {currentUser && activeSection === "search" && (
          <section id="search" style={{ padding: "26px 24px 30px", background: "#f8faf9", borderBottom: "1px solid #e6ece8" }}>
            <div style={{ maxWidth: "1180px", margin: "0 auto" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "14px", alignItems: "flex-start", flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontSize: "11px", fontWeight: 900, letterSpacing: ".08em", color: "#9a5b1f" }}>SEARCH • DISCOVER NEAR YOU</div>
                  <h2 style={{ margin: "5px 0 4px", fontSize: "27px", color: "#172033" }}>Find products, shops & workers 🔎</h2>
                  <p style={{ margin: 0, color: "#64748b", fontSize: "13px" }}>Results are focused on <strong style={{ color: "#365947" }}>📍 {customerLocation}</strong>.</p>
                </div>
              </div>

              <form onSubmit={runDiscoverySearch} style={{ display: "flex", gap: "10px", marginTop: "18px" }}>
                <input value={homeSearch} onChange={(e) => setHomeSearch(e.target.value)} placeholder={`Search in ${customerLocation}`} style={{ flex: 1, minWidth: 0, height: "48px", boxSizing: "border-box", border: "1px solid #cbd5e1", borderRadius: "12px", padding: "0 14px", background: "#fff", color: "#172033", fontSize: "14px" }} />
                <button type="submit" style={{ minWidth: "112px", border: 0, borderRadius: "12px", background: "#365947", color: "#fff", fontWeight: 900, cursor: "pointer" }}>Search</button>
              </form>

              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "14px" }}>
                {[['all','Everything'],['products','Products'],['shops','Shops'],['workers','Workers']].map(([value,label]) => (
                  <button key={value} type="button" onClick={() => setSearchType(value)} style={{ border: searchType === value ? "2px solid #365947" : "1px solid #d8e1dc", borderRadius: "999px", padding: "8px 13px", background: searchType === value ? "#edf6ef" : "#fff", color: "#172033", fontWeight: 800, cursor: "pointer" }}>{label}</button>
                ))}
              </div>

              <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap", marginTop: "12px" }}>
                <span style={{ fontSize: "12px", fontWeight: 900, color: "#64748b" }}>CATEGORY</span>
                {discoveryCategories.map((category) => (
                  <button key={category} type="button" onClick={() => setSearchCategory(category)} style={{ border: searchCategory === category ? "1px solid #365947" : "1px solid #e2e8f0", borderRadius: "9px", padding: "7px 10px", background: searchCategory === category ? "#f0f7f2" : "#fff", color: searchCategory === category ? "#365947" : "#475569", fontSize: "12px", fontWeight: 800, cursor: "pointer" }}>{category}</button>
                ))}
                <select value={searchSort} onChange={(e) => setSearchSort(e.target.value)} style={{ marginLeft: "auto", border: "1px solid #cbd5e1", borderRadius: "9px", padding: "8px 10px", background: "#fff", color: "#172033", fontWeight: 700 }}>
                  <option value="relevance">Sort: Relevance</option>
                  <option value="rating">Sort: Rating</option>
                  <option value="price-low">Sort: Price low</option>
                </select>
              </div>

              <div style={{ marginTop: "18px", display: "flex", justifyContent: "space-between", gap: "10px", alignItems: "center" }}>
                <strong style={{ color: "#172033" }}>{discoveryResults.length} result{discoveryResults.length === 1 ? "" : "s"}</strong>
                {searchQuery && <span style={{ fontSize: "12px", color: "#64748b" }}>for “{searchQuery}”</span>}
              </div>

              {discoveryResults.length ? (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(245px,1fr))", gap: "12px", marginTop: "12px" }}>
                  {discoveryResults.map((result, index) => (
                    <article key={`${result.type}-${result.title}-${index}`} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "15px", padding: "15px", boxShadow: "0 5px 16px rgba(23,32,25,.05)" }}>
                      <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                        <div style={{ width: 48, height: 48, borderRadius: 13, background: "#f4f7f5", display: "grid", placeItems: "center", fontSize: 25 }}>{result.icon}</div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontSize: "11px", fontWeight: 900, color: "#9a5b1f", textTransform: "uppercase" }}>{result.type}</div>
                          <strong style={{ display: "block", marginTop: 2, color: "#172033" }}>{result.title}</strong>
                          <div style={{ marginTop: 3, fontSize: "12px", color: "#64748b" }}>{result.subtitle}</div>
                        </div>
                      </div>
                      <div style={{ marginTop: 12, fontSize: "12px", color: "#475569", fontWeight: 800 }}>{result.meta}</div>
                      {result.type === "product" && <button type="button" onClick={() => openProductDetails(result.item)} style={{ width: "100%", marginTop: 12, border: 0, borderRadius: 10, padding: "10px", background: "#365947", color: "#fff", fontWeight: 900, cursor: "pointer" }}>View product</button>}
                      {result.type === "shop" && <button type="button" onClick={() => { setShopSearch(result.title); navigate("shop"); }} style={{ width: "100%", marginTop: 12, border: "1px solid #365947", borderRadius: 10, padding: "10px", background: "#f7faf8", color: "#365947", fontWeight: 900, cursor: "pointer" }}>View shop products</button>}
                      {result.type === "worker" && <button type="button" onClick={() => navigate("work")} style={{ width: "100%", marginTop: 12, border: "1px solid #365947", borderRadius: 10, padding: "10px", background: "#f7faf8", color: "#365947", fontWeight: 900, cursor: "pointer" }}>View workers</button>}
                    </article>
                  ))}
                </div>
              ) : (
                <div style={{ marginTop: "14px", padding: "30px 18px", textAlign: "center", background: "#fff", border: "1px dashed #cbd5e1", borderRadius: "15px", color: "#64748b" }}>
                  <div style={{ fontSize: 30 }}>🔎</div>
                  <strong style={{ display: "block", marginTop: 8, color: "#172033" }}>No matching results yet</strong>
                  <span style={{ display: "block", marginTop: 4, fontSize: "13px" }}>Try another keyword, category or result type.</span>
                </div>
              )}
            </div>
          </section>
        )}

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


          {shopSearch && (
            <div style={{ margin: "0 0 14px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", flexWrap: "wrap", padding: "11px 13px", borderRadius: "12px", background: "#f7faf8", border: "1px solid #dce8df" }}>
              <span style={{ fontSize: "13px", color: "#475569" }}>🔎 Showing products matching <strong style={{ color: "#172033" }}>{shopSearch}</strong></span>
              <button type="button" onClick={clearShopSearch} style={{ border: 0, background: "transparent", color: "#365947", fontWeight: 900, cursor: "pointer" }}>Clear search</button>
            </div>
          )}

          <div className="product-grid">

            {products.filter((product) => {
              const query = shopSearch.trim().toLowerCase();
              if (!query) return true;
              return `${product.name} ${product.shop} ${product.category} ${product.artisan || ""}`.toLowerCase().includes(query);
            }).map(
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
                      onClick={(event) => { event.stopPropagation(); toggleWishlist(product); }}
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
                      <button type="button" onClick={(event) => { event.stopPropagation(); buyNow(product, selectedQuantities[product.name] || 1); }} style={{ width: "100%", minHeight: "48px", border: 0, borderRadius: "12px", background: "#0f172a", color: "#fff", fontWeight: 900, fontSize: "15px", cursor: "pointer" }}>Buy Now</button>
                      <button type="button" onClick={(event) => { event.stopPropagation(); addToCart(product, selectedQuantities[product.name] || 1); }} style={{ width: "100%", minHeight: "48px", border: 0, borderRadius: "12px", background: "#365947", color: "#fff", fontWeight: 900, fontSize: "15px", cursor: "pointer" }}>Add to Cart</button>
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
            style={{ position: "fixed", inset: 0, zIndex: 2147482000, background: "rgba(15,23,42,.62)", display: "flex", alignItems: "center", justifyContent: "center", padding: "18px", backdropFilter: "blur(4px)" }}
          >
            <div
              onClick={(event) => event.stopPropagation()}
              style={{ width: "min(1080px, 100%)", maxHeight: "92vh", overflowY: "auto", background: "#fff", color: "#172033", borderRadius: "24px", boxShadow: "0 30px 80px rgba(0,0,0,.28)", padding: "22px", position: "relative", zIndex: 1, opacity: 1, visibility: "visible" }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", marginBottom: "14px" }}>
                <div>
                  <div style={{ fontSize: "11px", fontWeight: 900, letterSpacing: ".12em", color: "#6b806f" }}>HOWDI • HANDMADE MARKETPLACE</div>
                  <div style={{ fontSize: "13px", color: "#64748b", marginTop: "4px" }}>Every handmade piece carries the hands and story behind it. ❤️</div>
                </div>
                <button type="button" onClick={() => setProductDetailOpen(false)} style={{ width: "42px", height: "42px", borderRadius: "50%", border: "1px solid #cbd5e1", background: "#f8fafc", color: "#172033", WebkitTextFillColor: "#172033", fontSize: "22px", lineHeight: 1, fontWeight: 900, cursor: "pointer", display: "grid", placeItems: "center" }}>×</button>
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
                      <button key={label} type="button" onClick={() => setSelectedProductImage(index)} style={{ minHeight: "72px", borderRadius: "14px", border: selectedProductImage === index ? "2px solid #365947" : "1px solid #d8e0da", background: index === 0 ? "#f8f5ed" : index === 1 ? "#eef6f0" : "#f6eff6", color: "#24362d", WebkitTextFillColor: "#24362d", cursor: "pointer" }}>
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
                      {selectedProduct.sizes?.map((size) => <button key={size} type="button" onClick={() => setSelectedProductSize(size)} style={{ padding: "10px 14px", borderRadius: "10px", border: selectedProductSize === size ? "2px solid #365947" : "1px solid #cfd8d1", background: selectedProductSize === size ? "#edf6ef" : "#fff", color: "#24362d", fontWeight: 800, cursor: "pointer", opacity: 1, visibility: "visible" }}>{size}</button>)}
                    </div>
                    {selectedProductSize === "Custom" && <textarea value={customMeasurements} onChange={(event) => setCustomMeasurements(event.target.value)} placeholder={"Example: bust 38, waist 32, hip 40, height 5'4\""} rows={3} style={{ width: "100%", boxSizing: "border-box", marginTop: "10px", padding: "11px", borderRadius: "12px", border: "1px solid #cfd8d1", resize: "vertical" }} />}
                    <button type="button" onClick={() => setSizeGuideOpen(true)} style={{ marginTop: "8px", border: 0, background: "transparent", color: "#365947", fontWeight: 900, cursor: "pointer", padding: 0 }}>📏 View size guide</button>
                    {selectedProduct.sizes?.includes("Custom") && (
                      <button type="button" onClick={openFitStudio} style={{ marginTop: "9px", width: "100%", padding: "11px 12px", borderRadius: "12px", border: "1px solid #d8e4dc", background: "linear-gradient(135deg,#f5faf6,#fffaf2)", color: "#244c38", fontWeight: 900, cursor: "pointer", textAlign: "left" }}>📸✨ Custom Fit Studio · camera + measurements + 3D preview</button>
                    )}
                  </div>

                  <div style={{ marginTop: "15px" }}>
                    <div style={{ fontWeight: 900, color: "#24362d", marginBottom: "8px" }}>Choose colour</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                      {selectedProduct.colors?.map((color) => <button key={color} type="button" onClick={() => setSelectedProductColor(color)} style={{ padding: "9px 12px", borderRadius: "999px", border: selectedProductColor === color ? "2px solid #365947" : "1px solid #cfd8d1", background: selectedProductColor === color ? "#edf6ef" : "#fff", color: "#24362d", fontWeight: 800, cursor: "pointer", opacity: 1, visibility: "visible" }}>{color}</button>)}
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


      {fitStudioOpen && selectedProduct && (
        <div role="dialog" aria-modal="true" style={{ position: "fixed", inset: 0, zIndex: 6000, background: "rgba(15,23,42,.62)", display: "flex", alignItems: "center", justifyContent: "center", padding: 18 }} onClick={closeFitStudio}>
          <div onClick={(event) => event.stopPropagation()} style={{ width: "min(980px,100%)", maxHeight: "92vh", overflowY: "auto", background: "#fff", borderRadius: 22, padding: 20, boxShadow: "0 28px 90px rgba(0,0,0,.28)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: ".08em", color: "#a36a2a" }}>HOWDI FIT STUDIO</div>
                <h2 style={{ margin: "5px 0" }}>Custom fit for {selectedProduct.name}</h2>
                <p style={{ margin: 0, color: "#64748b", fontSize: 13 }}>Capture a fitting reference, enter measurements and get a suggested size. 📏</p>
              </div>
              <button type="button" onClick={closeFitStudio} style={{ width: 38, height: 38, border: 0, borderRadius: 11, background: "#f1f5f9", cursor: "pointer", fontSize: 18 }}>×</button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 16, marginTop: 18 }}>
              <div>
                <div style={{ borderRadius: 18, background: "#eef5ef", border: "1px solid #d9e6dc", padding: 12 }}>
                  <video ref={fitVideoRef} autoPlay playsInline muted style={{ width: "100%", aspectRatio: "4/3", objectFit: "cover", borderRadius: 14, background: "#dfe9e1", display: fitPhoto ? "none" : "block" }} />
                  {fitPhoto ? <img src={fitPhoto} alt="Captured fitting reference" style={{ width: "100%", aspectRatio: "4/3", objectFit: "cover", borderRadius: 14 }} /> : <div style={{ marginTop: 8, fontSize: 11, color: "#64748b" }}>Stand in good light and keep the full body visible if you use the camera.</div>}
                  <canvas ref={fitCanvasRef} style={{ display: "none" }} />
                  <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                    <button type="button" onClick={startFitCamera} style={{ flex: 1, minHeight: 42, border: "1px solid #365947", borderRadius: 11, background: "#fff", color: "#365947", fontWeight: 900, cursor: "pointer" }}>📷 Start camera</button>
                    <button type="button" onClick={captureFitPhoto} style={{ flex: 1, minHeight: 42, border: 0, borderRadius: 11, background: "#365947", color: "#fff", fontWeight: 900, cursor: "pointer" }}>Capture photo</button>
                  </div>
                  {fitCameraMessage && <div style={{ marginTop: 8, fontSize: 11, color: "#475569", lineHeight: 1.45 }}>{fitCameraMessage}</div>}
                </div>

                <div style={{ marginTop: 12, padding: 14, borderRadius: 16, background: "#f0f7f2", border: "1px solid #cfe2d3", fontSize: 12, color: "#24583b", lineHeight: 1.5 }}>
                  🔐 <strong>Privacy promise:</strong> photo capture is optional and requires your separate permission after you click “Capture photo”. This demo does not upload, sell, or share the captured image, and it is not saved to localStorage. The camera is stopped after capture.
                  <div style={{ marginTop: 7 }}>👤 <strong>Face privacy:</strong> the intended production flow converts the approved image into measurements/anonymous 3D fit data and does not use facial recognition.</div>
                  <div style={{ marginTop: 7 }}>🛡️ <strong>Safety:</strong> nudity, intimate imagery, or sexual content is strictly prohibited. A validated on-device nudity/modesty classifier must be integrated before HOWDI claims automatic detection or blocking.</div>
                </div>
              </div>

              <div>
                <div style={{ padding: 14, borderRadius: 18, background: "#f8faf9", border: "1px solid #e1e9e4" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><strong>📏 Your measurements</strong><span style={{ fontSize: 11, color: "#64748b" }}>inches</span></div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9, marginTop: 10 }}>
                    {[
                      ["height", "Height"], ["bust", "Bust"], ["waist", "Waist"], ["hip", "Hip"],
                    ].map(([key, label]) => (
                      <label key={key} style={{ fontSize: 11, color: "#64748b", fontWeight: 800 }}>
                        {label}
                        <input value={fitMeasurements[key]} onChange={(event) => setFitMeasurements((current) => ({ ...current, [key]: event.target.value.replace(/[^0-9.]/g, "") }))} inputMode="decimal" placeholder={key === "height" ? "e.g. 64" : "e.g. 38"} style={{ width: "100%", boxSizing: "border-box", marginTop: 5, padding: "10px 11px", borderRadius: 10, border: "1px solid #cfd8d1", background: "#fff" }} />
                      </label>
                    ))}
                  </div>
                  <button type="button" onClick={calculateFitSize} style={{ width: "100%", marginTop: 11, minHeight: 44, border: 0, borderRadius: 11, background: "#24362d", color: "#fff", fontWeight: 900, cursor: "pointer" }}>✨ Calculate my size</button>
                  {fitSizeResult && <div style={{ marginTop: 10, padding: 11, borderRadius: 11, background: "#edf6ef", color: "#24583b", fontSize: 12, fontWeight: 800, lineHeight: 1.45 }}>{fitSizeResult}</div>}
                </div>

                <div style={{ marginTop: 12, padding: 14, borderRadius: 18, background: "linear-gradient(135deg,#f8f5ed,#f0f7f2)", border: "1px solid #e0e6df", overflow: "hidden" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><strong>🧍 Live 3D fit preview</strong><span style={{ fontSize: 11, color: "#64748b" }}>{selectedProductColor || "Choose a colour"}</span></div>
                  <div style={{ height: 235, display: "flex", alignItems: "center", justifyContent: "center", perspective: 700 }}>
                    <div style={{ position: "relative", width: 130, height: 190, transformStyle: "preserve-3d", transform: `rotateY(${fitPreviewRotation}deg)`, transition: "transform .08s linear" }}>
                      <div style={{ position: "absolute", left: 48, top: 4, width: 34, height: 34, borderRadius: "50%", background: "#d9a889", boxShadow: "0 4px 8px rgba(0,0,0,.12)" }} />
                      <div style={{ position: "absolute", left: 28, top: 38, width: 74, height: 88, borderRadius: "28px 28px 18px 18px", background: selectedProductColor === "Rose Pink" ? "#d889a4" : selectedProductColor === "Mint" ? "#9bcbb5" : selectedProductColor === "Sky Blue" ? "#86c9df" : selectedProductColor === "Maroon" ? "#7d3e52" : "#e8dfd0", transform: "translateZ(10px)", boxShadow: "0 14px 24px rgba(35,54,45,.16)" }} />
                      <div style={{ position: "absolute", left: 35, top: 122, width: 24, height: 62, borderRadius: 12, background: "#334155" }} />
                      <div style={{ position: "absolute", left: 71, top: 122, width: 24, height: 62, borderRadius: 12, background: "#334155" }} />
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: "#64748b", lineHeight: 1.45 }}>This visual is a preview aid, not a precise body scan. The size recommendation uses the measurements you enter.</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {fitCaptureConsentOpen && fitStudioOpen && selectedProduct && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="howdi-fit-capture-consent-title"
          onClick={() => setFitCaptureConsentOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 7000,
            background: "rgba(15,23,42,.72)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 18
          }}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            style={{
              width: "min(560px,100%)",
              background: "#fff",
              borderRadius: 20,
              padding: 22,
              boxShadow: "0 30px 100px rgba(0,0,0,.35)"
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: ".08em", color: "#a36a2a" }}>
              HOWDI • PRIVACY & PHOTO PERMISSION
            </div>

            <h3 id="howdi-fit-capture-consent-title" style={{ margin: "7px 0 8px", color: "#183326" }}>
              Allow photo capture? 🔒
            </h3>

            <p style={{ margin: 0, color: "#475569", fontSize: 13, lineHeight: 1.55 }}>
              You clicked <strong>Capture photo</strong>. Before HOWDI captures anything, you must give separate permission.
            </p>

            <div style={{ marginTop: 14, padding: 13, borderRadius: 14, background: "#edf7ef", border: "1px solid #cfe2d3", color: "#24583b", fontSize: 12, lineHeight: 1.55 }}>
              <strong>🔐 What “Allow” means</strong>
              <ul style={{ margin: "7px 0 0 18px", padding: 0 }}>
                <li>The image is used only for fitting assistance in this demo.</li>
                <li>This demo does not upload or share it with sellers or third parties.</li>
                <li>It is not stored in localStorage.</li>
                <li>The camera is stopped after capture.</li>
                <li>Production should retain only the minimum derived fit data and provide deletion controls.</li>
              </ul>
            </div>

            <div style={{ marginTop: 10, padding: 13, borderRadius: 14, background: "#fff7ed", border: "1px solid #fed7aa", color: "#7c4a13", fontSize: 12, lineHeight: 1.55 }}>
              <strong>🛡️ Strict clothing-safety rule</strong>
              <div style={{ marginTop: 5 }}>
                Please remain fully clothed. Nudity, intimate imagery, and sexual content are strictly prohibited. This demo does <strong>not</strong> claim automated nudity detection; a validated safety classifier must be added before production.
              </div>
            </div>

            <label style={{ display: "flex", gap: 9, alignItems: "flex-start", marginTop: 14, fontSize: 12, lineHeight: 1.5, color: "#334155", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={fitCaptureAllowed}
                onChange={(event) => setFitCaptureAllowed(event.target.checked)}
                style={{ marginTop: 2 }}
              />
              <span>
                <strong>I Allow Photo Capture.</strong> I understand the privacy notice and confirm that I am fully clothed and am voluntarily allowing this fitting photo to be captured.
              </span>
            </label>

            <div style={{ display: "flex", gap: 9, marginTop: 17 }}>
              <button
                type="button"
                onClick={() => {
                  setFitCaptureConsentOpen(false);
                  setFitCaptureAllowed(false);
                }}
                style={{
                  flex: 1,
                  minHeight: 44,
                  border: "1px solid #cbd5e1",
                  borderRadius: 11,
                  background: "#fff",
                  color: "#334155",
                  fontWeight: 900,
                  cursor: "pointer"
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={!fitCaptureAllowed}
                onClick={confirmFitPhotoCapture}
                style={{
                  flex: 1,
                  minHeight: 44,
                  border: 0,
                  borderRadius: 11,
                  background: fitCaptureAllowed ? "#365947" : "#cbd5e1",
                  color: "#fff",
                  fontWeight: 900,
                  cursor: fitCaptureAllowed ? "pointer" : "not-allowed"
                }}
              >
                🔒 Allow & Capture
              </button>
            </div>

            <div style={{ marginTop: 11, textAlign: "center", fontSize: 10.5, color: "#64748b" }}>
              You can cancel and use manual measurements instead.
            </div>
          </div>
        </div>
      )}

{showCancellationModal && selectedCancellationOrder && (
  <div
    role="dialog"
    aria-modal="true"
    style={{
      position:"fixed",inset:0,zIndex:2147483000,
      background:"rgba(15,23,42,.62)",
      display:"flex",alignItems:"center",justifyContent:"center",
      padding:18,isolation:"isolate",pointerEvents:"auto"
    }}
    onClick={(e) => { if (e.target === e.currentTarget) setShowCancellationModal(false); }}
  >
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        width:"min(560px,100%)",maxHeight:"90vh",overflowY:"auto",
        background:"#fff",color:"#172033",borderRadius:20,padding:22,
        boxShadow:"0 24px 80px rgba(0,0,0,.35)",position:"relative",zIndex:1,opacity:1,visibility:"visible"
      }}
    >
      <div style={{display:"flex",justifyContent:"space-between",gap:12}}>
        <div>
          <div style={{fontSize:11,fontWeight:900,color:"#9a5b1f",letterSpacing:".08em"}}>CANCEL ORDER</div>
          <h2 style={{margin:"5px 0",color:"#172033",fontSize:24,lineHeight:1.2}}>Why are you cancelling?</h2>
          <p style={{margin:0,color:"#64748b",fontSize:13}}>Order #{selectedCancellationOrder.id}</p>
        </div>
        <button type="button" onClick={() => setShowCancellationModal(false)} style={{
          width:36,height:36,border:"1px solid #e2e8f0",borderRadius:10,background:"#f1f5f9",color:"#475569",cursor:"pointer",fontSize:18
        }}>×</button>
      </div>

      <div style={{marginTop:18,padding:12,borderRadius:12,background:"#f0f8f3",border:"1px solid #d5e8db"}}>
        <div style={{fontSize:12,fontWeight:900,color:"#365947"}}>👤 Cancellation requested by: Customer</div>
        <div style={{marginTop:4,fontSize:11.5,color:"#64748b",lineHeight:1.45}}>This customer-facing cancellation form records the person requesting cancellation. HOWDI/seller cancellations should be recorded separately by the authorised order team.</div>
      </div>

      <div style={{marginTop:16}}>
        <label style={{display:"block",fontSize:12,fontWeight:900,color:"#475569",marginBottom:7}}>Cancellation reason *</label>
        <select value={cancellationReason} onChange={(e) => setCancellationReason(e.target.value)} style={{
          width:"100%",padding:"12px",borderRadius:11,border:"1px solid #94a3b8",background:"#fff",color:"#172033",fontSize:14,fontWeight:600,opacity:1,visibility:"visible"
        }}>
          <option value="">Select a reason</option>
          {(cancellationReasons[cancellationActor] || []).map((reason) => (
            <option key={reason} value={reason}>{reason}</option>
          ))}
        </select>
      </div>

      <div style={{marginTop:16}}>
        <label style={{display:"block",fontSize:12,fontWeight:900,color:"#475569",marginBottom:7}}>What happened? (optional)</label>
        <textarea value={cancellationDetails} onChange={(e) => setCancellationDetails(e.target.value)}
          rows={4}
          placeholder="Add any useful details about the cancellation..."
          style={{width:"100%",boxSizing:"border-box",padding:"12px",borderRadius:11,border:"1px solid #cbd5e1",resize:"vertical",color:"#172033",fontSize:14,background:"#fff"}}
        />
      </div>

      <div style={{marginTop:16,padding:12,borderRadius:12,background:"#fff7ed",fontSize:12,color:"#7c2d12",lineHeight:1.5}}>
        HOWDI will keep the cancellation reason and order journey with this order so the customer can understand what happened later.
      </div>

      <div style={{display:"flex",gap:10,marginTop:18}}>
        <button type="button" onClick={() => setShowCancellationModal(false)} style={{
          flex:1,minHeight:46,border:"1px solid #cbd5e1",borderRadius:11,background:"#fff",color:"#172033",fontWeight:900,cursor:"pointer"
        }}>Keep Order</button>
        <button type="button" disabled={!cancellationReason} onClick={confirmCancellation} style={{
          flex:1,minHeight:46,border:0,borderRadius:11,
          background:cancellationReason ? "#be123c" : "#cbd5e1",
          color:"#fff",fontWeight:900,cursor:cancellationReason ? "pointer" : "not-allowed"
        }}>Confirm Cancellation</button>
      </div>
    </div>
  </div>
)}

    </div>


  );
}

export default App;
