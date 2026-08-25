import { lazy, Suspense, useEffect } from 'react'
import { Routes, Route, Navigate, useNavigate, useLocation } from "react-router"
import { useDispatch } from 'react-redux'
import { Helmet } from 'react-helmet-async'
import { setUser, setToken, setLogin } from './Slices/authSlice'
import Navbar from './Components/Home/Navbar'
import Banner from './Components/Home/Banner'
import HowItWorks from './Components/Home/HowItWorks'
import TemplateSlider from './Components/Home/TemplateSlider'
import Testimonials from './Components/Home/Testimonials'
import FAQ from './Components/Home/FAQ'
import Footer from './Components/Home/Footer'
import OpenRoute from './Hooks/OpenRoute'
import PrivateRoute from './Hooks/PrivateRoute'
import AdminRoute from './Hooks/AdminRoute'
import SupportRoute from './Hooks/SupportRoute'
import RecruiterRoute from './Hooks/RecruiterRoute'
import ScrollToTop from './Components/extra/ScrollToTop'
import AnnouncementBanner from './Components/extra/AnnouncementBanner'
import CookieConsent from './Components/extra/CookieConsent'
import ErrorBoundary from './Components/extra/ErrorBoundary'

// Lazy-loaded route components — split into separate chunks for faster initial load sir
const Join = lazy(() => import('./Components/UserCreation/Join'))
const OTP = lazy(() => import('./Components/UserCreation/OTP'))
const Login = lazy(() => import('./Components/Login/User'))
const ForgotPassword = lazy(() => import('./Components/Login/ForgotPassword'))
const ResetPassword = lazy(() => import('./Components/Login/ResetPassword'))
const OAuthComplete = lazy(() => import('./Components/Login/OAuthComplete'))
const Pricing = lazy(() => import('./Components/Home/Pricing'))
const DashboardHome = lazy(() => import('./Components/Dashboard/DashboardHome'))
const NewReview = lazy(() => import('./Components/Dashboard/NewReview'))
const TemplatePicker = lazy(() => import('./Components/ResumeBuilder/TemplatePicker'))
const BuildResumePicker = lazy(() => import('./Components/ResumeBuilder/BuildResumePicker'))
const BuilderEditor = lazy(() => import('./Components/ResumeBuilder/BuilderEditor'))
const Resumes = lazy(() => import('./Components/Dashboard/Resumes'))
const BuiltResumes = lazy(() => import('./Components/Dashboard/BuiltResumes'))
const Applications = lazy(() => import('./Components/Dashboard/Applications'))
const KeywordBank = lazy(() => import('./Components/Dashboard/KeywordBank'))
const Report = lazy(() => import('./Components/Dashboard/Report'))
const History = lazy(() => import('./Components/Dashboard/History'))
const Leaderboard = lazy(() => import('./Components/Dashboard/Leaderboard'))
const Chat = lazy(() => import('./Components/Dashboard/Chat'))
const CoverLetter = lazy(() => import('./Components/Dashboard/CoverLetter'))
const JobSearch = lazy(() => import('./Components/Dashboard/JobSearch'))
const MockInterview = lazy(() => import('./Components/Dashboard/MockInterview'))
const Account = lazy(() => import('./Components/Dashboard/Account'))
const Suspended = lazy(() => import('./Components/Dashboard/Suspended'))
const AdminOverview = lazy(() => import('./Components/Admin/Overview'))
const AdminUsers = lazy(() => import('./Components/Admin/Users'))
const AdminPayments = lazy(() => import('./Components/Admin/Payments'))
const AdminAudit = lazy(() => import('./Components/Admin/Audit'))
const AdminCreditGrants = lazy(() => import('./Components/Admin/CreditGrants'))
const AdminAnnouncements = lazy(() => import('./Components/Admin/Announcements'))
const AdminTestimonials = lazy(() => import('./Components/Admin/Testimonials'))
const AdminReports = lazy(() => import('./Components/Admin/Reports'))
const AdminSettings = lazy(() => import('./Components/Admin/Settings'))
const SharedReport = lazy(() => import('./Components/extra/SharedReport'))
const SharedPortfolio = lazy(() => import('./Components/extra/SharedPortfolio'))
const PrivacyPolicy = lazy(() => import('./Components/extra/PrivacyPolicy'))
const TermsAndConditions = lazy(() => import('./Components/extra/TermsAndConditions'))
const RefundPolicy = lazy(() => import('./Components/extra/RefundPolicy'))
const RecruiterJobList = lazy(() => import('./Components/Recruiter/JobList'))
const RecruiterJobBuilder = lazy(() => import('./Components/Recruiter/JobBuilder'))
const RecruiterJobDetail = lazy(() => import('./Components/Recruiter/JobDetailRecruiter'))
const RecruiterTestBuilder = lazy(() => import('./Components/Recruiter/TestBuilder'))
const RecruiterJobApplicantsList = lazy(() => import('./Components/Recruiter/JobApplicantsList'))
const RecruiterJobAnalytics = lazy(() => import('./Components/Recruiter/JobAnalytics'))
const RecruiterOverview = lazy(() => import('./Components/Recruiter/RecruiterOverview'))
const RecruiterAttemptDetail = lazy(() => import('./Components/Recruiter/AttemptDetail'))
const RecruiterAccount = lazy(() => import('./Components/Recruiter/RecruiterAccount'))
const ProctoredTestConsent = lazy(() => import('./Components/ProctoredTest/TestConsent'))
const ProctoredTestRunner = lazy(() => import('./Components/ProctoredTest/ProctoredTestRunner'))
const JobBoard = lazy(() => import('./Components/Jobs/JobBoard'))
const JobDetail = lazy(() => import('./Components/Jobs/JobDetail'))
const MyApplications = lazy(() => import('./Components/Dashboard/MyApplications'))
const ForRecruiters = lazy(() => import('./Components/Home/ForRecruiters'))
const AdminRecruiterApplications = lazy(() => import('./Components/Admin/RecruiterApplications'))

