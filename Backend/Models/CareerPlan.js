const mongoose = require('mongoose')

const careerPlanSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.ObjectId, ref: 'User', required: true, index: true },
  targetRole: { type: String, trim: true, maxlength: 150 },
  targetJob: { type: mongoose.Schema.ObjectId, ref: 'Job' },
  // 20000 sir, per 2026-11-15 audit — must match Validation/Career.js's own createRoadmapSchema
  // jobText cap exactly. This used to cap at 10000 while validation allowed up to 20000, so a
  // real job description between 10,001-20,000 chars passed validation, got used for the AI
  // call, then threw a generic Mongoose ValidationError 500 on the .create() below trying to
  // persist the very same text that had already been accepted and spent AI credit on.
  sourceText: { type: String, maxlength: 20000 },
  skills: [{ name: String, priority: String, reason: String }],
  actions: [{ title: String, description: String, week: Number, type: String }],
}, { timestamps: true })

module.exports = mongoose.model('CareerPlan', careerPlanSchema)
