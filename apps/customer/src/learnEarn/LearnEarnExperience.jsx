import React, { useEffect, useMemo, useState } from "react";
import "./learnEarn.css";
import {
  enrolInCourse,
  loadCourseDetails,
  loadLearningCatalog,
  loadLearningOpportunities,
  loadLiveAvailability,
  loadMyLearning,
  loadSkillPassport,
  normalizeCourse,
} from "./learnEarnApi";

const tabs = ["Discover", "My Learning", "Live Classes", "Skill Journey", "Skill Passport", "Opportunities"];

const fallbackCategories = [
  { name: "Crochet", icon: "🧶", subtitle: "Bags, home decor and wearables" },
  { name: "Embroidery", icon: "🪡", subtitle: "Hand embroidery and finishing" },
  { name: "Tailoring", icon: "🧵", subtitle: "Stitching, alterations and garment basics" },
];

function EmptyState({ title, text }) {
  return <div className="le-empty"><div className="le-empty-icon">✨</div><h3>{title}</h3><p>{text}</p></div>;
}

function LoadingState({ label = "Loading…" }) {
  return <div className="le-empty"><div className="le-empty-icon">⏳</div><h3>{label}</h3><p>HOWDI is preparing your learning space.</p></div>;
}

function CourseCard({ course, onOpen }) {
  const cat = String(course.category || "").toLowerCase();
  const icon = cat.includes("crochet") ? "🧶" : cat.includes("embroid") ? "🪡" : "🎓";
  return (
    <button className="le-course-card" onClick={() => onOpen(course)} aria-label={"Open course " + course.title}>
      <div className="le-course-art">{course.thumbnailUrl ? <img src={course.thumbnailUrl} alt="" /> : icon}</div>
      <div className="le-course-body">
        <div className="le-course-meta"><span>{course.level}</span><span>{course.format}</span></div>
        <h3>{course.title}</h3>
        <p>{course.teacher}</p>
        <div className="le-rating">✓ Published HOWDI learning</div>
        <div className="le-course-footer"><strong>{course.price ? "₹" + course.price.toLocaleString("en-IN") : "Free"}</strong><span>{course.duration}</span></div>
      </div>
    </button>
  );
}

