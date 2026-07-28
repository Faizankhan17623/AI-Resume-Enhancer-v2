# AI Resume Enhancer — Feature Manifest by Role

_Local reference only — not committed to git, not for GitHub._
_Generated 2026-07-22. Reflects the codebase as of commit range through the Google OAuth + security-fix pass._
_Updated 2026-07-28: added Structured Mock Interview mode, outcome-linked resume analytics, and real learning-resource search._

Roles: **Public** (no login) → **User** (any logged-in account, any plan) → **Support** → **Admin**.
Plan tiers (Basic/Pro/ProMax) are separate from role and apply within the User bucket.

---

## Public / Unauthenticated

- Homepage (Banner, How It Works, Template Slider, Testimonials, FAQ, Footer)
- Pricing page
- Public shared ATS-review report view (`/Shared/:shareId`) — safe subset only, no JD/keywords/rewrites
- Google OAuth login initiation + callback (redirect flow)
- Local signup (OTP email verification) and login
- Forgot password / reset password (emailed token, 1-hour expiry)
- Site-wide announcement banner
- Cookie consent banner
- Dark/light theme toggle
- Anonymous visitor tracking beacon (feeds the admin traffic chart)
- Backend cold-start "wake" ping

## User (any logged-in account — plan tier noted where it matters)

