import { Link } from 'react-router'
import { FaCrown } from 'react-icons/fa'
import IconBtn from './IconBtn'

// shared upgrade-prompt card sir — same visual shape CoverLetter.jsx/JobSearch.jsx/
// MockInterview.jsx already each hand-rolled independently for their own Pro-gate (crown icon,
// bold one-liner, explanation, "View plans" button to /Pricing). Pulled out once so the new
// credit-exhaustion trigger (NewReview/Chat/MockInterview/BuiltResume all consuming a credit)
// reuses the exact same look instead of a fourth copy, and `reason` lets /Pricing show
// context-aware messaging about WHY the visitor landed there (see Home/Pricing.jsx).
const UpgradeUpsell = ({ title, message, reason }) => (
  <div className="rounded-xl bg-richblack-800 shadow-md shadow-richblack-900/10 p-16 text-center flex flex-col items-center">
    <FaCrown className="text-3xl text-yellow-50 mx-auto mb-4" />
    <p className="text-richblack-100 mb-2 font-semibold">{title}</p>
    <p className="text-richblack-300 text-sm mb-6 max-w-sm">{message}</p>
    <Link to="/Pricing" state={reason ? { reason } : undefined} className="inline-block">
      <IconBtn text="View plans" />
    </Link>
  </div>
)

export default UpgradeUpsell
