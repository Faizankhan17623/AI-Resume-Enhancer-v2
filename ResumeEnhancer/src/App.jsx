import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from "react-router-dom"
import { Helmet } from 'react-helmet-async'
import Navbar from './Components/Home/Navbar'
import Banner from './Components/Home/Banner'
import HowItWorks from './Components/Home/HowItWorks'
import TemplateSlider from './Components/Home/TemplateSlider'
import FAQ from './Components/Home/FAQ'
import Footer from './Components/Home/Footer'
import OpenRoute from './Hooks/OpenRoute'
import PrivateRoute from './Hooks/PrivateRoute'
import AdminRoute from './Hooks/AdminRoute'
import ScrollToTop from './Components/extra/ScrollToTop'
import AnnouncementBanner from './Components/extra/AnnouncementBanner'

// Lazy-loaded route components — split into separate chunks for faster initial load sir
const Join = lazy(() => import('./Components/UserCreation/Join'))
const OTP = lazy(() => import('./Components/UserCreation/OTP'))
const Login = lazy(() => import('./Components/Login/User'))
const Pricing = lazy(() => import('./Components/Home/Pricing'))
const DashboardHome = lazy(() => import('./Components/Dashboard/DashboardHome'))
const NewReview = lazy(() => import('./Components/Dashboard/NewReview'))
const BuildResumePicker = lazy(() => import('./Components/ResumeBuilder/BuildResumePicker'))
const BuilderEditor = lazy(() => import('./Components/ResumeBuilder/BuilderEditor'))
const Resumes = lazy(() => import('./Components/Dashboard/Resumes'))
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
        <FAQ />
      </div>
      <Footer />
    </div>
  )
}

function App() {
  return (
    <>
      {/* the live admin broadcast sir — shows only when one is published */}
      <AnnouncementBanner />
      <ScrollToTop />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public sir */}
          <Route path="/" element={<Homelayout />} />
          <Route path="/Pricing" element={<Pricing />} />
          <Route path="/Shared/:shareId" element={<SharedReport />} />

          {/* Only for the logged-OUT sir */}
          <Route path="/Signup" element={<OpenRoute><Join /></OpenRoute>} />
          <Route path="/Verify-Otp" element={<OpenRoute><OTP /></OpenRoute>} />
          <Route path="/Login" element={<OpenRoute><Login /></OpenRoute>} />

          {/* Only for the logged-IN sir */}
          <Route path="/Dashboard" element={<PrivateRoute><DashboardHome /></PrivateRoute>} />
          <Route path="/Dashboard/New-Review" element={<PrivateRoute><NewReview /></PrivateRoute>} />
          <Route path="/Dashboard/Build-Resume" element={<PrivateRoute><BuildResumePicker /></PrivateRoute>} />
          <Route path="/Dashboard/Build-Resume/:resumeId" element={<PrivateRoute><BuilderEditor /></PrivateRoute>} />
          <Route path="/Dashboard/Resumes" element={<PrivateRoute><Resumes /></PrivateRoute>} />
          <Route path="/Dashboard/Review/:reviewId" element={<PrivateRoute><Report /></PrivateRoute>} />
          <Route path="/Dashboard/History" element={<PrivateRoute><History /></PrivateRoute>} />
          <Route path="/Dashboard/Leaderboard" element={<PrivateRoute><Leaderboard /></PrivateRoute>} />
          <Route path="/Dashboard/Chats" element={<PrivateRoute><Chat /></PrivateRoute>} />
          <Route path="/Dashboard/Chat/:chatId" element={<PrivateRoute><Chat /></PrivateRoute>} />
          <Route path="/Dashboard/Cover-Letter" element={<PrivateRoute><CoverLetter /></PrivateRoute>} />
          <Route path="/Dashboard/Job-Search" element={<PrivateRoute><JobSearch /></PrivateRoute>} />
          <Route path="/Dashboard/Account" element={<PrivateRoute><Account /></PrivateRoute>} />

          {/* Admin and Support only sir — the backend re-checks the role on every call anyway */}
          <Route path="/Admin" element={<AdminRoute><AdminOverview /></AdminRoute>} />
          <Route path="/Admin/Users" element={<AdminRoute><AdminUsers /></AdminRoute>} />
          <Route path="/Admin/Payments" element={<AdminRoute><AdminPayments /></AdminRoute>} />
          <Route path="/Admin/Audit" element={<AdminRoute><AdminAudit /></AdminRoute>} />
          <Route path="/Admin/Announcements" element={<AdminRoute><AdminAnnouncements /></AdminRoute>} />

          {/* anything unknown goes home sir */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Suspense>
    </>
  )
}

export default App
