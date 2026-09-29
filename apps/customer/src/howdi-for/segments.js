// MP-56 "HOWDI FOR" — segment landing pages (Students / Institutes / Startups).
// LOCKED (R01): audience pages route into four existing service destinations.
// The global six-pillar navigation stays intact; no feature logic lives here (R06/R07/R08). Content is data so Admin can own it later.

export const PILLARS = Object.freeze(['connect', 'shop', 'works', 'learn']);

/** Each action points at { pillar, view }. Real URLs are resolved in routes.js (single place to adjust). */
export const SEGMENTS = Object.freeze({
  students: {
    slug: 'students',
    title: 'HOWDI for Students',
    tagline: 'Learn a skill, build your proof, explore what comes next.',
    intro:
      'Explore learning, practice with a community, and build evidence of what you can do. Work and selling opportunities have their own eligibility requirements.',
    journey: ['Learn', 'Practice', 'Prove', 'Create', 'Earn', 'Grow'],
    actions: [
      { id: 'explore-courses', label: 'Explore courses', hint: 'Start with free and beginner-friendly skills.', target: { pillar: 'learn', view: 'discover' } },
      { id: 'skill-journey', label: 'Start your Skill Journey', hint: 'Learn, practise and get your work reviewed.', target: { pillar: 'learn', view: 'skill-journey' } },
      { id: 'skill-passport', label: 'Build your Skill Passport', hint: 'Verified skills and proof under your @username.', target: { pillar: 'learn', view: 'passport' } },
      { id: 'opportunities', label: 'See opportunities', hint: 'Apply for work that matches your passport.', target: { pillar: 'learn', view: 'opportunities' } },
      { id: 'work-path', label: 'Explore working with HOWDI', hint: 'Review skills and verification needed to offer services through Work.', target: { pillar: 'works', view: 'become' } },
      { id: 'learning-community', label: 'Find learning communities', hint: 'Discover available groups and learn with others on Connect.', target: { pillar: 'connect', view: 'communities' } },
      { id: 'sell-creations', label: 'Explore selling your creations', hint: 'Continue to Shop vendor setup. Approval and publishing requirements still apply.', target: { pillar: 'shop', view: 'vendor' } },
    ],
  },
  institutes: {
    slug: 'institutes',
    title: 'HOWDI for Institutes & Colleges',
    tagline: 'Bring your teaching to learners who want real skills.',
    intro:
      'Explore practical training for your learners, campus services and community connections. Apply separately to register your organisation with HOWDI.',
    journey: ['Create courses', 'Teach live', 'Review proof', 'Verify skills'],
    actions: [
      { id: 'teach', label: 'Teach on HOWDI', hint: 'Set up as a Teacher and publish your first course.', target: { pillar: 'learn', view: 'teach' } },
      { id: 'live-classes', label: 'Explore live classes', hint: 'Discover available live learning sessions.', target: { pillar: 'learn', view: 'live' } },
      { id: 'browse-catalogue', label: 'Browse the catalogue', hint: 'See what learners are studying today.', target: { pillar: 'learn', view: 'discover' } },
      { id: 'programmes', label: 'Explore training programmes', hint: 'See available partner programmes and their enrollment requirements.', target: { pillar: 'learn', view: 'community' } },
      { id: 'institute-apply', label: 'Register your institute or college', hint: 'Submit your organisation for review. Browsing does not grant staff access.', target: { pillar: 'learn', view: 'institute' } },
      { id: 'campus-services', label: 'Find campus services', hint: 'Search available local services in Work and review providers before booking.', target: { pillar: 'works', view: 'discover' } },
      { id: 'student-showcase', label: 'Showcase student-made products', hint: 'Use Shop vendor setup with the relevant permissions and creator consent.', target: { pillar: 'shop', view: 'vendor' } },
      { id: 'institution-community', label: 'Connect with learning communities', hint: 'Browse groups or use Connect’s existing community creation flow.', target: { pillar: 'connect', view: 'communities' } },
    ],
  },
  startups: {
    slug: 'startups',
    title: 'HOWDI for Startups & Small Businesses',
    tagline: 'Find skilled people, sell your products, grow your audience.',
    intro:
      'Get help from skilled workers, open a storefront for what you make, and build a following, all under one account.',
    journey: ['Find talent', 'Launch a storefront', 'Grow your audience'],
    actions: [
      { id: 'find-workers', label: 'Find skilled workers', hint: 'Browse services and request a booking.', target: { pillar: 'works', view: 'discover' } },
      { id: 'open-storefront', label: 'Open a storefront', hint: 'Sell as a Vendor inside Shop.', target: { pillar: 'shop', view: 'vendor' } },
      { id: 'grow-audience', label: 'Grow your audience', hint: 'Create posts, Vibes and Articles for your community.', target: { pillar: 'connect', view: 'create' } },
      { id: 'source-products', label: 'Source products and materials', hint: 'Search the available Shop catalogue. Prices and stock come from each listing.', target: { pillar: 'shop', view: 'catalogue' } },
      { id: 'team-training', label: 'Explore team training', hint: 'Find published courses and review the learning options for your team.', target: { pillar: 'learn', view: 'discover' } },
      { id: 'partnerships', label: 'Find communities and collaborators', hint: 'Explore Connect groups and their joining requirements.', target: { pillar: 'connect', view: 'communities' } },
      { id: 'startup-apply', label: 'Register your business', hint: 'Submit a startup or small business application for review.', target: { pillar: 'learn', view: 'startup' } },
    ],
  },
});

export const SEGMENT_SLUGS = Object.freeze(Object.keys(SEGMENTS));

export function getSegment(slug) {
  return typeof slug === 'string' && Object.prototype.hasOwnProperty.call(SEGMENTS, slug) ? SEGMENTS[slug] : null;
}
