import { V8Icon } from "../V8Shell";
import { PUBLIC_INFO_LINKS } from "./publicInfoRoutes";
import "./public-info.css";

const SIX = [
  ["home", "Home", "Your personalised starting point across HOWDI."],
  ["connect", "Connect", "People, posts, Vibe, communities and conversations."],
  ["shop", "Shop", "Browse products, stores and your shopping journey."],
  ["move", "Move", "Ride experiences and trip status where the service is enabled."],
  ["works", "Work", "Discover and book local services through HOWDI Works."],
  ["learn", "Learn", "Courses, learning progress and approved teaching roles."],
];

const FAQS = [
  ["Account", [
    ["What is my public identity on HOWDI?", "Your public identity is your @username together with the profile information you choose to make visible. Internal database IDs, UUIDs and master identifiers are not intended for customer-facing URLs or payloads."],
    ["Can I change my profile information?", "Signed-in members can edit supported profile fields in My HOWDI. Some identity and verification fields follow separate review or account-security flows."],
    ["Can one account have more than one role?", "Yes. The current role model can attach approved capabilities such as Vendor, Worker, Learner or Teacher to the same HOWDI account."],
  ]],
  ["Home & Connect", [
    ["What is Home?", "Home is HOWDI's shared starting point. It brings together useful content from the six pillars without creating another identity or account."],
    ["What can I control in Connect?", "Current Connect settings include profile/audience controls and blocking features. Availability can depend on the specific feature and account state."],
  ]],
  ["Shop, Move & Work", [
    ["Where do I check an order, ride or booking?", "Use the relevant Shop, Move or Work journey in HOWDI. Status and support actions are shown by the feature when the corresponding backend capability exists."],
    ["Is every Move feature live in production?", "No. The current repository includes Preview/Test-gated Move behavior and explicitly unavailable states for capabilities that are not connected. HOWDI should not present those unavailable integrations as live."],
  ]],
  ["Learn & roles", [
    ["How do learning and teaching work?", "Learners use Learn for available courses and progress. Teacher access is tied to an approved Teacher role on the signed-in HOWDI account."],
    ["Are Institute and Startup workspaces fully operational?", "Applications and roles exist in the current product model, but broader Institute/College and Startup operational capabilities still require approved product contracts."],
  ]],
  ["HPay & payments", [
    ["Is HPay a seventh main pillar?", "No. HPay is the wallet/payment capability available from the HOWDI shell and relevant journeys. The primary pillars remain Home, Connect, Shop, Move, Work and Learn."],
    ["Where do I see payment-related records?", "Signed-in users can view the payment, order or activity records exposed by the relevant HOWDI feature. The available detail depends on the current backend contract."],
  ]],
  ["Privacy & safety", [
    ["Can I control device permissions?", "Yes, where the browser supports them. My HOWDI includes a Privacy & permissions screen for camera, microphone, location and notifications. Browser or operating-system settings remain the source of truth for device permission state."],
    ["Does HOWDI expose my internal user ID publicly?", "Customer-facing V8 code is designed around public @usernames and opaque public references instead of raw internal account IDs."],
    ["Can I download my data or request account deletion?", "The current V8 account area supports a signed-in JSON data export and an account-deletion request that can be scheduled or cancelled. The public information page does not claim that every possible data store is included in the export or that scheduled deletion automatically erases every record; those broader retention and erasure rules need Founder/legal and backend verification."],
  ]],
];

function LinkButton({ page, label, onNavigate }) {
  return <button type="button" onClick={() => onNavigate(page)}>{label}</button>;
}

export function V8PublicFooter({ onNavigate }) {
  return (
    <footer className="v8pi-footer" aria-label="HOWDI information">
      <b>HOWDI information</b>
      <div className="v8pi-links">
        {PUBLIC_INFO_LINKS.map(([page, label]) => <LinkButton key={page} page={page} label={label} onNavigate={onNavigate} />)}
      </div>
    </footer>
  );
}

function Layout({ title, intro, children, onNavigate }) {
  return (
    <div className="v8-page v8-public-info" id="v8-main">
      <div className="v8pi-inner">
        <section className="v8pi-hero">
          <p className="v8pi-kicker">HOWDI · Public information</p>
          <h1>{title}</h1>
          <p>{intro}</p>
        </section>
        {children}
        <V8PublicFooter onNavigate={onNavigate} />
      </div>
    </div>
  );
}

