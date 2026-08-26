import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Helmet } from 'react-helmet-async'
import { motion, AnimatePresence } from 'motion/react'
import { FaToggleOn, FaToggleOff, FaSlidersH, FaCheck } from 'react-icons/fa'
import Navbar from '../Home/Navbar'
import AdminNav from './AdminNav'
import PageTransition from '../extra/PageTransition'
import Loading from '../extra/Loading'
import { fadeUp, staggerContainer } from '../../utils/motion'
import { GetSettings, UpdateSetting } from '../../Services/operations/Admin'
import { istPartsToUtcDate, utcDateToIstDisplay, istDateStrFromNow } from '../../utils/istTime'

// human-friendly label + description for each known key sir — must match KNOWN_KEYS in
// Backend/controllers/AdminSettings.js
const LABELS = {
  'feature.review': { label: 'AI Resume Review', description: 'The core ATS review — upload + JD, score, gaps.' },
  'feature.coverLetter': { label: 'Cover Letter Generator', description: 'Pro+ feature, generates a tailored cover letter.' },
  'feature.jobSearch': { label: 'Job Search', description: 'Pro+ feature, live job search via Tavily.' },
}

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1)
const MINUTES = Array.from({ length: 60 }, (_, i) => i)

const Settings = () => {
  const dispatch = useDispatch()
  const { token } = useSelector((state) => state.auth)
  const { settings, loading } = useSelector((state) => state.admin)
  const [noteDrafts, setNoteDrafts] = useState({})
  const [savedFlash, setSavedFlash] = useState({})
  // disable-confirmation state sir — only set while turning a flag ON->OFF, requires reason + future IST time
  const [disablingKey, setDisablingKey] = useState(null)
  const [disableForm, setDisableForm] = useState({ note: '', date: istDateStrFromNow(0), hour: 12, minute: 0, meridiem: 'PM' })
  // full-screen loader while a toggle/note save is in flight sir — replaces the old silent
  // wait (no in-flight indicator at all, just the eventual success/error toast)
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    dispatch(GetSettings(token))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleToggle = (setting) => {
    if (setting.enabled) {
      // turning OFF — open the reason + re-enable-time form instead of dispatching immediately
      setDisablingKey(setting.key)
      setDisableForm({ note: '', date: istDateStrFromNow(1), hour: 12, minute: 0, meridiem: 'PM' })
      return
    }
    // turning ON — no note/date required, just re-enable now
    dispatch(UpdateSetting(setting.key, true, '', token, null, setUpdating))
  }

  const handleConfirmDisable = (setting) => {
    const { note, date, hour, minute, meridiem } = disableForm
    if (!note.trim()) {
      return
    }
    const disabledUntil = istPartsToUtcDate(date, hour, minute, meridiem)
    if (!disabledUntil || disabledUntil <= new Date()) {
      return
    }
    dispatch(UpdateSetting(setting.key, false, note.trim(), token, disabledUntil.toISOString(), setUpdating))
    setDisablingKey(null)
  }

  const handleSaveNote = (setting) => {
    const note = noteDrafts[setting.key]
    if (note === undefined || note === setting.note) return
    dispatch(UpdateSetting(setting.key, setting.enabled, note, token, setting.disabledUntil, setUpdating))
    setSavedFlash((prev) => ({ ...prev, [setting.key]: true }))
    setTimeout(() => setSavedFlash((prev) => ({ ...prev, [setting.key]: false })), 1500)
  }

  return (
    <div className="min-h-screen w-full bg-richblack-900">
      <Helmet>
        <title>Admin — Settings | Resumify</title>
      </Helmet>
      <Navbar />
      <AdminNav />

      <AnimatePresence>
      {updating && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-richblack-900/70 backdrop-blur-sm"
        >
          <Loading text="Saving..." size="compact" />
        </motion.div>
      )}
      </AnimatePresence>

      <PageTransition className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        <h2 className="font-display text-lg text-richblack-5 flex items-center gap-2">
          <FaSlidersH className="text-yellow-50" /> Feature flags
        </h2>
        <p className="text-sm text-richblack-300 -mt-4">
          Turn a feature off instantly without a redeploy — useful during a cost spike or an incident.
        </p>

        {/* initial={false} sir — animate only the very first mount; without it, every
            toggle/note-save re-renders this list from Redux and restages the fade-in
            across every card, not just the one that changed */}
        {loading && !settings.length ? (
          <Loading text="Loading settings..." />
        ) : (
          <motion.div variants={staggerContainer(0.05)} initial={false} animate="show" className="space-y-3">
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
                    <div className="mt-3 flex items-center gap-2 max-w-md">
                      <input
                        type="text"
                        value={noteDrafts[setting.key] ?? setting.note ?? ''}
                        onChange={(e) => setNoteDrafts((prev) => ({ ...prev, [setting.key]: e.target.value }))}
                        onBlur={() => handleSaveNote(setting)}
                        placeholder="Optional note — why this was toggled..."
                        className="flex-1 rounded-lg bg-richblack-900/60 border border-richblack-600 px-3 py-2 text-xs text-richblack-5 placeholder:text-richblack-400 focus:outline-none focus:border-yellow-50 transition-colors duration-200"
                      />
                      <button
                        onClick={() => handleSaveNote(setting)}
                        disabled={noteDrafts[setting.key] === undefined || noteDrafts[setting.key] === setting.note}
                        className="shrink-0 px-3 py-2 text-xs font-semibold rounded-lg bg-richblack-700 text-richblack-100 hover:bg-richblack-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-200 cursor-pointer flex items-center gap-1.5"
                      >
                        {savedFlash[setting.key] ? <><FaCheck className="text-caribgreen-100" /> Saved</> : 'Save'}
                      </button>
                    </div>
                    {!setting.enabled && setting.disabledUntil && (
                      <p className="text-xs text-pink-100 mt-2">
                        Scheduled to auto re-enable {utcDateToIstDisplay(setting.disabledUntil)}
                      </p>
                    )}
                    {setting.updatedAt && (
                      <p className="text-xs text-richblack-400 mt-2">Last updated {new Date(setting.updatedAt).toLocaleString()}</p>
                    )}

                    {disablingKey === setting.key && (
                      <div className="mt-4 rounded-lg border border-pink-700/40 bg-pink-700/10 p-4 space-y-3 max-w-md">
                        <p className="text-xs font-semibold text-pink-100">Disabling requires a reason and a re-enable time</p>
                        <input
                          type="text"
                          value={disableForm.note}
                          onChange={(e) => setDisableForm((prev) => ({ ...prev, note: e.target.value }))}
                          placeholder="Reason (required)"
                          className="w-full rounded-lg bg-richblack-900/60 border border-richblack-600 px-3 py-2 text-xs text-richblack-5 placeholder:text-richblack-400 focus:outline-none focus:border-yellow-50 transition-colors duration-200"
                        />
                        <div className="flex flex-wrap gap-2 items-center">
                          <input
                            type="date"
                            min={istDateStrFromNow(1)}
                            value={disableForm.date}
                            onChange={(e) => setDisableForm((prev) => ({ ...prev, date: e.target.value }))}
                            className="rounded-lg bg-richblack-900/60 border border-richblack-600 px-2 py-1.5 text-xs text-richblack-5 focus:outline-none focus:border-yellow-50"
                          />
                          <select
                            value={disableForm.hour}
                            onChange={(e) => setDisableForm((prev) => ({ ...prev, hour: parseInt(e.target.value) }))}
                            className="rounded-lg bg-richblack-900/60 border border-richblack-600 px-2 py-1.5 text-xs text-richblack-5"
                          >
                            {HOURS.map((h) => <option key={h} value={h}>{h}</option>)}
                          </select>
                          <select
                            value={disableForm.minute}
                            onChange={(e) => setDisableForm((prev) => ({ ...prev, minute: parseInt(e.target.value) }))}
                            className="rounded-lg bg-richblack-900/60 border border-richblack-600 px-2 py-1.5 text-xs text-richblack-5"
                          >
                            {MINUTES.map((m) => <option key={m} value={m}>{String(m).padStart(2, '0')}</option>)}
                          </select>
                          <select
                            value={disableForm.meridiem}
                            onChange={(e) => setDisableForm((prev) => ({ ...prev, meridiem: e.target.value }))}
                            className="rounded-lg bg-richblack-900/60 border border-richblack-600 px-2 py-1.5 text-xs text-richblack-5"
                          >
                            <option value="AM">AM</option>
                            <option value="PM">PM</option>
                          </select>
                          <span className="text-[10px] text-richblack-400">IST</span>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleConfirmDisable(setting)}
                            disabled={!disableForm.note.trim()}
                            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-pink-700 text-richblack-5 hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer"
                          >
                            Confirm disable
                          </button>
                          <button
                            onClick={() => setDisablingKey(null)}
                            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-richblack-700 text-richblack-100 hover:bg-richblack-600 transition-colors duration-200 cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
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
