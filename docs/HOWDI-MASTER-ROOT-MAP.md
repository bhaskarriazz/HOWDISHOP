# HOWDI — Master Root Map (Development Constitution)

This is the frozen architecture we code against. Every feature fits into this tree instead of adding random screens. We never rebuild a working branch just because another branch needs fixing.

## 1. HOWDI — master navigation

```text
HOWDI
│
├── CONNECT      ← DEFAULT HOME / DAILY ENGAGEMENT
├── SHOP
├── WORKS
├── LEARN & EARN
│
├── Global Search / Ask HOWDI
├── Location
├── Notifications
├── HPay
└── My HOWDI / Profile

```

**Locked rule:** Works remains its own pillar. Worker functionality must NOT be moved inside Connect.

Vendor functionality also remains, but is primarily a **business/storefront role connected to Shop**, not another competing main navigation tab.

---

## 2. HOWDI logo / Home behavior 🏠

### Website

The **HOWDI logo must always stay at the top-left**, on every screen (Shop, Product page, Works, Worker profile, Learn & Earn, Course, Connect, Messages, Profile, HPay, Settings).

Clicking the **HOWDI Logo → returns to HOWDI Connect Home** (`/` or `/connect`). This becomes the universal Home.

### Mobile

Bottom navigation:

```text
Home    Vibe    +    Messages    My HOWDI

```

Tapping **Home → Connect Home**. We do NOT create multiple confusing "Home" pages.

---

## 3. WEBSITE — GLOBAL HEADER

```text
HOWDI SPECIAL / Announcement Bar

HOWDI Logo

CONNECT
SHOP
WORKS
LEARN & EARN

Search / Ask HOWDI
AI Voice
Location
Notifications
HPay
My HOWDI

```

### Cart rule

Cart should **not clutter every HOWDI page**. It appears when the user enters SHOP, which can then show: Search, Wishlist, Cart, Orders.

---

## 4. CONNECT — default HOWDI Home 🌎

```text
CONNECT
├── Home
├── Vibe
├── Explore
├── Stories
├── Messages
└── Communities

```

Articles, creators, following, calls, groups and channels live inside this ecosystem.

---

## 5. CONNECT HOME

```text
HOWDI Special / Daily announcement
Stories
Personalised Vibe / community feed
Handpicked for You
People / Creators to Follow
Trending Communities
Articles
Products you may like
Workers / Services near you
Courses / Learn & Earn suggestions
Recent activity
Orders / bookings / learning continuation
Daily admin-managed content

```

One ecosystem, not a menu page. Example loop: User watches a crochet Vibe → sees the creator → opens creator profile → sees creator products → enters Shop → purchases → HPay → follows creator → returns to Connect.

---

## 6. VIBE 🎬

```text
Connect → Vibe → Vertical swipe → Video / Photo
→ Like / Comment / Follow / Save / Share / Remix

```

Content categories: Entertainment, Education, Travel, Comedy, Dance, Music, Lifestyle, Community, Products, Services, Courses.

Bridges: Vibe → Product, Vibe → Worker/Service, Vibe → Course, Vibe → Creator Profile, Vibe → Community.

A product-linked Vibe opens its real Shop product. A learning Vibe opens the real Learn & Earn course.

---

## 7. CONNECT — PUBLIC PROFILE 👤

```text
@username, Profile photo, Display name, Bio
Followers, Following, Follow Back
Likes, Vibes, Articles, Communities, Creator links

```

Bridges: Shop, Courses, Works/service profile, Creator content.

**Critical identity rule:** Never display internal HOWDI ID / database user ID / numeric user ID. Customers interact using `@public_username` only.

---

## 8. FOLLOW SYSTEM

```text
Discover Person → Open Profile → Follow → Following

```

If mutual: **Follow Back**. Screens: Followers, Following, Mutuals, Suggestions, Requests where applicable.

---

## 9. STORIES

User: View, Next, Previous, React, Reply, Share, Open creator profile. Creator: Create Story, Photo/Video, Publish, View reactions.

---

## 10. CONNECT MESSAGES 💬

```text
Messages
├── Personal Chat
├── Group Chat
├── Channel Chat
├── Media
├── Files
├── Links
└── Calls

```

