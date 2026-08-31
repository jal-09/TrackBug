# BugTrack — System Design

IFN636 Assessment 1.1 — Component 2 of 6
Companion document to `BugTrack-System-Design.drawio` (5 pages). Diagrams alone aren't sufficient
per the brief — this explains the rationale behind each view and how it traces back to the
Requirements & PM artefact.

**Provenance note:** this is the second full pass at this document. The first was built against a
divergent backup copy of the project; this pass was rebuilt against the confirmed authoritative
codebase (`trackbug-code-v2/trackbug`, pushed to `github.com/jal-09/TrackBug`) after that
discrepancy was caught. See Requirements & PM change log, CL-6.

## Why these five views (and no more)

The rubric rewards using multiple views only where each adds explanatory value, not diagram
quantity. Each page here answers a question the others can't:

| Page | Question it answers |
|---|---|
| 1 — Component Diagram | What are the modules, and who depends on whom? |
| 2 — Data Model | What is persisted, and how are the two collections related? |
| 3 — Sequence: Report & Triage | How does end-to-end workflow 1 actually execute, message by message, including failure paths? |
| 4 — Sequence: Triage to Resolution | How does end-to-end workflow 2 execute — a *different* slice of behaviour from workflow 1, not a repeat of it? |
| 5 — State Diagram: Bug Lifecycle | What should the `status` field's behaviour be — and where does the current code fall short of that? |

## Page 1 — Component Diagram

**Design choice:** structured around what's actually in the repo — `app.js` wires together
`routes/auth.js`, `routes/bugs.js`, `routes/admin.js`, `middleware/auth.js`, the Mongoose models,
and the EJS view engine, with sessions persisted via `connect-mongo` into the same MongoDB Atlas
cluster as the application data.

**Key dependency shown deliberately:** both `Bug Routes` and `Admin Routes` depend on
`Auth Middleware`, but with different guards — `requireLogin` alone for the former, `requireLogin`
+ `requireAdmin` for the latter (`routes/admin.js`'s `router.use(requireLogin, requireAdmin)`).
This directly demonstrates FR3 (admin-only routes enforced server-side) as a structural property,
not just a claim. `blockAdminFromUserPages` is also part of Auth Middleware — it stops an admin
session from viewing the reporter-only dashboard/report-bug pages, which is exercised in the
Page 4 sequence diagram.

**Traces to:** NFR6 (layered structure), FR1–FR8.

## Page 2 — Data Model (Class Diagram)

**Design choice:** two collections only, `User` and `Bug` — there is no comment or collaboration
table in this codebase (an earlier draft of both this document and the diagrams assumed one; it
doesn't exist here, see Requirements CL-6). The `Bug.assignedTo` relationship is drawn as nullable
and explicitly annotated with its real behaviour: `routes/admin.js` sets it to *the currently
editing admin's own session id* on every save, never to a value the admin chooses. This is not a
bug — `views/manage-bug.ejs` says so directly ("Saving will assign this bug to you") — so the
diagram documents it as an intentional design decision rather than a defect.

**Two distinct relationships from `User` to `Bug`** (`reporterId`, required; `assignedTo`,
nullable) are drawn as separate associations because they carry different cardinality and
lifecycle meaning: every bug has exactly one reporter set at creation, but may have zero or one
assignee set later during triage.

**Traces to:** FR4, FR7.

## Page 3 — Sequence: Report & Triage (end-to-end workflow 1)

Covers BT-4 → BT-8. Chosen as a sequence diagram because the rubric wants behavioural modelling of
the actual client/server/database message flow, and this workflow's complexity is in *who is
allowed to do what, and what happens when they aren't* — captured as four alt/error annotations
rather than happy-path only:

- Unauthenticated submission → `requireLogin` flashes a message and redirects to `/login`
- Missing/invalid field on the report-bug form (empty title, title under 3 characters, an
  out-of-enum category or priority) → flash error, redirected back to the form
- Non-admin calling `/admin` directly → `requireAdmin` flashes "Administrator access required."
  and redirects to `/dashboard` — **not a hard HTTP 403.** This is a real, deliberate difference
  from a typical API-style guard: the app never breaks the page, it always lands the user
  somewhere sensible.
- Invalid priority/status value on the triage form → rejected with a flash error *before* any
  database write

## Page 4 — Sequence: Triage to Resolution (end-to-end workflow 2)

Covers the rest of FR7 (progression to `Resolved`) plus FR5. This is deliberately a *different*
slice of behaviour from workflow 1, not a re-run of it: it starts from a bug that's already been
triaged once (status `In Progress`), shows an admin revisiting it and completing it, and then shows
the Reporter independently checking their own dashboard afterwards to see the final state — closing
the loop without any comment thread or verify/reopen mechanism, because neither exists in this
codebase (see Requirements CL-6). The one alt path worth calling out here is
`blockAdminFromUserPages`: if an admin's session tries to load `/dashboard`, they're redirected to
`/admin` instead — the reporter-facing view is never shown to an admin session at all.

## Page 5 — State Diagram: Bug Lifecycle

This page models *intended* behaviour rather than only *observed* behaviour, and says so
explicitly. `views/manage-bug.ejs` renders all three status options in the `<select>` regardless of
the bug's current status, and `routes/admin.js`'s `POST /admin/bug/:id` applies whatever value is
submitted as long as it's a member of the enum — there's no check that the transition itself makes
sense (an admin can jump straight from `Open` to `Resolved`, or move a `Resolved` bug back to
`Open`).

**Why include a diagram of behaviour the code doesn't enforce?** Because the rubric rewards
identifying gaps and reasoning about them, not just describing what exists. This diagram is the
target for a concrete, low-effort improvement (validate the submitted `status` against allowed
transitions from the bug's current state, server-side) that directly strengthens NFR2 — a good
candidate for the "make a change and propagate it" part of the live demonstration.

## Traceability Summary

| Design artefact | Requirements it satisfies |
|---|---|
| Component Diagram | NFR6, FR1–FR3, FR6 |
| Data Model | FR4, FR7 |
| Sequence — Report & Triage | FR2–FR4, FR6, FR7, NFR1, NFR2 |
| Sequence — Triage to Resolution | FR5, FR7 |
| State Diagram | FR7, NFR2 (as a planned enhancement) |
