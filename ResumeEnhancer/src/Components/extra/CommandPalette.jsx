import { useEffect, useRef, useState } from 'react'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router'
import { motion, AnimatePresence } from 'motion/react'
import {
  FaSearch, FaFilePdf, FaMagic, FaComments, FaEnvelopeOpenText, FaBriefcase,
  FaPlus, FaUsers, FaBug, FaChartLine, FaFolderOpen,
} from 'react-icons/fa'
import { apiConnector } from '../../Services/apiConnector'
import BASE_URL from '../../utils/backendUrl'
import { modalBackdrop, modalPanel } from '../../utils/motion'

// role-scoped quick actions sir — same shortcuts each layout's own sidebar/FAB already links
// to, just reachable without leaving the keyboard. Matches DashboardLayout.jsx / RecruiterNav.jsx
// / AdminNav.jsx's own nav lists — kept as a small local table here rather than importing those
// (which are route-definition arrays, not built for this shape) to avoid coupling this shared,
// role-agnostic component to three separate layout files' internals.
const QUICK_ACTIONS = {
  User: [
    { label: 'New Review', path: '/Dashboard/New-Review', icon: FaFilePdf },
    { label: 'Build Resume', path: '/Dashboard/Build-Resume', icon: FaMagic },
    { label: 'AI Coach', path: '/Dashboard/Chats', icon: FaComments },
    { label: 'Cover Letter', path: '/Dashboard/Cover-Letter', icon: FaEnvelopeOpenText },
    { label: 'My Job Applications', path: '/Dashboard/My-Applications', icon: FaBriefcase },
    { label: 'My Resumes', path: '/Dashboard/Resumes', icon: FaFolderOpen },
  ],
  Recruiter: [
    { label: 'Post a New Job', path: '/Recruiter/New', icon: FaPlus },
    { label: 'My Jobs', path: '/Recruiter', icon: FaBriefcase },
    { label: 'Analytics', path: '/Recruiter/Analytics', icon: FaChartLine },
  ],
  Admin: [
    { label: 'Users', path: '/Admin/Users', icon: FaUsers },
    { label: 'Reports', path: '/Admin/Reports', icon: FaBug },
  ],
  Support: [
    { label: 'Users', path: '/Support/Users', icon: FaUsers },
    { label: 'Reports', path: '/Support/Reports', icon: FaBug },
  ],
}

const CATEGORY_LABELS = {
  resumes: 'Resumes', builtResumes: 'Built resumes', coverLetters: 'Cover letters', applications: 'Applications',
  jobs: 'Jobs', tests: 'Tests', applicants: 'Applicants',
  users: 'Users', reports: 'Reports',
}