function Privacy({ onNavigate, signedIn }) {
  return <Layout title="Privacy information" intro="A product-backed summary of the privacy controls and data handling that can be verified in the current HOWDI repository. This is not yet a Founder/legal-approved privacy policy." onNavigate={onNavigate}>
    <section className="v8pi-section v8pi-tbd">
      <strong>Legal review required</strong>
      <p>Legal entity details, jurisdiction-specific rights wording, processor lists, formal retention schedules, office/DPO details and compliance certifications are not published here because they are not established by the current product source.</p>
    </section>
    <div className="v8pi-grid">
      <article><h2>Account & public identity</h2><p>HOWDI uses an account to provide signed-in features. In the V8 customer experience, public identity is represented by a public @username and public-safe profile fields. Raw internal user IDs, UUIDs and master IDs are not intended for public customer-facing identity.</p></article>
      <article><h2>Profile & content</h2><p>Profile information and user-generated content may be visible according to the feature's supported audience/privacy controls. Connect includes profile visibility, audience and blocking controls in the current implementation.</p></article>
      <article><h2>Location</h2><p>The web experience can request browser location permission when a location-dependent feature asks for it. Browser permission remains under your device control. Exact location should not be presented as public profile identity.</p></article>
      <article><h2>Orders, rides & payments</h2><p>HOWDI stores account-scoped records needed for supported shopping, ride and HPay journeys. Public pages use public references where the current V8 contract provides them rather than exposing internal record IDs.</p></article>
      <article><h2>Browser storage</h2><p>The current web client uses browser local/session storage for session state and preferences such as personalisation. A complete cookie/third-party storage disclosure still needs a deployment and legal review; this page does not claim that no cookies or external processors exist in every environment.</p></article>
      <article><h2>Security</h2><p>Protected V8 actions use the signed-in session as the acting account, and several modules use private-media or scoped-access patterns. This is a description of current product controls, not a certification or guarantee of absolute security.</p></article>
    </div>
    <section className="v8pi-section">
      <h2>Your controls today</h2>
      <ul>
        <li>Supported profile and audience/privacy settings in My HOWDI and Connect.</li>
        <li>Browser permission controls for camera, microphone, location and notifications where supported.</li>
        <li>A signed-in JSON data export for the categories currently included by the V8 export endpoint.</li>
        <li>An account-deletion request flow that can be scheduled and cancelled, subject to current product blockers and warnings.</li>
        <li>Deletion of the saved size profile through its dedicated My HOWDI control.</li>
      </ul>
      <div className="v8pi-actions">
        {signedIn ? <button className="v8-btn v8-btn-primary" type="button" onClick={() => onNavigate("me-privacy")}>Open privacy controls</button> : null}
        <button className="v8-btn" type="button" onClick={() => onNavigate("data-rights")}>Your data & privacy rights</button>
      </div>
    </section>
    <section className="v8pi-section">
      <h2>Retention & deletion</h2>
      <p>The current account flow schedules a deletion request with a 30-day grace period and allows cancellation during that flow. That implementation alone does not prove a complete production erasure pipeline or a universal retention period for every HOWDI record. Those rules remain Founder/legal + backend verification TBD.</p>
    </section>
  </Layout>;
}

function DataRights({ onNavigate, signedIn }) {
  return <Layout title="Your data & privacy rights" intro="What the current HOWDI product can actually let you control today, separated from rights or workflows that still need a formal product/legal contract." onNavigate={onNavigate}>
    <section className="v8pi-section">
      <h2>Current product controls</h2>
      <div className="v8pi-status"><b>Correct profile information</b><p>Available for supported profile fields in My HOWDI.</p></div>
      <div className="v8pi-status"><b>Privacy & permissions</b><p>Available for supported Connect privacy settings and browser device permissions.</p></div>
      <div className="v8pi-status"><b>Download data</b><p>A signed-in JSON export is implemented for the specific account, role, saved-place, Shop, review, wishlist, HPay, rewards and size-profile fields included by the current V8 export endpoint. It is not described as a universal export of every HOWDI record.</p></div>
      <div className="v8pi-status"><b>Saved measurements</b><p>The current size-profile feature includes a dedicated delete action.</p></div>
      <div className="v8pi-status"><b>Account deletion request</b><p>The product can schedule or cancel a deletion request after account checks. A complete production deletion/retention lifecycle still needs verification before HOWDI makes a broader erasure promise.</p></div>
    </section>
    <section className="v8pi-section v8pi-tbd">
      <h2>Founder/legal decision or backend work still required</h2>
      <ul>
        <li>Formal jurisdiction-specific rights and request-handling policy.</li>
        <li>Verified full-account erasure/retention lifecycle across every pillar and legally retained record.</li>
        <li>A single global consent-withdrawal workflow; current consent/settings are feature-specific.</li>
        <li>A complete verified inventory of processors, international transfers and retention periods.</li>
        <li>A public privacy contact/DPO route, if HOWDI decides one is required.</li>
      </ul>
    </section>
    <section className="v8pi-section">
      <h2>Open your controls</h2>
      <div className="v8pi-actions">
        {signedIn ? <button className="v8-btn v8-btn-primary" type="button" onClick={() => onNavigate("me-delete")}>Data export & deletion request</button> : <p>Sign in to use account-specific data controls.</p>}
        {signedIn ? <button className="v8-btn" type="button" onClick={() => onNavigate("me-privacy")}>Privacy & permissions</button> : null}
      </div>
    </section>
  </Layout>;
}

