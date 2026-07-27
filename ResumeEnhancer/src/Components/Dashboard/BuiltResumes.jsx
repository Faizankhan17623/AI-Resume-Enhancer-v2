import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link, useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import Swal from 'sweetalert2'
import { motion, AnimatePresence } from 'motion/react'
import { FaLayerGroup, FaCopy, FaTrash, FaPen } from 'react-icons/fa'
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

  useEffect(() => {
    dispatch(GetBuiltResumes(token))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

  return (
    <DashboardLayout title="My built resumes">
      <Helmet>
        <title>My Built Resumes | Resumify</title>
      </Helmet>

      <PageTransition className="h-full overflow-y-auto max-w-4xl mx-auto px-4 lg:px-6 py-8">

        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-richblack-300">
            Every resume you've built from a template. Duplicate one to branch a variant for a different job.
          </p>
          <Link to="/Dashboard/Templates" className="shrink-0 ml-4">
            <IconBtn text="Build new">
              <FaLayerGroup />
            </IconBtn>
          </Link>
        </div>

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
        ) : (
          <motion.div variants={staggerContainer(0.05)} initial="hidden" animate="show" className="space-y-3">
            <AnimatePresence>
            {resumes.map((resume) => {
              const template = getTemplateById(resume.templateId)
              return (
                <motion.div
                  key={resume._id}
                  layout
                  variants={fadeUp}
                  exit={{ opacity: 0, x: -20, transition: { duration: 0.2 } }}
                  className="flex items-center justify-between gap-3 rounded-xl bg-richblack-800 shadow-sm shadow-richblack-900/10 p-5"
                >
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
