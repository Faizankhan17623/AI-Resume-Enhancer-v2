# AI Resume Enhancer

A full-stack web application that helps users improve their resumes using AI-powered feedback, with user authentication, a chat-based review flow, payments, and an admin dashboard.

**Live Demo:** [https://ai-resume-enhancer-xi.vercel.app/](https://ai-resume-enhancer-xi.vercel.app/)

## Features

- **Authentication** — signup/login with OTP email verification, JWT-based sessions, and per-account brute-force lockout (5 failed attempts locks the account for 15 minutes)
- **AI Resume Chat** — upload a resume (PDF) and get AI-generated feedback and suggestions via Groq
- **Resume Library** — save parsed resumes for reuse across reviews, chats, and cover letters without re-uploading; supports renaming and a default resume
- **AI Cover Letter Generator** — generate a tailored cover letter from a resume + job description (Pro+ feature)
- **Job Search** — live web search for matching job postings via Tavily (Pro+ feature)
- **Payments** — subscription/checkout support via Razorpay and Stripe
- **Reviews** — users can leave reviews after using the platform
- **Notification Preferences** — per-type opt-in/opt-out for streak, win-back, and digest emails
- **Admin Dashboard** — manage users, payments, announcements, and view audit logs
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
- Groq SDK for AI-generated resume feedback
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

Interactive Swagger UI documentation for all ~47 API endpoints (auth, AI review, chat, resume library, cover letters, job search, payments, reviews, grammar check, streaks, leaderboard, admin) is served directly from the backend at **`/api-docs`**.

**Production:**
```
https://ai-resume-enhancer-88nm.onrender.com/api-docs
```

**Local development** (once the backend is running via `npm run dev`):
```
http://localhost:4000/api-docs
```

The spec itself is hand-written in `Backend/docs/swagger.js` and mounted in `Backend/index.js` via `swagger-ui-express`. Every route is grouped under a tag (Auth, AI Review, Chat, Resumes, Cover Letter, Job Search, Reviews, Grammar, Streak, Leaderboard, Payment, Admin, Announcements) and documents its request body, path params, and response codes. Bearer JWT auth is pre-wired in the Swagger UI — click **Authorize** and paste a token from `/Login` to try authenticated endpoints directly from the docs page.

> Note: Render's free tier spins the service down after periods of inactivity, so the first request to the production docs link may take 30-60 seconds to wake it up.

## Testing

The backend has an integration test suite (Jest + Supertest + an in-memory MongoDB instance — no mocked DB) covering authentication and payment verification flows:

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