const PageLoader = () => (
  <div className="min-h-screen bg-richblack-900 flex items-center justify-center">
    <div className="w-10 h-10 border-4 border-yellow-50 border-t-transparent rounded-full animate-spin" />
  </div>
)

const Homelayout = () => {
  return (
    <div className="bg-richblack-900 min-h-screen flex flex-col">
      <Helmet>
        <title>Resumify — Beat the ATS</title>
      </Helmet>
      <Navbar />
      <div className="flex-1">
        <Banner />
        <HowItWorks />
        <TemplateSlider />
        <Testimonials />
        <FAQ />
      </div>
      <Footer />
    </div>
  )
}

function App() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const location = useLocation()

  // cross-tab logout sync sir — LogoutUser/DeleteAccount (Services/operations/Auth.js) and the
  // apiConnector 401 interceptor all clear the "user" key on logout/session-expiry. That only
  // touches THIS tab's Redux store though — a second tab left open keeps thinking it's still
  // logged in until it hits its own 401. The "storage" event fires in every OTHER tab (never
  // the one that made the change) whenever localStorage changes, so listen for "user" going
  // away and mirror the same clear-state here, then bounce to /Login if not already there.
  //
  // Watches "user", not "token", sir: the token is no longer persisted at all (it lives in
  // memory only, see Slices/authSlice.js), so a "token" listener would never fire again and
  // cross-tab logout would silently stop working.
  useEffect(() => {
    const handleStorageChange = (event) => {
      if (event.key !== 'user') return
      if (event.newValue) return // user was SET (login), not cleared — nothing to sync
      dispatch(setToken(null))
      dispatch(setUser(null))
      dispatch(setLogin(false))
      if (location.pathname !== '/Login') {
        navigate('/Login')
      }
    }
    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname])

  // Render free tier sleeps after inactivity sir — ping the backend root the moment
  // anyone lands so the 30-60s cold start happens NOW, not on their first real API call
  useEffect(() => {
    const backendUrl = import.meta.env.VITE_MAIN_BACKEND_URL
    if (!backendUrl) return
    try {
      const wakeUrl = new URL(backendUrl).origin
      fetch(wakeUrl, { method: 'GET' }).catch(() => {})
    } catch {
      // malformed env URL sir — nothing to wake
    }
  }, [])

  // anonymous first-visit tracking for the admin traffic dashboard sir — the backend sets its own
  // httpOnly visitor_id cookie, but JS can't read httpOnly, so this localStorage flag is what
  // stops the beacon firing again on every future page load in this browser
  useEffect(() => {
    const backendUrl = import.meta.env.VITE_MAIN_BACKEND_URL
    if (!backendUrl) return
    if (localStorage.getItem('visit_tracked')) return
    fetch(`${backendUrl}/track-visit`, { method: 'POST', credentials: 'include' })
      .then(() => localStorage.setItem('visit_tracked', '1'))
      .catch(() => {})
  }, [])

  return (
    <>
      {/* the live admin broadcast sir — shows only when one is published */}
      <AnnouncementBanner />
      {/* cookie consent card sir — shows once until accepted */}
      <CookieConsent />
      <ScrollToTop />
      <ErrorBoundary>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Public sir */}
            <Route path="/" element={<Homelayout />} />
            <Route path="/Pricing" element={<Pricing />} />
            <Route path="/Shared/:shareId" element={<SharedReport />} />
            <Route path="/Portfolio/:shareId" element={<SharedPortfolio />} />
            <Route path="/Privacy-Policy" element={<PrivacyPolicy />} />
            <Route path="/Terms-And-Conditions" element={<TermsAndConditions />} />
            <Route path="/Refund-Policy" element={<RefundPolicy />} />
            <Route path="/oauth/complete" element={<OAuthComplete />} />
            {/* public job board sir — deliberately NOT /Dashboard/Job-Search, that's the
                unrelated private Tavily web-search feature. Anyone can browse without logging in. */}
            <Route path="/Jobs" element={<JobBoard />} />
            <Route path="/Jobs/:jobId" element={<JobDetail />} />
            <Route path="/For-Recruiters" element={<ForRecruiters />} />

            {/* Only for the logged-OUT sir */}
            <Route path="/Signup" element={<OpenRoute><Join /></OpenRoute>} />
            <Route path="/Verify-Otp" element={<OpenRoute><OTP /></OpenRoute>} />
            <Route path="/Login" element={<OpenRoute><Login /></OpenRoute>} />
            <Route path="/Forgot-Password" element={<OpenRoute><ForgotPassword /></OpenRoute>} />
            <Route path="/reset-password/:token" element={<OpenRoute><ResetPassword /></OpenRoute>} />

            {/* Only for the logged-IN sir */}
            <Route path="/Dashboard" element={<PrivateRoute><DashboardHome /></PrivateRoute>} />
            <Route path="/Dashboard/New-Review" element={<PrivateRoute><NewReview /></PrivateRoute>} />
            <Route path="/Dashboard/Templates" element={<PrivateRoute><TemplatePicker /></PrivateRoute>} />
            <Route path="/Dashboard/Build-Resume" element={<PrivateRoute><BuildResumePicker /></PrivateRoute>} />
            <Route path="/Dashboard/Build-Resume/:resumeId" element={<PrivateRoute><BuilderEditor /></PrivateRoute>} />
            <Route path="/Dashboard/Resumes" element={<PrivateRoute><Resumes /></PrivateRoute>} />
            <Route path="/Dashboard/Built-Resumes" element={<PrivateRoute><BuiltResumes /></PrivateRoute>} />
            <Route path="/Dashboard/Applications" element={<PrivateRoute><Applications /></PrivateRoute>} />
            <Route path="/Dashboard/Keyword-Bank" element={<PrivateRoute><KeywordBank /></PrivateRoute>} />
            <Route path="/Dashboard/Review/:reviewId" element={<PrivateRoute><Report /></PrivateRoute>} />
            <Route path="/Dashboard/History" element={<PrivateRoute><History /></PrivateRoute>} />
            <Route path="/Dashboard/Leaderboard" element={<PrivateRoute><Leaderboard /></PrivateRoute>} />
            <Route path="/Dashboard/Chats" element={<PrivateRoute><Chat /></PrivateRoute>} />
            <Route path="/Dashboard/Chat/:chatId" element={<PrivateRoute><Chat /></PrivateRoute>} />
            <Route path="/Dashboard/Cover-Letter" element={<PrivateRoute><CoverLetter /></PrivateRoute>} />
            <Route path="/Dashboard/Job-Search" element={<PrivateRoute><JobSearch /></PrivateRoute>} />
            <Route path="/Dashboard/Mock-Interview" element={<PrivateRoute><MockInterview /></PrivateRoute>} />
            <Route path="/Dashboard/Mock-Interview/:sessionId" element={<PrivateRoute><MockInterview /></PrivateRoute>} />
            <Route path="/Dashboard/Account" element={<PrivateRoute><Account /></PrivateRoute>} />
            <Route path="/Dashboard/Suspended" element={<PrivateRoute><Suspended /></PrivateRoute>} />
            {/* candidate's own real job-board applications sir — distinct from
                /Dashboard/Applications (the pre-existing personal Kanban tracker) */}
            <Route path="/Dashboard/My-Applications" element={<PrivateRoute><MyApplications /></PrivateRoute>} />

            {/* candidate-facing proctored test flow sir — plain 'User' accounts only, same
                PrivateRoute as every other Dashboard feature. Not under /Dashboard/* itself since
                the test runner intentionally does NOT use DashboardLayout (no sidebar/nav —
                nothing should distract from or let the candidate navigate away mid-test). */}
            <Route path="/Test/:inviteCode" element={<PrivateRoute><ProctoredTestConsent /></PrivateRoute>} />
            <Route path="/Test/:inviteCode/run" element={<PrivateRoute><ProctoredTestRunner /></PrivateRoute>} />

            {/* Recruiter-only sir — strictly, see RecruiterRoute.jsx. A candidate ('User') hitting
                any of these gets redirected to their own Dashboard instead of being let through.
                Jobs are the top-level view now — a Test lives inside a Job, reached from it. */}
            <Route path="/Recruiter" element={<RecruiterRoute><RecruiterJobList /></RecruiterRoute>} />
            <Route path="/Recruiter/Analytics" element={<RecruiterRoute><RecruiterOverview /></RecruiterRoute>} />
            <Route path="/Recruiter/New" element={<RecruiterRoute><RecruiterJobBuilder /></RecruiterRoute>} />
            <Route path="/Recruiter/Jobs/:jobId" element={<RecruiterRoute><RecruiterJobDetail /></RecruiterRoute>} />
            <Route path="/Recruiter/Jobs/:jobId/Test" element={<RecruiterRoute><RecruiterTestBuilder /></RecruiterRoute>} />
            <Route path="/Recruiter/Jobs/:jobId/applicants" element={<RecruiterRoute><RecruiterJobApplicantsList /></RecruiterRoute>} />
            <Route path="/Recruiter/Jobs/:jobId/analytics" element={<RecruiterRoute><RecruiterJobAnalytics /></RecruiterRoute>} />
            <Route path="/Recruiter/Attempts/:attemptId" element={<RecruiterRoute><RecruiterAttemptDetail /></RecruiterRoute>} />
            <Route path="/Recruiter/Account" element={<RecruiterRoute><RecruiterAccount /></RecruiterRoute>} />

            {/* Admin-only sir — strictly, see AdminRoute.jsx. A Support user hitting any of
                these gets redirected to their OWN dashboard at /Support, never let through. */}
            <Route path="/Admin" element={<AdminRoute><AdminOverview /></AdminRoute>} />
            <Route path="/Admin/Users" element={<AdminRoute><AdminUsers /></AdminRoute>} />
            <Route path="/Admin/Payments" element={<AdminRoute><AdminPayments /></AdminRoute>} />
            <Route path="/Admin/Audit" element={<AdminRoute><AdminAudit /></AdminRoute>} />
            <Route path="/Admin/Credit-Grants" element={<AdminRoute><AdminCreditGrants /></AdminRoute>} />
            <Route path="/Admin/Announcements" element={<AdminRoute><AdminAnnouncements /></AdminRoute>} />
            <Route path="/Admin/Testimonials" element={<AdminRoute><AdminTestimonials /></AdminRoute>} />
            <Route path="/Admin/Reports" element={<AdminRoute><AdminReports /></AdminRoute>} />
            <Route path="/Admin/Recruiter-Applications" element={<AdminRoute><AdminRecruiterApplications /></AdminRoute>} />
            <Route path="/Admin/Settings" element={<AdminRoute><AdminSettings /></AdminRoute>} />

            {/* Support-only sir — strictly, see SupportRoute.jsx. An Admin hitting any of these
                gets redirected to /Admin instead. Reuses the same Overview/Users/Payments/
                Announcements components (they already self-gate write actions by role
                internally), just under their own URL space with no Audit/Settings routes at all. */}
            <Route path="/Support" element={<SupportRoute><AdminOverview /></SupportRoute>} />
            <Route path="/Support/Users" element={<SupportRoute><AdminUsers /></SupportRoute>} />
            <Route path="/Support/Payments" element={<SupportRoute><AdminPayments /></SupportRoute>} />
            <Route path="/Support/Announcements" element={<SupportRoute><AdminAnnouncements /></SupportRoute>} />
            <Route path="/Support/Testimonials" element={<SupportRoute><AdminTestimonials /></SupportRoute>} />
            <Route path="/Support/Reports" element={<SupportRoute><AdminReports /></SupportRoute>} />

            {/* anything unknown goes home sir */}
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </>
  )
}

export default App