- **AI ATS Resume Review** (upload or from a saved resume) — Basic: core review + top-3 fixes. Pro: + keyword analysis, section feedback, quick wins, full rewrites, learning roadmap. ProMax: + recruiter first impression, red flags, interview prep, rewritten summary. Costs 1 credit.
- Learning roadmap resources are **real** — each skill-gap item has a "Find real courses" lookup (live Tavily search, Mongo-cached by query since the same gap repeats across users) instead of a plain Google search link. **Pro/ProMax only** (matches the roadmap's own existing tier), no credit cost.
- Free grammar/spell check (no credit)
- Free ATS formatting scan (auto-runs on upload/save, no credit)
- Resume Library — save / rename / set-default / delete uploaded PDFs
- AI Resume Builder — generate from scratch, tailor an existing resume (both cost 1 credit) + manual CRUD/autosave + DOCX export
- Built-resume AI review against a JD (costs 1 credit)
- AI Coach Chat — create/message/list/view/delete; depth and message cap scale with plan (Basic 60 msgs, Pro 200, ProMax 500)
- **Structured Mock Interview mode** — **ProMax only**; a dedicated session (not just a chat prompt): one AI-generated question at a time grounded in the resume + JD, the candidate answers, the AI scores it 1-10 with feedback and a stronger sample answer, then asks the next question. Sessions are saved with full history. Costs 1 credit per session (not per question).
- Cover Letter Generator — **Pro/ProMax only**; includes an automatic "genericness" score on the output
- Job Search (live web via Tavily) — **Pro/ProMax only**
- Application Tracker — Kanban board (Applied/Interview/Offer/Rejected), optionally link an application to the past ATS review it was sent with
- **Outcome-linked resume analytics** — **ProMax only**; on the Application Tracker page, a chart of interview/offer rate bucketed by the ATS score of the review linked to each application (below 60 / 60-79 / 80+). Only counts applications the user has explicitly linked to a review — there's no reliable auto-inference (Review has no ref back to the resume it scored), so this is opt-in, not full-coverage.
- Review history, score-progress graph
- PDF export of a review report — **Pro/ProMax only**
- Share a review publicly, choosing "friend" or "recruiter" framing
- Activity streak tracking + milestone emails (7/30/100 days)
- Leaderboards (best score / weekly activity / streak) — fully anonymized, never shows identity
- Feedback popup (star rating + NPS + optional text)
- Payments — view plans, buy Pro/ProMax via Razorpay, view own payment history
- Account page — profile, effective plan, credit usage, activity counts
- Change password (not available to Google-only accounts)
- Notification preference toggles: streak reminders, win-back emails, weekly digest, monthly health check
- Onboarding checklist (dismissible once)
- Delete account — 2-day recovery window (logging back in undoes it); permanently purged by a daily cron after that
- Passive (opt-out-able): monthly resume health-check email, weekly digest email, streak-break/win-back nudge emails

## Support role (Support **and** Admin both pass these)

- View dashboard stats/overview (users, revenue, plan split, avg score, 30-day charts)
- View/search all users; view one user's full detail, their reviews, their chats
- View any single chat's full transcript
- Adjust a user's credit balance (refund or manual charge)
- View payments dashboard (list, status/plan breakdown, MRR, failure rate)
- View AI cost/health monitor (calls, tokens, latency, error rate, 30-day trend, recent failures)
- View system health (MongoDB ping, Groq reachability, server uptime/memory)
- View product insights (top targeted job titles, score-by-plan, most common missing keywords)
- View traffic dashboard (unique visitors + logins, day/week/month)
- View announcements list (read-only — cannot create/edit/delete)

## Admin role (Admin **only** — Support gets a 403 on these)

- Change any user's role (User ⇄ Support ⇄ Admin), self-demotion blocked
- Change any user's plan manually (Basic/Pro/ProMax) — e.g. refunds, giveaways, failed webhook recovery
- Ban / unban a user with a reason (an Admin cannot be banned directly, must be demoted first)
- Impersonate a user (15-minute token, every use is audit-logged) for support debugging
- Delete a user, cascading their Chats + Reviews (Payments/Resumes/BuiltResumes/CoverLetters are kept)
- View the full audit trail (every admin action, who/what/when)
- View **and toggle** feature flags — kill-switches for the AI Review, Cover Letter, Job Search, Learning Resources, and Mock Interview features (instant, no redeploy needed)
- Create, activate/deactivate, and delete site-wide announcements

---

## Known gaps / things worth fixing

_Re-verified 2026-07-26: items 1-3 below were already fixed by the time of this pass — `AdminNav.jsx` gives Support its own separate `supportTabs` (no Audit/Settings), `App.jsx` has no `/Support/Audit` or `/Support/Settings` routes at all, and `GET /admin/deletions` + the "Account Deletions" panel + cost-alert banner in `Overview.jsx` already cover purge and cost-alert visibility. Only item 4 remains._

1. ~~Frontend/backend RBAC mismatch on Admin pages.~~ **Fixed** — Support has its own `/Support/*` routes; Audit/Settings simply don't exist under that prefix.
2. ~~No 2-day purge visibility.~~ **Fixed** — `GET /admin/deletions` + "Account Deletions" panel.
3. ~~AI cost-alert emails invisible in-app.~~ **Fixed** — surfaced via the cost-alert banner on the admin Overview page, backed by `AuditLog` (`actor` is optional; system-fired entries use `logSystemAction`).
4. ~~"Reviews/testimonials" on the homepage is static hard-coded content.~~ **Fixed** (commit `abd0ab7`) — `Testimonial` model, `POST /testimonials` submission (Account page), Admin/Support moderation queue (`/admin/testimonials`), and a public `GET /testimonials/approved` feed the homepage now fetches from (falling back to static copy only if the fetch errors or returns empty). Moderation (`PATCH /admin/testimonials/:id`) now also fires an in-app `Notification` (`type: 'testimonial'`) to the submitter on approve/reject, alongside the existing admin audit log entry.
5. ~~ProMax chat prompt promised mock interviews, salary negotiation, and LinkedIn optimization "in chat" but only mock interviews had no dedicated feature — it only worked if a user thought to ask for it in freeform chat.~~ **Fixed** — `MockInterview` model, `POST /mock-interview` + `POST /mock-interview/:id/answer` (question bank, one-at-a-time flow, 1-10 scored answers, saved session history), `/Dashboard/Mock-Interview` page. ProMax only, 1 credit per session. (Salary negotiation and LinkedIn optimization remain chat-only — not addressed by this pass.)
6. ~~Each review's `learningRoadmap` item had a `resourceQuery` but the frontend only turned it into a dead Google search link — no real course results were ever fetched.~~ **Fixed** — `POST /learning-resources` calls Tavily for real course/tutorial links (Mongo-cached 30 days per query, since the same skill gap repeats across users), rendered as a lazy "Find real courses" expandable on the Report page. Pro/ProMax only, no credit cost.
7. **New gap surfaced by this pass**: `Application`/`Review` have no reliable way to auto-link an application to the resume it was actually sent with (`Review` has no ref back to the source resume/builtResume). The new outcome-linked analytics feature works around this by letting the user manually pick a review when adding/editing an application — accurate but opt-in only, and most existing applications will show as "not linked" until a user goes back and tags them.
