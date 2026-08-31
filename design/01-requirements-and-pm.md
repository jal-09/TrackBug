# BugTrack — Problem, Requirements & Project Management

IFN636 Assessment 1.1 — Component 1 of 6
Status: Draft v3 — reconciled against the confirmed production codebase
(`github.com/jal-09/TrackBug`, local working copy `trackbug-code-v2/trackbug`)

> **A note on this document's own history.** Sections 1–8 below were rewritten twice before they
> matched the real code — first against an assumed MERN/React stack, then against a divergent
> Express copy that turned out to be a decoy backup. §9 (Change & Decision Log) keeps every one of
> those corrections rather than quietly erasing them, because that reconciliation process — a real
> blocker, a real wrong turn, a real fix — is exactly the kind of evidence the assignment asks for.
> The tables above the log are kept clean and current; the log is where the messy true story lives.

## 1. Problem Statement

Small software teams need a lightweight way to log, triage and resolve defects with clear
ownership and visible status, without adopting the overhead of an enterprise tool such as Jira.
**BugTrack** is a minimal, self-hosted bug-tracking web application that lets a **Reporter** log a
defect — classified by category and priority — and an **Admin** action it through to resolution,
with both roles able to see the bug's current state at any time.

The problem is deliberately bounded to keep the two end-to-end workflows meaningful rather than
shallow:

- **In scope:** account registration/login, role-based access, bug reporting with category and
  priority classification, an admin triage view of every bug, and a status lifecycle from `Open`
  through `In Progress` to `Resolved`.
- **Out of scope (non-goals for this iteration):** threaded comments, a reporter-driven
  verify/reopen step, admin user management (deactivating accounts), keyword search, and dashboard
  summary counts. These were explored in earlier drafts of this document and deliberately cut —
  see CL-6 — so the boundary is a recorded decision, not a silent gap.

## 2. Stakeholders & User Roles

| Role | Who they represent | Primary goals |
|---|---|---|
| **Reporter** (`role: user`) | Any team member — QA, support, or a developer — who encounters a defect | Log a bug quickly with enough context (category, priority) to be actionable, and track its status |
| **Admin** | Technical lead responsible for the backlog | See every incoming bug in one place, triage it (priority + status), and drive it to `Resolved` |

**Meaningful interaction between roles:** a Reporter's submission is inert data — sitting at
`Open`, unassigned — until an Admin opens it and updates its priority/status, at which point they
are automatically recorded as its assignee. A Reporter can see that progress on their own
dashboard but cannot act on any bug but their own; an Admin can act on every bug but did not create
any of them. Neither role can complete the reporting-to-resolution workflow alone.

## 3. Constraints & Dependencies

- Must be deployed and reachable via a single EC2 instance (assignment constraint).
- Must use persistent storage — no in-memory-only data (assignment constraint).
- Individual project, ~10–15 hours effort — scope is kept small and coherent rather than
  feature-heavy, per the brief's own grading philosophy.
- Two user roles minimum, two complete end-to-end workflows minimum (assignment constraint).
- **Stack:** Node.js + Express + EJS server-rendered views + MongoDB via Mongoose, with
  `express-session`/`connect-mongo` for session-based auth and a small custom flash-message
  middleware for user feedback. This codebase is a deliberate **Express/MongoDB reimplementation of
  an earlier Flask/SQLite prototype** (see CL-6) — the validation rules, role logic, and data shape
  were carried over from that prototype rather than designed from scratch a second time, which is
  why several route and field names still echo it (e.g. `reporterId`, the 3-value status enum).

## 4. Functional Requirements

Each requirement has a stable ID, a MoSCoW priority, the responsible role, and a measurable
acceptance criterion, matched against the actual routes in `routes/auth.js`, `routes/bugs.js`, and
`routes/admin.js`.