// mounted ONCE, high up (App.jsx) sir — a single global Ctrl+K/Cmd+K listener rather than one
// per layout, since this same component serves all three roles (the quick-actions list and the
// backend's own /search branch both key off req.User.role, this component just picks its local
// half of that same branch).
const CommandPalette = () => {
  const navigate = useNavigate()
  const { token, isLoggedIn, user } = useSelector((s) => s.auth)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState({})
  const [loading, setLoading] = useState(false)
  const inputRef = useRef(null)

  // clears the palette's own search state sir — called from every place that closes it
  // (Escape, backdrop click, picking a result) so query/results never carry over into the next
  // time it's opened. Plain event-driven updates, not a reactive "clear on open/close" effect —
  // keeps every setState call inside a handler, never synchronously inside an effect body.
  const closePalette = () => {
    setOpen(false)
    setQuery('')
    setResults({})
  }

  useEffect(() => {
    const onKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen((v) => {
          if (v) { setQuery(''); setResults({}) }
          return !v
        })
      }
      if (e.key === 'Escape') closePalette()
    }
    // a plain DOM CustomEvent sir — lets a visible button in ANY layout (DashboardLayout,
    // RecruiterLayout, AdminNav) open this same single mounted instance without prop-drilling a
    // setter through three separate layout trees, or lifting this component's state into Redux
    // for what is otherwise pure local UI state
    const onOpenEvent = () => setOpen(true)
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('open-command-palette', onOpenEvent)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('open-command-palette', onOpenEvent)
    }
  }, [])

  useEffect(() => {
    // focus needs a tick sir — the input isn't mounted yet on the same render that flips `open`
    if (open) setTimeout(() => inputRef.current?.focus(), 0)
  }, [open])

  useEffect(() => {
    if (!open || !isLoggedIn || query.trim().length < 2) return
    let alive = true
    // must flip synchronously sir — the spinner needs to show immediately on keystroke, not
    // only once the 250ms debounce timer below actually fires. Same justification as
    // AdminNav.jsx's own search box, which has this identical shape.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
    const timer = setTimeout(() => {
      apiConnector('GET', `${BASE_URL}/search`, null, { Authorization: `Bearer ${token}` }, { q: query.trim() })
        .then((r) => { if (alive) setResults(r.data.results || {}) })
        .catch(() => { if (alive) setResults({}) })
        .finally(() => { if (alive) setLoading(false) })
      // 250ms debounce sir — a search-as-you-type palette must not fire one request per keystroke
    }, 250)
    return () => { alive = false; clearTimeout(timer) }
  }, [query, open, isLoggedIn, token])

  // query shorter than 2 chars sir — the effect above never fires for it, so `results` is
  // whatever the LAST valid search returned. Render nothing rather than that stale data.
  const showResults = query.trim().length >= 2

  if (!isLoggedIn) return null

  const quickActions = QUICK_ACTIONS[user?.role] || QUICK_ACTIONS.User
  const filteredActions = query.trim()
    ? quickActions.filter((a) => a.label.toLowerCase().includes(query.trim().toLowerCase()))
    : quickActions

  const go = (path) => {
    closePalette()
    navigate(path)
  }

  const categories = showResults ? Object.entries(results).filter(([, items]) => items?.length > 0) : []

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial="hidden" animate="show" exit="exit" variants={modalBackdrop}
          className="fixed inset-0 z-[100] bg-richblack-900/80 backdrop-blur-sm flex items-start justify-center pt-24 px-4"
          onClick={closePalette}
        >
          <motion.div
            variants={modalPanel}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-2xl bg-richblack-800 border border-richblack-700 shadow-2xl overflow-hidden"
          >
            <div className="flex items-center gap-3 px-4 py-3 border-b border-richblack-700">
              <FaSearch className="text-richblack-400 shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search resumes, jobs, applications... or jump to a page"
                className="flex-1 bg-transparent text-sm text-richblack-5 placeholder:text-richblack-500 focus:outline-none"
              />
              <kbd className="text-[10px] text-richblack-500 border border-richblack-600 rounded px-1.5 py-0.5">Esc</kbd>
            </div>

            <div className="max-h-96 overflow-y-auto py-2">
              {loading && (
                <p className="px-4 py-3 text-xs text-richblack-400">Searching...</p>
              )}

              {filteredActions.length > 0 && (
                <div className="mb-1">
                  <p className="px-4 py-1 text-[10px] font-semibold uppercase tracking-wide text-richblack-500">Quick actions</p>
                  {filteredActions.map((a) => (
                    <button
                      key={a.path}
                      onClick={() => go(a.path)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-richblack-100 hover:bg-richblack-700 transition-colors duration-150 cursor-pointer"
                    >
                      <a.icon className="text-richblack-400 text-xs shrink-0" /> {a.label}
                    </button>
                  ))}
                </div>
              )}

              {categories.map(([key, items]) => (
                <div key={key} className="mb-1">
                  <p className="px-4 py-1 text-[10px] font-semibold uppercase tracking-wide text-richblack-500">
                    {CATEGORY_LABELS[key] || key}
                  </p>
                  {items.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => go(item.link)}
                      className="w-full text-left px-4 py-2.5 text-sm text-richblack-100 hover:bg-richblack-700 transition-colors duration-150 cursor-pointer truncate"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              ))}

              {!loading && query.trim().length >= 2 && categories.length === 0 && filteredActions.length === 0 && (
                <p className="px-4 py-3 text-xs text-richblack-400">No results for "{query.trim()}"</p>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default CommandPalette
