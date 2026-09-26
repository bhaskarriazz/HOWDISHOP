# V8 Slice 1: foundation shell, Common Home and the one Shop

- **Branch:** `v8-foundation`, built on `b4b2b3e` (K5A Connect Home + K5B Part 1 + the rate-limit fix).
- **Scope:** customer frontend only. There are no backend, schema or API changes.
- **Not done:** not merged, pushed or deployed.

## V8 rows covered (HOWDI Master Tracker → V8 Visual Delivery / Flow Register)

| Row | Board | What is built |
|---|---|---|
| NAV-001 Desktop shell | 04 | A text-only left rail: Home · Connect · Shop · Works · Learn & Earn. Exactly one selected state. |
| NAV-002 Desktop header | 04 | The fixed order: Search · Ask HOWDI · Location … HPay · Notifications · Cart (in Shop only) · Profile / Sign in. |
| NAV-003 Mobile shell | 04 / 16 | One floating rounded bottom bar with the same five destinations. There is no second bar: the legacy `.howdi-mobile-nav` and Connect's `.hc2-mobile-nav` are not shown. |
| NAV-004 Mobile quick actions | 04 | Vibe, Create, Messages and My HOWDI appear as "Quick actions" in the profile hub. |
| NAV-006 Responsive | 30 | 1440 / 768 / 390 layouts. Body and input text is 16 px. |
| HOME-001 Common Home | 04 | The mixed Home. Guests see "Welcome to HOWDI"; signed-in members see "Welcome back, {first name}". It has six cards (Community, Crochet Shop, Find a Worker, Continue/Learn Crochet, Hype, Tips) and the community band. |
| HOME-002 Section states | 15 | Every card has loading skeletons and an empty state. When loading fails, the page shows one "Some of Home didn't load · Try again" banner, not an error per section. |
| SHP-001 One Shop | 16 | One canonical Shop. **Handmade Crochet is a collection chip** inside the catalogue, and the Shop opens on it. It has category chips, an inline search, Filters, an In-stock toggle, Sort, a product grid, the collection card and the cart summary. |
| SYS-001..003 | 15 | Loading, empty ("No results found" + Clear filters) and error/retry states on the V8 pages. |

## Home / Connect entry (V8 Gate)

- Guests land on Home.
- A signed-in session lands on Connect, unless the person chose Home.
- Home, Connect, Shop, Works and Learn & Earn are separate destinations. The K5A redirect of Home to Connect Home is removed.

## Retired (never mounted; source kept for reference behind `V8_RETIRED_LEGACY_HOME`)

- The legacy crochet landing (`section.hero#home`) and the handpicked, dashboard, legacy-search and quick-navigation blocks.
- The "Picked for you", most-purchased, recently-viewed, learn-teaser and offers blocks, the footer and the floating mascot.
- The legacy Shop Home (`.hs2-layout`) with its invented statistics.
- The "Shop Home" and "Handmade Crochet" sub-navigation entries, and the K5A `home ↔ crochet` redirects.
- The legacy announcement bar, header, master sidebar and mobile nav, which the V8 shell replaces.

## Data rules

- **Home data:** only the K5A public DTOs (`/api/connect/home`) and the Shop S1 catalogue (`/api/shop/catalogue/products`).
- **Nothing invented:** no ratings, review counts, distances or member totals that the API does not return. The Shop shows "No reviews yet" until reviews exist.

## Known gaps (tracked for later slices)

- **Community card photo:** the card cannot show a post photo, because the K5A post DTO exposes only `has_media`. A `media_url` field would need a K5A DTO change and a security review.
- **Find a Worker photo:** the K5A worker DTO has no photo.
- **"Book a service":** opens Works → Find. Booking from a Home card needs worker-code routes, which is K5B Part 2 / Works.
- **Global search / Ask HOWDI (HOME-004):** the header search currently searches Shop products and says so. People, services and courses search is the K5B Global Search UI, which is not started.
- **Legacy content:** Connect, Works and Learn & Earn content, the product detail page, the cart and checkout still use their legacy inner styling inside the V8 frame. They are later V8 slices (boards 06/07/08/09/10/11…).
- **Dark mode:** board 12, not in this slice.

## Slice 1b: V8 colours and typography on every legacy screen

- **Colour migration:** `tools/v8/v8_recolor.py` is a deterministic, property-aware migration. It changed 5,904 colour values in `App.css`, `ux-recovery.css`, `App.jsx`, Learn, HOWDI-for, the Shop CSS and the auth portal. Every change is listed in `docs/V8_COLOR_MIGRATION_MAP.csv`. The mapping works like this:
  - **Forest-green brand colours:** used as text they become navy / slate ink; used as surfaces or buttons they become cobalt; used as borders they become cool blue-grey.
  - **Gold kickers:** become cobalt.
  - **Cream / ivory backgrounds:** become the blue-white base.
  - **Semantic colours are kept:** success greens, emerald, teal, red, amber, stars and violet.
- **Typography:** Inter is used everywhere. The legacy Georgia / Playfair serif headings are replaced.
- **Pillar accents:** HPay uses a teal balance card (board 11). Learn & Earn uses violet kickers (board 10). The Connect Home "Special" and "Media of the Day" banners are soft blue-white cards, no longer large saturated blocks.
- **Rail selection:** HPay is a header utility, so no rail item is selected while it is open.
