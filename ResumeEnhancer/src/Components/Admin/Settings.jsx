import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Helmet } from 'react-helmet-async'
import { motion } from 'motion/react'
import { FaToggleOn, FaToggleOff, FaSlidersH } from 'react-icons/fa'
import Navbar from '../Home/Navbar'
import AdminNav from './AdminNav'
import PageTransition from '../extra/PageTransition'
import { fadeUp, staggerContainer } from '../../utils/motion'
import { GetSettings, UpdateSetting } from '../../Services/operations/Admin'

// human-friendly label + description for each known key sir — must match KNOWN_KEYS in
// Backend/controllers/AdminSettings.js
const LABELS = {
  'feature.review': { label: 'AI Resume Review', description: 'The core ATS review — upload + JD, score, gaps.' },
  'feature.coverLetter': { label: 'Cover Letter Generator', description: 'Pro+ feature, generates a tailored cover letter.' },
  'feature.jobSearch': { label: 'Job Search', description: 'Pro+ feature, live job search via Tavily.' },
}

const Settings = () => {
  const dispatch = useDispatch()
  const { token } = useSelector((state) => state.auth)
  const { settings, loading } = useSelector((state) => state.admin)
  const [noteDrafts, setNoteDrafts] = useState({})

  useEffect(() => {
    dispatch(GetSettings(token))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleToggle = (setting) => {
    const note = noteDrafts[setting.key] ?? setting.note ?? ''
    dispatch(UpdateSetting(setting.key, !setting.enabled, note, token))
  }

  const handleNoteBlur = (setting) => {
    const note = noteDrafts[setting.key]
    if (note === undefined || note === setting.note) return
    dispatch(UpdateSetting(setting.key, setting.enabled, note, token))
  }

  return (
    <div className="min-h-screen w-full bg-richblack-900">
      <Helmet>
        <title>Admin — Settings | Resumify</title>
      </Helmet>
      <Navbar />
      <AdminNav />

      <PageTransition className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        <h2 className="font-display text-lg text-richblack-5 flex items-center gap-2">
          <FaSlidersH className="text-yellow-50" /> Feature flags
        </h2>
        <p className="text-sm text-richblack-300 -mt-4">
          Turn a feature off instantly without a redeploy — useful during a cost spike or an incident.
        </p>

        {loading && !settings.length ? (
          <p className="text-sm text-richblack-400 py-6 text-center">Loading settings...</p>
        ) : (
          <motion.div variants={staggerContainer(0.05)} initial="hidden" animate="show" className="space-y-3">
            {settings.map((setting) => {
              const meta = LABELS[setting.key] || { label: setting.key, description: '' }
              return (
                <motion.div
                  key={setting.key}
                  variants={fadeUp}
                  className={`rounded-xl border p-5 flex items-start justify-between gap-4 ${
                    setting.enabled ? 'bg-richblack-800 border-richblack-600' : 'bg-richblack-800/40 border-richblack-700'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3">
                      <p className="font-bold text-richblack-5">{meta.label}</p>
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${
                        setting.enabled
                          ? 'bg-caribgreen-700/30 text-caribgreen-25 border-caribgreen-700'
                          : 'bg-pink-700/20 text-pink-100 border-pink-700'
                      }`}>
                        {setting.enabled ? 'ENABLED' : 'DISABLED'}
                      </span>
                    </div>
                    <p className="text-sm text-richblack-300 mt-1">{meta.description}</p>
                    <input
                      type="text"
                      value={noteDrafts[setting.key] ?? setting.note ?? ''}
                      onChange={(e) => setNoteDrafts((prev) => ({ ...prev, [setting.key]: e.target.value }))}
                      onBlur={() => handleNoteBlur(setting)}
                      placeholder="Optional note — why this was toggled..."
                      className="mt-3 w-full max-w-md rounded-lg bg-richblack-900/60 border border-richblack-600 px-3 py-2 text-xs text-richblack-5 placeholder:text-richblack-400 focus:outline-none focus:border-yellow-50 transition-colors duration-200"
                    />
                    {setting.updatedAt && (
                      <p className="text-xs text-richblack-400 mt-2">Last updated {new Date(setting.updatedAt).toLocaleString()}</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleToggle(setting)}
                    className="shrink-0 text-3xl transition-colors duration-200 cursor-pointer"
                    title={setting.enabled ? 'Turn off' : 'Turn on'}
                  >
                    {setting.enabled ? (
                      <FaToggleOn className="text-caribgreen-100" />
                    ) : (
                      <FaToggleOff className="text-richblack-400" />
                    )}
                  </button>
                </motion.div>
              )
            })}
          </motion.div>
        )}
      </PageTransition>
    </div>
  )
}

export default Settings
