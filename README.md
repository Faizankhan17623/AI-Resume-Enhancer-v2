# Resumify (AI Resume Enhancer)

A full-stack web application that helps job seekers improve their resumes using AI-powered
feedback, apply to real jobs on a built-in board, and helps recruiters post jobs and screen
candidates with proctored tests — with a full admin/support back office running it all.

**Live Demo:** [https://ai-resume-enhancer-v2.vercel.app/](https://ai-resume-enhancer-v2.vercel.app/)

## Features

### For job seekers

- **Authentication** — signup/login with OTP email verification, JWT-based sessions (httpOnly
  session cookie, never persisted client-side), per-account brute-force lockout (5 failed
  attempts locks the account for 15 minutes), and Google/GitHub OAuth
- **AI Resume Review** — upload a resume (PDF) + job description for an ATS-style AI review via
  Groq (`openai/gpt-oss-120b`); score breakdown, strengths, missing keywords, before/after
  rewrites. Pro adds keyword analysis and a learning roadmap; ProMax adds a recruiter
  first-impression read, red flags, and interview prep
- **ATS Formatting Scan** — a deterministic structural check (multi-column layouts, embedded
  images, missing text layer, non-standard fonts) independent of the AI's subjective review
- **Free Grammar/Spelling Check** — no AI credit spent
- **Resume Builder** — build a resume from structured form data across 11 templates with a live
  preview; export as a print-ready PDF or a real, ATS-safe DOCX file
- **Resume Library** — save parsed resumes for reuse across reviews, chats, and cover letters;
  rename, delete, set a default
- **Keyword Bank** — save and reuse frequently-missed keywords surfaced by reviews
- **AI Coach Chat** — a threaded conversation grounded in a resume + job description, with
  streaming replies and plan-limited message caps
- **Structured Mock Interview** (ProMax) — one AI-generated question at a time, scored 1-10 with
  feedback and a stronger sample answer; sessions saved with full history
- **AI Cover Letter Generator** (Pro+) — generated from a resume + job description, with an
  automatic "genericness" score to flag cliché phrasing
- **Job Search** (Pro+) — live web search for matching job postings via Tavily, plus a way to
  tailor one of your built resumes against a real job-search result
- **Public Job Board** — no login required to browse; an "Applied" badge shows on the board and
  the job page itself once you have (cross-referenced client-side, since the board is a genuinely
  public route). Applying is a real multi-step form (fresher vs. experienced, address, expected
  salary, education or work history, a PDF resume upload), not a one-click apply
- **My Applications** — track status (applied → invited to test → under review → hired/rejected,
  plus an invite-expired state if a test invite went unused) from a dedicated dashboard page, with
  a plain-language hint under each row explaining what that status actually means
- **Proctored Screening Tests** — before the exam clock starts, the candidate passes a camera
  check (a live self-preview, so a broken webcam is caught before the timer runs) and an internet
  speed check (≥5 Mbps, checked against a small backend-served probe, not a public file). Once
  running, a TF.js face-detection model tracks look-away violations in-browser (nothing is ever
  uploaded except a snapshot at the moment of an actual violation) and auto-submits the test if the
  candidate exceeds the job's configured warning limit. A test invite is only valid for 5 hours —
  the candidate gets a reminder email with about an hour left, and an expired invite can be
  re-sent by the recruiter with one click
- **Application Tracker** — a personal Kanban board (Applied/Interview/Offer/Rejected), separate
  from the job-board application flow, with outcome-linked analytics bucketed by ATS score
- **Gamification** — a consecutive-day activity streak and an anonymized leaderboard of top ATS
  scores
- **Onboarding Checklist** — a "Get started" progress card derived from real activity, dismisses
  itself for good once complete
- **Referral Program** — invite friends with a personal link; both sides get bonus AI credits on
  a successful signup+login, capped per referrer, with a full dashboard (week/month/year/custom
  date-range totals, invite list)
- **Portfolio & Report Sharing** — turn a built resume or a saved review into a public share link
  (no login required to view), with distinct framing for sharing with a friend vs. a recruiter
- **Homepage Testimonials** — share your story; goes through an Admin/Support moderation queue
  before appearing publicly
- **Account Self-Service** — inline-editable profile fields, per-type email notification
  opt-in/opt-out (streak, win-back, digest, monthly resume health check, interview-prep
  reminders), bonus credit history, export your own data as JSON, and delete your account with a
  2-day recovery window (logging back in undoes it)
- **In-App Notifications** — an unread-badge bell mirroring the email nudges

### For recruiters

- **Recruiter Onboarding** — direct signup (locked pending Admin approval) or apply from an
  existing candidate account; every action stays locked until an Admin approves the application
- **Job Postings** — draft → published → closed lifecycle, with an optional attached proctored
  screening test (a job can be published with or without one), real compensation details (a CTC
  range for paid roles, a duration + certificate flag for unpaid/internship roles), and an
  automatic 30-day expiry once published
- **Structured Applications** — candidates apply through a multi-step form (fresher vs.
  experienced, address, expected salary, education or work history, a real PDF resume upload)
  instead of a one-click apply
- **AI Fit-Scoring** — every application is scored automatically against the job description
  (0-100, tiered not-a-fit / can-get-it-done / hireable / best-fit), so recruiters can filter and
  rank applicants by fit before reading a single resume
- **Applicant Management** — filter by status, fit tier, or your own shortlist flag; review
  applicants ranked by AI fit score (then test score once available); a sequential resume viewer
  (cycle through every applicant's PDF, ranked order, without opening one tab per candidate); a
  "Candidate detail" panel with the full structured application (experience level, address,
  salary, education/work history); invite to test (single or bulk — sends a real email with the
  test link, plus a reminder before it expires) — a test must be published before it can be
  invited to, and an expired invite can be re-sent with one click; close/reject an application at
  any stage; record hire/reject outcomes (single or bulk), each emailed to the candidate
- **Per-Job Analytics** — a full funnel (views → applications → invited → completed →
  hired/rejected), conversion-rate cards, test performance stats, and a fit-tier-vs-hiring
  breakdown (which tier of applicant actually converts to a hire, for this job)
- **Cross-Job Analytics** — totals across every posting, ranked by hires, with each job's average
  applicant fit score
- **Job Deletion** — withdraw a posting outright; every applicant is emailed that it was withdrawn
- **New-Applicant Email Alerts** — an email the moment a candidate applies to one of your jobs,
  opt-out from your Account page
- **Recruiter Plans (Basic/Pro/ProMax)** — a separate subscription system from the User plans
  above, gating active job postings and AI-scored applicants per month, with a visible usage meter
  on the Account page
- **Recruiter AI Tools** (Pro/ProMax) — an AI job-description writer, an AI interview-question
  generator grounded in the job's own description, and AI candidate-summary write-ups, each with
  its own monthly quota
- **Recruiter Account Page** — the same self-service set candidates get: profile, edit profile,
  change password, email notifications, share your story, invite friends, export your data
  (posted jobs + received applications), delete account

### Admin & Support back office

- **Overview Dashboard** — stats, system health, AI usage/cost charts, unique-visitor and login
  traffic charts, at-risk-subscriber and referral-abuse signal panels, revenue and paid-conversion
  cards linking straight through to the relevant list
- **User Management** — search, role filter, ban/unban with the reason visible on hover, bonus
  credit grants (never a deduction — always a positive top-up, emailed to the user), a
  read-only profile/plan/status detail drawer, delete, impersonate
- **Role Changes Are Deliberately Restricted** — the only role transition possible from this UI is
  promoting a plain User to Support, and it's one-way. A Recruiter role is granted exclusively
  through the recruiter-application approval flow; Admin access is never reachable from this page
  at all. Bulk actions follow the same rule
- **Recruiter Applications** — a dedicated approval queue, separate from the general role editor
- **Recruiter Data Health** — a read-only view surfacing exactly the kind of thing that otherwise
  needs a manual database query to spot: published jobs whose attached test is still a draft
  (silently blocking "invite to test"), and test invites stuck past their expiry window because a
  scheduled job missed a run
- **Support Suspension** — a Support account can be suspended (one appeal allowed) or escalated to
  a distinct, harsher **permanent suspension** with no appeal path at all; a ban takes effect on
  the account's very next request, not just its next page navigation
- **Payments, Announcements, Testimonial Moderation, Feature Flags** (schedulable disable/re-enable
  with a required reason), a filterable/searchable/exportable **Audit Log**, CSV export, a
  **Security Panel** for account lockouts, and an Account-Deletion widget for the pending
  2-day-purge queue
- **Automated Admin Emails** — a weekly activity digest, an hourly AI cost/error-rate alert, and a
  congratulations email when a User is promoted to Support

## Tech Stack

**Frontend**
- React 19 + Vite 8
- Redux Toolkit for state management
- React Router for routing
- Tailwind CSS 4 for styling
- Axios for API calls
- TensorFlow.js (`@tensorflow-models/face-detection`) for in-browser proctored-test violation
  detection — the lighter 6-keypoint face detector, not the full 468-point face mesh; this
  feature only ever needed nose + eye positions for a 2D "looking away" check
- `vite-plugin-pwa` — installable PWA with a service worker; a new deployment is picked up on the
  next natural reload rather than an in-session update prompt

**Backend**
- Node.js + Express 5
- MongoDB with Mongoose 9 (**requires a replica set in production** — see below)
- JWT authentication (httpOnly cookie as the real credential, revoked instantly via a per-account
  `tokenVersion` counter on logout/password-change/account-deletion), bcrypt password hashing
- Groq SDK for AI-generated resume feedback — model is `openai/gpt-oss-120b`, set once in
  `Backend/utils/AiModel.js` and overridable via the `GROQ_MODEL` env var
- pdfkit (PDF) & docx (DOCX) for resume/report file generation
- Cloudinary for file storage
- Razorpay for payments, with idempotent webhook + client-verify activation (a MongoDB
  transaction, guarded so the two can safely race each other without double-crediting a user) —
  the Recruiter plan system (Basic/Pro/ProMax) has its own fully separate payment flow/collection,
  never sharing code or DB fields with the User plan system above
- Helmet, CORS (fail-closed allowlist), and rate limiting for security — limits are stored in
  MongoDB, so they hold across restarts and multiple instances, with an explicit fail-open vs.
  fail-closed policy per limiter (traffic-shaping limits fail open, security-critical ones like
  login/OTP fail closed)
- Zod request validation on the auth, payment, and admin routes
- Scheduled jobs run in a **separate worker process** (`npm run worker`), not inside the API
  server, and are protected by a MongoDB-backed lease so only one process instance ever executes
  a given job tick

## Project Structure

```
AI-Resume-Enhancer-v2/
├── Backend/              # Express API server
│   ├── controllers/      # Route handlers (thin: parse, call service, shape response)
│   ├── services/         # Business logic, independent of HTTP
│   ├── Routes/           # Route definitions (+ registry that fails on route collisions)
│   ├── Models/           # Mongoose schemas
│   ├── Middlewares/      # Auth, rate limiting, validation, request context
│   ├── Templates/        # HTML email templates
│   ├── Validation/       # Zod schemas (one definition per rule)
│   ├── Installation/     # DB & Cloudinary setup
│   ├── docs/             # OpenAPI/Swagger spec
│   ├── jobs/             # One-shot entry points for individual scheduled jobs
│   ├── index.js          # API server entry point
│   └── worker.js         # Background worker entry point (long-lived, all cron jobs)
└── ResumeEnhancer/       # React frontend
    └── src/
        ├── Components/   # UI components (Home, Login, Dashboard, Recruiter, Admin, etc.)
        ├── Services/     # API call definitions
        ├── Slices/       # Redux slices
        └── reducer/      # Redux store setup
```

> Note: `Backend/tests/` (Jest + Supertest integration tests) exists locally but is `.gitignore`d
> in this repository, so it will not appear after a fresh clone.

## API Docs

Interactive Swagger UI documentation for the API (auth, AI review, chat, resume library, cover
letters, job search, job board, payments, reviews, grammar check, streaks, leaderboard,
notifications, admin) is served directly from the backend at **`/api-docs`**.

```
https://airesumeenhancerr.duckdns.org/api-docs
```

**Local development** (once the backend is running via `npm run dev`):
```
http://localhost:4000/api-docs
```

The spec itself is hand-written in `Backend/docs/swagger.js` and mounted in `Backend/index.js` via
`swagger-ui-express`. Bearer JWT auth is pre-wired in the Swagger UI — click **Authorize** and
paste a token from `/Login` to try authenticated endpoints directly from the docs page.

## Getting Started

### Prerequisites
- Node.js (v18+)
- MongoDB instance — a **replica set** (Atlas provides one by default; see "Database requirement"
  below for why a standalone `mongod` isn't enough in production)
- API keys for Cloudinary, Groq, Razorpay, Tavily (job search), and an SMTP provider (for OTP/
  notification emails)

### Setup

1. Clone the repository
   ```bash
   git clone https://github.com/Faizankhan17623/AI-Resume-Enhancer-v2.git
   cd AI-Resume-Enhancer-v2
   ```

2. Install dependencies
   ```bash
   cd Backend && npm install
   cd ../ResumeEnhancer && npm install
   ```

3. Create a `.env` file inside `Backend/` with the required environment variables (Mongo URI, JWT
   secret, Cloudinary keys, Groq API key, Razorpay keys, SMTP credentials, `FRONTEND_URL`, etc.)

4. Run the app

   From the `ResumeEnhancer` folder, a single command starts **both** the backend and the frontend
   together:
   ```bash
   npm run dev
   ```

   This uses `concurrently` to run the Express server (via `nodemon`) and the Vite dev server side
   by side — no need to open a separate terminal for the backend.

   To run only the frontend:
   ```bash
   npm run client
   ```

5. Open the app at `http://localhost:5173` (Vite falls back to the next free port, e.g. `5174`, if
   that one is already in use)

6. (Optional in dev) Start the background worker

   Scheduled jobs — streak nudges, weekly/admin digests, the account-purge sweep, AI cost alerts,
   feature-flag re-enable, and subscription expiry reconciliation — run in their own process,
   **not** inside the API server. Nothing scheduled fires unless this is running:

   ```bash
   cd Backend
   npm run worker        # or: npm run dev:worker, for auto-restart
   ```

## Testing

The backend has an integration test suite (Jest + Supertest + an in-memory MongoDB instance — no
mocked DB) covering authentication, the AI resume review pipeline, cover letter generation, the
resume library, chat streaming, payment verification, admin RBAC, notifications, and profile
editing/data export. AI-dependent controllers mock the Groq SDK rather than making real API calls.
The suite lives at `Backend/tests/` but is not tracked in this repository (see Project Structure).

```bash
cd Backend
npm test
```

## Deployment

The frontend and backend deploy independently, to different platforms, and are separate concerns
from the scheduled-jobs worker below.

**Frontend** — deployed on Vercel. `ResumeEnhancer/vercel.json` rewrites every unmatched path to
`index.html` so client-side routing (React Router) works on a hard refresh or a shared deep link.

**Backend** — runs on a persistent server (this project runs it on an AWS EC2 instance) behind
Nginx as a reverse proxy, with the Node process kept alive by PM2 as two separate processes:

| PM2 process | Runs | Notes |
|---|---|---|
| `web` | `Backend/index.js` | Serves all HTTP traffic |
| `worker` | `Backend/worker.js` | All scheduled/cron jobs — see below |

A typical deploy is: SSH in, `git pull`, `pm2 restart web worker` (only `npm install` first if
`package.json` changed).

### Scheduled jobs — two options

**Option A — a dedicated worker process (what this project uses)**

```bash
pm2 start Backend/worker.js --name worker
```

A real long-lived process is the better choice if you need jobs to fire at an exact time — a
GitHub Actions schedule (below) is best-effort and can be delayed by several minutes.

**Option B — free (GitHub Actions)**

`.github/workflows/scheduled-jobs.yml` runs every job on GitHub's scheduled runners, which are
free and unlimited for public repositories — a reasonable choice if you don't want to run a
persistent worker process at all. Each run invokes `Backend/jobs/runJob.js <job>`, which executes
one job and exits. Needs these repository secrets under **Settings → Secrets and variables →
Actions**:

```
MONGO_DB_URL        (required)
MAIL_HOST           (needed for the digest / nudge emails)
MAIL_USER
MAIL_PASS
ADMIN_ALERT_EMAIL   (needed for the AI cost alert)
FRONTEND_URL
```

You can also run any job by hand:
```bash
cd Backend
node jobs/runJob.js subscription-reconcile
```

**Do not run both options at once against the same database** unless you mean to. It is *safe* if
you do — a Mongo-backed lease (`Backend/utils/jobLease.js`) guarantees only one process executes
each tick, which also covers the overlap during a rolling deploy — but there is no reason to pay
for/run both.

### Database requirement

**Production requires a MongoDB replica set** (Atlas provides one by default). The payment,
credit-spend, and account-deletion paths write to multiple documents inside a transaction, and the
app refuses to run those non-atomically rather than risk a charged-but-not-upgraded user. This is
checked at boot, so a misconfigured deployment fails immediately instead of at a customer's first
payment. Set `ALLOW_NON_TRANSACTIONAL_WRITES=true` only if you knowingly accept that risk.

## License

This project is for personal/portfolio use.
