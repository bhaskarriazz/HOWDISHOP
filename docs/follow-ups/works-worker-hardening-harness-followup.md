# Follow-up: Works worker hardening test harness scope

The C2 application source has `pathname` in the live request handler scope. `backend/tests/works-worker-hardening.test.cjs` extracts the `/api/worker/applications` route body into a standalone `AsyncFunction` but omits `pathname` from the function parameters. The existing test then raises `ReferenceError: pathname is not defined` at the route's `progressiveSubmit` expression. This is a hermetic test-harness defect; the route receives `pathname` at runtime from the enclosing request handler.

Follow-up acceptance criteria:

- Pass `pathname` into every extracted route body that references it (or use a dedicated harness context that mirrors the server handler bindings).
- Keep the Works application and B1 runtime behavior unchanged.
- Re-run `node backend/tests/works-worker-hardening.test.cjs` and the related Works PostgreSQL route suite.