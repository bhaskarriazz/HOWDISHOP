const ROUTES = Object.freeze({
  person: /^\/@[a-z0-9._]{3,30}$/i,
  product: /^\/shop\/products\/PRD-[0-9A-F0-9]{12}$/,
  worker: /^\/works\/workers\/[A-Za-z0-9][A-Za-z0-9_-]{2,63}$/,
  course: /^\/learn\/courses\/CRS-[0-9A-F0-9]{12}$/,
});

const TARGETS = Object.freeze({ person: "Connect", product: "Shop", worker: "Work", course: "Learn" });
const QUERY_STOP = new Set(["a", "an", "the", "i", "me", "my", "we", "our", "you", "your", "to", "for", "of", "in", "on", "at", "with", "from", "by", "and", "or", "is", "are", "do", "does", "can", "could", "please", "find", "search", "show", "look", "need", "want", "get", "buy", "book", "near", "nearby", "around", "tomorrow", "today", "tonight", "next", "this", "between", "before", "after"]);

export function sparkSearchQuery(question) {
  return String(question || "").normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/)
    .filter((word) => word.length >= 2 && !QUERY_STOP.has(word) && !/^\d+$/.test(word)).slice(0, 6).join(" ").slice(0, 80);
}

export function normalizeSparkResults(results) {
  if (!Array.isArray(results)) return [];
  return results.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    if (!Object.hasOwn(item, "type") || !Object.hasOwn(item, "route") || !Object.hasOwn(item, "title")) return [];
    const type = String(item.type || "");
    const route = String(item.route || "");
    if (!Object.hasOwn(ROUTES, type) || !ROUTES[type].test(route)) return [];
    const title = String(item.title || "").replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, 100);
    if (!title) return [];
    return [{ type, title, subtitle: String(item.subtitle || "").replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, 160), route }];
  });
}

export function sparkTargetFor(type) {
  return Object.hasOwn(TARGETS, type) ? TARGETS[type] : "";
}