| ID | Requirement | Role | Priority | Acceptance Criteria |
|---|---|---|---|---|
| FR1 | User can register an account (name, email, password, confirm password) | Both | Must | Given all fields are completed, passwords match, and the password is ≥6 characters, when submitted, then an account is created with `role: "user"` and a unique email is enforced. Any violation shows a flash error and redirects back to the form. |
| FR2 | User can log in and receive a role-scoped session | Both | Must | Given valid credentials, when the user logs in, then `req.session` stores their id/name/role and they're redirected to `/admin` (admin) or `/dashboard` (reporter). Invalid credentials show a flash error, no session is created. Visiting `/login` while already logged in redirects straight to the right dashboard. |
| FR3 | Admin-only routes are enforced server-side | Admin | Must | `router.use(requireLogin, requireAdmin)` on `routes/admin.js` means every `/admin/*` route rejects a non-admin session server-side, regardless of what the UI shows or hides. |
| FR4 | Reporter can submit a new bug with title, description, category, and priority | Reporter | Must | Given all fields are completed, title is ≥3 characters, category is one of `UI/Functionality/Performance/Security/Other`, and priority is one of `Low/Medium/High`, when submitted, then a bug is created with `status: "Open"` and `reporterId` set to the logged-in user. Any violation shows a flash error and redirects back to the form. |
| FR5 | Reporter can view their own submitted bugs with current status | Reporter | Must | Given the reporter has ≥1 bug, when they open `/dashboard`, then they see only bugs where `reporterId` matches their session, sorted newest first. |
| FR6 | Admin can view every bug with reporter and assignee names resolved | Admin | Must | Given bugs exist, when the admin opens `/admin`, then all bugs are listed with `reporterId` and `assignedTo` populated to display names, sorted newest first. |
| FR7 | Admin can triage a bug: set priority and status; the editing admin becomes the assignee | Admin | Must | Given a bug and a valid priority/status pair, when the admin submits `/admin/bug/:id`, then the bug's `priority`, `status`, and `assignedTo` (= the submitting admin's own id) are updated and persisted. An invalid priority or status is rejected with a flash error before any write. |
| FR8 | User-facing feedback uses one-time flash messages | Both | Should | Given any action that redirects (register, login, report-bug, admin update), when the redirect completes, then a flash message describing the outcome is shown once and does not reappear on a subsequent page load. |
| FR9 *(cut)* | ~~Reporter/Admin comment thread on a bug~~ | — | Won't | Explored in an earlier draft; not present in the confirmed codebase and deliberately not added back — see CL-6. |
| FR10 *(cut)* | ~~Reporter verifies/reopens a Resolved bug~~ | — | Won't | Same as above — the real status enum has no `Closed`/`Reopened` value; an Admin can set `Resolved` directly and that is the end of the modelled lifecycle. |
| FR11 *(cut)* | ~~Admin deactivates a user account~~ | — | Won't | No user-management route exists in `routes/admin.js`; out of scope for this submission. |

## 5. Non-Functional Requirements

| ID | Requirement | Priority | Acceptance Criteria |
|---|---|---|---|
| NFR1 | Passwords are hashed at rest; sessions are server-side and signed | Must | `bcryptjs` hashes every password before `User.create`; `express-session` + `connect-mongo` store session data in MongoDB rather than a readable client cookie. Inspecting the `users` collection shows no plaintext passwords. |
| NFR2 | All inputs are validated server-side, not just in the browser | Must | Every POST route (`register`, `login`, `report-bug`, admin `bug/:id`) re-validates required fields and enum membership in the route handler itself, independent of any client-side/HTML validation — confirmed by calling the routes with invalid payloads directly. |
| NFR3 | Application is reachable over the public internet via the EC2 instance | Must | The deployed URL loads the login page from an unauthenticated network. |
| NFR4 | Each core workflow (report a bug; triage a bug) is completable in ≤4 screens | Should | Walkthrough count of screens/clicks from dashboard to task completion. |
| NFR5 | Secrets are never committed to version control | Must | `.env` holds `MONGODB_URI`/`SESSION_SECRET`/`PORT` and is git-ignored; `.env.example` (placeholders only) is the committed template. See CL-7 — this was a real incident, not a hypothetical. |
| NFR6 | API follows a layered structure (routes → middleware → models) with consistent conventions | Should | `app.js` wires `routes/*.js` (thin controllers) → `middleware/auth.js` (cross-cutting auth/flash) → `models/*.js` (Mongoose schemas) → MongoDB. Documented in the System Design artefact. |

## 6. Product Backlog