function Help({ onNavigate }) {
  return <Layout title="Help & FAQ" intro="Practical answers based on the product behavior that is visible in the current HOWDI implementation and frozen decisions." onNavigate={onNavigate}>
    {FAQS.map(([group, rows]) => <section className="v8pi-section" key={group}><h2>{group}</h2><div className="v8pi-faq">{rows.map(([q, a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}</div></section>)}
    <section className="v8pi-section"><h2>Need more help?</h2><p>Use the contextual support/status controls inside the relevant HOWDI journey when they are available. A public support email, phone number, office location and response-time promise have not been verified in the current source.</p><button className="v8-btn" type="button" onClick={() => onNavigate("contact")}>Contact HOWDI information</button></section>
  </Layout>;
}

function Contact({ onNavigate, signedIn }) {
  return <Layout title="Contact HOWDI" intro="Use verified in-product routes for account or transaction-specific help. Public contact details are intentionally not invented." onNavigate={onNavigate}>
    <div className="v8pi-grid">
      <article><h2>Account & privacy</h2><p>Signed-in users can open My HOWDI for profile, privacy, data export and account-deletion request controls.</p>{signedIn ? <button className="v8-btn" type="button" onClick={() => onNavigate("me-privacy")}>Open privacy controls</button> : null}</article>
      <article><h2>Orders, rides, bookings & learning</h2><p>Open the relevant Shop, Move, Work or Learn item to use the support/status actions that the feature currently provides. This page does not create a parallel support system.</p></article>
    </div>
    <section className="v8pi-section v8pi-tbd"><h2>Public contact details — TBD</h2><p>No Founder-approved public support email, phone number, physical office address or response-time SLA was found in the current repository. These must be supplied and approved before publication.</p></section>
    <section className="v8pi-section"><h2>Safety</h2><p>For urgent safety issues, use the safety/support path shown by the relevant HOWDI feature. HOWDI's public-information page does not claim to provide emergency services.</p></section>
  </Layout>;
}

function About({ onNavigate, onOpenArea }) {
  return <Layout title="About HOWDI" intro="HOWDI brings social connection, commerce, mobility, local work and learning into one account and one consistent navigation system." onNavigate={onNavigate}>
    <section className="v8pi-section"><h2>One HOWDI, six pillars</h2><p>The primary customer navigation is <b>Home · Connect · Shop · Move · Work · Learn</b>. HPay is the wallet/payment capability used across relevant journeys; it is not a seventh main pillar.</p></section>
    <div className="v8pi-grid">{SIX.map(([area, label, copy]) => <article key={area}><h3>{label}</h3><p>{copy}</p><button className="v8-btn" type="button" onClick={() => onOpenArea(area, area === "shop" ? "catalogue" : area === "works" ? "find" : area === "learn" ? "discover" : "home")}>Open {label}</button></article>)}</div>
    <section className="v8pi-section"><h2>How HOWDI is being built</h2><p>Current V8 architecture reuses one HOWDI account across supported roles and pillars, uses public-safe references for customer-facing routes, and keeps unavailable capabilities visibly blocked instead of presenting them as live.</p></section>
  </Layout>;
}

function Team({ onNavigate }) {
  return <Layout title="Our Team" intro="This page is ready for Founder-approved team information without inventing people, titles, biographies or photographs." onNavigate={onNavigate}>
    <section className="v8pi-section v8pi-tbd"><h2>Team directory — Founder content required</h2><p>No repository-approved public team roster, official titles, biographies or photos were found. HOWDI should publish a person only after the Founder supplies or approves that person's public information.</p></section>
    <div className="v8pi-team-slot"><div><V8Icon name="users" size={28} /><p><strong>Approved team profiles will appear here.</strong></p><p>Names · roles · biographies · photographs — TBD.</p></div></div>
  </Layout>;
}

export default function V8PublicInfo({ page, onNavigate, onOpenArea, signedIn }) {
  const props = { onNavigate, onOpenArea, signedIn };
  if (page === "privacy") return <Privacy {...props} />;
  if (page === "data-rights") return <DataRights {...props} />;
  if (page === "help") return <Help {...props} />;
  if (page === "contact") return <Contact {...props} />;
  if (page === "team") return <Team {...props} />;
  return <About {...props} />;
}
