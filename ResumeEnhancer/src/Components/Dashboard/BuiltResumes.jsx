import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link, useNavigate } from 'react-router'
import { Helmet } from 'react-helmet-async'
import toast from 'react-hot-toast'
import Swal from 'sweetalert2'
import { motion, AnimatePresence } from 'motion/react'
import { FaLayerGroup, FaCopy, FaTrash, FaPen, FaSearch } from 'react-icons/fa'
import DashboardLayout from './DashboardLayout'
import Loading from '../extra/Loading'
import IconBtn from '../extra/IconBtn'
import PageTransition from '../extra/PageTransition'
import { fadeUp, staggerContainer } from '../../utils/motion'
import { getTemplateById } from '../ResumeBuilder/Templates/templateRegistry'
import { GetBuiltResumes, DuplicateBuiltResume, DeleteBuiltResume } from '../../Services/operations/BuiltResume'

const swalDark = { background: '#1F1C16', color: '#F3EFE6', confirmButtonColor: '#2F6F5E', cancelButtonColor: '#3A3428' }

// the missing browse/manage page for BuiltResume documents sir — the builder editor and template
// picker already existed, but there was nowhere to see everything you've built, duplicate a
// resume to branch a variant for a different job, or delete an old one. This is that page.
const BuiltResumes = () => {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { token } = useSelector((state) => state.auth)
  const { resumes, loading } = useSelector((state) => state.builtResume)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState([])
  const [bulkDeleting, setBulkDeleting] = useState(false)

  useEffect(() => {
    dispatch(GetBuiltResumes(token))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // client-side filter sir — a user's own resume list is small, no backend search endpoint needed
  const visibleResumes = search.trim()
    ? resumes.filter((r) => (r.title || '').toLowerCase().includes(search.trim().toLowerCase()))
    : resumes

  const toggleSelect = (id) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const toggleSelectAll = () => {
    setSelected((prev) => (prev.length === visibleResumes.length ? [] : visibleResumes.map((r) => r._id)))
  }

  const handleDelete = (resume) => {
    Swal.fire({
      ...swalDark,
      title: `Delete "${resume.title || 'Untitled resume'}"?`,
      text: 'This cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete',
    }).then((result) => {
      if (result.isConfirmed) dispatch(DeleteBuiltResume(resume._id, token))
    })
  }

  // reuses the existing single-delete endpoint one item at a time sir, rather than adding a
  // new bulk-delete route — but runs each call silent + skips its per-item refetch, so the
  // whole batch ends in exactly one combined toast and one list refetch, not N of each
  const handleBulkDelete = () => {
    if (selected.length === 0) return
    Swal.fire({
      ...swalDark,
      title: `Delete ${selected.length} resume${selected.length > 1 ? 's' : ''}?`,
      text: 'This cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete',
    }).then(async (result) => {
      if (!result.isConfirmed) return
      setBulkDeleting(true)
      const count = selected.length
      const results = await Promise.all(
        selected.map((id) => dispatch(DeleteBuiltResume(id, token, { silent: true, skipRefetch: true })))
      )
      const deletedCount = results.filter(Boolean).length
      if (deletedCount > 0) {
        toast.success(`${deletedCount} resume${deletedCount > 1 ? 's' : ''} deleted`)
      }
      if (deletedCount < count) {
        toast.error(`Could not delete ${count - deletedCount} resume${count - deletedCount > 1 ? 's' : ''}`)
      }
      dispatch(GetBuiltResumes(token))
      setSelected([])
      setBulkDeleting(false)
    })
  }

  return (
    <DashboardLayout title="My built resumes">
      <Helmet>
        <title>My Built Resumes | Resumify</title>
      </Helmet>

      <PageTransition className="h-full overflow-y-auto max-w-4xl mx-auto px-4 lg:px-6 py-8">

        <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
          <p className="text-sm text-richblack-300">
            Every resume you've built from a template. Duplicate one to branch a variant for a different job.
          </p>
          <Link to="/Dashboard/Templates" className="shrink-0 ml-4">
            <IconBtn text="Build new">
              <FaLayerGroup />
            </IconBtn>
          </Link>
        </div>

        {resumes.length > 0 && (
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-richblack-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search built resumes..."
                className="w-full rounded-lg bg-richblack-800 border border-richblack-600 pl-9 pr-3 py-2 text-sm text-richblack-5 placeholder:text-richblack-400 focus:outline-none focus:border-yellow-50 transition-colors duration-200"
              />
            </div>
            <label className="flex items-center gap-2 text-xs text-richblack-300 cursor-pointer">
              <input
                type="checkbox"
                checked={selected.length > 0 && selected.length === visibleResumes.length}
                onChange={toggleSelectAll}
                className="cursor-pointer"
              />
              Select all
            </label>
            {selected.length > 0 && (
              <button
                onClick={handleBulkDelete}
                disabled={bulkDeleting}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-pink-200 border border-pink-700/40 rounded-full hover:bg-pink-700/10 transition-all duration-200 cursor-pointer disabled:opacity-50"
              >
                <FaTrash className="text-[10px]" /> {bulkDeleting ? 'Deleting...' : `Delete ${selected.length} selected`}
              </button>
            )}
          </div>
        )}

        {loading ? (
          <Loading text="Loading your resumes..." />
        ) : resumes.length === 0 ? (
          <div className="rounded-xl bg-richblack-800 shadow-md shadow-richblack-900/10 p-16 text-center">
            <FaLayerGroup className="text-3xl text-richblack-400 mx-auto mb-4" />
            <p className="text-richblack-200 mb-2">No built resumes yet.</p>
            <p className="text-richblack-400 text-sm mb-6">Pick a template and start filling in your details.</p>
            <Link to="/Dashboard/Templates" className="inline-block">
              <IconBtn text="Choose a template" />
            </Link>
          </div>
        ) : visibleResumes.length === 0 ? (
          <p className="text-sm text-richblack-400 text-center py-10">No resumes match "{search}"</p>
        ) : (
          <motion.div variants={staggerContainer(0.05)} initial="hidden" animate="show" className="space-y-3">
            <AnimatePresence>
            {visibleResumes.map((resume) => {
              const template = getTemplateById(resume.templateId)
              return (
                <motion.div
                  key={resume._id}
                  layout
                  variants={fadeUp}
                  exit={{ opacity: 0, x: -20, transition: { duration: 0.2 } }}
                  className="flex items-center justify-between gap-3 rounded-xl bg-richblack-800 shadow-sm shadow-richblack-900/10 p-5"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <input
                      type="checkbox"
                      checked={selected.includes(resume._id)}
                      onChange={() => toggleSelect(resume._id)}
                      className="cursor-pointer shrink-0"
                      aria-label="Select resume"
                    />
                    <button
                      onClick={() => navigate(`/Dashboard/Build-Resume/${resume._id}`)}
                      className="flex items-center gap-3 min-w-0 flex-1 text-left cursor-pointer group"
                    >
                      <FaLayerGroup className="text-xl text-yellow-50 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-richblack-5 truncate group-hover:underline">
                          {resume.title || 'Untitled resume'}
                        </p>
                        <p className="text-xs text-richblack-400 mt-1">
                          {template.name} · edited {new Date(resume.updatedAt).toDateString()}
                        </p>
                      </div>
                    </button>
                  </div>

                  <div className="flex items-center gap-3.5 shrink-0 text-richblack-300">
                    <button
                      onClick={() => navigate(`/Dashboard/Build-Resume/${resume._id}`)}
                      className="hover:text-richblack-5 transition-colors duration-200 cursor-pointer"
                      title="Edit"
                    >
                      <FaPen className="text-sm" />
                    </button>
                    <button
                      onClick={() => dispatch(DuplicateBuiltResume(resume._id, token))}
                      className="hover:text-yellow-50 transition-colors duration-200 cursor-pointer"
                      title="Duplicate"
                    >
                      <FaCopy className="text-sm" />
                    </button>
                    <button
                      onClick={() => handleDelete(resume)}
                      className="hover:text-pink-200 transition-colors duration-200 cursor-pointer"
                      title="Delete"
                    >
                      <FaTrash className="text-sm" />
                    </button>
                  </div>
                </motion.div>
              )
            })}
            </AnimatePresence>
          </motion.div>
        )}
      </PageTransition>
    </DashboardLayout>
  )
}

export default BuiltResumes