export default function LearnEarnExperience({ onExit = () => history.back() }) {
  const [tab, setTab] = useState("Discover");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [query, setQuery] = useState("");
  const [catalog, setCatalog] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState("");
  const [course, setCourse] = useState(null);
  const [courseDetails, setCourseDetails] = useState(null);
  const [courseBusy, setCourseBusy] = useState(false);
  const [actionNotice, setActionNotice] = useState("");
  const [myLearning, setMyLearning] = useState([]);
  const [myLearningLoading, setMyLearningLoading] = useState(false);
  const [liveClasses, setLiveClasses] = useState([]);
  const [liveLoading, setLiveLoading] = useState(false);
  const [passport, setPassport] = useState(null);
  const [passportLoading, setPassportLoading] = useState(false);
  const [opportunities, setOpportunities] = useState([]);
  const [opportunityLoading, setOpportunityLoading] = useState(false);

  useEffect(() => {
    let active = true;
    setCatalogLoading(true);
    loadLearningCatalog()
      .then((rows) => active && setCatalog(rows.map(normalizeCourse)))
      .catch((error) => active && setCatalogError(error.message || "Unable to load published courses."))
      .finally(() => active && setCatalogLoading(false));
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (tab !== "My Learning") return;
    setMyLearningLoading(true);
    loadMyLearning().then(setMyLearning).catch(() => setMyLearning([])).finally(() => setMyLearningLoading(false));
  }, [tab]);

  useEffect(() => {
    if (tab !== "Live Classes") return;
    setLiveLoading(true);
    loadLiveAvailability().then(setLiveClasses).catch(() => setLiveClasses([])).finally(() => setLiveLoading(false));
  }, [tab]);

  useEffect(() => {
    if (tab !== "Skill Passport") return;
    setPassportLoading(true);
    loadSkillPassport().then(setPassport).catch(() => setPassport(null)).finally(() => setPassportLoading(false));
  }, [tab]);

  useEffect(() => {
    if (tab !== "Opportunities") return;
    setOpportunityLoading(true);
    loadLearningOpportunities()
      .then((data) => setOpportunities(data.opportunities || []))
      .catch(() => setOpportunities([]))
      .finally(() => setOpportunityLoading(false));
  }, [tab]);

  const categories = useMemo(() => {
    const names = [...new Set(catalog.map((item) => item.category).filter(Boolean))];
    return names.length ? names.map((name) => ({
      name,
      icon: name.toLowerCase().includes("crochet") ? "🧶" : name.toLowerCase().includes("embroid") ? "🪡" : "🎓",
      subtitle: "Explore published HOWDI courses",
    })) : fallbackCategories;
  }, [catalog]);

  const visibleCourses = useMemo(() => {
    const q = query.trim().toLowerCase();
    return catalog.filter((item) => {
      const categoryMatch = selectedCategory === "All" || item.category === selectedCategory;
      const queryMatch = !q || [item.title, item.teacher, item.category, item.level].join(" ").toLowerCase().includes(q);
      return categoryMatch && queryMatch;
    });
  }, [catalog, query, selectedCategory]);

  async function openCourse(nextCourse) {
    setCourse(nextCourse);
    setCourseDetails(null);
    setActionNotice("");
    if (!nextCourse?.id) return;
    setCourseBusy(true);
    try {
      setCourseDetails(await loadCourseDetails(nextCourse.id));
    } catch (error) {
      setActionNotice(error.message || "Unable to load full course details.");
    } finally {
      setCourseBusy(false);
    }
  }

  async function enrol() {
    if (!course?.id) return;
    setActionNotice("");
    setCourseBusy(true);
    try {
      const data = await enrolInCourse(course.id);
      setActionNotice(data.message || "Course added to My Learning.");
      const rows = await loadMyLearning().catch(() => []);
      setMyLearning(rows);
    } catch (error) {
      setActionNotice(error.status === 401 ? "Sign in to enrol and save your learning progress." : error.message);
    } finally {
      setCourseBusy(false);
    }
  }

  const detailCourse = course ? { ...course, ...(courseDetails?.course ? normalizeCourse(courseDetails.course) : {}) } : null;
  const modules = courseDetails?.modules || courseDetails?.curriculum || [];
  const lessons = modules.flatMap((m) => Array.isArray(m.lessons) ? m.lessons : []);

  if (detailCourse) {
    return (
      <main className="le-shell">
        <header className="le-topbar">
          <button className="le-logo" onClick={onExit}>HOWDI</button>
          <div className="le-title-wrap"><span>Learn & Earn</span><small>Learn → Practice → Prove → Create → Earn → Grow</small></div>
          <button className="le-secondary" onClick={() => setCourse(null)}>Back</button>
        </header>
        <section className="le-detail">
          <div className="le-detail-hero">
            <div className="le-detail-art">{detailCourse.thumbnailUrl ? <img src={detailCourse.thumbnailUrl} alt="" /> : "🎓"}</div>
            <div>
              <span className="le-pill">{detailCourse.category}</span>
              <h1>{detailCourse.title}</h1>
              <p>{detailCourse.description || "Practical HOWDI learning with clear next steps and real proof of skill."}</p>
              <p>Learn with <strong>{detailCourse.teacher}</strong>.</p>
              <div className="le-detail-meta"><span>{detailCourse.level}</span><span>{detailCourse.duration}</span><span>{detailCourse.lessonCount} lessons</span></div>
              <button className="le-primary" disabled={courseBusy} onClick={enrol}>{courseBusy ? "PLEASE WAIT…" : detailCourse.price ? "ENROL / CONTINUE" : "START FREE"}</button>
              {actionNotice && <p className="le-note">{actionNotice}</p>}
            </div>
          </div>
          <div className="le-detail-grid">
            <section className="le-panel">
              <h2>Curriculum</h2>
              {courseBusy && !courseDetails ? <LoadingState label="Loading curriculum" /> : lessons.length ? lessons.map((lesson, index) => (
                <div className="le-lesson" key={lesson.id || lesson.title || index}>
                  <span>{index + 1}</span>
                  <div><strong>{lesson.title || "Lesson"}</strong><small>{lesson.lesson_type || lesson.type || "Lesson + practice"}</small></div>
                </div>
              )) : <EmptyState title="Curriculum is being prepared" text="Published lesson details will appear here when available." />}
            </section>
            <aside className="le-panel">
              <h2>Your easiest next step</h2>
              <p className="le-next">Start with the first available lesson, then practice and show your work.</p>
              <div className="le-readiness">
                <strong>Ready to learn</strong>
                <span>{detailCourse.materials?.length ? detailCourse.materials.join(" · ") : "Materials guidance inside the course"}</span>
                <span>Low-data learning supported where resources are available</span>
                <span>Practice and proof stay inside Learn & Earn</span>
              </div>
            </aside>
          </div>
        </section>
      </main>
    );
  }

  const passportUser = passport?.profile?.public_username ? "@" + String(passport.profile.public_username).replace(/^@/, "") : "@your_username";
  const passportEvidence = Array.isArray(passport?.evidence) ? passport.evidence : [];
  const passportSummary = passport?.summary || {};

  return (
    <main className="le-shell">
      <header className="le-topbar">
        <button className="le-logo" onClick={onExit}>HOWDI</button>
        <div className="le-title-wrap"><span>Learn & Earn</span><small>Your skill-to-life journey</small></div>
      </header>

      <nav className="le-tabs" aria-label="Learn and Earn navigation">
        {tabs.map((item) => <button key={item} className={tab === item ? "active" : ""} onClick={() => setTab(item)}>{item}</button>)}
      </nav>

      {tab === "Discover" && <>
        <section className="le-hero">
          <div>
            <span className="le-eyebrow">WHAT DO YOU WANT TO ACHIEVE?</span>
            <h1>Learn something useful. Prove it. Use it in real life.</h1>
            <p>HOWDI keeps the next step simple — lesson, practice, live help, worksheet or project.</p>
            <div className="le-goals">{["Earn from home", "Make & sell", "Offer a service", "Get job-ready", "Learn for myself"].map((goal) => <button key={goal}>{goal}</button>)}</div>
          </div>
          <div className="le-companion">
            <small>DAILY SKILL COMPANION</small><h3>One useful next step</h3>
            <div>▶ Learn</div><div>👐 Practice</div><div>📷 Show HOWDI</div><div>💡 Get guidance</div>
            <button className="le-primary" onClick={() => setTab("My Learning")}>CONTINUE</button>
          </div>
        </section>
        <section className="le-section">
          <div className="le-section-head"><div><small>DISCOVER BY SKILL</small><h2>Skill categories</h2></div></div>
          <div className="le-categories">
            <button className={selectedCategory === "All" ? "active" : ""} onClick={() => setSelectedCategory("All")}><span>✨</span><strong>All skills</strong><small>Explore everything</small></button>
            {categories.map((category) => <button key={category.name} className={selectedCategory === category.name ? "active" : ""} onClick={() => setSelectedCategory(category.name)}><span>{category.icon}</span><strong>{category.name}</strong><small>{category.subtitle}</small></button>)}
          </div>
        </section>
        <section className="le-section">
          <div className="le-section-head"><div><small>COURSES</small><h2>Published learning</h2></div><input aria-label="Search courses" placeholder="Search courses or teachers" value={query} onChange={(e) => setQuery(e.target.value)} /></div>
          {catalogLoading ? <LoadingState label="Loading courses" /> : catalogError ? <EmptyState title="Learning catalog unavailable" text={catalogError} /> : <>
            <div className="le-course-grid">{visibleCourses.map((item) => <CourseCard key={item.id} course={item} onOpen={openCourse} />)}</div>
            {!visibleCourses.length && <EmptyState title="No courses found" text="Try another skill or clear your search." />}
          </>}
        </section>
      </>}

      {tab === "My Learning" && <section className="le-section">
        <div className="le-section-head"><div><small>MY LEARNING</small><h2>Continue where you stopped</h2></div></div>
        {myLearningLoading ? <LoadingState label="Loading My Learning" /> : myLearning.length ? myLearning.map((item) => {
          const linked = catalog.find((c) => String(c.id) === String(item.course_id));
          const progress = Number(item.progress_percent ?? item.progress ?? 0);
          return <button className="le-learning-row" key={item.course_id} onClick={() => linked && openCourse(linked)}>
            <div className="le-course-art small">🎓</div>
            <div className="le-learning-main"><strong>{linked?.title || "HOWDI course"}</strong><span>{item.completed_lessons || 0} lessons completed</span><div className="le-progress"><i style={{ width: Math.max(0, Math.min(100, progress)) + "%" }} /></div><small>{Math.round(progress)}% complete</small></div>
            <b>CONTINUE</b>
          </button>;
        }) : <EmptyState title="Nothing in My Learning yet" text="Choose a published course and start learning." />}
      </section>}

      {tab === "Live Classes" && <section className="le-section">
        <div className="le-section-head"><div><small>LIVE</small><h2>Teacher availability</h2></div></div>
        {liveLoading ? <LoadingState label="Loading live classes" /> : liveClasses.length ? <div className="le-list">{liveClasses.map((item) => <article className="le-list-card" key={item.id}><div><span className="le-pill">AVAILABLE</span><h3>{item.course_title || "Live learning"}</h3><p>{item.teacher_name || "HOWDI Teacher"}</p><strong>{item.available_date || "Recurring"} · {item.start_time || ""}</strong></div><button className="le-secondary">View slot</button></article>)}</div> : <EmptyState title="No live slots available" text="New teacher availability will appear here." />}
        <p className="le-note">A real live/video provider must be connected before HOWDI can claim live video delivery.</p>
      </section>}

      {tab === "Skill Journey" && <section className="le-section">
        <div className="le-section-head"><div><small>SKILL JOURNEY</small><h2>Learn → Practice → Proof → Verified</h2></div></div>
        <div className="le-journey">{["Learn", "Practice", "Submit Proof", "Teacher Review", "Assessment", "Verified", "Passport"].map((step, index) => <div key={step}><span>{index + 1}</span><strong>{step}</strong></div>)}</div>
        <div className="le-panel"><h3>Proof stays evidence-based</h3><p className="le-next">Practice submissions, projects, assessments and teacher verification build your Skill Passport.</p><button className="le-primary" onClick={() => setTab("Skill Passport")}>OPEN SKILL PASSPORT</button></div>
      </section>}

      {tab === "Skill Passport" && <section className="le-section">
        {passportLoading ? <LoadingState label="Loading Skill Passport" /> : passport ? <>
          <div className="le-passport"><div className="le-avatar">{passportUser.slice(1, 2).toUpperCase() || "H"}</div><div><small>PUBLIC SKILL PASSPORT</small><h2>{passportUser}</h2><p>Verified learning proof only. Internal HOWDI/database IDs are not displayed.</p></div></div>
          <div className="le-passport-grid">
            <div className="le-panel"><h3>Verified proof</h3>{passportEvidence.length ? passportEvidence.map((item) => <div className="le-skill" key={item.id}><span>✓</span><div><strong>{item.skill_label || item.display_title || item.title}</strong><small>{item.evidence_type} · {item.verification_status}</small></div></div>) : <p>No verified proof yet.</p>}</div>
            <div className="le-panel"><h3>Passport strength</h3><p>{passportSummary.readiness_label || "BUILDING PROOF"}</p><p>{passportSummary.verified_evidence || 0} verified evidence · {passportSummary.certificates || 0} certificates</p></div>
          </div>
        </> : <EmptyState title="Sign in to view Skill Passport" text="Your verified skills and certificates will appear here." />}
      </section>}

      {tab === "Opportunities" && <section className="le-section">
        <div className="le-section-head"><div><small>OPPORTUNITIES</small><h2>Use verified skills in real life</h2></div></div>
        {opportunityLoading ? <LoadingState label="Matching opportunities" /> : opportunities.length ? <div className="le-list">{opportunities.map((item) => <article className="le-list-card" key={item.id}><div><span className="le-pill">{String(item.fit_state || item.opportunity_type || "OPPORTUNITY").replaceAll("_", " ")}</span><h3>{item.title}</h3><p>{item.description || item.summary || "HOWDI opportunity"}</p>{item.match_percent != null && <strong>{item.match_percent}% proof match</strong>}</div><button className="le-primary">View opportunity</button></article>)}</div> : <EmptyState title="No matching opportunities yet" text="Build verified proof in your Skill Passport to improve matching." />}
      </section>}
    </main>
  );
}
