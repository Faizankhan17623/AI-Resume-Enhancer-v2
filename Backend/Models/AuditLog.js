const mongoose = require('mongoose')

// immutable record of every admin action sir — who did what to whom, and when
// written automatically by utils/AdminLog.js, never edited, never deleted from the app
const auditLogSchema = new mongoose.Schema(
    {
        // the admin/support person who performed the action sir — absent for system-fired
        // entries (isSystem: true), e.g. cron jobs with no human actor
        actor: {
            type: mongoose.Schema.ObjectId,
            ref: 'User',
            index: true,
        },
        // true for entries written by a cron/system process rather than a logged-in admin sir
        isSystem: {
            type: Boolean,
            default: false,
            index: true,
        },
        // what happened sir — a short SCREAMING_SNAKE action code so the frontend can filter
        action: {
            type: String,
            required: true,
            enum: [
                'ROLE_CHANGE',
                'PLAN_CHANGE',
                'USER_BAN',
                'USER_UNBAN',
                'CREDIT_ADJUST',
                'USER_DELETE',
                'IMPERSONATE',
                'ANNOUNCEMENT_CREATE',
                'ANNOUNCEMENT_DELETE',
                'SETTING_CHANGE',
                'ACCOUNT_PURGED',
                'AI_COST_ALERT',
            ],
            index: true,
        },
        // who it happened to sir — kept as both id and email so the log survives the user's deletion
        targetUser: {
            type: mongoose.Schema.ObjectId,
            ref: 'User',
        },
        targetEmail: {
            type: String,
        },
        // the specifics sir — old/new role, plan given, credit delta, ban reason...
        details: {
            type: mongoose.Schema.Types.Mixed,
        },
    },
    { timestamps: true }
)

// the audit page reads newest-first sir
auditLogSchema.index({ createdAt: -1 })

module.exports = mongoose.model('AuditLog', auditLogSchema)