Voice/Video/Group calls initiated by `@username`, never internal IDs.

---

## 11. GROUPS + CHANNELS

```text
Communities
├── Groups
└── Channels

```

**Group:** Create, Invite users, Invite link, Members, Admins, Messages, Media, Voice/video, Leave/report. **Channel:** Create, Follow/join, Posts, Announcements, Invite link, Members/subscribers, Admin controls.

Invitation flow: Generate link → Copy link → Share externally → User opens link → HOWDI opens → Join/Follow.

---

## 12. ARTICLES 📰

```text
Discover article → Read → Author profile → Like/Save/Share/Comment

```

Creator flow: `+` → Write Article → Title/Cover/Body/Tags → Draft → Preview → Publish → Published/Edit/Analytics/Report handling/History.

---

## 13. GLOBAL CREATE BUTTON +

```text
+
├── Vibe
├── Story
├── Post
├── Article
└── Community content

```

Available choices can change based on user role.

---

## 14. HOWDI SHOP 🛍️

```text
SHOP
├── Shop Home
├── Categories
│   └── Sub-Categories   ← see Section 54
├── Product Discovery
├── Search / Filters
├── Product
├── Wishlist
├── Cart
└── Vendor / Creator Storefront

```

---

## 15. SHOP HOME

```text
Shop search, Categories, Featured handmade products, New arrivals,
Handpicked products, Popular creators, Recommended for you,
Custom / Made for Me, Recently viewed, Deals / rewards

```

Handmade/crochet products remain a major category for the current HOWDI focus.

---

## 16. COMPLETE SHOP PURCHASE FLOW

```text
Discover → Category → Sub-Category → Product listing → Product details
→ Choose colour/size/variation → Add to Cart / Buy Now / Made for Me
→ Address → Order summary → HPay / Payment → Order confirmed
→ My Orders → Tracking → Delivery → Review → Follow creator/vendor
→ Related products/content

```

This is the exact loop to test end-to-end.

---

## 17. PRODUCT PAGE

Images/multiple views, video where available, title, price, discount, creator/vendor, rating, description, materials, colour, size, stock, delivery, customisation, Made for Me, Wishlist, Add to Cart, Buy Now, Reviews, Related products.

---

## 18. VENDOR / CREATOR STOREFRONT

```text
Product → Vendor/Creator → Storefront

```

Storefront: Public @username/business identity, Brand, Products, Ratings, Followers, About, Policies, Vibes, Articles/content, Follow, Message.

Vendor management lives in the vendor/business side, not mixed into ordinary customer navigation.

---

## 19. WORKS 🔧

```text
WORKS
├── Works Home
├── Find Worker
│   └── Service Categories → Sub-Services   ← see Section 54
├── My Bookings
├── Saved Workers
├── Safety
└── Become a Worker

```

---

## 20. WORKS HOME

"What service do you need?", Location, Service categories, Trusted workers nearby, Top rated, Available now, Recommended workers, Recent services, Saved workers, My bookings.

---

## 21. FULL WORKS CUSTOMER FLOW

```text
Select Service → Location → Describe problem → Photo/video if needed
→ Need Now / Schedule / Request Quotes → Available verified workers
→ Worker profile → Compare/Select → Send request → Worker accepts
→ Booking confirmed → Chat/Call → Live booking status → Work completed
→ HPay → Receipt → Rating/Review → Rebook

```

Safety/report must remain accessible throughout.

---

## 22. WORKER PROFILE

Photo, @public\_username/business identity, Verified status, Skills, Services, Experience, Rating, Reviews, Availability, Service area, Pricing, Completed jobs, Portfolio, Save worker, Message, Book.

Internal HOWDI ID must not appear.

---

## 23. BECOME A WORKER

Only inside Works, not Connect.

```text
Works → Become a Worker → Worker onboarding → Profile → Services/Skills
→ Verification → Availability → Service area → Ready for bookings

```

Worker dashboard handles: Requests, Accept/reject, Schedule, Jobs, Communication, Completion, Earnings, HPay, Ratings.

---

## 24. LEARN & EARN 🎓

```text
LEARN & EARN
├── Discover
│   └── Skill Categories → Sub-Skills   ← see Section 54
├── My Learning
├── Live Classes
├── Skill Journey
├── Skill Passport
└── Opportunities

```