Organised as epics decomposed into user stories, each with a stable ID (`BT-n`) and a dependency.
IDs are referenced again in the Git/JIRA linkage evidence. Items cut after reconciling with the
real codebase (see CL-6) are kept, struck through, rather than deleted, so the backlog shows real
decisions rather than a rewritten history.

### Epic A — Authentication & Roles
- **BT-1** — As a new user, I can register an account, so that I can access BugTrack. *(depends on: none)*
- **BT-2** — As a registered user, I can log in, so that I reach my role-appropriate dashboard. *(depends on: BT-1)*
- **BT-3** — As the system, I enforce role checks on every protected route, so that a Reporter cannot perform Admin actions even by calling the route directly. *(depends on: BT-2)*

### Epic B — Bug Reporting (Reporter-facing)
- **BT-4** — As a Reporter, I can submit a new bug with title/description/category/priority, so that it's recorded and classified. *(depends on: BT-2)*
- **BT-5** — As a Reporter, I can view a list of my submitted bugs with status, so that I can track progress. *(depends on: BT-4)*
- ~~**BT-6** — As a Reporter, I can open a bug's full detail and comment history.~~ *(cut — no comment feature; see CL-6)*

### Epic C — Triage (Admin-facing, cross-role)
- **BT-7** — As an Admin, I can view all bugs with reporter/assignee names resolved, so that I have full context at a glance. *(depends on: BT-4)*
- **BT-8** — As an Admin, I can triage a bug (priority, status; I become the assignee), so that work is actioned and ownership is clear. *(depends on: BT-7)*
- ~~**BT-9** — As a Reporter or Admin, I can comment on a bug.~~ *(cut — see CL-6)*
- ~~**BT-10** — As a Reporter, I can verify a resolved bug and close it, or reopen it.~~ *(cut — status enum has no Closed/Reopened value; see CL-6)*

### Epic D — Admin User Management *(cut in full)*
- ~~**BT-11** — As an Admin, I can view registered users and deactivate one.~~ *(cut — no such route exists; see CL-6)*

### Epic E — Dashboard & Search *(cut in full)*
- ~~**BT-12** — Status counts on dashboard.~~ / ~~**BT-13** — Keyword search.~~ *(cut — not present, not required for minimum scope; see CL-6)*

### Epic F — User Feedback (added)
- **BT-14** — As a user, I see a one-time flash message after any action (success or error), so that I always know what just happened. *(depends on: BT-1)*

The dependency chain (BT-1 → BT-2 → BT-3/BT-4 → BT-5/BT-7 → BT-8, with BT-14 threaded through
everything) is what the two end-to-end workflows below are built on: nothing in Epic C can be
demoed before Epic A and BT-4 exist.

## 7. Iteration Plan

### Iteration 1 — Foundation
**Goal:** a Reporter can register, log in, and submit/view bugs; an Admin can log in, see every
bug, and triage it. This alone is one complete end-to-end slice (report → triage) and is the
version this project was actually ported from an existing Flask/SQLite prototype to build.

- Scope: BT-1 → BT-8
- Risk identified going in: role-check logic could be applied inconsistently across routes if
  done ad hoc. *Mitigation:* centralise it in `middleware/auth.js` (`requireLogin`, `requireAdmin`,
  `blockAdminFromUserPages`) applied once per router rather than duplicated per handler.
- **Real blocker encountered:** partway through this iteration, two different local copies of a
  similarly-named Express project (`copy_trackbug`, a backup/testing copy) and this actively
  developed one had diverged, and a GitHub repository under a different name (`BugTrack`, a
  separate Flask/SQLite implementation) was mistaken for the real submission. Both the
  Requirements doc and the System Design diagrams were built against the wrong codebase twice
  before this was caught and corrected.
- **Review outcome → change:** the actual codebase (`trackbug-code-v2/trackbug`, pushed to
  `github.com/jal-09/TrackBug`) was confirmed as authoritative, and this document plus the System
  Design diagrams were rebuilt against it. Logged as CL-6.

### Iteration 2 — Hardening & deployment (in progress)
**Goal:** fix the credential-exposure issue found while reconciling the codebase, get real Git
history in place, and deploy to EC2 — completing the demonstrable second half of the workflow
(triage through to `Resolved`).

