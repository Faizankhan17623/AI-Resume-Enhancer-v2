const mongoose = require('mongoose')
const crypto = require('crypto')
const User = require('../Models/User')
const Resume = require('../Models/Resume')
const Job = require('../Models/Job')
const JobApplication = require('../Models/JobApplication')
const CareerPlan = require('../Models/CareerPlan')
const CareerFollowUp = require('../Models/CareerFollowUp')
const logger = require('../utils/logger')

const STOP = new Set('and the for with from your you are this that into our have will using work years role job about'.split(' '))
const words = (text = '') => [...new Set((text.toLowerCase().match(/[a-z][a-z+#.-]{2,}/g) || []).filter(w => !STOP.has(w)))]
const trustScore = (job) => {
  let score = 35
  if (job.companyName) score += 10
  if (job.description?.length >= 300) score += 15
  if (job.skills?.length >= 3) score += 10
  if (job.location || job.employmentType) score += 8
  if (job.compensationType === 'paid' && job.ctcMin !== undefined && job.ctcMax !== undefined) score += 15
  if (job.compensationType === 'unpaid' && job.unpaidDurationMonths !== undefined) score += 7
  if (job.views > 0) score += 2
  return Math.min(100, score)
}
const match = (resumeText, jobText) => {
  const resume = new Set(words(resumeText)); const required = words(jobText)
  const matched = required.filter(w => resume.has(w)); const missing = required.filter(w => !resume.has(w)).slice(0, 20)
  const score = required.length ? Math.round(matched.length / required.length * 100) : 0
  return { score, tier: score >= 75 ? 'Strong match' : score >= 50 ? 'Potential match' : 'Needs work', matched: matched.slice(0, 30), missing }
}

exports.getOverview = async (req, res) => {
  try {
    const userId = req.User.id
    const [resume, applications, plans, followUps] = await Promise.all([
      Resume.findOne({ user: userId, isDefault: true }).select('resumeText label'),
      JobApplication.find({ candidate: userId }).populate('job', 'title companyName description status'),
      CareerPlan.find({ user: userId }).sort({ createdAt: -1 }).limit(5),
      CareerFollowUp.find({ user: userId }).sort({ dueAt: 1 }).limit(20),
    ])
    const matches = applications.filter(a => a.job).map(a => ({ applicationId: a._id, job: a.job, match: match(resume?.resumeText, `${a.job.title} ${a.job.description}`) }))
    return res.json({ success: true, resume, matches, plans, followUps })
  } catch (error) { logger.error('career overview failed', { err: error }); return res.status(500).json({ success: false, message: 'Could not load Career Copilot' }) }
}

exports.smartMatch = async (req, res) => {
  try {
    const { jobId, jobText, resumeId } = req.body
    if (jobId && !mongoose.isValidObjectId(jobId)) return res.status(400).json({ success: false, message: 'Job is invalid' })
    if (resumeId && !mongoose.isValidObjectId(resumeId)) return res.status(400).json({ success: false, message: 'Resume is invalid' })
    const resume = (resumeId && mongoose.isValidObjectId(resumeId)
      ? await Resume.findOne({ _id: resumeId, user: req.User.id })
      : null) || await Resume.findOne({ user: req.User.id, isDefault: true })
    let text = jobText
    if (jobId) { const job = await Job.findOne({ _id: jobId, status: 'published' }); if (!job) return res.status(404).json({ success: false, message: 'Job not found' }); text = `${job.title} ${job.description} ${(job.skills || []).join(' ')}` }
    if (!resume?.resumeText || !text?.trim()) return res.status(400).json({ success: false, message: 'A saved resume and job description are required' })
    return res.json({ success: true, result: match(resume.resumeText, text), resume: { _id: resume._id, label: resume.label } })
  } catch (error) { logger.error('smart match failed', { err: error }); return res.status(500).json({ success: false, message: 'Could not calculate the match' }) }
}

exports.createRoadmap = async (req, res) => {
  try {
    const { targetRole, jobText = '', targetJob } = req.body
    const resume = await Resume.findOne({ user: req.User.id, isDefault: true }).select('resumeText')
    if (!resume?.resumeText || typeof jobText !== 'string' || !jobText.trim()) return res.status(400).json({ success: false, message: 'A saved resume and target job description are required' })
    if (targetJob && !mongoose.isValidObjectId(targetJob)) return res.status(400).json({ success: false, message: 'Target job is invalid' })
    if (targetJob && !(await Job.exists({ _id: targetJob, status: 'published' }))) return res.status(404).json({ success: false, message: 'Target job not found' })
    const result = match(resume.resumeText, jobText)
    const skills = result.missing.map((name, i) => ({ name, priority: i < 5 ? 'high' : i < 12 ? 'medium' : 'low', reason: `Mentioned in the target role but not found in your resume` }))
    const actions = skills.slice(0, 8).flatMap((s, i) => [
      { title: `Learn ${s.name}`, description: `Build practical evidence for ${s.name} through a small project or course.`, week: i + 1, type: 'learn' },
      { title: `Add evidence for ${s.name}`, description: `Update your resume with a measurable example if you have used this skill.`, week: i + 2, type: 'resume' },
    ])
    const plan = await CareerPlan.create({ user: req.User.id, targetRole, targetJob: targetJob || undefined, sourceText: jobText, skills, actions })
    return res.status(201).json({ success: true, plan, match: result })
  } catch (error) { logger.error('career roadmap failed', { err: error }); return res.status(500).json({ success: false, message: 'Could not create your roadmap' }) }
}

exports.listFollowUps = async (req, res) => { const items = await CareerFollowUp.find({ user: req.User.id }).sort({ completed: 1, dueAt: 1 }); return res.json({ success: true, followUps: items }) }
exports.createFollowUp = async (req, res) => {
  const { title, dueAt, kind = 'custom', application } = req.body
  const allowedKinds = new Set(['follow-up', 'interview', 'deadline', 'custom'])
  if (typeof title !== 'string' || !title.trim() || !dueAt || Number.isNaN(new Date(dueAt).getTime()) || !allowedKinds.has(kind)) return res.status(400).json({ success: false, message: 'Title, valid due date, and kind are required' })
  if (application && !mongoose.isValidObjectId(application)) return res.status(400).json({ success: false, message: 'Application is invalid' })
  if (application && !(await JobApplication.exists({ _id: application, candidate: req.User.id }))) return res.status(404).json({ success: false, message: 'Application not found' })
  const item = await CareerFollowUp.create({ user: req.User.id, title, dueAt, kind, application }); return res.status(201).json({ success: true, followUp: item })
}
exports.toggleFollowUp = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.followUpId)) return res.status(400).json({ success: false, message: 'Follow-up is invalid' })
  const item = await CareerFollowUp.findOneAndUpdate({ _id: req.params.followUpId, user: req.User.id }, { $set: { completed: !!req.body.completed } }, { returnDocument: 'after' }); return item ? res.json({ success: true, followUp: item }) : res.status(404).json({ success: false, message: 'Follow-up not found' })
}

exports.getProfile = async (req, res) => { const user = await User.findById(req.User.id).select('firstName lastName email role recruiterApplication referralCode'); return res.json({ success: true, profile: user }) }
exports.shareProfile = async (req, res) => { const shareId = crypto.randomBytes(12).toString('base64url'); await User.findByIdAndUpdate(req.User.id, { $set: { careerShareId: shareId } }); return res.json({ success: true, shareId }) }
exports.getSharedProfile = async (req, res) => {
  const user = await User.findOne({ careerShareId: req.params.shareId }).select('firstName lastName role recruiterApplication.companyName recruiterApplication.location')
  return user ? res.json({ success: true, profile: user }) : res.status(404).json({ success: false, message: 'Profile not found' })
}

exports.recruiterMatches = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.jobId)) return res.status(400).json({ success: false, message: 'Job is invalid' })
  const job = await Job.findOne({ _id: req.params.jobId, recruiter: req.User.id }).select('title description skills')
  if (!job) return res.status(404).json({ success: false, message: 'Job not found' })
  const applications = await JobApplication.find({ job: job._id }).populate('candidate', 'firstName lastName email')
  const result = applications.map(a => ({ application: a, match: a.fitScore != null ? { score: a.fitScore, tier: a.fitTier, reasoning: a.fitScoreReasoning } : { score: null, tier: 'Pending', missing: [] } })).sort((a, b) => (b.match.score || -1) - (a.match.score || -1))
  return res.json({ success: true, job, candidates: result })
}

