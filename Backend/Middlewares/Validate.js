// Request validation middleware sir.
//
// THE PROBLEM IT SOLVES: every controller hand-checked req.body with ad-hoc `if (!x)` blocks.
// That had four costs:
//
//   1. The same rule was written many times and had already drifted. A 10-digit phone number was
//      enforced in the model, in createUser, and in the frontend, each independently.
//   2. Type coercion was accidental. `count: { $lt: plan.credits }` style comparisons and
//      `parseInt(req.query.page)` were scattered, so a string where a number was expected either
//      threw or silently became NaN.
//   3. Nothing stopped extra fields. A request could send `{ role: 'Admin' }` to an endpoint that
//      spread req.body into an update, and only the explicit field-picking in each controller
//      stood between that and a privilege escalation.
//   4. index.js had to patch `req.body = {}` globally because controllers destructured it
//      unguarded, which turned a missing body into a 500 rather than a 400.
//
// This middleware validates and REPLACES req.body/req.query/req.params with the parsed result, so
// a controller downstream can trust both the shape and the types. Unknown keys are stripped by
// default (zod objects are non-passthrough), which fixes 3 structurally rather than per-handler.

const { ZodError } = require('zod')

// the error shape the frontend already parses sir — { success, message } plus a `field` so the UI
// can highlight the offending input, matching what the hand-written checks returned
const firstIssue = (error) => {
    const issue = error.issues?.[0]
    if (!issue) return { field: undefined, message: 'Invalid request' }
    return {
        field: issue.path?.join('.') || undefined,
        message: issue.message,
    }
}

/**
 * @param {object} schemas  { body?, query?, params? } — any subset, each a zod schema
 *
 * Usage sir:  router.post('/x', validate({ body: createXSchema }), controller.createX)
 */
const validate = (schemas) => (req, res, next) => {
    try {
        // req.query and req.params are getter-only on Express 5 sir, so the parsed result is
        // assigned onto a plain property rather than replacing the object wholesale
        if (schemas.body) req.body = schemas.body.parse(req.body ?? {})
        if (schemas.query) req.validatedQuery = schemas.query.parse(req.query ?? {})
        if (schemas.params) req.validatedParams = schemas.params.parse(req.params ?? {})
        return next()
    } catch (err) {
        if (err instanceof ZodError) {
            const { field, message } = firstIssue(err)
            return res.status(400).json({
                success: false,
                field,
                message,
                // every issue, for a form that wants to highlight all of them at once sir
                errors: err.issues.map((i) => ({ field: i.path?.join('.') || undefined, message: i.message })),
            })
        }
        return next(err)
    }
}

module.exports = { validate }