---

## 25. LEARN & EARN HOME

Continue Learning, Recommended courses, Categories, Popular courses, Free learning, Live classes, Skill progress, Skill Passport, Opportunities, Creator/teacher content.

---

## 26. COURSE JOURNEY

```text
Discover → Course → Course Detail → Curriculum → Instructor → Preview
→ Buy/Subscribe/Enrol → HPay → My Learning → Lessons → Practice
→ Assignments/Projects → Teacher review → Assessment → Completion
→ Skill Passport / Certificate

```

---

## 27. MY LEARNING

```text
My Learning
├── Continue Learning
├── Purchased courses
├── Active courses
├── Completed
├── Progress
├── Assignments
├── Projects
├── Assessments
└── Certificates

```

---

## 28. LIVE CLASSES

Upcoming, Live, Completed.

```text
Course → Live Class → Reminder → Join → Attendance → Class completion
→ Recording/material where available

```

The video provider is an infrastructure integration — not marked complete until one is connected.

---

## 29. SKILL JOURNEY

```text
Learn → Practice → Submit Proof → Teacher Review → Assessment
→ Skill Verified → Skill Passport

```

---

## 30. SKILL PASSPORT

Publicly shareable: @username, Skills, Verified skills, Learning achievements, Certificates, Projects, Experience/proof. Never HOWDI internal ID.

---

## 31. OPPORTUNITIES / EARN

```text
Skill Passport → Opportunity → Apply → Selection → Assignment/Work
→ Submit → Review → Approved → Earning → HPay

```

**Learn → Skill → Opportunity → Earn.**

---

## 32. HPAY 💳

HPay is global infrastructure, not a disconnected website.

Customer:

```text
HPay
├── Wallet
├── Add Money
├── Payments
├── Transactions
├── Refunds
├── Rewards
└── Subscriptions

```

Business/worker/creator roles additionally have: Earnings, Settlements, Escrow, Payouts, Disputes.

HPay connects: Shop purchases, Works bookings, Courses, Creator subscriptions, Refunds, Rewards, Worker earnings, Creator earnings, Vendor settlements.

---

## 33. NOTIFICATIONS 🔔

One unified centre. Filters: All, Connect, Shop, Works, Learn & Earn, HPay, System.

Every notification must deep-link to the real destination (e.g. "Your worker accepted the booking" → tap → Works → Booking, not Notifications again).

---

## 34. GLOBAL SEARCH / ASK HOWDI 🔎

Search spans: Products, Creators, People, Workers, Services, Vendors, Communities, Courses, Videos/Vibes, Articles.

Examples:

- "crochet handbag under ₹800" → Shop results
- "plumber near me" → Works
- "Excel beginner course" → Learn & Earn
- "crochet creators" → Connect creators

Search results should always lead to real HOWDI actions, resolving into the Category/Sub-Category taxonomy in Section 54.

---

## 35. LOCATION 📍

Search location, Use Current Location, Recent locations, Cities.

Influences: Works workers, Shop delivery, Local communities, Nearby vendors, Local content.

Internally stores latitude/longitude/accuracy/source — not surfaced in customer UI.

---

## 36. MY HOWDI 👤

Account control centre:

```text
MY HOWDI
├── Profile
├── Address Book
├── My Orders
├── Wishlist
├── Works Bookings
├── Payments
├── HOWDI Wallet
├── Notifications
├── Messages
├── My Learning
├── Subscription
├── Settings & Security
├── Help & Support
└── Logout

```

Can additionally expose: Returns, Refunds, Reorder, Saved Workers, Certificates, Activity, Quick Actions — without changing primary structure.

---

## 37. PROFILE

Profile photo, Full Name, @public\_username, Bio/status, Email, Phone, Profile completion.

One identity across Connect, Shop, Works, Learn & Earn, HPay. Changing username in My HOWDI means Connect sees the same username — no duplicate identity system.

---

## 38. SUBSCRIPTION

Current Plan, Benefits, Billing, Renewal, Upgrade, Cancel, Resume, Payment history.

Manages: HOWDI Premium, Creator memberships, Learning subscription, other future entitlements — one account area for billing.

