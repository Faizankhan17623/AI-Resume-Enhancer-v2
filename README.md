<!--
Full feature list (internal reference — not rendered as part of the public README body)

Auth & Account
- Signup/login with OTP email verification, JWT session cookie
- Per-account brute-force lockout: 5 failed attempts locks the account for 15 minutes
- Google and GitHub OAuth login/signup (one-time exchange-code redirect flow, callback URLs point at the live Render backend). Facebook/LinkedIn OAuth was removed (never actually configured/wired live)
- Profile page: plan, activity counts, editable first/last name, email, and phone number
- Per-type email notification preferences (streak, win-back, digest, monthly health check)
- In-app notification bell (unread badge, dropdown, mark read/mark all read) mirroring the email nudges
- Delete account with a 2-day recovery window (logging back in undoes it) and an automated daily purge cron past the window
- GDPR-style self-service data export (JSON download of the user's own reviews/chats/cover letters/resumes/payments)
- Recruiter vs. friend framing for public share links (same safe data, different closing CTA)

AI Resume Review
- Upload resume PDF + job description for an ATS-style AI review (consumes a credit)
- Run a review from a previously saved resume (no re-upload)
- Score breakdown, strengths, missing keywords, before/after rewrites
- Pro: keyword analysis, section-by-section feedback, quick wins, learning roadmap with course-search links
- ProMax: recruiter first-impression, red flags, rewritten summary, interview prep, learning roadmap
- Saved review history, progress-over-time chart, PDF export, public share links
- Resume Builder: DOCX export (real text layer, ATS-safe) alongside the existing print-to-PDF download
- Free grammar/spelling pre-check (no AI credit spent)
- ATS formatting scan: deterministic structural check (via pdfjs-dist) for multi-column layouts, embedded images, missing text layer, non-standard fonts — the stuff that breaks real ATS parsers but a text-only AI review can't see
- Monthly resume health-check email re-surfacing the stored ATS formatting score, no fresh AI call

Resume Library
- Save parsed resumes for reuse across reviews/chats/cover letters
- Rename, delete, set a default resume

AI Coach Chat
- Start a chat from a resume + JD (consumes a credit)
- Threaded conversation with streaming AI replies, plan-limited message caps

Cover Letter Generator (Pro+)
- Generate a tailored cover letter from a resume + JD
- Automatic "genericness" score flagging cliché phrasing so the user can personalize it
- Saved cover letter history

Job Search (Pro+)
- Live web search for matching job postings via Tavily

Gamification / Community
- Consecutive-day activity streak
- Anonymized leaderboard of top ATS scores

Payments
- Basic / Pro / ProMax plans (5 / 100 / 300 AI uses per month, 60 / 200 / 500 messages per chat)
- Razorpay checkout + signature verification, payment history

Admin Dashboard (role-gated: Admin/Support)
- Stats overview, system health, AI usage/cost stats, 30-day charts (revenue chart shown in rupees, not paise), unique visitors + logins traffic chart
- Overview stat cards (Total Users, Revenue, Paid Conversion) link straight through to the relevant Users/Payments page
- User management: search, role filter (Admin accounts always excluded from the list), role change restricted to User ↔ Support only (granting/removing Admin access is a deliberate out-of-band operation, not reachable from this UI), credit adjust, ban/unban with the ban reason visible on hover without opening detail, delete, impersonate
- Plan shown read-only to avoid accidental Pro/ProMax revenue mismatches from a casual dropdown; a separate Admin-only "Fix plan" action (confirm-dialog gated) exists for refunds, failed webhooks, and giveaways
- Bulk actions on the Users page: multi-select with a "select all" checkbox, a bulk suspend/restore bar, and bulk role change between User and Support (same Admin-exclusion rules as the single-user actions)
- A read-only user detail drawer (profile, role/plan/status, recent reviews and payments) opens from clicking a name in the Users list
- A congratulations email is sent automatically when a user is promoted from User to Support (single or bulk)
- A global admin search bar (users + payments, by name/email/order id/payment id) in the dashboard nav
- Payments dashboard, audit log (filterable by action type and searchable by target/actor email, paginated), feature flags (kill-switches for Review/Cover Letter/Job Search, no redeploy needed)
- Feature flags require a reason and a scheduled future re-enable time when disabled, with a cron that automatically re-enables the flag once that time passes; the disabled-feature error a user sees includes the admin's note and re-enable time
- Site-wide announcement banners: editable after publishing, capped at 2 concurrently active, with optional scheduled start/end windows (IST, 12-hour time, start must be tomorrow or later, start-to-end gap capped at 15 days)
- CSV export on the Users and Payments pages (currently loaded/filtered page); the Audit Log's export pulls every entry matching the current filter, not just the visible page (capped at 5,000 rows)
- Security panel: live count of currently-locked accounts (5 failed logins = 15-minute lockout) plus a rolling log of recent lockout events — the one abuse signal that previously had zero dashboard visibility
- A weekly digest email to every Admin summarizing the past 7 days of audit-log activity by action type, so nobody has to remember to check the Audit Log manually
- Hourly AI cost/error-rate alert email to a configured admin address, now also logged as an in-app audit entry with a dashboard banner
- Account Deletions widget: live count of accounts pending the 2-day purge window plus a rolling log of recently purged accounts (previously the purge cron only wrote to the server console)
- Mobile-responsive card layouts for the Users/Payments tables (desktop keeps the full table)
- Audit Log and Settings tabs correctly hidden/blocked for Support (Admin-only, matching the backend gate)
- Pagination/filter changes on Users, Payments, and Audit Log no longer replace the list with a full-page spinner — the existing rows stay visible (dimmed) during a background refetch instead of flashing to a blank loading state

Onboarding
- Dashboard "Get started" checklist for new users, derived from real activity (first review, first saved resume, first chat, first cover letter), dismissible and never reappears once done

Recruiter Job Board & Proctored Testing
- Direct recruiter signup, locked pending Admin approval before any recruiter action (posting jobs, viewing applicants, inviting to tests) is allowed
- Recruiter job postings: draft/published/closed lifecycle, company/title/description/location/employment type/skills, optional attached screening test
- Public job board (no login required to browse) with search/location/employment-type filters; candidates sign in only at apply time
- Candidates apply with a saved resume from their Resume Library (ownership-verified server-side), tracked in a "My Applications" dashboard page with per-application status (applied/invited to test/completed test/rejected/hired)
- Recruiters review applicants per job, see which resume was submitted, and invite a candidate to take the job's proctored test
- TF.js-based proctored test runner: face-landmark detection for tab-switch/away-from-camera violation tracking during timed tests, with a violation count and score surfaced on the recruiter's attempt review

Platform
- Cloud file storage via Cloudinary
- Helmet, CORS, rate limiting (IP + account-level + dedicated limiters for PDF-parsing and admin routes)
- Interactive Swagger API docs at /api-docs (~65 endpoints)
- Dark/light theme toggle, responsive dashboard layout
- Backend wake-up ping on app load (starts Render's free-tier cold boot before the user's first real action)
- Cookie consent card (localStorage-remembered, shown once)
- AI model centralized in Backend/utils/AiModel.js (openai/gpt-oss-120b, overridable via GROQ_MODEL env)
- Baseline accessibility pass on the feedback modal and notification bell (ARIA roles/labels, Escape-to-close, radiogroup semantics)
- Backend integration test suite: 152 tests across 18 files (auth, AI review, chat streaming, cover letters, resume library, admin RBAC, notifications, profile edit/export, payments, subscription expiry reconciliation, rate-limit fail-closed policy, request validation, misc features)
-->

# AI Resume Enhancer

A full-stack web application that helps users improve their resumes using AI-powered feedback, with user authentication, a chat-based review flow, payments, and an admin dashboard.

**Live Demo:** [https://ai-resume-enhancer-v2.vercel.app/](https://ai-resume-enhancer-v2.vercel.app/)

## Features

- **Authentication** — signup/login with OTP email verification, JWT-based sessions, per-account brute-force lockout (5 failed attempts locks the account for 15 minutes), and Google/GitHub OAuth
- **AI Resume Chat** — upload a resume (PDF) and get AI-generated feedback and suggestions via Groq (`openai/gpt-oss-120b`)
- **Resume Builder** — build a resume from structured form data across 11 templates with a live preview; export it as a print-ready PDF or a real, ATS-safe **DOCX** file
- **ATS Formatting Scan** — a deterministic structural check (multi-column layouts, embedded images, missing text layer, non-standard fonts) that catches parsing issues real ATS software chokes on, independent of the AI's subjective review
- **Resume Library** — save parsed resumes for reuse across reviews, chats, and cover letters without re-uploading; supports renaming and a default resume
- **Keyword Bank** — save and reuse frequently-missed keywords/phrases surfaced by reviews
- **Structured Mock Interview** (ProMax) — one AI-generated question at a time grounded in the resume + JD, scored 1-10 with feedback and a stronger sample answer; sessions are saved with full history
- **Application Tracker** — a Kanban board (Applied/Interview/Offer/Rejected) for job applications, with optional linking to the ATS review it was sent with and outcome-linked analytics (interview/offer rate bucketed by ATS score)
- **Onboarding Checklist** — a dashboard "Get started" progress card for new users that tracks real activity and dismisses itself for good once complete
- **Recruiter Job Board** — Admin-approved recruiters post jobs (draft/published/closed) with an optional proctored screening test attached; candidates browse the public board, apply with a resume from their Resume Library, and track application status from a dedicated dashboard page; recruiters review applicants and invite them to test
- **Proctored Screening Tests** — a TF.js face-landmark-detection test runner that tracks tab-switch and away-from-camera violations during a timed test, with the violation count and score surfaced to the recruiter reviewing the attempt
- **AI Cover Letter Generator** — generate a tailored cover letter from a resume + job description (Pro+ feature), with an automatic genericness check
- **Job Search** — live web search for matching job postings via Tavily (Pro+ feature)
- **Learning Resources** — real course/tutorial links (live Tavily search, Mongo-cached by query) for each skill gap in a review's learning roadmap, instead of a plain Google search link (Pro+ feature)
- **Payments** — subscription/checkout support via Razorpay
- **Reviews & Testimonials** — users can leave reviews after using the platform and can frame a shared report for a friend or a recruiter; user-submitted homepage testimonials go through an Admin/Support moderation queue before appearing publicly
- **Notifications** — an in-app bell (unread badge, mark read) alongside per-type email opt-in/opt-out (streak, win-back, digest, monthly health check)
- **Account Self-Service** — edit profile fields inline, export your own data as JSON, and delete your account with a 2-day recovery window
- **Admin Dashboard** — manage users (with bulk actions including role change, CSV export, and a read-only detail drawer), payments, announcements (editable, schedulable), testimonial moderation, and feature flags (schedulable disable/re-enable) with a filterable/searchable/exportable audit log, a global search bar, a security panel for account lockouts, a weekly activity digest email to Admins, mobile-responsive tables, and no full-page loading flash on pagination; also surfaces account-deletion (2-day purge) status and AI cost-alert firings in-app instead of console/email-only
- **Cloud File Storage** — resume uploads stored via Cloudinary

## Tech Stack

**Frontend**
- React 19 + Vite
- Redux Toolkit for state management
- React Router for routing
- Tailwind CSS for styling
- Axios for API calls
- TensorFlow.js (`@tensorflow-models/face-landmarks-detection`) for in-browser proctored-test violation detection

**Backend**
- Node.js + Express
- MongoDB with Mongoose
- JWT authentication, bcrypt password hashing
- Groq SDK for AI-generated resume feedback — model is `openai/gpt-oss-120b`, set once in `Backend/utils/AiModel.js` and overridable via the `GROQ_MODEL` env var
- pdfkit (PDF) & docx (DOCX) for resume/report file generation
- Cloudinary for file storage
- Razorpay for payments
- Helmet, CORS, and rate limiting for security (limits are stored in MongoDB, so they hold across restarts and multiple instances)
- Zod request validation on the auth, payment, and admin routes
- Scheduled jobs run in a **separate worker process** (`npm run worker`), not inside the API server

## Project Structure

```
AI-Resume-Enhancer-v2/
├── Backend/              # Express API server
│   ├── controllers/      # Route handlers (thin: parse, call service, shape response)
│   ├── services/         # Business logic, independent of HTTP
│   ├── Routes/           # Route definitions (+ registry that fails on route collisions)
│   ├── Models/           # Mongoose schemas
│   ├── Middlewares/      # Auth, rate limiting, validation, request context
│   ├── Validation/       # Zod schemas (one definition per rule)
│   ├── Installation/     # DB & Cloudinary setup
│   ├── docs/             # OpenAPI/Swagger spec
│   ├── tests/            # Jest + Supertest integration tests
│   ├── index.js          # API server entry point
│   └── worker.js         # Background worker entry point (all cron jobs)
└── ResumeEnhancer/       # React frontend
    └── src/
        ├── Components/   # UI components (Home, Login, Dashboard, ResumeBuilder, Admin, etc.)
        ├── Services/     # API call definitions
        ├── Slices/       # Redux slices
        └── reducer/      # Redux store setup
```

## API Docs

Interactive Swagger UI documentation for the API (auth, AI review, chat, resume library, cover letters, job search, payments, reviews, grammar check, streaks, leaderboard, notifications, admin) is served directly from the backend at **`/api-docs`**.

**Production:**
```
https://ai-resume-enhancer-v2.onrender.com/api-docs
```

**Local development** (once the backend is running via `npm run dev`):
```
http://localhost:4000/api-docs
```

The spec itself is hand-written in `Backend/docs/swagger.js` and mounted in `Backend/index.js` via `swagger-ui-express`. Every route is grouped under a tag (Auth, AI Review, Chat, Resumes, Cover Letter, Job Search, Reviews, Grammar, Streak, Leaderboard, Payment, Admin, Announcements) and documents its request body, path params, and response codes. Bearer JWT auth is pre-wired in the Swagger UI — click **Authorize** and paste a token from `/Login` to try authenticated endpoints directly from the docs page.

> Note: Render's free tier spins the service down after periods of inactivity, so the first request to the production docs link may take 30-60 seconds to wake it up. (The frontend mitigates this for app users by pinging the backend the moment anyone lands on the site, so the cold boot starts before their first real action.)

## Testing

The backend has an integration test suite (Jest + Supertest + an in-memory MongoDB instance — no mocked DB): 152 tests across 18 files covering authentication, the AI resume review pipeline, cover letter generation, the resume library, chat streaming, payment verification, admin RBAC (role changes, bans, credit adjustments, self-demotion/self-ban/self-delete protection), notifications, and profile editing/data export. AI-dependent controllers mock the Groq SDK rather than making real API calls.

```bash
cd Backend
npm test
```

## Getting Started

### Prerequisites
- Node.js (v18+)
- MongoDB instance (local or Atlas)
- API keys for Cloudinary, Groq, Razorpay, and an SMTP provider (for OTP emails)

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

3. Create a `.env` file inside `Backend/` with the required environment variables (Mongo URI, JWT secret, Cloudinary keys, Groq API key, payment gateway keys, SMTP credentials, `FRONTEND_URL`, etc.)

4. Run the app

   From the `ResumeEnhancer` folder, a single command starts **both** the backend and the frontend together:
   ```bash
   npm run dev
   ```

   This uses `concurrently` to run the Express server (via `nodemon`) and the Vite dev server side by side — no need to open a separate terminal for the backend.

   To run only the frontend:
   ```bash
   npm run client
   ```

5. Open the app at `http://localhost:5173`

6. (Optional in dev) Start the background worker

   Scheduled jobs — streak nudges, weekly/admin digests, the account-purge sweep, AI cost
   alerts, feature-flag re-enable, and subscription expiry reconciliation — run in their own
   process, **not** inside the API server. Nothing scheduled fires unless this is running:

   ```bash
   cd Backend
   npm run worker        # or: npm run dev:worker, for auto-restart
   ```

## Deployment

The API and the scheduled jobs are **separate concerns** and must be run separately.

| Service | Start command | Notes |
|---|---|---|
| API server | `npm start` | Web service. Serves all HTTP traffic. |
| Scheduled jobs | see below | Two options: a long-lived worker, or a free external scheduler. |

Both use root directory `Backend` and build command `npm install`.

### Option A — free (GitHub Actions), recommended

`.github/workflows/scheduled-jobs.yml` runs every job on GitHub's scheduled runners, which are
free and unlimited for public repositories. Nothing extra to host.

Each run invokes `Backend/jobs/runJob.js <job>`, which executes one job and exits. Add these
repository secrets under **Settings → Secrets and variables → Actions**:

```
MONGO_DB_URL        (required)
MAIL_HOST           (needed for the digest / nudge emails)
MAIL_USER
MAIL_PASS
ADMIN_ALERT_EMAIL   (needed for the AI cost alert)
FRONTEND_URL
```

Verify it with **Actions → Scheduled Jobs → Run workflow**, picking a job from the dropdown.
`subscription-reconcile` is the safest one to test with: it sends no email.

You can also run any job by hand:
```bash
cd Backend
node jobs/runJob.js subscription-reconcile
```

### Option B — a dedicated worker process

If you would rather have a real long-lived process (Render Background Worker, a VPS, Docker, or a
system service), run:

```bash
npm run worker
```

This is a paid tier on Render. It is the better choice if you later add jobs that must fire at an
exact time, since GitHub's scheduler is best-effort and can be delayed by several minutes.

**Do not run both at once against the same database** unless you mean to. It is *safe* if you do —
a Mongo-backed lease (`Backend/utils/jobLease.js`) guarantees only one process executes each tick,
which also covers the overlap during a rolling deploy — but there is no reason to pay for both.

### Database requirement

**Production requires a MongoDB replica set** (Atlas provides one by default). The payment,
credit-spend and account-deletion paths write to multiple documents inside a transaction, and the
app refuses to run those non-atomically rather than risk a charged-but-not-upgraded user. This is
checked at boot, so a misconfigured deployment fails immediately instead of at a customer's first
payment. Set `ALLOW_NON_TRANSACTIONAL_WRITES=true` only if you knowingly accept that risk.

## License

This project is for personal/portfolio use.