- Scope: NFR5 (secrets hygiene), Git version-control practice, EC2 deployment
- **Real blocker encountered:** `.env.example` in one of the working copies contained a live
  MongoDB Atlas connection string (real username/password), and `.gitignore` was configured to
  allow that exact file to be committed. It had not yet been pushed, but the repository is public.
  **Review outcome → change:** `.env.example` was sanitised to placeholders, a real `.env` was
  created (git-ignored) for local development, and the Atlas password should be rotated as a
  precaution regardless of whether it was ever actually pushed. Logged as CL-7.
- Risk identified going in: EC2 security-group misconfiguration (open inbound ports) is the most
  likely way to lose NFR1/NFR5-adjacent marks even with correct application-level security.
  *Mitigation:* restrict inbound rules to SSH (22, IP-restricted) and HTTP/HTTPS only; document the
  rule set in the Deployment artefact.

## 8. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Role checks bypassed via direct route calls | Medium | High | Centralised auth middleware (FR3), tested by calling `/admin/*` with a non-admin session |
| Working from the wrong codebase/repo (materialised — see CL-6) | — (occurred) | High | Explicit confirmation of the authoritative repo/folder before further work; documented in §9 |
| Committing real secrets (materialised — see CL-7) | — (occurred, caught before push) | High | `.gitignore` audited, `.env.example` sanitised, real `.env` kept local-only |
| EC2 security misconfiguration | Medium | High | Documented security-group rules; secrets via environment variables, never committed |
| Scope creep beyond the 10–15h estimate | Medium | Medium | Comments/reopen/user-management/search explicitly cut (§1, §6) rather than half-built |

## 9. Change & Decision Log

Every entry states *why* the change happened and which other artefacts it touches. Entries are
never rewritten or removed, including the ones that record getting something wrong — that's the
traceability evidence this section exists to provide.

| ID | When | Change | Reason | Artefacts impacted |
|---|---|---|---|---|
| CL-1 | Early draft | Proposed splitting a single `severity` field into separate `severity`/`priority` fields | Speculative, written before any real code was reviewed | *(superseded by CL-5, then made moot entirely by CL-6 — the real app has only `priority`)* |
| CL-2 | Early draft | Proposed an explicit `Reopened` status | Speculative | *(moot — see CL-6, the real status enum is `Open`/`In Progress`/`Resolved` only)* |
| CL-3 | Early draft | Proposed soft-delete instead of hard-delete | Speculative | *(moot — see CL-6, there is no delete route in the real app)* |
| CL-4 | Early draft | EC2 inbound rules restricted to 22/80/443 | Still correct and still planned | Deployment artefact, NFR3 |
| CL-5 | Mid-point | Connected an Express/EJS/MongoDB codebase (`copy_trackbug`) as ground truth, superseding an assumed React/JWT stack | First real-code check — but against the wrong copy of the project, as CL-6 later found | *(superseded by CL-6)* |
| CL-6 | Reconciliation | Confirmed the authoritative codebase is `trackbug-code-v2/trackbug` (pushed to `github.com/jal-09/TrackBug`) — **not** `copy_trackbug` (a divergent backup) and **not** the `BugTrack` Flask/SQLite repo (a related but separate implementation this app was ported from). Rewrote this entire document's FR/NFR/backlog tables to match: dropped comments, verify/reopen, and admin user-management (none exist in the real code); added the `category` field, the auto-assign-on-edit behaviour, and flash-message feedback (all present in the real code) | Three different codebases existed under confusingly similar names, and requirements/design work had been built against the wrong one twice. Getting this wrong a third time was the actual risk this entry mitigates | Every section of this document; System Design diagrams (full rebuild); UI/UX (not yet started — now correctly scoped) |
| CL-7 | Reconciliation | Found a real MongoDB Atlas connection string (live credentials) committed in plaintext inside `.env.example`, with `.gitignore` configured to allow that file to be tracked. Sanitised the example file to placeholders, generated a real local-only `.env`, confirmed nothing had been pushed yet | Public GitHub repo + a `.gitignore` rule that explicitly un-ignores the one file holding real secrets is a live leak waiting to happen, not a hypothetical one | `.env.example`, `.gitignore`, NFR5, deployment prerequisites (Atlas password rotation recommended) |

---
*Current as of the Iteration 2 reconciliation pass. Further entries are appended to §9, never
inserted into it, so the log's own order is part of the evidence.*
