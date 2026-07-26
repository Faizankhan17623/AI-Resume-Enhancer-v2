import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Helmet } from 'react-helmet-async'
import { motion, AnimatePresence } from 'motion/react'
import { FaStar, FaCheck, FaTimes, FaTrash, FaCommentDots } from 'react-icons/fa'
import Navbar from '../Home/Navbar'
import AdminNav from './AdminNav'
import PageTransition from '../extra/PageTransition'
import { fadeUp, staggerContainer } from '../../utils/motion'
import { GetTestimonials, ModerateTestimonial, DeleteTestimonial } from '../../Services/operations/Admin'

const STATUS_FILTERS = [
  { label: 'Pending', value: 'pending' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
  { label: 'All', value: '' },
]

const STATUS_BADGE = {
  pending: 'bg-yellow-700/20 text-yellow-25 border-yellow-700',
  approved: 'bg-caribgreen-700/30 text-caribgreen-25 border-caribgreen-700',
  rejected: 'bg-pink-700/20 text-pink-100 border-pink-700',
}

const Testimonials = () => {
  const [statusFilter, setStatusFilter] = useState('pending')
  const dispatch = useDispatch()
  const { token, user } = useSelector((state) => state.auth)
  const { testimonials } = useSelector((state) => state.admin)
  const isAdmin = user?.role === 'Admin'

  useEffect(() => {
    dispatch(GetTestimonials(token, statusFilter))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter])

  return (
    <div className="min-h-screen w-full bg-richblack-900">
      <Helmet>
        <title>Admin — Testimonials | Resumify</title>
      </Helmet>
      <Navbar />
      <AdminNav />

      <PageTransition className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 className="font-display text-lg text-richblack-5 flex items-center gap-2">
            <FaCommentDots className="text-yellow-50" /> User testimonials
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
          {testimonials.length === 0 ? (
            <p className="text-sm text-richblack-300 py-6 text-center">Nothing here sir.</p>
          ) : (
            <motion.div variants={staggerContainer(0.05)} initial={false} animate="show" className="space-y-3">
              <AnimatePresence>
                {testimonials.map((item) => (
                  <motion.div
                    key={item._id}
                    layout
                    variants={fadeUp}
                    exit={{ opacity: 0, x: -20 }}
                    className="rounded-xl border border-richblack-700 bg-richblack-800 p-5 flex items-start justify-between gap-4"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-3 flex-wrap">
                        <p className="font-bold text-richblack-5">
                          {item.user?.firstName} {item.user?.lastName}
                        </p>
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border uppercase ${STATUS_BADGE[item.status]}`}>
                          {item.status}
                        </span>
                        <div className="flex gap-0.5 text-warm-200 text-xs">
                          {Array.from({ length: item.rating }).map((_, s) => <FaStar key={s} />)}
                        </div>
                      </div>
                      <p className="text-xs text-richblack-400 mt-1">{item.user?.email} · {item.role}</p>
                      <p className="text-sm text-richblack-200 mt-2">"{item.quote}"</p>
                      <p className="text-xs text-richblack-400 mt-2">{new Date(item.createdAt).toLocaleString()}</p>
                    </div>
                    {isAdmin && (
                      <div className="flex items-center gap-2 shrink-0">
                        {item.status !== 'approved' && (
                          <button
                            onClick={() => dispatch(ModerateTestimonial(item._id, 'approved', token))}
                            title="Approve"
                            className="p-2 rounded-lg text-caribgreen-25 hover:bg-richblack-700 transition-colors duration-200 cursor-pointer"
                          >
                            <FaCheck className="text-sm" />
                          </button>
                        )}
                        {item.status !== 'rejected' && (
                          <button
                            onClick={() => dispatch(ModerateTestimonial(item._id, 'rejected', token))}
                            title="Reject"
                            className="p-2 rounded-lg text-yellow-25 hover:bg-richblack-700 transition-colors duration-200 cursor-pointer"
                          >
                            <FaTimes className="text-sm" />
                          </button>
                        )}
                        <button
                          onClick={() => dispatch(DeleteTestimonial(item._id, token))}
                          title="Delete"
                          className="p-2 rounded-lg text-pink-200 hover:bg-richblack-700 transition-colors duration-200 cursor-pointer"
                        >
                          <FaTrash className="text-sm" />
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

export default Testimonials
