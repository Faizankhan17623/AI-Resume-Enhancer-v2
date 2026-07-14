import { useState, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import toast from 'react-hot-toast'
import { FaMagic, FaFileUpload, FaLayerGroup, FaCloudUploadAlt, FaFilePdf, FaTimes } from 'react-icons/fa'
import DashboardLayout from '../Dashboard/DashboardLayout'
import IconBtn from '../extra/IconBtn'
import { TEMPLATE_REGISTRY } from './Templates/templateRegistry'
import { SAMPLE_RESUME_DATA } from './Templates/sampleResumeData'
import { CreateBuiltResume, GenerateResume, TailorResume } from '../../Services/operations/BuiltResume'

// three ways in sir — pick a blank template, let the AI draft one from raw info, or tailor an old resume to a JD.
// each mode still ends the same way: pick a template, then land in the editor with a BuiltResume already created.
const MODES = [
  { id: 'blank', label: 'Start from a template', icon: FaLayerGroup, desc: 'Pick a look, fill in your details yourself.' },
  { id: 'generate', label: 'Let AI draft it', icon: FaMagic, desc: 'Describe your background, get a full first draft.' },
  { id: 'tailor', label: 'Tailor an old resume', icon: FaFileUpload, desc: 'Upload a resume + a job description, get it rewritten for that job.' },
]

const BuildResumePicker = () => {
  const [mode, setMode] = useState('blank')
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [rawInfo, setRawInfo] = useState('')
  const [targetRole, setTargetRole] = useState('')
  const [jd, setJd] = useState('')
  const [pdfFile, setPdfFile] = useState(null)
  const fileInputRef = useRef(null)

  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { token } = useSelector((state) => state.auth)
  const { generating } = useSelector((state) => state.builtResume)

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

  const handlePickTemplate = (templateId) => {
    setSelectedTemplate(templateId)
    if (mode === 'blank') {
      dispatch(CreateBuiltResume(templateId, token, navigate))
    }
  }

  const handleGenerate = () => {
    if (!rawInfo.trim()) {
      toast.error("Tell the AI a bit about your background first")
      return
    }
    if (!selectedTemplate) {
      toast.error("Please pick a template first")
      return
    }
    dispatch(GenerateResume(rawInfo.trim(), targetRole.trim(), selectedTemplate, token, navigate))
  }

  const handleTailor = () => {
    if (!pdfFile) {
      toast.error("Please upload your existing resume")
      return
    }
    if (!jd.trim()) {
      toast.error("Please paste the job description")
      return
    }
    if (!selectedTemplate) {
      toast.error("Please pick a template first")
      return
    }
    dispatch(TailorResume(pdfFile, jd.trim(), selectedTemplate, token, navigate))
  }

  return (
    <DashboardLayout title="Build a resume">
      <Helmet>
        <title>Build Resume | Resumify</title>
      </Helmet>

      <div className="h-full overflow-y-auto max-w-6xl mx-auto px-4 lg:px-6 py-8 animate-fadeIn">

        {/* Mode switch sir */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          {MODES.map((m) => {
            const Icon = m.icon
            const active = mode === m.id
            return (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                className={`text-left rounded-2xl p-5 border transition-all duration-200 cursor-pointer ${
                  active
                    ? 'bg-richblack-800 border-warm-200 shadow-[0_0_30px_-14px_rgba(232,131,79,0.4)]'
                    : 'bg-richblack-800 border-richblack-700 hover:border-richblack-500'
                }`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-3 ${active ? 'bg-warm-200 text-richblack-900' : 'bg-richblack-700 text-richblack-300'}`}>
                  <Icon />
                </div>
                <p className="font-semibold text-richblack-5 text-sm">{m.label}</p>
                <p className="text-xs text-richblack-400 mt-1 leading-relaxed">{m.desc}</p>
              </button>
            )
          })}
        </div>

        {/* generate/tailor inputs sir — shown above the template grid, since both need a template picked at the end */}
        {mode === 'generate' && (
          <div className="rounded-2xl bg-richblack-800 border border-richblack-700 p-6 mb-8">
            <label className="text-sm font-semibold text-richblack-100 mb-2 block">Tell the AI about yourself</label>
            <textarea
              value={rawInfo}
              onChange={(e) => setRawInfo(e.target.value)}
              placeholder="Your work history, education, skills, projects — write it however you like, the AI will organize it into a resume."
              rows={6}
              className="w-full rounded-xl bg-richblack-900 border border-richblack-600 px-4 py-3 text-richblack-5 text-sm placeholder:text-richblack-400 focus:outline-none focus:border-yellow-50 transition-colors duration-200 resize-none"
            />
            <label className="text-sm font-semibold text-richblack-100 mt-4 mb-2 block">Target role (optional)</label>
            <input
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
              placeholder="e.g. Frontend Developer"
              className="w-full rounded-xl bg-richblack-900 border border-richblack-600 px-4 py-2.5 text-richblack-5 text-sm placeholder:text-richblack-400 focus:outline-none focus:border-yellow-50 transition-colors duration-200"
            />
          </div>
        )}

        {mode === 'tailor' && (
          <div className="rounded-2xl bg-richblack-800 border border-richblack-700 p-6 mb-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-semibold text-richblack-100 mb-2 block">Your existing resume</label>
              {pdfFile ? (
                <div className="flex items-center justify-between rounded-xl bg-richblack-900 border border-caribgreen-300 p-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <FaFilePdf className="text-xl text-pink-200 shrink-0" />
                    <p className="text-sm text-richblack-5 truncate">{pdfFile.name}</p>
                  </div>
                  <button onClick={() => setPdfFile(null)} className="text-richblack-300 hover:text-pink-200 cursor-pointer">
                    <FaTimes />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-richblack-600 bg-yellow-900/5 hover:border-richblack-400 p-8 cursor-pointer transition-all duration-200">
                  <FaCloudUploadAlt className="text-2xl text-yellow-50" />
                  <p className="text-sm text-richblack-100 font-semibold">Drop your PDF here</p>
                  <p className="text-xs text-richblack-400">or click to browse · max 5 MB</p>
                  <input ref={fileInputRef} type="file" accept="application/pdf" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
                </label>
              )}
            </div>
            <div>
              <label className="text-sm font-semibold text-richblack-100 mb-2 block">Target job description</label>
              <textarea
                value={jd}
                onChange={(e) => setJd(e.target.value)}
                placeholder="Paste the job description you're targeting..."
                rows={6}
                className="w-full rounded-xl bg-richblack-900 border border-richblack-600 px-4 py-3 text-richblack-5 text-sm placeholder:text-richblack-400 focus:outline-none focus:border-yellow-50 transition-colors duration-200 resize-none"
              />
            </div>
          </div>
        )}

        {/* Template grid sir — always shown, since every mode ends in "which template renders this data" */}
        <p className="text-sm font-semibold text-richblack-100 mb-4">
          {mode === 'blank' ? 'Pick a template to start' : 'Pick a template for the result'}
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
          {TEMPLATE_REGISTRY.map((t) => (
            <button
              key={t.id}
              onClick={() => handlePickTemplate(t.id)}
              className={`group text-left rounded-xl overflow-hidden border transition-all duration-200 cursor-pointer ${
                selectedTemplate === t.id ? 'border-warm-200 ring-2 ring-warm-200/40' : 'border-richblack-700 hover:border-richblack-500'
              }`}
            >
              <div className="relative aspect-[3/4] bg-richblack-5 overflow-hidden">
                <div className="w-full h-full origin-top-left scale-[0.27] pointer-events-none">
                  <t.Component data={SAMPLE_RESUME_DATA} />
                </div>
                {/* hover overlay sir — "Use this template" on hover, mirrors the home page slider's cards */}
                <div className="absolute inset-0 bg-richblack-900/0 group-hover:bg-richblack-900/55 transition-colors duration-300 flex items-center justify-center">
                  <span className="opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300 flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold rounded-full bg-yellow-50 text-richblack-900 shadow-lg">
                    <FaMagic className="text-[10px]" /> Use this template
                  </span>
                </div>
              </div>
              <div className="bg-richblack-800 px-3 py-2.5">
                <p className="text-sm font-semibold text-richblack-5">{t.name}</p>
                <p className="text-[11px] text-richblack-400 mt-0.5 line-clamp-1">{t.description}</p>
              </div>
            </button>
          ))}
        </div>

        {/* Confirm button for generate/tailor sir — blank mode already navigates on template click */}
        {mode === 'generate' && (
          <div className="flex justify-end mt-8">
            <IconBtn
              text={generating ? "Drafting..." : "Generate my resume"}
              onclick={handleGenerate}
              disabled={generating}
              customClasses="px-8 py-3 text-sm"
            />
          </div>
        )}
        {mode === 'tailor' && (
          <div className="flex justify-end mt-8">
            <IconBtn
              text={generating ? "Tailoring..." : "Tailor my resume"}
              onclick={handleTailor}
              disabled={generating}
              customClasses="px-8 py-3 text-sm"
            />
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

export default BuildResumePicker
