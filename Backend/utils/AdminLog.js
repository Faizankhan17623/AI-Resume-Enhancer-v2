const AuditLog = require('../Models/AuditLog')
const logger = require('./logger')
const AiLog = require('../Models/AiLog')

// both loggers here are FIRE-AND-FORGET sir — a logging failure must never break the real request,
// so we don't await them in controllers and we swallow their errors with a console note

// record an admin action sir — call this right after the mutation succeeds
// logAction(adminId, 'ROLE_CHANGE', targetUser, { from: 'User', to: 'Admin' })
const logAction = (actorId, action, target, details = {}) => {
    AuditLog.create({
        actor: actorId,
        action,
        targetUser: target?._id,
        targetEmail: target?.email,
        details,
    }).catch((err) => logger.error('audit log failed', { err: err }))
}

// record a cron/system-fired event sir — no human actor, so isSystem carries that instead
// logSystemAction('ACCOUNT_PURGED', { email: user.email }, { deletionDate })
// logSystemAction('CREDIT_RECONCILED', { _id: userId }, { kind, spentAt })
const logSystemAction = (action, target = {}, details = {}) => {
    AuditLog.create({
        isSystem: true,
        action,
        targetUser: target?._id,
        targetEmail: target?.email,
        details,
    }).catch((err) => logger.error('system audit log failed', { err: err }))
}

// record one Groq call sir — usage comes straight off the completion response
// logAi({ user, type: 'review', plan, model, usage: Invoking.usage, latencyMs, success, error })
const logAi = ({ user, type, plan, model, usage, latencyMs, success = true, error }) => {
    AiLog.create({
        user,
        type,
        plan,
        model,
        promptTokens: usage?.prompt_tokens || 0,
        completionTokens: usage?.completion_tokens || 0,
        totalTokens: usage?.total_tokens || 0,
        latencyMs,
        success,
        error,
    }).catch((err) => logger.error('ai log failed', { err: err }))
}

module.exports = { logAction, logSystemAction, logAi }
