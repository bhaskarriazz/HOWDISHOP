// MP-56 "HOWDI FOR" — segment landing pages (Students / Institutes / Startups).
// LOCKED (R01): these are audience landing pages, NOT a fifth pillar. Every action routes INTO one of the
// four existing pillars; no feature logic lives here (R06/R07/R08). Content is data so Admin can own it later.

export const PILLARS = Object.freeze(['connect', 'shop', 'works', 'learn']);

/** Each action points at { pillar, view }. Real URLs are resolved in routes.js (single place to adjust). */
export const SEGMENTS = Object.freeze({
  students: {
    slug: 'students',
    title: 'HOWDI for Students',
    tagline: 'Learn a skill, prove it, and start earning.',
    intro:
      'Go from learning to earning in one place. Build real skills, collect proof, and find work that fits what you can do.',
    journey: ['Learn', 'Practice', 'Prove', 'Create', 'Earn', 'Grow'],
    actions: [
      { id: 'explore-courses', label: 'Explore courses', hint: 'Start with free and beginner-friendly skills.', target: { pillar: 'learn', view: 'discover' } },
      { id: 'skill-journey', label: 'Start your Skill Journey', hint: 'Learn, practise and get your work reviewed.', target: { pillar: 'learn', view: 'skill-journey' } },
      { id: 'skill-passport', label: 'Build your Skill Passport', hint: 'Verified skills and proof under your @username.', target: { pillar: 'learn', view: 'passport' } },
      { id: 'opportunities', label: 'See opportunities', hint: 'Apply for work that matches your passport.', target: { pillar: 'learn', view: 'opportunities' } },
    ],
  },
  institutes: {
    slug: 'institutes',
    title: 'HOWDI for Institutes',
    tagline: 'Bring your teaching to learners who want real skills.',
    intro:
      'Share courses and live classes with a community that learns by doing, and help your learners prove what they can do.',
    journey: ['Create courses', 'Teach live', 'Review proof', 'Verify skills'],
    actions: [
      { id: 'teach', label: 'Teach on HOWDI', hint: 'Set up as a Teacher and publish your first course.', target: { pillar: 'learn', view: 'teach' } },
      { id: 'live-classes', label: 'Host live classes', hint: 'Run sessions and keep learners engaged.', target: { pillar: 'learn', view: 'live' } },
      { id: 'browse-catalogue', label: 'Browse the catalogue', hint: 'See what learners are studying today.', target: { pillar: 'learn', view: 'discover' } },
    ],
  },
  startups: {
    slug: 'startups',
    title: 'HOWDI for Startups',
    tagline: 'Find skilled people, sell your products, grow your audience.',
    intro:
      'Get help from skilled workers, open a storefront for what you make, and build a following, all under one account.',
    journey: ['Find talent', 'Launch a storefront', 'Grow your audience'],
    actions: [
      { id: 'find-workers', label: 'Find skilled workers', hint: 'Browse services and request a booking.', target: { pillar: 'works', view: 'discover' } },
      { id: 'open-storefront', label: 'Open a storefront', hint: 'Sell as a Vendor inside Shop.', target: { pillar: 'shop', view: 'vendor' } },
      { id: 'grow-audience', label: 'Grow your audience', hint: 'Create posts, Vibes and Articles for your community.', target: { pillar: 'connect', view: 'create' } },
    ],
  },
});

export const SEGMENT_SLUGS = Object.freeze(Object.keys(SEGMENTS));

export function getSegment(slug) {
  return typeof slug === 'string' && Object.prototype.hasOwnProperty.call(SEGMENTS, slug) ? SEGMENTS[slug] : null;
}
