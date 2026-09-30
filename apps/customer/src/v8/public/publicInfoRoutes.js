// Public information routes live outside the six-pillar navigation.
// Keep this file data-only so route behavior can be regression-tested without React.
export const PUBLIC_INFO_ROUTES = Object.freeze({
  privacy: "/privacy",
  "data-rights": "/data-rights",
  help: "/help",
  contact: "/contact",
  about: "/about",
  team: "/team",
});

const PATH_TO_PAGE = Object.freeze({
  "/privacy": "privacy",
  "/data-rights": "data-rights",
  "/help": "help",
  "/faq": "help",
  "/contact": "contact",
  "/about": "about",
  "/team": "team",
});

export function publicInfoPageForPath(pathname) {
  const path = String(pathname || "/").split("?")[0].replace(/\/+$/, "") || "/";
  return PATH_TO_PAGE[path] || null;
}

export function publicInfoPathForPage(page) {
  return PUBLIC_INFO_ROUTES[String(page || "")] || null;
}

export const PUBLIC_INFO_LINKS = Object.freeze([
  ["about", "About HOWDI"],
  ["privacy", "Privacy"],
  ["data-rights", "Your data"],
  ["help", "Help & FAQ"],
  ["contact", "Contact"],
  ["team", "Our Team"],
]);
