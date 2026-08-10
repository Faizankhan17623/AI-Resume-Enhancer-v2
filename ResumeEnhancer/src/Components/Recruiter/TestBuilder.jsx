import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate, useParams } from 'react-router'
import { Helmet } from 'react-helmet-async'
import toast from 'react-hot-toast'
import { FaPlus, FaTrash, FaLock } from 'react-icons/fa'
import RecruiterLayout from './RecruiterLayout'
import IconBtn from '../extra/IconBtn'
import useRecruiterLock from '../../Hooks/useRecruiterLock'
import { CreateTest } from '../../Services/operations/Test'

const emptyQuestion = () => ({ prompt: '', type: 'mcq', options: ['', ''], correctAnswer: '', marks: 10 })

// reached from a specific job's page sir (/Recruiter/Jobs/:jobId/Test) — a test always belongs
// to exactly one job now, there's no standalone test creation anymore
const TestBuilder = () => {
  const { jobId } = useParams()
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { token } = useSelector((state) => state.auth)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [totalMarks, setTotalMarks] = useState(100)
  const [timeLimitMinutes, setTimeLimitMinutes] = useState(30)
  const [maxViolations, setMaxViolations] = useState(4)
  const [questions, setQuestions] = useState([emptyQuestion()])
  const [submitting, setSubmitting] = useState(false)
  const { isLocked } = useRecruiterLock()

  const marksSum = questions.reduce((sum, q) => sum + (Number(q.marks) || 0), 0)
  const marksMatch = marksSum === Number(totalMarks)

  const updateQuestion = (index, patch) => {
    setQuestions((qs) => qs.map((q, i) => (i === index ? { ...q, ...patch } : q)))
  }

  const updateOption = (qIndex, oIndex, value) => {
    setQuestions((qs) => qs.map((q, i) => {
      if (i !== qIndex) return q
      const options = [...q.options]
      options[oIndex] = value
      return { ...q, options }
    }))
  }

  const addOption = (qIndex) => {
    setQuestions((qs) => qs.map((q, i) => (i === qIndex ? { ...q, options: [...q.options, ''] } : q)))
  }

  const removeOption = (qIndex, oIndex) => {
    setQuestions((qs) => qs.map((q, i) => (i === qIndex ? { ...q, options: q.options.filter((_, oi) => oi !== oIndex) } : q)))
  }

  const addQuestion = () => setQuestions((qs) => [...qs, emptyQuestion()])
  const removeQuestion = (index) => setQuestions((qs) => qs.filter((_, i) => i !== index))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (isLocked) return toast.error("Your recruiter account is pending admin approval")
    if (!title.trim()) return toast.error("Please give the test a title")
    if (!questions.length) return toast.error("Add at least one question")

    for (const [i, q] of questions.entries()) {
      if (!q.prompt.trim()) return toast.error(`Question ${i + 1} needs a prompt`)
      if (!q.marks || Number(q.marks) < 1) return toast.error(`Question ${i + 1} needs marks (at least 1)`)
      if (q.type === 'mcq') {
        const filledOptions = q.options.filter((o) => o.trim())
        if (filledOptions.length < 2) return toast.error(`Question ${i + 1} needs at least 2 options`)
        if (q.correctAnswer && !filledOptions.includes(q.correctAnswer)) {
          return toast.error(`Question ${i + 1}'s correct answer must match one of its options`)
        }
      }
    }

    if (!marksMatch) {
      return toast.error(`Question marks add up to ${marksSum}, but the total is set to ${totalMarks} — they must match exactly`)
    }

    const payload = {
      job: jobId,
      title: title.trim(),
      description: description.trim() || undefined,
      totalMarks: Number(totalMarks),
      timeLimitMinutes: Number(timeLimitMinutes),
      maxViolations: Number(maxViolations),
      questions: questions.map((q) => ({
        prompt: q.prompt.trim(),
        type: q.type,
        marks: Number(q.marks),
        options: q.type === 'mcq' ? q.options.filter((o) => o.trim()) : undefined,
        correctAnswer: q.type === 'mcq' && q.correctAnswer ? q.correctAnswer : undefined,
      })),
    }

    setSubmitting(true)
    await dispatch(CreateTest(payload, token, navigate))
    setSubmitting(false)
  }

  return (
    <RecruiterLayout>
      <Helmet>
        <title>Attach a Test | Resumify Recruiter</title>
      </Helmet>

      <h1 className="font-display text-xl text-richblack-5 mb-6">Attach a Test</h1>

      <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
        <div className="rounded-xl bg-richblack-800 shadow-md shadow-richblack-900/10 p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-richblack-200 mb-1.5">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Frontend Engineer — Screening Test"
              className="w-full rounded-xl bg-richblack-900/60 border border-richblack-600 px-4 py-3 text-richblack-5 text-sm placeholder:text-richblack-400 focus:outline-none focus:border-yellow-50 transition-colors duration-200"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-richblack-200 mb-1.5">Description (optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Shown to the candidate before they start"
              className="w-full rounded-xl bg-richblack-900/60 border border-richblack-600 px-4 py-3 text-richblack-5 text-sm placeholder:text-richblack-400 focus:outline-none focus:border-yellow-50 transition-colors duration-200 resize-none"
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-richblack-200 mb-1.5">Total marks</label>
              <input
                type="number"
                min={1}
                value={totalMarks}
                onChange={(e) => setTotalMarks(e.target.value)}
                className="w-full rounded-xl bg-richblack-900/60 border border-richblack-600 px-4 py-3 text-richblack-5 text-sm focus:outline-none focus:border-yellow-50 transition-colors duration-200"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-richblack-200 mb-1.5">Time limit (minutes)</label>
              <input
                type="number"
                min={1}
                max={180}
                value={timeLimitMinutes}
                onChange={(e) => setTimeLimitMinutes(e.target.value)}
                className="w-full rounded-xl bg-richblack-900/60 border border-richblack-600 px-4 py-3 text-richblack-5 text-sm focus:outline-none focus:border-yellow-50 transition-colors duration-200"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-richblack-200 mb-1.5">Warnings before auto-exit</label>
              <input
                type="number"
                min={1}
                max={20}
                value={maxViolations}
                onChange={(e) => setMaxViolations(e.target.value)}
                className="w-full rounded-xl bg-richblack-900/60 border border-richblack-600 px-4 py-3 text-richblack-5 text-sm focus:outline-none focus:border-yellow-50 transition-colors duration-200"
              />
            </div>
          </div>

          {/* live running total sir — mirrors the backend's hard gate so the recruiter isn't
              surprised by a 400 only when they hit publish */}
          <div className={`rounded-lg px-4 py-2.5 text-sm font-semibold ${marksMatch ? 'bg-caribgreen-700/20 text-caribgreen-100' : 'bg-pink-700/20 text-pink-100'}`}>
            Marks: {marksSum} / {totalMarks || 0} {marksMatch ? '— matches' : '— must match exactly before creating'}
          </div>
        </div>

        <div className="space-y-4">
          {questions.map((q, qIndex) => (
            <div key={qIndex} className="rounded-xl bg-richblack-800 shadow-md shadow-richblack-900/10 p-6 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <span className="text-xs font-bold text-richblack-400 mt-2.5 shrink-0">Q{qIndex + 1}</span>
                <textarea
                  value={q.prompt}
                  onChange={(e) => updateQuestion(qIndex, { prompt: e.target.value })}
                  placeholder="Question prompt"
                  rows={2}
                  className="flex-1 rounded-xl bg-richblack-900/60 border border-richblack-600 px-4 py-2.5 text-richblack-5 text-sm placeholder:text-richblack-400 focus:outline-none focus:border-yellow-50 transition-colors duration-200 resize-none"
                />
                <div className="flex items-center gap-2 shrink-0">
                  <input
                    type="number"
                    min={1}
                    value={q.marks}
                    onChange={(e) => updateQuestion(qIndex, { marks: e.target.value })}
                    title="Marks for this question"
                    className="w-16 rounded-xl bg-richblack-900/60 border border-richblack-600 px-2 py-2.5 text-richblack-5 text-xs text-center focus:outline-none focus:border-yellow-50 transition-colors duration-200"
                  />
                  <select
                    value={q.type}
                    onChange={(e) => updateQuestion(qIndex, { type: e.target.value })}
                    className="rounded-xl bg-richblack-900/60 border border-richblack-600 px-3 py-2.5 text-richblack-5 text-xs focus:outline-none focus:border-yellow-50 transition-colors duration-200"
                  >
                    <option value="mcq">Multiple choice</option>
                    <option value="text">Free text</option>
                  </select>
                  {questions.length > 1 && (
                    <button type="button" onClick={() => removeQuestion(qIndex)} className="text-richblack-400 hover:text-pink-200 cursor-pointer p-2">
                      <FaTrash className="text-xs" />
                    </button>
                  )}
                </div>
              </div>

              {q.type === 'mcq' && (
                <div className="pl-8 space-y-2">
                  {q.options.map((opt, oIndex) => (
                    <div key={oIndex} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name={`correct-${qIndex}`}
                        checked={!!opt && q.correctAnswer === opt}
                        onChange={() => updateQuestion(qIndex, { correctAnswer: opt })}
                        title="Mark as correct answer"
                        className="accent-yellow-50 cursor-pointer"
                      />
                      <input
                        value={opt}
                        onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                        placeholder={`Option ${oIndex + 1}`}
                        className="flex-1 rounded-lg bg-richblack-900/60 border border-richblack-600 px-3 py-2 text-richblack-5 text-sm placeholder:text-richblack-400 focus:outline-none focus:border-yellow-50 transition-colors duration-200"
                      />
                      {q.options.length > 2 && (
                        <button type="button" onClick={() => removeOption(qIndex, oIndex)} className="text-richblack-400 hover:text-pink-200 cursor-pointer p-1">
                          <FaTrash className="text-[10px]" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => addOption(qIndex)}
                    className="text-xs text-yellow-50 hover:underline cursor-pointer"
                  >
                    + Add option
                  </button>
                  <p className="text-[11px] text-richblack-400">Select the radio next to the correct option for auto-grading, or leave unset for manual review.</p>
                </div>
              )}
            </div>
          ))}

          <button
            type="button"
            onClick={addQuestion}
            className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-richblack-600 py-4 text-sm text-richblack-300 hover:border-richblack-400 hover:text-richblack-5 transition-colors duration-200 cursor-pointer"
          >
            <FaPlus /> Add question
          </button>
        </div>

        {isLocked && (
          <p className="flex items-center gap-2 text-xs text-yellow-25">
            <FaLock /> Locked until an admin approves your recruiter account
          </p>
        )}
        <IconBtn
          type="submit"
          text={submitting ? "Creating..." : "Create test"}
          disabled={submitting || !marksMatch || isLocked}
          customClasses="w-full justify-center"
        />
      </form>
    </RecruiterLayout>
  )
}

export default TestBuilder
