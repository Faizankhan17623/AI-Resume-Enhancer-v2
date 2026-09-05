const mongoose = require('mongoose')

const careerPlanSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.ObjectId, ref: 'User', required: true, index: true },
  targetRole: { type: String, trim: true, maxlength: 150 },
  targetJob: { type: mongoose.Schema.ObjectId, ref: 'Job' },
  sourceText: { type: String, maxlength: 10000 },
  skills: [{ name: String, priority: String, reason: String }],
  actions: [{ title: String, description: String, week: Number, type: String }],
}, { timestamps: true })

module.exports = mongoose.model('CareerPlan', careerPlanSchema)
