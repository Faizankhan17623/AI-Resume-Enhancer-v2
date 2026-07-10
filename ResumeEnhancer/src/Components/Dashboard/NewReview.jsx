import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate, Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import toast from 'react-hot-toast'
import { FaCloudUploadAlt, FaFilePdf, FaTimes, FaSpellCheck, FaCheckCircle, FaFolderOpen } from 'react-icons/fa'
import DashboardLayout from './DashboardLayout'
import IconBtn from '../extra/IconBtn'
import Loading from '../extra/Loading'
import { CreateReview, CreateReviewFromResume, CheckGrammar } from '../../Services/operations/Review'
import { GetResumes } from '../../Services/operations/Resume'
import { setGrammar } from '../../Slices/reviewSlice'

const grammarScoreColor = (score) =>
  score >= 85 ? 'text-caribgreen-100' : score >= 60 ? 'text-yellow-50' : 'text-pink-200'

const NewReview = () => {
  const [source, setSource] = useState('upload') // 'upload' | 'saved'
  const [pdfFile, setPdfFile] = useState(null)
  const [savedResumeId, setSavedResumeId] = useState('')
  const [jd, setJd] = useState('')
  const [dragging, setDragging] = useState(false)
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { token } = useSelector((state) => state.auth)
  const { loading, grammar, grammarChecking } = useSelector((state) => state.review)
  const { resumes } = useSelector((state) => state.resume)

  useEffect(() => {
    dispatch(GetResumes(token))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // pre-select the default resume once the library loads sir
  useEffect(() => {
    if (!savedResumeId && resumes.length > 0) {
      const def = resumes.find((r) => r.isDefault) || resumes[0]
      setSavedResumeId(def._id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resumes])

  // only PDFs get through sir
  const handleFile = (file) => {
    if (!file) return
    if (file.type !== 'application/pdf') {
      toast.error("Please upload a PDF file")
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("The file must be under 5 MB")
      return
    }
    setPdfFile(file)
    // free instant pre-check sir — runs automatically, no credit spent, doesn't block upload
    dispatch(CheckGrammar(file, token))
  }

  const removeFile = () => {
    setPdfFile(null)
    dispatch(setGrammar(null))
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    handleFile(e.dataTransfer.files?.[0])
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!jd.trim()) {
      toast.error("Please paste the job description")
      return
    }

    if (source === 'saved') {
      if (!savedResumeId) {
        toast.error("Please choose a saved resume")
        return
      }
      dispatch(CreateReviewFromResume(savedResumeId, jd.trim(), token, navigate))
      return
    }

    if (!pdfFile) {
      toast.error("Please upload your resume PDF")
      return
    }
    dispatch(CreateReview(pdfFile, jd.trim(), token, navigate))
  }

  return (
    <DashboardLayout title="New ATS review">
      <Helmet>
        <title>New Review | ResumeEnhancer</title>
      </Helmet>

      <div className="h-full overflow-y-auto max-w-4xl mx-auto px-4 lg:px-6 py-8 animate-fadeIn">

        {loading ? (
          <Loading text="The AI is reading your resume — give it a few seconds..." />
        ) : (
          <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Left - PDF dropzone or saved-resume picker sir */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold text-richblack-100 block">Your resume</label>
                {resumes.length > 0 && (
                  <div className="flex rounded-full bg-richblack-800 border border-richblack-600 p-0.5 text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => setSource('upload')}
                      className={`px-3 py-1 rounded-full transition-colors duration-150 cursor-pointer ${source === 'upload' ? 'bg-yellow-50 text-richblack-900' : 'text-richblack-200'}`}
                    >
                      Upload new
                    </button>
                    <button
                      type="button"
                      onClick={() => setSource('saved')}
                      className={`px-3 py-1 rounded-full transition-colors duration-150 cursor-pointer ${source === 'saved' ? 'bg-yellow-50 text-richblack-900' : 'text-richblack-200'}`}
                    >
                      Choose saved
                    </button>
                  </div>
                )}
              </div>

              {source === 'saved' ? (
                <div className="rounded-xl bg-richblack-800 border border-richblack-600 p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <FaFolderOpen className="text-xl text-yellow-50 shrink-0" />
                    <select
                      value={savedResumeId}
                      onChange={(e) => setSavedResumeId(e.target.value)}
                      className="flex-1 rounded-lg bg-richblack-900 border border-richblack-600 px-3 py-2 text-sm text-richblack-5 focus:outline-none focus:border-yellow-50"
                    >
                      {resumes.map((r) => (
                        <option key={r._id} value={r._id}>
                          {r.label || r.originalFilename}{r.isDefault ? ' (default)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <Link to="/Dashboard/Resumes" className="text-xs text-yellow-50 hover:underline">
                    Manage saved resumes
                  </Link>
                </div>
              ) : pdfFile ? (
                <div className="flex items-center justify-between rounded-xl bg-richblack-800 border border-caribgreen-300 p-5">
                  <div className="flex items-center gap-3 min-w-0">
                    <FaFilePdf className="text-2xl text-pink-200 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-richblack-5 truncate">{pdfFile.name}</p>
                      <p className="text-xs text-richblack-400">{(pdfFile.size / 1024).toFixed(0)} KB</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={removeFile}
                    className="text-richblack-300 hover:text-pink-200 transition-colors duration-200 cursor-pointer"
                  >
                    <FaTimes />
                  </button>
                </div>
              ) : (
                <label
                  onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={handleDrop}
                  className={`flex flex-col items-center justify-center gap-2.5 rounded-xl border-2 border-dashed p-10 cursor-pointer transition-all duration-200 ${
                    dragging ? 'border-yellow-50 bg-yellow-900/10' : 'border-richblack-600 bg-yellow-900/5 hover:border-richblack-400'
                  }`}
                >
                  <FaCloudUploadAlt className="text-3xl text-yellow-50" />
                  <p className="text-sm text-richblack-100 font-semibold">Drop your PDF here</p>
                  <p className="text-xs text-richblack-400">or click to browse · max 5 MB</p>
                  <input
                    type="file"
                    accept="application/pdf"
                    className="hidden"
                    onChange={(e) => handleFile(e.target.files?.[0])}
                  />
                </label>
              )}

              {/* Free instant grammar/spell pre-check sir — no AI credit spent */}
              {pdfFile && (grammarChecking || grammar) && (
                <div className="mt-4 rounded-xl bg-richblack-800 shadow-md shadow-richblack-900/10 p-4">
                  {grammarChecking ? (
                    <div className="flex items-center gap-2 text-sm text-richblack-300">
                      <FaSpellCheck className="animate-pulse" />
                      Checking spelling &amp; style...
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-sm font-semibold text-richblack-5 flex items-center gap-2">
                          <FaSpellCheck className="text-yellow-50" /> Grammar &amp; Spelling
                        </p>
                        <span className={`text-sm font-bold font-mono ${grammarScoreColor(grammar.score)}`}>
                          {grammar.score}/100
                        </span>
                      </div>
                      {grammar.issues.length === 0 ? (
                        <p className="text-xs text-caribgreen-100 flex items-center gap-1.5">
                          <FaCheckCircle /> No issues found, looks clean
                        </p>
                      ) : (
                        <ul className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                          {grammar.issues.slice(0, 8).map((issue, index) => (
                            <li key={index} className="text-xs text-richblack-200 flex gap-2">
                              <span className={issue.type === 'spelling' ? 'text-pink-200' : 'text-yellow-50'}>
                                {issue.type === 'spelling' ? '✎' : '⚠'}
                              </span>
                              {issue.message}
                            </li>
                          ))}
                          {grammar.issues.length > 8 && (
                            <li className="text-xs text-richblack-400">
                              +{grammar.issues.length - 8} more
                            </li>
                          )}
                        </ul>
                      )}
                      <p className="mt-2 text-[11px] text-richblack-400">
                        Free pre-check — fix these before spending a credit on the full AI review.
                      </p>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Right - JD textarea */}
            <div>
              <label className="text-sm font-semibold text-richblack-100 mb-2 block">Job description</label>
              <textarea
                value={jd}
                onChange={(e) => setJd(e.target.value)}
                placeholder="Paste the full job description here — requirements, skills, responsibilities, everything..."
                rows={10}
                className="w-full rounded-xl bg-richblack-800 border border-richblack-600 px-4 py-3 text-richblack-5 text-sm placeholder:text-richblack-400 focus:outline-none focus:border-yellow-50 transition-colors duration-200 resize-none"
              />
              <p className="mt-1.5 text-xs text-richblack-400 text-right">{jd.length} characters</p>

              {/* Submit sir */}
              <div className="flex justify-end mt-4">
                <IconBtn type="submit" text="Analyze my resume →" customClasses="px-8 py-3 text-sm" />
              </div>
            </div>
          </form>
        )}
      </div>
    </DashboardLayout>
  )
}

export default NewReview
