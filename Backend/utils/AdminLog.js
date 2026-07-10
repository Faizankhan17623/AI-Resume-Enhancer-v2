const AuditLog = require('../Models/AuditLog')
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
    }).catch((err) => console.log('audit log failed:', err.message))
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
    }).catch((err) => console.log('ai log failed:', err.message))
}

module.exports = { logAction, logAi }
