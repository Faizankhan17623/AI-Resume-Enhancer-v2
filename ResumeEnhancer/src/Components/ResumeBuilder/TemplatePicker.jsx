import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Helmet } from 'react-helmet-async'
import { motion } from 'motion/react'
import { FaMagic } from 'react-icons/fa'
import DashboardLayout from '../Dashboard/DashboardLayout'
import PageTransition from '../extra/PageTransition'
import { fadeUp, staggerContainer } from '../../utils/motion'
import { TEMPLATE_REGISTRY } from './Templates/templateRegistry'
import { SAMPLE_RESUME_DATA } from './Templates/sampleResumeData'

// same swatch set offered in the builder's color picker sir — kept in one place would be nicer,
// but these two pickers serve different moments (browsing vs. already-editing) so a little
// duplication here is fine; ACCENT_SWATCHES in BuilderEditor.jsx is the source of truth to update too
const ACCENT_SWATCHES = ['#0b2545', '#1d4ed8', '#0f766e', '#b91c1c', '#c2410c', '#7e22ce', '#171717']

// dedicated gallery page sir — separate from Build Resume's mode picker (blank/AI-draft/tailor).
// Browsing here is commitment-free: picking a template + color just carries both forward as
// query params into /Dashboard/Build-Resume, where the user still chooses blank/generate/tailor.
const TemplatePicker = () => {
  const navigate = useNavigate()
  const [colorByTemplate, setColorByTemplate] = useState({})

  const handlePickColor = (e, templateId, color) => {
    e.stopPropagation()
    setColorByTemplate((prev) => ({ ...prev, [templateId]: color }))
  }

  const handleUseTemplate = (templateId) => {
    const color = colorByTemplate[templateId]
    const params = new URLSearchParams({ template: templateId })
    if (color) params.set('color', color)
    navigate(`/Dashboard/Build-Resume?${params.toString()}`)
  }

  return (
    <DashboardLayout title="Choose a template">
      <Helmet>
        <title>Templates | Resumify</title>
      </Helmet>

      <PageTransition className="h-full overflow-y-auto max-w-6xl mx-auto px-4 lg:px-6 py-8">
        <div className="mb-8">
          <h1 className="font-display font-bold text-2xl text-richblack-5">Choose a template</h1>
          <p className="text-sm text-richblack-400 mt-1">
            Pick a look and an accent color — you can still change either later in the editor.
          </p>
        </div>

        <motion.div layout variants={staggerContainer(0.04)} initial="hidden" animate="show" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
          {TEMPLATE_REGISTRY.map((t) => {
            const selectedColor = colorByTemplate[t.id]
            const previewData = selectedColor ? { ...SAMPLE_RESUME_DATA, color: selectedColor } : SAMPLE_RESUME_DATA
            return (
              <motion.div
                key={t.id}
                layout
                variants={fadeUp}
                className="group rounded-xl overflow-hidden border border-richblack-700 hover:border-richblack-500 transition-colors duration-200"
              >
                <button
                  onClick={() => handleUseTemplate(t.id)}
                  className="relative w-full aspect-[3/4] bg-richblack-5 overflow-hidden cursor-pointer block text-left"
                >
                  <div className="w-full h-full origin-top-left scale-[0.27] pointer-events-none">
                    <t.Component data={previewData} />
                  </div>
                  <div className="absolute inset-0 bg-richblack-900/0 group-hover:bg-richblack-900/55 transition-colors duration-300 flex items-center justify-center">
                    <span className="opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300 flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold rounded-full bg-yellow-50 text-richblack-900 shadow-lg">
                      <FaMagic className="text-[10px]" /> Use this template
                    </span>
                  </div>
                </button>
                <div className="bg-richblack-800 px-3 py-2.5">
                  <p className="text-sm font-semibold text-richblack-5">{t.name}</p>
                  <p className="text-[11px] text-richblack-400 mt-0.5 line-clamp-1">{t.description}</p>
                  <div className="flex items-center gap-1.5 mt-2">
                    {ACCENT_SWATCHES.map((c) => (
                      <button
                        key={c}
                        onClick={(e) => handlePickColor(e, t.id, c)}
                        aria-label={`Preview ${t.name} in ${c}`}
                        style={{ backgroundColor: c }}
                        className={`w-4 h-4 rounded-full cursor-pointer transition-transform duration-150 hover:scale-110 ${
                          (selectedColor || ACCENT_SWATCHES[0]) === c && selectedColor ? 'ring-2 ring-offset-1 ring-offset-richblack-800 ring-warm-200' : ''
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </motion.div>
            )
          })}
        </motion.div>
      </PageTransition>
    </DashboardLayout>
  )
}

export default TemplatePicker
