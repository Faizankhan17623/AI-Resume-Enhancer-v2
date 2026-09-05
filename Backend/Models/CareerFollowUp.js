const mongoose = require('mongoose')

const followUpSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.ObjectId, ref: 'User', required: true, index: true },
  application: { type: mongoose.Schema.ObjectId, ref: 'JobApplication' },
  title: { type: String, required: true, trim: true, maxlength: 150 },
  dueAt: { type: Date, required: true },
  kind: { type: String, enum: ['follow-up', 'interview', 'deadline', 'custom'], default: 'follow-up' },
  completed: { type: Boolean, default: false },
}, { timestamps: true })

module.exports = mongoose.model('CareerFollowUp', followUpSchema)
