import React, { useMemo, useState } from 'react';
import './learnEarn.css';

const tabs = ['Discover', 'My Learning', 'Live Classes', 'Skill Journey', 'Skill Passport', 'Opportunities'];

const categories = [
  { name: 'Crochet', icon: '🧶', subtitle: 'Bags, home decor, wearables' },
  { name: 'Embroidery', icon: '🪡', subtitle: 'Hand embroidery and finishing' },
  { name: 'Tailoring', icon: '🧵', subtitle: 'Stitching, alterations and garment basics' },
];

const courses = [
  {
    slug: 'crochet-foundations',
    title: 'Crochet Foundations',
    teacher: '@meera_crochets',
    level: 'Beginner',
    duration: '4 weeks',
    format: 'Recorded + Practice',
    rating: 4.9,
    reviews: 148,
    progress: 38,
    price: 0,
    output: 'SKILL',
    category: 'Crochet',
    nextAction: 'Continue: Practice the chain stitch',
    lessons: ['Getting ready', 'Chain stitch', 'Single crochet', 'First coaster'],
  },
  {
    slug: 'crochet-bag',
    title: 'Make Your First Crochet Bag',
    teacher: '@ananya_makes',
    level: 'Beginner',
    duration: '6 weeks',
    format: 'Recorded + Live',
    rating: 4.8,
    reviews: 96,
    progress: 0,
    price: 799,
    output: 'PRODUCT_CREATION',
    category: 'Crochet',
    nextAction: 'Preview the first lesson',
    lessons: ['Materials', 'Base', 'Body', 'Handles', 'Finishing', 'Project review'],
  },
  {
    slug: 'embroidery-basics',
    title: 'Everyday Hand Embroidery',
    teacher: '@asha_threads',
    level: 'Beginner',
    duration: '3 weeks',
    format: 'Recorded',
    rating: 4.7,
    reviews: 73,
    progress: 0,
    price: 399,
    output: 'PRODUCT_CREATION',
    category: 'Embroidery',
    nextAction: 'Start with the materials guide',
    lessons: ['Needles and fabric', 'Running stitch', 'Back stitch', 'Mini motif'],
  },
];

const liveClasses = [
  { title: 'Crochet Doubt Session', teacher: '@meera_crochets', time: 'Today · 6:30 PM', status: 'UPCOMING' },
  { title: 'Bag Handles Workshop', teacher: '@ananya_makes', time: 'Sun · 11:00 AM', status: 'UPCOMING' },
];

const opportunities = [
  { title: 'Crochet coaster sample', type: 'Make & sell', reward: '₹450', skill: 'Crochet', proof: 'Verified Skill Passport' },
  { title: 'Beginner crochet mentor', type: 'Mentor', reward: '₹300/session', skill: 'Crochet', proof: 'Teacher review required' },
];

function EmptyState({ title, text }) {
  return <div className="le-empty"><div className="le-empty-icon">✨</div><h3>{title}</h3><p>{text}</p></div>;
}

function CourseCard({ course, onOpen }) {
  return (
    <button className="le-course-card" onClick={() => onOpen(course)} aria-label={'Open course ' + course.title}>
      <div className="le-course-art">{course.category === 'Crochet' ? '🧶' : '🪡'}</div>
      <div className="le-course-body">
        <div className="le-course-meta"><span>{course.level}</span><span>{course.format}</span></div>
        <h3>{course.title}</h3>
        <p>{course.teacher}</p>
        <div className="le-rating">★ {course.rating} <span>({course.reviews})</span></div>
        <div className="le-course-footer"><strong>{course.price ? '₹' + course.price : 'Free'}</strong><span>{course.duration}</span></div>
      </div>
    </button>
  );
}