exports.interviewFeedback = async (req, res) => {
  const { question, answer } = req.body
  if (typeof question !== 'string' || typeof answer !== 'string' || !question.trim() || !answer.trim()) return res.status(400).json({ success: false, message: 'Question and answer are required' })
  const sentences = answer.split(/[.!?]+/).filter(Boolean).length; const wordsCount = words(answer).length
  const hasEvidence = /\b(I|we)\s+(built|led|improved|delivered|reduced|increased|created|managed)/i.test(answer)
  const score = Math.min(100, 35 + Math.min(30, wordsCount) + (hasEvidence ? 25 : 0) + (sentences >= 3 ? 10 : 0))
  return res.json({ success: true, feedback: { score, strengths: [hasEvidence ? 'Uses evidence and action verbs' : 'Directly addresses the question'], improvements: [sentences < 3 ? 'Use the STAR structure with a clear situation, action, and result.' : 'Quantify the result and connect it to the role.'], metrics: { wordCount: wordsCount, sentenceCount: sentences } } })
}

exports.jobTrust = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.jobId)) return res.status(400).json({ success: false, message: 'Job is invalid' })
  const job = await Job.findOne({ _id: req.params.jobId, status: 'published' }).select('companyName description skills location employmentType compensationType ctcMin ctcMax unpaidDurationMonths views')
  if (!job) return res.status(404).json({ success: false, message: 'Job not found' })
  const score = trustScore(job)
  return res.json({ success: true, trust: { score, label: score >= 80 ? 'High transparency' : score >= 60 ? 'Good transparency' : 'Needs more information', checks: { company: !!job.companyName, detailedDescription: job.description?.length >= 300, skills: job.skills?.length >= 3, location: !!(job.location || job.employmentType), compensation: job.compensationType === 'paid' ? job.ctcMin !== undefined && job.ctcMax !== undefined : !!job.unpaidDurationMonths } } })
}
