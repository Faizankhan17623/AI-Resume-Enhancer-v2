import { lazy, Suspense, useEffect } from 'react'
import { Routes, Route, Navigate } from "react-router-dom"
import { Helmet } from 'react-helmet-async'
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
import ScrollToTop from './Components/extra/ScrollToTop'
import AnnouncementBanner from './Components/extra/AnnouncementBanner'
import CookieConsent from './Components/extra/CookieConsent'

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
const BuildResumePicker = lazy(() => import('./Components/ResumeBuilder/BuildResumePicker'))
const BuilderEditor = lazy(() => import('./Components/ResumeBuilder/BuilderEditor'))
const Resumes = lazy(() => import('./Components/Dashboard/Resumes'))
const Applications = lazy(() => import('./Components/Dashboard/Applications'))
const KeywordBank = lazy(() => import('./Components/Dashboard/KeywordBank'))
const Report = lazy(() => import('./Components/Dashboard/Report'))
const History = lazy(() => import('./Components/Dashboard/History'))
const Leaderboard = lazy(() => import('./Components/Dashboard/Leaderboard'))
const Chat = lazy(() => import('./Components/Dashboard/Chat'))
const CoverLetter = lazy(() => import('./Components/Dashboard/CoverLetter'))
const JobSearch = lazy(() => import('./Components/Dashboard/JobSearch'))
const Account = lazy(() => import('./Components/Dashboard/Account'))
const AdminOverview = lazy(() => import('./Components/Admin/Overview'))
const AdminUsers = lazy(() => import('./Components/Admin/Users'))
const AdminPayments = lazy(() => import('./Components/Admin/Payments'))
const AdminAudit = lazy(() => import('./Components/Admin/Audit'))
const AdminAnnouncements = lazy(() => import('./Components/Admin/Announcements'))
const AdminSettings = lazy(() => import('./Components/Admin/Settings'))
const SharedReport = lazy(() => import('./Components/extra/SharedReport'))

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
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public sir */}
          <Route path="/" element={<Homelayout />} />
          <Route path="/Pricing" element={<Pricing />} />
          <Route path="/Shared/:shareId" element={<SharedReport />} />
          <Route path="/oauth/complete" element={<OAuthComplete />} />

          {/* Only for the logged-OUT sir */}
          <Route path="/Signup" element={<OpenRoute><Join /></OpenRoute>} />
          <Route path="/Verify-Otp" element={<OpenRoute><OTP /></OpenRoute>} />
          <Route path="/Login" element={<OpenRoute><Login /></OpenRoute>} />
          <Route path="/Forgot-Password" element={<OpenRoute><ForgotPassword /></OpenRoute>} />
          <Route path="/reset-password/:token" element={<OpenRoute><ResetPassword /></OpenRoute>} />

          {/* Only for the logged-IN sir */}
          <Route path="/Dashboard" element={<PrivateRoute><DashboardHome /></PrivateRoute>} />
          <Route path="/Dashboard/New-Review" element={<PrivateRoute><NewReview /></PrivateRoute>} />
          <Route path="/Dashboard/Build-Resume" element={<PrivateRoute><BuildResumePicker /></PrivateRoute>} />
          <Route path="/Dashboard/Build-Resume/:resumeId" element={<PrivateRoute><BuilderEditor /></PrivateRoute>} />
          <Route path="/Dashboard/Resumes" element={<PrivateRoute><Resumes /></PrivateRoute>} />
          <Route path="/Dashboard/Applications" element={<PrivateRoute><Applications /></PrivateRoute>} />
          <Route path="/Dashboard/Keyword-Bank" element={<PrivateRoute><KeywordBank /></PrivateRoute>} />
          <Route path="/Dashboard/Review/:reviewId" element={<PrivateRoute><Report /></PrivateRoute>} />
          <Route path="/Dashboard/History" element={<PrivateRoute><History /></PrivateRoute>} />
          <Route path="/Dashboard/Leaderboard" element={<PrivateRoute><Leaderboard /></PrivateRoute>} />
          <Route path="/Dashboard/Chats" element={<PrivateRoute><Chat /></PrivateRoute>} />
          <Route path="/Dashboard/Chat/:chatId" element={<PrivateRoute><Chat /></PrivateRoute>} />
          <Route path="/Dashboard/Cover-Letter" element={<PrivateRoute><CoverLetter /></PrivateRoute>} />
          <Route path="/Dashboard/Job-Search" element={<PrivateRoute><JobSearch /></PrivateRoute>} />
          <Route path="/Dashboard/Account" element={<PrivateRoute><Account /></PrivateRoute>} />

          {/* Admin-only sir — strictly, see AdminRoute.jsx. A Support user hitting any of
              these gets redirected to their OWN dashboard at /Support, never let through. */}
          <Route path="/Admin" element={<AdminRoute><AdminOverview /></AdminRoute>} />
          <Route path="/Admin/Users" element={<AdminRoute><AdminUsers /></AdminRoute>} />
          <Route path="/Admin/Payments" element={<AdminRoute><AdminPayments /></AdminRoute>} />
          <Route path="/Admin/Audit" element={<AdminRoute><AdminAudit /></AdminRoute>} />
          <Route path="/Admin/Announcements" element={<AdminRoute><AdminAnnouncements /></AdminRoute>} />
          <Route path="/Admin/Settings" element={<AdminRoute><AdminSettings /></AdminRoute>} />

          {/* Support-only sir — strictly, see SupportRoute.jsx. An Admin hitting any of these
              gets redirected to /Admin instead. Reuses the same Overview/Users/Payments/
              Announcements components (they already self-gate write actions by role
              internally), just under their own URL space with no Audit/Settings routes at all. */}
          <Route path="/Support" element={<SupportRoute><AdminOverview /></SupportRoute>} />
          <Route path="/Support/Users" element={<SupportRoute><AdminUsers /></SupportRoute>} />
          <Route path="/Support/Payments" element={<SupportRoute><AdminPayments /></SupportRoute>} />
          <Route path="/Support/Announcements" element={<SupportRoute><AdminAnnouncements /></SupportRoute>} />

          {/* anything unknown goes home sir */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Suspense>
    </>
  )
}

export default App
