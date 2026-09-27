// HOWDI V8 Connect pillar router. The fixed shell (rail, header, bottom bar) stays in App.jsx; this owns /connect/*.
//   /connect                    Connect hub (board 06 / 17)
//   /connect/vibe[/VIB-…]       Vibe viewer          /connect/vibe/create[?remix=VIB-…]   Create Vibe
//   /connect/live[/LIV-…]       Live                 /connect/spaces[/SPC-…]              Spaces
//   /connect/articles[/ART-…]   Articles             /connect/communities[/slug]          Communities, Groups, Channels
import { lazy, Suspense, useCallback, useState } from "react";
import "./connect.css";
import { useApi } from "./common";
import ConnectHub from "./Hub";
import VibeScreen from "./Vibe";
import VibeCreate from "./VibeCreate";
import { StoryViewer, StoryCreate } from "./Stories";
import { V8State } from "../V8Shell";

const LiveScreen = lazy(() => import("./Live"));
const SpacesScreen = lazy(() => import("./Spaces"));
const ArticlesScreen = lazy(() => import("./Articles"));
const CommunitiesScreen = lazy(() => import("./Communities"));

export function parseConnectPath(path) {
  const [p, qs] = String(path || "").split("?");
  const parts = p.split("/").filter(Boolean);
  return { section: parts[0] || "", id: parts[1] || "", sub: parts[2] || "", query: new URLSearchParams(qs || "") };
}

export default function V8Connect({ apiBase, getAuthHeaders, user, path, onNavigate, onRequireLogin, onOpenProfile, onOpenArea }) {
  const api = useApi(apiBase, getAuthHeaders);
  const [story, setStory] = useState(null); // {groups, index}
  const [storyCreate, setStoryCreate] = useState(false);
  const [hubKey, setHubKey] = useState(0);
  const { section, id, query } = parseConnectPath(path);
  const nav = useCallback((p) => onNavigate(p), [onNavigate]);
  // In-app routes from linked items: /shop/…, /learn/…, /works/…, /@handle, /connect/…
  const route = useCallback((r) => {
    const s = String(r || "");
    if (s.startsWith("/connect")) return onNavigate(s.replace(/^\/connect\/?/, ""));
    if (s.startsWith("/@")) return onOpenProfile(s.slice(2));
    const m = s.match(/^\/(shop|learn|works)(?:\/(.*))?$/);
    if (m) return onOpenArea(m[1], m[1] === "shop" ? "crochet" : (m[2] || "home"));
    return undefined;
  }, [onNavigate, onOpenProfile, onOpenArea]);
  const common = { api, user, onNav: nav, onRequireLogin, onOpenProfile, onRoute: route, apiBase, getAuthHeaders };
  let body;
  if (!section) body = <ConnectHub key={hubKey} {...common} onOpenStory={(groups, index) => setStory({ groups, index })} onCreateStory={() => setStoryCreate(true)} />;
  else if (section === "vibe" && id === "create") body = user ? <VibeCreate {...common} remixOf={query.get("remix") || ""} onDone={(key) => nav(`vibe/${key}`)} onCancel={() => nav("vibe")} /> : <V8State icon="lock" title="Sign in to create a Vibe" actionLabel="Sign in" onAction={onRequireLogin} />;
  else if (section === "vibe") body = <VibeScreen {...common} focus={/^VIB-[0-9A-F]{12}$/.test(id) ? id : ""} />;
  else if (section === "live") body = <LiveScreen {...common} focus={id} />;
  else if (section === "spaces") body = <SpacesScreen {...common} focus={id} />;
  else if (section === "articles") body = <ArticlesScreen {...common} focus={id} mode={query.get("mode") || ""} />;
  else if (section === "communities") body = <CommunitiesScreen {...common} focus={id} type={query.get("type") || ""} />;
  else body = <V8State icon="alert" title="Page not found" message="This Connect page doesn’t exist." actionLabel="Back to Connect" onAction={() => nav("")} />;
  return (
    <div className={`v8-page v8c-page ${section === "vibe" && id !== "create" ? "v8c-page-vibe" : ""}`}>
      <div className="v8-page-inner v8c-inner">
        <Suspense fallback={<div className="v8-card" style={{ padding: 24 }}><div className="v8-skel" style={{ height: 200 }} /></div>}>{body}</Suspense>
      </div>
      {story ? <StoryViewer groups={story.groups} start={story.index} api={api} signedIn={Boolean(user)} onRequireLogin={onRequireLogin} onOpenProfile={onOpenProfile} onClose={() => { setStory(null); setHubKey((k) => k + 1); }} /> : null}
      {storyCreate ? <StoryCreate api={api} onClose={() => setStoryCreate(false)} onPosted={() => { setStoryCreate(false); setHubKey((k) => k + 1); }} /> : null}
    </div>
  );
}