---

## 39. SETTINGS & SECURITY 🔐

Account, Privacy, Security, Password, Sessions, Notification preferences, Blocked users, Content controls, Language, Location preferences, Delete/deactivate account.

Privacy settings must be shared correctly with Connect instead of resetting when Profile is edited.

---

## 40. HELP & SUPPORT

Context-aware: Order issue, Payment issue, Works booking issue, Course issue, Account issue, Report user/content, Safety issue, Refund, General support. Entering from an order should carry that order's context already.

---

## 41. LOGIN / ACCOUNT RULE

Visitors browse freely (Connect, Shop, Works, courses). Login required for: Follow, Message, Add Wishlist, Buy, Book Worker, Enroll, Save progress, Post content, Pay.

After login: one session works everywhere.

---

## 42. FIRST-TIME USER FLOW

```text
Open HOWDI → Language → Location → Interests → Connect Home
→ Explore freely → Meaningful action → Login/Register
→ Choose @username → Continue original action

```

Don't force registration before the customer understands HOWDI.

---

## 43. WEBSITE CROSS-MODULE FLOW

**Discover → Connect → Shop → Book → Learn → Pay → Earn → Return.**

```text
DISCOVER → CONNECT → SHOP/BOOK/LEARN → PAY → EARN/REWARD
→ SHARE/REVIEW/FOLLOW → RETURN TO CONNECT

```

---

## 44. MOBILE APP ARCHITECTURE 📱

Mobile should not simply shrink the desktop header.

```text
┌──────────────────────────────────┐
│ Home │ Vibe │ + │ Messages │ Me │
└──────────────────────────────────┘

```

- Home → Connect Home
- Vibe → vertical Vibe feed
-

* → Create Center

1. Messages → conversations/calls
2. My HOWDI → account/profile

---

## 45. MOBILE TOP BAR

```text
HOWDI
Search / Ask AI
Location
Notifications
HPay

```

Some can be icon-based depending on screen width.

---

## 46. MOBILE ECOSYSTEM SWITCHER

See Section 55 for the finalised icon-row design. From Home, the customer needs simple access to Connect, Shop, Works, Learn & Earn without permanent bottom-nav positions — kept as a switcher, not bottom-nav tabs, to keep mobile navigation clean.

---

## 47. MOBILE SHOP

```text
Shop Header
Search
Categories → Sub-Categories
Wishlist
Cart

```

Bottom navigation remains globally accessible. Product flow identical to web: Product → Cart → Address → Payment → Order.

---

## 48. MOBILE WORKS

```text
Works → Service Category → Sub-Service → Location → Worker → Request
→ Booking → Chat/call → Completion → HPay

```

Uses mobile cards/bottom sheets instead of desktop-heavy panels.

---

## 49. MOBILE LEARN & EARN

```text
Discover (Category → Sub-Category)
My Learning
Live
Skills
Passport
Opportunities

```

Continue Learning stays near the top for repeat learners.

---

## 50. MOBILE MY HOWDI

Bottom-right: **My HOWDI** → Profile, Orders, Bookings, Learning, Wallet, Subscriptions, Wishlist, Addresses, Notifications, Settings, Help, Logout. Same backend and identity as website.

---

## 51. ROLE ARCHITECTURE

One HOWDI account, multiple roles: Customer, Creator, Vendor, Worker, Learner, Teacher — not six disconnected accounts. Public identity stays `@username`; internal identity/roles/permissions stay invisible to the public.

---

## 52. ADMIN SIDE

Separate from customer navigation. Manages: Users, Creators, Vendors, Workers, Products, Orders, Bookings, Courses, Vibes, Stories, Articles, Communities, Payments, Refunds, Settlements, Reports, Moderation, Safety, Subscriptions, Daily quote, Homepage content, Hero/content media, Notifications, Support, Roles, Permissions, System configuration. Never part of the normal customer shell.

Category and sub-category management (Section 54) lives here too — categories are admin-managed data, not hardcoded per screen.

---

## 53. FINAL ROOT MAP

