import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import toast from 'react-hot-toast'
import { FaCloudUploadAlt, FaFilePdf, FaTimes, FaCopy, FaCrown } from 'react-icons/fa'
import DashboardLayout from './DashboardLayout'
import IconBtn from '../extra/IconBtn'
import Loading from '../extra/Loading'
import { GenerateCoverLetter } from '../../Services/operations/CoverLetter'
import { setContent } from '../../Slices/coverLetterSlice'

const copyText = (text) => {
  navigator.clipboard.writeText(text)
  toast.success("Copied to clipboard")
}

const CoverLetter = () => {
  const [pdfFile, setPdfFile] = useState(null)
  const [jd, setJd] = useState('')
  const [dragging, setDragging] = useState(false)
  const dispatch = useDispatch()
  const { token, user } = useSelector((state) => state.auth)
  const { content, generating } = useSelector((state) => state.coverLetter)

  const isBasic = !user?.SubType || user.SubType === 'Basic'

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
  }

  const removeFile = () => setPdfFile(null)

  const handleDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    handleFile(e.dataTransfer.files?.[0])
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!pdfFile) {
      toast.error("Please upload your resume PDF")
      return
    }
    if (!jd.trim()) {
      toast.error("Please paste the job description")
      return
    }
    dispatch(GenerateCoverLetter(pdfFile, jd.trim(), token))
  }

  const startOver = () => {
    dispatch(setContent(null))
    setPdfFile(null)
    setJd('')
  }

  return (
    <DashboardLayout title="Cover letter generator">
      <Helmet>
        <title>Cover Letter | ResumeEnhancer</title>
      </Helmet>

      <div className="h-full overflow-y-auto max-w-4xl mx-auto px-4 lg:px-6 py-8 animate-fadeIn">

        {isBasic ? (
          <div className="rounded-xl bg-richblack-800 shadow-md shadow-richblack-900/10 p-16 text-center">
            <FaCrown className="text-3xl text-yellow-50 mx-auto mb-4" />
            <p className="text-richblack-100 mb-2 font-semibold">Cover letters are a Pro feature</p>
            <p className="text-richblack-300 text-sm mb-6">Upgrade your plan to generate a tailored cover letter from your resume and a job description.</p>
            <Link to="/Pricing" className="inline-block">
              <IconBtn text="View plans" />
            </Link>
          </div>
        ) : generating ? (
          <Loading text="The AI is drafting your cover letter — give it a few seconds..." />
        ) : content ? (
          <div className="space-y-5">
            <div className="rounded-xl bg-richblack-800 shadow-md shadow-richblack-900/10 p-6 md:p-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-lg text-richblack-5">Your cover letter</h2>
                <button
                  onClick={() => copyText(content)}
                  className="text-richblack-300 hover:text-yellow-50 transition-colors duration-200 cursor-pointer"
                  title="Copy"
                >
                  <FaCopy />
                </button>
              </div>
              <p className="text-sm text-richblack-100 leading-relaxed whitespace-pre-wrap">{content}</p>
            </div>
            <div className="flex justify-end">
              <button
                onClick={startOver}
                className="px-4 py-2.5 text-sm font-semibold text-richblack-100 border border-richblack-600 rounded-full hover:bg-richblack-700 hover:text-richblack-5 transition-all duration-200 cursor-pointer"
              >
                Write another
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Left - PDF dropzone sir */}
            <div>
              <label className="text-sm font-semibold text-richblack-100 mb-2 block">Your resume</label>
              {pdfFile ? (
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

              <div className="flex justify-end mt-4">
                <IconBtn type="submit" text="Write my cover letter →" customClasses="px-8 py-3 text-sm" />
              </div>
            </div>
          </form>
        )}
      </div>
    </DashboardLayout>
  )
}

export default CoverLetter
