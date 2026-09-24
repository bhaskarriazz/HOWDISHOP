# Stage 3 — Progressive Worker and Vendor Onboarding

**Baseline:** `c93a5cf` (Stage 2B verified)
**Branch:** `stage3-progressive-onboarding`
**Scope:** Worker and Vendor applicant journeys only. No Admin/Teacher/Worker Portal activation, merge, push or deployment.

## What exists

- Worker application table and a final-submit route exist, but the customer UI renders every Worker field in one long form.
- Vendor application has only two visual steps and neither journey can save/resume a signed-in applicant's draft.
- Existing application responses expose internal database-linked fields. Stage 3 client responses will use only a public application code and non-sensitive state.

## Production contract

| Capability | Actor | Route | Safe response |
|---|---|---|---|
| Read own draft | Signed-in applicant | `GET /api/onboarding/{worker|vendor}/draft` | `role`, `step`, `fields`, `updatedAt` |
| Save current step | Signed-in applicant | `PUT /api/onboarding/{worker|vendor}/draft` | same draft projection |
| Submit Worker | Signed-in applicant | `POST /api/onboarding/worker/submit` | `applicationCode`, `status`, `submittedAt` |
| Submit Vendor | Signed-in applicant | `POST /api/onboarding/vendor/submit` | `applicationCode`, `status`, `submittedAt` |
| Request application help | Applicant | `POST /api/works/whatsapp-assist` | `leadCode`, `status`, `createdAt` |

Rules:

1. The server derives the applicant only from the session. It rejects body/query/header actor IDs.
2. Drafts are keyed by the internal session user only; no internal identifier is returned.
3. Draft fields are allowlisted. Files are uploaded only with final Worker submission, never written into the draft JSON.
4. Submission returns no database ID, conversion ID, storage path, file name, phone or email.
5. A successful submit atomically creates the role request and removes the related draft.
6. Worker pre-accept privacy and all Worker Portal constraints remain unchanged.

## Build order

1. Add the session-scoped draft table, route helpers and safe projections.
2. Convert Worker UI into five saved steps: identity, work, earnings, verification, safety/review.
3. Convert Vendor UI into four saved steps: identity, business, catalogue, review/consent.
4. Add PostgreSQL tests for session ownership, draft isolation, field allowlisting, submit response redaction and role-request state.
5. Run build + browser checks at desktop, tablet and 390px, then request Gemini UX and DeepSeek security reviews.