```text
HOWDI
│
├── CONNECT ★ DEFAULT HOME
│   ├── Home
│   ├── Vibe
│   ├── Explore
│   ├── Stories
│   ├── Messages
│   │   ├── Chat
│   │   ├── Voice
│   │   ├── Video
│   │   └── Group Calls
│   ├── Communities
│   │   ├── Groups
│   │   └── Channels
│   ├── Articles
│   └── Public Profiles / Social Graph
│
├── SHOP
│   ├── Home
│   ├── Categories
│   │   └── Sub-Categories
│   ├── Discovery
│   ├── Product
│   ├── Wishlist
│   ├── Cart
│   ├── Checkout
│   ├── Orders
│   └── Vendor / Creator Storefront
│
├── WORKS
│   ├── Home
│   ├── Find Worker
│   │   └── Service Categories → Sub-Services
│   ├── Worker Profile
│   ├── Request / Booking
│   ├── My Bookings
│   ├── Saved Workers
│   ├── Safety
│   └── Become a Worker
│
├── LEARN & EARN
│   ├── Discover
│   │   └── Skill Categories → Sub-Skills
│   ├── Course
│   ├── My Learning
│   ├── Live Classes
│   ├── Practice / Projects
│   ├── Skill Journey
│   ├── Skill Passport
│   └── Opportunities / Earnings
│
├── HPAY
│   ├── Wallet
│   ├── Pay
│   ├── Transactions
│   ├── Refunds
│   ├── Rewards
│   ├── Earnings
│   └── Subscriptions
│
├── NOTIFICATIONS
│
├── SEARCH / ASK HOWDI
│
├── LOCATION
│
├── MY HOWDI
│   ├── Profile
│   ├── Address Book
│   ├── Orders
│   ├── Wishlist
│   ├── Works Bookings
│   ├── My Learning
│   ├── Payments / Wallet
│   ├── Notifications
│   ├── Messages
│   ├── Subscription
│   ├── Settings & Security
│   ├── Help & Support
│   └── Logout
│
└── HOWDI FOR — (segment landing pages, not a nav tab)
    ├── Students
    ├── Institutes / Colleges
    └── Startups / Small Businesses

```

We shouldn't add a screen unless we know exactly where it belongs in this tree. We never rebuild a working branch just because another branch needs fixing.

---

## 54. CATEGORY / SUB-CATEGORY TAXONOMY

A cross-cutting taxonomy layer that lives inside Shop, Works, and Learn & Earn — admin-managed data (Section 52), not hardcoded per screen.

```text
SHOP — Categories
├── Crochet & Handloom
│   ├── Bags
│   ├── Blankets & Throws
│   ├── Accessories (scrunchies, coasters, keychains)
│   ├── Home décor
│   └── Baby/kids items
└── (future categories as verticals expand)

```

```text
WORKS — Service Categories
├── Home Services
│   ├── Electrician
│   ├── Plumber
│   ├── Mason
│   ├── Painter
│   └── AC/Appliance repair
├── Events
│   ├── Catering
│   ├── Tent/décor
│   └── Photography
├── Transport
│   └── Driver / logistics
└── Vendor & Rental
    ├── Materials
    └── Equipment rental

```

```text
LEARN & EARN — Skill Categories
├── Crochet
├── Embroidery
├── Tailoring
└── (future skill categories)

```

**Integration points:**

- Shop's "Categories" node (Section 14/16) → category page → sub-category chips/filters → listing grid
- Works' "Find Worker" (Section 19/21) → service category → sub-service → worker list
- Learn & Earn's "Discover" (Section 24/26) → skill category → sub-skill → course list
- Global Search (Section 34) resolves queries into this taxonomy (e.g. "electrician" → Works → Home Services → Electrician)
- Admin (Section 52) owns creation/editing of categories and sub-categories

---

## 55. MOBILE ECOSYSTEM ICON ROW

Bottom nav stays exactly as locked (Section 44: Home | Vibe | + | Messages | My HOWDI). This section fills the gap flagged in Section 46: a visible way to jump between the four ecosystems.

```text
[🏠 Connect] [🛍️ Shop] [🔧 Works] [🎓 Learn & Earn]

```

