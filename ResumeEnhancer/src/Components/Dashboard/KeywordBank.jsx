import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Helmet } from 'react-helmet-async'
import { motion, AnimatePresence } from 'motion/react'
import { FaCheck, FaTimes, FaUndo, FaKey } from 'react-icons/fa'
import DashboardLayout from './DashboardLayout'
import Loading from '../extra/Loading'
import PageTransition from '../extra/PageTransition'
import { fadeUp, staggerContainer } from '../../utils/motion'
import { GetKeywordBank, UpdateKeywordStatus } from '../../Services/operations/KeywordBank'
import { DirectionAwareTabs } from '../Animated/DirectionAwareTabs'
import { CountUp } from '../Animated/CountUp'

const STATUS_META = {
  matched: { label: 'Matched', chip: 'bg-caribgreen-700/20 text-caribgreen-25 border-caribgreen-700' },
  added: { label: 'Added by you', chip: 'bg-caribgreen-700/20 text-caribgreen-25 border-caribgreen-700' },
  weak: { label: 'Weak', chip: 'bg-yellow-700/20 text-yellow-25 border-yellow-700' },
  missing: { label: 'Missing', chip: 'bg-pink-700/20 text-pink-100 border-pink-700' },
  ignored: { label: 'Ignored', chip: 'bg-richblack-700 text-richblack-300 border-richblack-600' },
}

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'missing', label: 'Missing' },
  { key: 'weak', label: 'Weak' },
  { key: 'matched', label: 'Matched' },
  { key: 'added', label: 'Added by you' },
  { key: 'ignored', label: 'Ignored' },
]

const KeywordBank = () => {
  const dispatch = useDispatch()
  const { token } = useSelector((state) => state.auth)
  const { items, summary, loading } = useSelector((state) => state.keywordBank)

  useEffect(() => {
    dispatch(GetKeywordBank(token))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // one tab per filter sir — DirectionAwareTabs slides the list in from the side the new tab is on
  const renderList = (list) => (
    list.length === 0 ? (
      <p className="text-sm text-richblack-400 py-8 text-center">No keywords in this filter.</p>
    ) : (
      <motion.div variants={staggerContainer(0.03)} initial="hidden" animate="show" className="space-y-2 pt-3">
        <AnimatePresence>
          {list.map((item) => {
            const meta = STATUS_META[item.status] || STATUS_META.missing
            return (
              <motion.div
                key={item._id}
                layout
                variants={fadeUp}
                exit={{ opacity: 0, x: -20, transition: { duration: 0.15 } }}
                className="flex items-center justify-between gap-3 rounded-xl bg-richblack-800 shadow-sm shadow-richblack-900/10 px-4 py-3"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <span className={`shrink-0 px-2.5 py-0.5 text-[10px] font-bold rounded-full border ${meta.chip}`}>
                    {meta.label}
                  </span>
                  <p className="text-sm text-richblack-5 truncate">{item.keyword}</p>
                </div>

                <div className="flex items-center gap-3 shrink-0 text-richblack-300">
                  {item.status !== 'added' && (
                    <button
                      onClick={() => dispatch(UpdateKeywordStatus(item._id, 'added', token))}
                      className="hover:text-caribgreen-100 transition-colors duration-200 cursor-pointer"
                      title="Mark as added to your resume"
                    >
                      <FaCheck className="text-sm" />
                    </button>
                  )}
                  {item.status !== 'ignored' && (
                    <button
                      onClick={() => dispatch(UpdateKeywordStatus(item._id, 'ignored', token))}
                      className="hover:text-pink-200 transition-colors duration-200 cursor-pointer"
                      title="Ignore this keyword"
                    >
                      <FaTimes className="text-sm" />
                    </button>
                  )}
                  {['added', 'ignored'].includes(item.status) && (
                    <button
                      onClick={() => dispatch(UpdateKeywordStatus(item._id, 'missing', token))}
                      className="hover:text-richblack-5 transition-colors duration-200 cursor-pointer"
                      title="Reset"
                    >
                      <FaUndo className="text-xs" />
                    </button>
                  )}
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </motion.div>
    )
  )

  const tabs = FILTERS.map((f, index) => ({
    id: index,
    label: f.label,
    content: renderList(f.key === 'all' ? items : items.filter((i) => i.status === f.key)),
  }))

  return (
    <DashboardLayout title="Keyword Bank">
      <Helmet>
        <title>Keyword Bank | Resumify</title>
      </Helmet>

      <PageTransition className="h-full overflow-y-auto max-w-4xl mx-auto px-4 lg:px-6 py-8">
        <p className="text-sm text-richblack-300 mb-6">
          Every keyword your AI reviews have ever flagged, in one place. Mark one "Added" once it's on your resume, or "Ignore" if it doesn't apply.
        </p>

        {loading ? (
          <Loading text="Loading your keyword bank..." />
        ) : items.length === 0 ? (
          <div className="rounded-xl bg-richblack-800 shadow-md shadow-richblack-900/10 p-16 text-center flex flex-col items-center">
            <FaKey className="text-3xl text-richblack-400 mx-auto mb-4" />
            <p className="text-richblack-200 mb-2">No keywords tracked yet.</p>
            <p className="text-richblack-400 text-sm">Run an AI review and every keyword it flags will show up here automatically.</p>
          </div>
        ) : (
          <>
            {summary && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                <div className="rounded-xl bg-richblack-800 shadow-sm shadow-richblack-900/10 p-4">
                  <p className="font-display text-xl text-richblack-5">
                    {summary.coveragePercent !== null ? <><CountUp value={summary.coveragePercent} />%</> : '—'}
                  </p>
                  <p className="text-xs text-richblack-400 mt-0.5">Coverage</p>
                </div>
                <div className="rounded-xl bg-richblack-800 shadow-sm shadow-richblack-900/10 p-4">
                  <p className="font-display text-xl text-pink-100"><CountUp value={summary.missing} /></p>
                  <p className="text-xs text-richblack-400 mt-0.5">Missing</p>
                </div>
                <div className="rounded-xl bg-richblack-800 shadow-sm shadow-richblack-900/10 p-4">
                  <p className="font-display text-xl text-yellow-25"><CountUp value={summary.weak} /></p>
                  <p className="text-xs text-richblack-400 mt-0.5">Weak</p>
                </div>
                <div className="rounded-xl bg-richblack-800 shadow-sm shadow-richblack-900/10 p-4">
                  <p className="font-display text-xl text-caribgreen-25"><CountUp value={summary.covered} /></p>
                  <p className="text-xs text-richblack-400 mt-0.5">Covered</p>
                </div>
              </div>
            )}

            <DirectionAwareTabs tabs={tabs} />
          </>
        )}
      </PageTransition>
    </DashboardLayout>
  )
}

export default KeywordBank
