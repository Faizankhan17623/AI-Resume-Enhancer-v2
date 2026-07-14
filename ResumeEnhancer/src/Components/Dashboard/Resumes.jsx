import { useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import toast from 'react-hot-toast'
import { FaFilePdf, FaStar, FaRegStar, FaTrash, FaPen, FaCloudUploadAlt, FaCheck, FaTimes } from 'react-icons/fa'
import DashboardLayout from './DashboardLayout'
import Loading from '../extra/Loading'
import IconBtn from '../extra/IconBtn'
import { GetResumes, SaveResume, RenameResume, SetDefaultResume, DeleteResume } from '../../Services/operations/Resume'

const Resumes = () => {
  const dispatch = useDispatch()
  const fileInputRef = useRef(null)
  const { token } = useSelector((state) => state.auth)
  const { resumes, loading, saving } = useSelector((state) => state.resume)
  const [renamingId, setRenamingId] = useState(null)
  const [renameValue, setRenameValue] = useState('')

  useEffect(() => {
    dispatch(GetResumes(token))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

      <div className="h-full overflow-y-auto max-w-4xl mx-auto px-4 lg:px-6 py-8 animate-fadeIn">

        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-richblack-300">
            Save a resume once, then reuse it across reviews, chats and cover letters without re-uploading.
          </p>
          <input ref={fileInputRef} type="file" accept="application/pdf" className="hidden" onChange={handleFileChange} />
          <IconBtn text={saving ? "Saving..." : "Upload resume"} onclick={handleUploadClick} disabled={saving} customClasses="text-sm shrink-0 ml-4">
            <FaCloudUploadAlt />
          </IconBtn>
        </div>

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
        ) : (
          <div className="space-y-3">
            {resumes.map((resume) => (
              <div
                key={resume._id}
                className="flex items-center justify-between gap-3 rounded-xl bg-richblack-800 shadow-sm shadow-richblack-900/10 p-5"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
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
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

export default Resumes