export default function LearnEarnExperience({ onExit }) {
  const [tab, setTab] = useState('Discover');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [query, setQuery] = useState('');
  const [course, setCourse] = useState(null);

  const visibleCourses = useMemo(() => {
    const q = query.trim().toLowerCase();
    return courses.filter((item) => {
      const categoryMatch = selectedCategory === 'All' || item.category === selectedCategory;
      const queryMatch = !q || [item.title, item.teacher, item.category, item.level].join(' ').toLowerCase().includes(q);
      return categoryMatch && queryMatch;
    });
  }, [query, selectedCategory]);

  if (course) {
    return (
      <main className="le-shell">
        <header className="le-topbar">
          <button className="le-logo" onClick={onExit}>HOWDI</button>
          <div className="le-title-wrap"><span>Learn & Earn</span><small>Learn → Practice → Prove → Create → Earn → Grow</small></div>
          <button className="le-secondary" onClick={() => setCourse(null)}>Back</button>
        </header>
        <section className="le-detail">
          <div className="le-detail-hero">
            <div className="le-detail-art">{course.category === 'Crochet' ? '🧶' : '🪡'}</div>
            <div>
              <span className="le-pill">{course.output.replaceAll('_', ' ')}</span>
              <h1>{course.title}</h1>
              <p>Learn with <strong>{course.teacher}</strong>. Your public learning identity stays tied to your HOWDI @username.</p>
              <div className="le-detail-meta"><span>★ {course.rating}</span><span>{course.level}</span><span>{course.duration}</span></div>
              <button className="le-primary">{course.progress ? 'CONTINUE' : course.price ? 'ENROL' : 'START FREE'}</button>
            </div>
          </div>
          <div className="le-detail-grid">
            <section className="le-panel">
              <h2>Curriculum</h2>
              {course.lessons.map((lesson, index) => <div className="le-lesson" key={lesson}><span>{index + 1}</span><div><strong>{lesson}</strong><small>{index === 0 ? 'Preview available' : 'Lesson + practice'}</small></div></div>)}
            </section>
            <aside className="le-panel">
              <h2>Your easiest next step</h2>
              <p className="le-next">{course.nextAction}</p>
              <div className="le-readiness"><strong>Class readiness</strong><span>Materials checklist</span><span>Low-data option available</span><span>PDF / worksheet support</span></div>
            </aside>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="le-shell">
      <header className="le-topbar">
        <button className="le-logo" onClick={onExit}>HOWDI</button>
        <div className="le-title-wrap"><span>Learn & Earn</span><small>Your skill-to-life journey</small></div>
        <div className="le-top-actions"><button className="le-icon" aria-label="Notifications">🔔</button><button className="le-icon" aria-label="HPay">₹</button></div>
      </header>

      <nav className="le-tabs" aria-label="Learn and Earn navigation">
        {tabs.map((item) => <button key={item} className={tab === item ? 'active' : ''} onClick={() => setTab(item)}>{item}</button>)}
      </nav>

      {tab === 'Discover' && (
        <>
          <section className="le-hero">
            <div>
              <span className="le-eyebrow">WHAT DO YOU WANT TO ACHIEVE?</span>
              <h1>Learn something useful. Prove it. Use it in real life.</h1>
              <p>Choose a goal and HOWDI keeps the next step simple — video, practice, live help, worksheet or project.</p>
              <div className="le-goals">
                {['Earn from home', 'Make & sell', 'Offer a service', 'Get job-ready', 'Learn for myself'].map((goal) => <button key={goal}>{goal}</button>)}
              </div>
            </div>
            <div className="le-companion">
              <small>DAILY SKILL COMPANION</small>
              <h3>20 minutes today</h3>
              <div>▶ Watch · 6 min</div><div>👐 Practice · 10 min</div><div>📷 Show HOWDI · 3 min</div><div>💡 Grandma Tip · 1 min</div>
              <button className="le-primary">CONTINUE</button>
            </div>
          </section>

          <section className="le-section">
            <div className="le-section-head"><div><small>DISCOVER BY SKILL</small><h2>Skill categories</h2></div></div>
            <div className="le-categories">
              <button className={selectedCategory === 'All' ? 'active' : ''} onClick={() => setSelectedCategory('All')}><span>✨</span><strong>All skills</strong><small>Explore everything</small></button>
              {categories.map((category) => <button key={category.name} className={selectedCategory === category.name ? 'active' : ''} onClick={() => setSelectedCategory(category.name)}><span>{category.icon}</span><strong>{category.name}</strong><small>{category.subtitle}</small></button>)}
            </div>
          </section>

          <section className="le-section">
            <div className="le-section-head">
              <div><small>COURSES</small><h2>Recommended for you</h2></div>
              <input aria-label="Search courses" placeholder="Search courses or teachers" value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
            <div className="le-course-grid">
              {visibleCourses.map((item) => <CourseCard key={item.slug} course={item} onOpen={setCourse} />)}
            </div>
            {!visibleCourses.length && <EmptyState title="No courses found" text="Try another skill or clear your search." />}
          </section>
        </>
      )}

      {tab === 'My Learning' && (
        <section className="le-section">
          <div className="le-section-head"><div><small>MY LEARNING</small><h2>Continue where you stopped</h2></div></div>
          {courses.filter((item) => item.progress > 0).map((item) => (
            <button className="le-learning-row" key={item.slug} onClick={() => setCourse(item)}>
              <div className="le-course-art small">🧶</div><div className="le-learning-main"><strong>{item.title}</strong><span>{item.nextAction}</span><div className="le-progress"><i style={{ width: item.progress + '%' }} /></div><small>{item.progress}% complete</small></div><b>CONTINUE</b>
            </button>
          ))}
        </section>
      )}

      {tab === 'Live Classes' && (
        <section className="le-section">
          <div className="le-section-head"><div><small>LIVE</small><h2>Upcoming classes</h2></div></div>
          <div className="le-list">{liveClasses.map((item) => <article className="le-list-card" key={item.title}><div><span className="le-pill">{item.status}</span><h3>{item.title}</h3><p>{item.teacher}</p><strong>{item.time}</strong></div><button className="le-secondary">Set reminder</button></article>)}</div>
          <p className="le-note">Live provider integration is shown as readiness UI only until a real video provider is connected.</p>
        </section>
      )}

      {tab === 'Skill Journey' && (
        <section className="le-section">
          <div className="le-section-head"><div><small>SKILL JOURNEY</small><h2>From learning to verified proof</h2></div></div>
          <div className="le-journey">{['Learn', 'Practice', 'Submit Proof', 'Teacher Review', 'Assessment', 'Verified', 'Passport'].map((step, index) => <div key={step} className={index < 2 ? 'done' : ''}><span>{index < 2 ? '✓' : index + 1}</span><strong>{step}</strong></div>)}</div>
          <div className="le-panel"><h3>Current milestone</h3><p className="le-next">I can make a clean crochet chain and start a single-crochet row.</p><button className="le-primary">SHOW HOWDI</button></div>
        </section>
      )}

      {tab === 'Skill Passport' && (
        <section className="le-section">
          <div className="le-passport">
            <div className="le-avatar">V</div><div><small>PUBLIC SKILL PASSPORT</small><h2>@your_username</h2><p>Only public HOWDI identity and approved learning proof appear here. Internal user IDs never appear.</p></div>
          </div>
          <div className="le-passport-grid">
            <div className="le-panel"><h3>Verified skills</h3><div className="le-skill"><span>🧶</span><div><strong>Crochet Foundations</strong><small>Teacher verified · project evidence</small></div></div></div>
            <div className="le-panel"><h3>Achievements</h3><p>1 verified milestone · 1 project in progress</p><button className="le-secondary">Share passport</button></div>
          </div>
        </section>
      )}

      {tab === 'Opportunities' && (
        <section className="le-section">
          <div className="le-section-head"><div><small>OPPORTUNITIES</small><h2>Turn verified skills into earnings</h2></div></div>
          <div className="le-list">{opportunities.map((item) => <article className="le-list-card" key={item.title}><div><span className="le-pill">{item.type}</span><h3>{item.title}</h3><p>{item.skill} · {item.proof}</p><strong>{item.reward}</strong></div><button className="le-primary">View opportunity</button></article>)}</div>
        </section>
      )}
    </main>
  );
}
