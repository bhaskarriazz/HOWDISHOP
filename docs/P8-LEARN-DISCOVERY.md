# P8 — Learn Discovery + learning-to-commerce (BUILD/REVIEW)

**Status: BUILD/REVIEW. Founder visual walkthrough pending. Not FINAL.**
Branch `codex/p7-p8-learn-discovery`, based on `ad0f129` + CodeRabbit P7 V2 (`bb6f7b8`, imported unchanged as `5accf97`).
P7-HOWDI-FOR / K5-HF-01 remains BUILD/REVIEW (visual direction accepted, Founder final walkthrough pending).

## Tracker mapping

| ID | Result | Where |
|---|---|---|
| K5-LD-01 / LRN-DISC-001 working filters | Done | `backend/learn-discovery-v8.cjs`, `v8/learn/LearnDiscover.jsx` |
| LRN-DISC-002 search, paging, shareable URL | Done | same + `v8/learn/learnDiscovery.js`, App URL sync |
| LRN-DISC-003 evidence-backed cards | Done | `v8/learn/CourseCard.jsx`, `courseCard()` in `learn-v8.cjs` |
| LRN-PATH-001 Find My Learning Path | Done | `PathFinder` in `v8/learn/LearnJourney.jsx`, `learnJourneyModel.js` |
| LRN-PROG-001 Today's Next Step + Project Journey | Done | `backend/learn-journey-v8.cjs`, `NextStep`, `JourneyTrack` |
| LRN-MAT-001 Materials Checklist → Shop | Done | `/courses/{CRS}/materials`, `MaterialsChecklist`, App `howdi:v8-open` |
| LRN-WORK-001 Show My Work + teacher feedback | Done (moderation/report flow not added) | `/courses/{CRS}/work`, `/work/{EVD}/media`, `/teach/work/{EVD}/review` |
| LRN-SELL-001 Ready to Sell | Done (draft only) | `ReadyToSell` → existing `POST /api/v8/vendor/products` |
| LRN-NAV-001 simplified learner navigation | Not started — needs Founder visual approval first | Learn navigation unchanged |
| TG-LRN-01/02/03 | Evidence below | tests + browser proof |
| TG-LRN-04/05/06 | Evidence below | tests + browser proof |

## Discovery (`/learn/courses`)

Query parameters (also the API contract): `q`, `goal` (certificate · project · sell), `lang` (values present in the published
catalogue), `level`, `price` (free · under500 · 500to2000 · over2000), `skill`, `format` (video · reading · live), `time`
(under1h · 1to3h · over3h), `materials` (none · list), `sort` (relevance · newest · learners · shortest · price_low · price_high),
`offset`, `limit` (1–48, default 12). The P7 `from=for-*` marker is preserved in the URL and never sent to the API.
Every value maps to a real column; unknown values are dropped server-side and the applied set is echoed back.
Goal is derived transparently: certificate → `certificate_enabled`, project → `project_required`, sell → skill "Business & Selling".
"Most learners" sorts by the real enrolment count; no Bestseller/Popular labels exist. The legacy first-8 grid is no longer
reachable and its positional badges and hard-coded 4.8 rating were removed.

Cards show only returned metadata: outcome, teacher @handle, skill, level, language, format, duration, support (live class /
certificate), course price, materials estimate shown separately (`v8_materials_cost`, optional, teacher-entered), preview lesson,
Save (private, `howdi_v8_learn_saves`).

Responsive: 1440 sticky filter panel + grid · 768 quick-filter pills + 2 columns + side sheet · 390 skill rail + Filters bottom
sheet (portalled above the dock) + single-column image cards; 16px inputs, 44px touch targets.

## Learner journey

- Next step / journey milestones come only from entitlement, lesson progress, checklist, evidence status and certificate records.
  The chosen step is actionable (lesson, materials, share, revise) before waiting states.
- Materials checklist stores only the course's own items; Shop receives only the item name (existing v8-open event + notice).
- Show My Work: entitled learners only; JPG/PNG/WebP ≤5 MB or MP4/WebM/MOV ≤20 MB, magic-byte checked, stored in the private
  folder; readable only by the learner and that course's teacher through an authorised JSON read (`private, no-store`).
  One pending share at a time, up to 3 attempts, retry after a revision, none after acceptance. Teachers accept or request a
  revision (feedback required) once per share; both sides are notified. New public code prefix `EVD`.
- Ready to Sell appears only after accepted work; the worksheet is the learner's own numbers and says it predicts nothing.
  It calls the existing vendor API, which only creates drafts, requires an approved vendor and keeps publish validation in Shop.
- Find My Learning Path relaxes level → time → language → goal until real courses match, states matched vs widened criteria,
  stores nothing and makes no outcome promise.

## Verification (this branch)

- Backend: `tests/learn-discovery-v8.test.cjs` 10/10; `tests/v8-pg/14-learn-p8.cjs` 51/51 (sandbox and no-sandbox);
  `tests/v8-pg/11-learn.cjs` 39/39 and 37/37; full `tests/v8-pg/run.cjs` at closure (see report).
- Client: P7 `scripts/test-howdi-for.mjs` 26/26, registration regression 1/1, `learnDiscovery.test.mjs` 10/10,
  `learnJourneyModel.test.mjs` 5/5; customer build passes (existing chunk-size warning).
- Browser (Chrome 154 via playwright-core, synthetic scratch data): Discovery 31/31, learner journey 51/51, journey API probes
  31/31, P7 regression on the combined build 44/44 — screenshots at 390/768/1440 in the evidence package.

## Remaining

Founder visual walkthrough for P7 and P8; LRN-NAV-001 after visual approval; a report/moderation flow for shared work;
teacher-side editing of materials/estimate on existing courses; per-lesson "project step" metadata if teachers need finer
milestones; paid-course checkout was not re-verified in the browser (unchanged API, covered by 11-learn).
