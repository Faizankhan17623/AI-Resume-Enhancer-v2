import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Helmet } from 'react-helmet-async'
import { motion, AnimatePresence } from 'motion/react'
import Swal from 'sweetalert2'
import { FaCheck, FaTimes, FaUserTie, FaGlobe } from 'react-icons/fa'
import Navbar from '../Home/Navbar'
import AdminNav from './AdminNav'
import PageTransition from '../extra/PageTransition'
import { fadeUp, staggerContainer } from '../../utils/motion'
import { GetRecruiterApplications, ApproveRecruiterApplication, RejectRecruiterApplication } from '../../Services/operations/Admin'

const swalDark = { background: '#1F1C16', color: '#F3EFE6', confirmButtonColor: '#2F6F5E', cancelButtonColor: '#3A3428' }

const STATUS_FILTERS = [
  { label: 'Pending', value: 'pending' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
]

const STATUS_BADGE = {
  pending: 'bg-yellow-700/20 text-yellow-25 border-yellow-700',
  approved: 'bg-caribgreen-700/30 text-caribgreen-25 border-caribgreen-700',
  rejected: 'bg-pink-700/20 text-pink-100 border-pink-700',
}

// Admin-only approval queue for recruiter self-signup sir — verification is a manual judgment
// call based on company name/brand, not an automated check (per the user's explicit ask)
const RecruiterApplications = () => {
  const [statusFilter, setStatusFilter] = useState('pending')
  const dispatch = useDispatch()
  const { token, user } = useSelector((state) => state.auth)
  const { recruiterApplications, loading } = useSelector((state) => state.admin)
  const isAdmin = user?.role === 'Admin'

  useEffect(() => {
    dispatch(GetRecruiterApplications(token, statusFilter))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter])

  const handleApprove = async (applicant) => {
    const { isConfirmed } = await Swal.fire({
      ...swalDark,
      title: `Approve ${applicant.email} as a Recruiter?`,
      text: `${applicant.recruiterApplication?.companyName} will be able to post jobs immediately.`,
      showCancelButton: true,
      confirmButtonText: 'Approve',
    })
    if (isConfirmed) dispatch(ApproveRecruiterApplication(applicant._id, token, statusFilter))
  }

  const handleReject = async (applicant) => {
    const { value, isConfirmed } = await Swal.fire({
      ...swalDark,
      title: `Reject ${applicant.email}'s application?`,
      input: 'text',
      inputPlaceholder: 'Reason (optional, shown to the applicant)',
      customClass: { input: 'swal-dark-select' },
      showCancelButton: true,
      confirmButtonText: 'Reject',
      confirmButtonColor: '#C1443C',
    })
    if (isConfirmed) dispatch(RejectRecruiterApplication(applicant._id, value || '', token, statusFilter))
  }

  return (
    <div className="min-h-screen w-full bg-richblack-900">
      <Helmet>
        <title>Admin — Recruiter Applications | Resumify</title>
      </Helmet>
      <Navbar />
      <AdminNav />

      <PageTransition className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 className="font-display text-lg text-richblack-5 flex items-center gap-2">
            <FaUserTie className="text-yellow-50" /> Recruiter applications
          </h2>
          <div className="flex items-center gap-1 bg-richblack-800 rounded-lg p-1">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setStatusFilter(f.value)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors duration-200 cursor-pointer ${
                  statusFilter === f.value ? 'bg-yellow-50 text-richblack-900' : 'text-richblack-300 hover:text-richblack-5'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          {loading ? (
            <p className="text-sm text-richblack-300 py-6 text-center">Loading...</p>
          ) : recruiterApplications.length === 0 ? (
            <p className="text-sm text-richblack-300 py-6 text-center">Nothing here.</p>
          ) : (
            <motion.div variants={staggerContainer(0.05)} initial={false} animate="show" className="space-y-3">
              <AnimatePresence>
                {recruiterApplications.map((applicant) => (
                  <motion.div
                    key={applicant._id}
                    layout
                    variants={fadeUp}
                    exit={{ opacity: 0, x: -20 }}
                    className="rounded-xl border border-richblack-700 bg-richblack-800 p-5 flex items-start justify-between gap-4 flex-wrap"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-3 flex-wrap">
                        <p className="font-bold text-richblack-5">{applicant.recruiterApplication?.companyName}</p>
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border uppercase ${STATUS_BADGE[applicant.recruiterApplication?.status]}`}>
                          {applicant.recruiterApplication?.status}
                        </span>
                      </div>
                      <p className="text-xs text-richblack-400 mt-1">
                        {applicant.firstName} {applicant.lastName} · {applicant.email}
                      </p>
                      <p className="text-xs text-richblack-400 mt-1">
                        {applicant.recruiterApplication?.companySize && `${applicant.recruiterApplication.companySize} employees`}
                        {applicant.recruiterApplication?.companySize && applicant.recruiterApplication?.location && ' · '}
                        {applicant.recruiterApplication?.location}
                      </p>
                      {applicant.recruiterApplication?.companyWebsite && (
                        <a
                          href={applicant.recruiterApplication.companyWebsite}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1.5 text-xs text-blue-100 hover:underline mt-2"
                        >
                          <FaGlobe /> {applicant.recruiterApplication.companyWebsite}
                        </a>
                      )}
                      {applicant.recruiterApplication?.hiringNeeds && (
                        <p className="text-sm text-richblack-200 mt-2">"{applicant.recruiterApplication.hiringNeeds}"</p>
                      )}
                      {applicant.recruiterApplication?.status === 'rejected' && applicant.recruiterApplication?.rejectionReason && (
                        <p className="text-xs text-pink-100 mt-2">Rejected: {applicant.recruiterApplication.rejectionReason}</p>
                      )}
                    </div>
                    {isAdmin && applicant.recruiterApplication?.status === 'pending' && (
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleApprove(applicant)}
                          title="Approve"
                          className="p-2 rounded-lg text-caribgreen-25 hover:bg-richblack-700 transition-colors duration-200 cursor-pointer"
                        >
                          <FaCheck className="text-sm" />
                        </button>
                        <button
                          onClick={() => handleReject(applicant)}
                          title="Reject"
                          className="p-2 rounded-lg text-pink-200 hover:bg-richblack-700 transition-colors duration-200 cursor-pointer"
                        >
                          <FaTimes className="text-sm" />
                        </button>
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </div>
      </PageTransition>
    </div>
  )
}

export default RecruiterApplications