- Lives as a persistent icon row just below the mobile top bar, on Connect Home
- Not part of bottom nav — sits above the feed
- Tapping one temporarily switches the screen into that ecosystem (mobile equivalent of the web's CONNECT/SHOP/WORKS/LEARN & EARN top tabs)
- Bottom-nav **Home** always returns to Connect regardless of which ecosystem is currently active

---

## 56. "HOWDI FOR —" SEGMENT LANDING PAGES

Not a 5th main pillar — it would compete with the four locked pillars and fracture the nav. Instead, a segment landing page that routes existing capability toward a specific audience (same pattern as "for teams / for enterprise" pages).

```text
HOWDI FOR —
├── Students
│   ├── Part-time earning → routes into Works (verified gigs)
│   ├── Free skill courses → routes into Learn & Earn
│   └── Skill Passport → resume-ready proof of skills
│
├── Institutes / Colleges
│   ├── Bulk skill-training tie-ups → Learn & Earn (B2B enrollment)
│   ├── Campus events → Works (catering/tent/vendor booking)
│   └── Showcase student-made products → Shop (storefront)
│
└── Startups / Small Businesses
    ├── Vendor sourcing → Works vendor network
    ├── Sponsored/co-branded Learn & Earn courses
    └── Bulk material/equipment rental

```

**Placement:** a discoverable link — footer on web, a card inside Connect's "Explore," or a menu item near the main nav — not a top-level tab. Each "Howdi for X" page deep-links into Works/Shop/Learn & Earn with pre-filtered context, inheriting existing flows rather than duplicating them.

---

# LOCKED ADDENDUM — 2026-09-18

This addendum records the final architecture decisions agreed after review. Where an older sentence in the document conflicts with this addendum, this addendum wins.

## Connect Home preserved composition
Connect is the universal HOWDI Home. Preserve the original homepage content inside the Connect feed:
HOWDI Special → Hero / admin-managed daily media → Stories → personalised Vibe/community feed → Handpicked for You → Daily Quote ("A kinder brighter community with HOWDI") → creators/communities/articles → Shop recommendations → Works recommendations → Learn & Earn recommendations → recent/continuation activity.

## HOWDI Assistant — global locked feature
HOWDI Assistant sits at the global tier alongside Search, Notifications and HPay.
- Ask AI
- Discover
- Connect
Desktop: floating/middle-right assistant entry.
Mobile: accessible from the compact top experience / Ask AI.

## Shop Orders lifecycle
SHOP includes Checkout and Orders:
- Active
- Tracking
- Delivered
- Cancel
- Return
- Refund
- Reorder
Returns/refunds remain nested inside Orders/My Orders, not separate My HOWDI top-level menu items.

## Works boundary
WORKS remains a separate pillar. Connect may surface a worker/service card, but selecting it opens the real Works Worker Profile/booking flow.

## Teacher / Instructor Profile
Learn & Earn includes a public Teacher/Instructor Profile with courses, ratings, experience, Vibes/articles, Follow and Message. It is also a Connect ↔ Learn bridge.

## My HOWDI nesting
Primary menu remains compact. Returns/Refunds live in Orders; Certificates in My Learning; Saved Workers in Works Bookings; transaction history in Wallet/Payments.

## Identity field rule
PUBLIC:
- @public_username
- approved public display/profile information

PRIVATE / NEVER CUSTOMER-FACING:
- HOWDI internal ID
- database user ID
- UUID
- master ID
- raw numeric IDs

## Login continuation
After successful authentication, continue the exact action the visitor attempted rather than dumping the user on Home.

## Role Center / My Roles
My HOWDI includes My Roles. One login and one @username can activate multiple capabilities:
- CUSTOMER (permanent base)
- CREATOR
- VENDOR
- WORKER
- LEARNER
- TEACHER

Verified/onboarding roles must reflect their real underlying onboarding/approval state. Internal staff roles are never offered in My Roles.

## Storefront definition
Storefront is not a new top-level pillar or account type.
SHOP → Storefront → Creator Storefront / Vendor Storefront.
Creator and Vendor capabilities determine management features; customers browse/follow/message/purchase through the same Shop ecosystem.

## Mobile navigation
Permanent bottom navigation stays:
Home | Vibe | + | Messages | My HOWDI

The ecosystem switcher stays separate:
Connect | Shop | Works | Learn & Earn

Home always returns to Connect.
