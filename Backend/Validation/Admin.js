// Admin schemas sir — these endpoints change roles and money, so their inputs are the ones most
// worth constraining. See controllers/Admin.js.

const { z } = require('zod')
const { objectId, planKey } = require('./Shared')

const roleSchema = z.enum(['User', 'Support', 'Admin', 'Recruiter'], { error: 'Invalid role' })

const updateUserRoleSchema = z.object({ role: roleSchema })

// internal Admin/Support-only sticky note sir — see Models/User.js's own comment on adminNote
const updateAdminNoteSchema = z.object({
    note: z.string().trim().max(2000).optional(),
})

const bulkUpdateRoleSchema = z.object({
    userIds: z.array(objectId, { error: 'userIds must be a non-empty array' })
        .min(1, 'userIds must be a non-empty array')
        .max(200, 'Cannot act on more than 200 users at once'),
    role: roleSchema,
})

// field names mirror controllers/Admin.js exactly sir — `banned`, not `isBanned` (that's the
// MODEL's field). Getting this wrong would reject every legitimate request from the existing
// admin UI, so it's taken from the controller's own destructuring rather than from the schema.
const banUserSchema = z.object({
    banned: z.boolean({ error: "'banned' must be true or false" }),
    reason: z.string().trim().max(500).optional(),
})

// permanentlySuspendSupport (Admin.js) sir — unlike banUserSchema above, reason is REQUIRED
// here, not optional: this is the final, no-appeal action, so it always needs an explanation
// the account holder can see.
const permanentSuspendSchema = z.object({
    reason: z.string({ error: 'A reason is required' }).trim().min(1, 'A reason is required').max(500),
})

const bulkBanSchema = z.object({
    userIds: z.array(objectId, { error: 'userIds must be a non-empty array' })
        .min(1, 'userIds must be a non-empty array')
        .max(200, 'Cannot act on more than 200 users at once'),
    banned: z.boolean({ error: "'banned' must be true or false" }),
    reason: z.string().trim().max(500).optional(),
})

const bulkUserIdsSchema = z.object({
    userIds: z.array(objectId, { error: 'userIds must be a non-empty array' })
        .min(1, 'userIds must be a non-empty array')
        .max(200, 'Cannot act on more than 200 users at once'),
})

// `credits` sir, a positive bonus amount to grant a single user — this endpoint is bonus-only
// now (always reduces used-count, floored at 0, always emails), matching grantCreditsToAllSchema
// below. Bounded so an unbounded amount here isn't effectively a free-credits endpoint.
const adjustCreditsSchema = z.object({
    credits: z.coerce
        .number()
        .int("'credits' must be a positive integer")
        .positive("'credits' must be a positive integer")
        .max(100000, 'That amount is too large'),
    reason: z.string().trim().max(300).optional(),
})

// broadcast bonus sir — POSITIVE only (a broadcast is always a gift, never a mass charge), same
// upper bound reasoning as adjustCreditsSchema
const grantCreditsToAllSchema = z.object({
    credits: z.coerce
        .number()
        .int("'credits' must be a positive integer")
        .positive("'credits' must be a positive integer")
        .max(100000, 'That amount is too large'),
    reason: z.string().trim().max(300).optional(),
})

const updateUserPlanSchema = z.object({
    plan: planKey,
})

// POST /admin/payments/:paymentId/refund body sir — amount is OPTIONAL (omit for a full refund,
// pass a smaller paise amount for partial), in paise same unit as Payment.amount
const refundPaymentSchema = z.object({
    amount: z.coerce.number().int().positive().optional(),
    reason: z.string().trim().max(500).optional(),
})

const userIdParamSchema = z.object({ userId: objectId })

module.exports = {
    updateUserRoleSchema,
    updateAdminNoteSchema,
    bulkUpdateRoleSchema,
    banUserSchema,
    permanentSuspendSchema,
    bulkBanSchema,
    bulkUserIdsSchema,
    adjustCreditsSchema,
    grantCreditsToAllSchema,
    updateUserPlanSchema,
    refundPaymentSchema,
    userIdParamSchema,
}
