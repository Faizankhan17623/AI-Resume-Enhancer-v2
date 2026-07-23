<!--
Full feature list (internal reference — not rendered as part of the public README body)

Auth & Account
- Signup/login with OTP email verification, JWT session cookie
- Per-account brute-force lockout: 5 failed attempts locks the account for 15 minutes
- Google OAuth login (currently disabled pending Cloud console credentials — see Backend/controllers/GoogleAuth.js, routes commented not removed in Backend/Routes/Auth.js)
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
- Stats overview, system health, AI usage/cost stats, 30-day charts, unique visitors + logins traffic chart
- User management: search, role/plan change, credit adjust, ban/unban, delete, impersonate
- Payments dashboard, audit log, feature flags (kill-switches for Review/Cover Letter/Job Search, no redeploy needed)
- Site-wide announcement banners
- Hourly AI cost/error-rate alert email to a configured admin address, now also logged as an in-app audit entry with a dashboard banner (previously email-only, invisible in the app)
- Account Deletions widget: live count of accounts pending the 2-day purge window plus a rolling log of recently purged accounts (previously the purge cron only wrote to the server console)
- Mobile-responsive card layouts for the Users/Payments tables (desktop keeps the full table)
- Audit Log and Settings tabs correctly hidden/blocked for Support (Admin-only, matching the backend gate)

Onboarding
- Dashboard "Get started" checklist for new users, derived from real activity (first review, first saved resume, first chat, first cover letter), dismissible and never reappears once done

Platform
- Cloud file storage via Cloudinary
- Helmet, CORS, rate limiting (IP + account-level + dedicated limiters for PDF-parsing and admin routes)
- Interactive Swagger API docs at /api-docs (~65 endpoints)
- Dark/light theme toggle, responsive dashboard layout
- Backend wake-up ping on app load (starts Render's free-tier cold boot before the user's first real action)
- Cookie consent card (localStorage-remembered, shown once)
- AI model centralized in Backend/utils/AiModel.js (openai/gpt-oss-120b, overridable via GROQ_MODEL env)
- Baseline accessibility pass on the feedback modal and notification bell (ARIA roles/labels, Escape-to-close, radiogroup semantics)
- Backend integration test suite: 78 tests across 10 files (auth, AI review, chat streaming, cover letters, resume library, admin RBAC, notifications, profile edit/export, payments, misc features)
-->

# AI Resume Enhancer

A full-stack web application that helps users improve their resumes using AI-powered feedback, with user authentication, a chat-based review flow, payments, and an admin dashboard.

