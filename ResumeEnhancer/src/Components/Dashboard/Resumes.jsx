import { useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import toast from 'react-hot-toast'
import Swal from 'sweetalert2'
import { motion, AnimatePresence } from 'motion/react'
import { FaFilePdf, FaStar, FaRegStar, FaTrash, FaPen, FaCloudUploadAlt, FaCheck, FaTimes, FaSearch } from 'react-icons/fa'
import DashboardLayout from './DashboardLayout'
import Loading from '../extra/Loading'
import IconBtn from '../extra/IconBtn'
import PageTransition from '../extra/PageTransition'
import { fadeUp, staggerContainer } from '../../utils/motion'
import { GetResumes, SaveResume, RenameResume, SetDefaultResume, DeleteResume } from '../../Services/operations/Resume'

const swalDark = { background: '#1F1C16', color: '#F3EFE6', confirmButtonColor: '#2F6F5E', cancelButtonColor: '#3A3428' }

const Resumes = () => {
  const dispatch = useDispatch()
  const fileInputRef = useRef(null)
  const { token } = useSelector((state) => state.auth)
  const { resumes, loading, saving } = useSelector((state) => state.resume)
  const [renamingId, setRenamingId] = useState(null)
  const [renameValue, setRenameValue] = useState('')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState([])
  const [bulkDeleting, setBulkDeleting] = useState(false)

  useEffect(() => {
    dispatch(GetResumes(token))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // client-side filter sir — a user's own resume list is small, no backend search endpoint needed
  const visibleResumes = search.trim()
    ? resumes.filter((r) => (r.label || r.originalFilename || '').toLowerCase().includes(search.trim().toLowerCase()))
    : resumes

  const toggleSelect = (id) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const toggleSelectAll = () => {
    setSelected((prev) => (prev.length === visibleResumes.length ? [] : visibleResumes.map((r) => r._id)))
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
        selected.map((id) => dispatch(DeleteResume(id, token, { silent: true, skipRefetch: true })))
      )
      const deletedCount = results.filter(Boolean).length
      if (deletedCount > 0) {
        toast.success(`${deletedCount} resume${deletedCount > 1 ? 's' : ''} deleted`)
      }
      if (deletedCount < count) {
        toast.error(`Could not delete ${count - deletedCount} resume${count - deletedCount > 1 ? 's' : ''}`)
      }
      dispatch(GetResumes(token))
      setSelected([])
      setBulkDeleting(false)
    })
  }

  const handleUploadClick = () => fileInputRef.current?.click()

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    e.target.value = '' // sir — lets picking the same file twice still fire onChange
    if (!file) return
    if (file.type !== 'application/pdf') {
      toast.error("Please upload a PDF file")
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("The file must be under 5 MB")
      return
    }
    dispatch(SaveResume(file, file.name, token))
  }

  const startRename = (resume) => {
    setRenamingId(resume._id)
    setRenameValue(resume.label || resume.originalFilename || '')
  }

  const confirmRename = (resumeId) => {
    if (!renameValue.trim()) return
    dispatch(RenameResume(resumeId, renameValue.trim(), token))
    setRenamingId(null)
  }

  return (
    <DashboardLayout title="My resumes">
      <Helmet>
        <title>My Resumes | Resumify</title>
      </Helmet>

      <PageTransition className="h-full overflow-y-auto max-w-4xl mx-auto px-4 lg:px-6 py-8">

        <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
          <p className="text-sm text-richblack-300">
            Save a resume once, then reuse it across reviews, chats and cover letters without re-uploading.
          </p>
          <input ref={fileInputRef} type="file" accept="application/pdf" className="hidden" onChange={handleFileChange} />
          <IconBtn text={saving ? "Saving..." : "Upload resume"} onclick={handleUploadClick} disabled={saving} customClasses="text-sm shrink-0 ml-4">
            <FaCloudUploadAlt />
          </IconBtn>
        </div>

        {resumes.length > 0 && (
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-richblack-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search resumes..."
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
            <FaFilePdf className="text-3xl text-richblack-400 mx-auto mb-4" />
            <p className="text-richblack-200 mb-2">No saved resumes yet.</p>
            <p className="text-richblack-400 text-sm mb-6">Upload one here, or save it directly from a new review.</p>
            <Link to="/Dashboard/New-Review" className="inline-block">
              <IconBtn text="Start a new review" />
            </Link>
          </div>
        ) : visibleResumes.length === 0 ? (
          <p className="text-sm text-richblack-400 text-center py-10">No resumes match "{search}"</p>
        ) : (
          <motion.div variants={staggerContainer(0.05)} initial="hidden" animate="show" className="space-y-3">
            <AnimatePresence>
            {visibleResumes.map((resume) => (
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
                  <FaFilePdf className="text-xl text-pink-200 shrink-0" />
                  <div className="min-w-0 flex-1">
                    {renamingId === resume._id ? (
                      <div className="flex items-center gap-2">
                        <input
                          autoFocus
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && confirmRename(resume._id)}
                          className="w-full max-w-xs rounded-lg bg-richblack-900 border border-richblack-600 px-3 py-1.5 text-sm text-richblack-5 focus:outline-none focus:border-yellow-50"
                        />
                        <button onClick={() => confirmRename(resume._id)} className="text-caribgreen-100 hover:opacity-80 cursor-pointer" title="Save">
                          <FaCheck />
                        </button>
                        <button onClick={() => setRenamingId(null)} className="text-richblack-300 hover:text-pink-200 cursor-pointer" title="Cancel">
                          <FaTimes />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-richblack-5 truncate">{resume.label || resume.originalFilename}</p>
                        {resume.isDefault && (
                          <span className="shrink-0 px-2 py-0.5 text-[10px] font-bold rounded-full bg-yellow-900/15 text-yellow-100">Default</span>
                        )}
                      </div>
                    )}
                    <p className="text-xs text-richblack-400 mt-1">Saved {new Date(resume.createdAt).toDateString()}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3.5 shrink-0 text-richblack-300">
                  <button
                    onClick={() => !resume.isDefault && dispatch(SetDefaultResume(resume._id, token))}
                    className={`hover:text-yellow-50 transition-colors duration-200 ${resume.isDefault ? 'text-yellow-50 cursor-default' : 'cursor-pointer'}`}
                    title={resume.isDefault ? 'Default resume' : 'Set as default'}
                  >
                    {resume.isDefault ? <FaStar /> : <FaRegStar />}
                  </button>
                  <button onClick={() => startRename(resume)} className="hover:text-richblack-5 transition-colors duration-200 cursor-pointer" title="Rename">
                    <FaPen className="text-sm" />
                  </button>
                  <button onClick={() => dispatch(DeleteResume(resume._id, token))} className="hover:text-pink-200 transition-colors duration-200 cursor-pointer" title="Delete">
                    <FaTrash className="text-sm" />
                  </button>
                </div>
              </motion.div>
            ))}
            </AnimatePresence>
          </motion.div>
        )}
      </PageTransition>
    </DashboardLayout>
  )
}

export default Resumes