**Live Demo:** [https://ai-resume-enhancer-v2.vercel.app/](https://ai-resume-enhancer-v2.vercel.app/)

## Features

- **Authentication** — signup/login with OTP email verification, JWT-based sessions, per-account brute-force lockout (5 failed attempts locks the account for 15 minutes), and Google OAuth (currently disabled pending Cloud console setup)
- **AI Resume Chat** — upload a resume (PDF) and get AI-generated feedback and suggestions via Groq (`openai/gpt-oss-120b`)
- **Resume Builder** — build a resume from structured form data with a live template preview; export it as a print-ready PDF or a real, ATS-safe **DOCX** file
- **ATS Formatting Scan** — a deterministic structural check (multi-column layouts, embedded images, missing text layer, non-standard fonts) that catches parsing issues real ATS software chokes on, independent of the AI's subjective review
- **Resume Library** — save parsed resumes for reuse across reviews, chats, and cover letters without re-uploading; supports renaming and a default resume
- **Onboarding Checklist** — a dashboard "Get started" progress card for new users that tracks real activity and dismisses itself for good once complete
- **AI Cover Letter Generator** — generate a tailored cover letter from a resume + job description (Pro+ feature), with an automatic genericness check
- **Job Search** — live web search for matching job postings via Tavily (Pro+ feature)
- **Payments** — subscription/checkout support via Razorpay and Stripe
- **Reviews** — users can leave reviews after using the platform, and can frame a shared report for a friend or a recruiter
- **Notifications** — an in-app bell (unread badge, mark read) alongside per-type email opt-in/opt-out (streak, win-back, digest, monthly health check)
- **Account Self-Service** — edit profile fields inline, export your own data as JSON, and delete your account with a 2-day recovery window
- **Admin Dashboard** — manage users, payments, announcements, feature flags, and audit logs, with mobile-responsive tables; also surfaces account-deletion (2-day purge) status and AI cost-alert firings in-app instead of console/email-only
- **Cloud File Storage** — resume uploads stored via Cloudinary

## Tech Stack

**Frontend**
- React 19 + Vite
- Redux Toolkit for state management
- React Router for routing
- Tailwind CSS for styling
- Axios for API calls

**Backend**
- Node.js + Express
- MongoDB with Mongoose
- JWT authentication, bcrypt password hashing
- Groq SDK for AI-generated resume feedback — model is `openai/gpt-oss-120b`, set once in `Backend/utils/AiModel.js` and overridable via the `GROQ_MODEL` env var
- pdfkit (PDF) & docx (DOCX) for resume/report file generation
- Cloudinary for file storage
- Razorpay & Stripe for payments
- Helmet, CORS, and rate limiting for security

## Project Structure

```
AiResumeEnhancer/
├── Backend/              # Express API server
│   ├── controllers/      # Route handlers
│   ├── Routes/           # API route definitions
│   ├── Models/           # Mongoose schemas
│   ├── Middlewares/      # Auth, rate limiting, etc.
│   ├── Installation/     # DB & Cloudinary setup
│   ├── docs/              # OpenAPI/Swagger spec
│   ├── tests/             # Jest + Supertest integration tests
│   └── index.js          # Server entry point
└── ResumeEnhancer/       # React frontend
    └── src/
        ├── Components/   # UI components (Home, Login, Dashboard incl. Resumes/CoverLetter/JobSearch, Admin, etc.)
        ├── Services/     # API call definitions
        ├── Slices/       # Redux slices
        └── reducer/      # Redux store setup
```

## API Docs

Interactive Swagger UI documentation for the API (auth, AI review, chat, resume library, cover letters, job search, payments, reviews, grammar check, streaks, leaderboard, notifications, admin) is served directly from the backend at **`/api-docs`**.

**Production:**
```
https://ai-resume-enhancer-88nm.onrender.com/api-docs
```

**Local development** (once the backend is running via `npm run dev`):
```
http://localhost:4000/api-docs
```

The spec itself is hand-written in `Backend/docs/swagger.js` and mounted in `Backend/index.js` via `swagger-ui-express`. Every route is grouped under a tag (Auth, AI Review, Chat, Resumes, Cover Letter, Job Search, Reviews, Grammar, Streak, Leaderboard, Payment, Admin, Announcements) and documents its request body, path params, and response codes. Bearer JWT auth is pre-wired in the Swagger UI — click **Authorize** and paste a token from `/Login` to try authenticated endpoints directly from the docs page.

> Note: Render's free tier spins the service down after periods of inactivity, so the first request to the production docs link may take 30-60 seconds to wake it up. (The frontend mitigates this for app users by pinging the backend the moment anyone lands on the site, so the cold boot starts before their first real action.)

## Testing

The backend has an integration test suite (Jest + Supertest + an in-memory MongoDB instance — no mocked DB): 78 tests across 10 files covering authentication, the AI resume review pipeline, cover letter generation, the resume library, chat streaming, payment verification, admin RBAC (role changes, bans, credit adjustments, self-demotion/self-ban/self-delete protection), notifications, and profile editing/data export. AI-dependent controllers mock the Groq SDK rather than making real API calls.

```bash
cd Backend
npm test
```

## Getting Started

### Prerequisites
- Node.js (v18+)
- MongoDB instance (local or Atlas)
- API keys for Cloudinary, Groq, Razorpay/Stripe, and an SMTP provider (for OTP emails)

### Setup

1. Clone the repository
   ```bash
   git clone https://github.com/Faizankhan17623/AI-Resume-Enhancer.git
   cd AI-Resume-Enhancer
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

## License

This project is for personal/portfolio use.
