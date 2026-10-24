// The request schemas sir — one file per area, named after the Mongoose model / domain it
// validates (Auth.js, User.js, Job.js, JobApplication.js, ...), exactly like Models/.
//
// This file is only the single import point: routes keep doing
//     const { loginSchema } = require('../Validation/schemas.js')
// so splitting the schemas into files never touched a route or a controller. To add a schema,
// put it in the file for its area (or a new file) and re-export it here.
//
// Rules shared by several files (phone number, password policy, plan keys, pagination, ObjectId)
// live once in Shared.js.
//
// Deliberately NOT exhaustive: this covers the surfaces where the hand-written checks were
// densest and where a mistake is most costly. The `validate` middleware is the extension point
// for the rest, added route by route.

const shared = require('./Shared')

module.exports = {
    // primitives, exported so new schemas reuse the same rules sir
    email: shared.email,
    phoneNumber: shared.phoneNumber,
    password: shared.password,
    objectId: shared.objectId,
    planKey: shared.planKey,
    pagination: shared.pagination,

    ...require('./Auth'),
    ...require('./User'),
    ...require('./Payment'),
    ...require('./Admin'),
    ...require('./CannedResponse'),
    ...require('./Test'),
    ...require('./Job'),
    ...require('./JobApplication'),
    ...require('./JobInvite'),
    ...require('./RecruiterAI'),
    ...require('./RecruiterApplication'),
    ...require('./Career'),
    ...require('./InterviewSchedule'),
    ...require('./MessageThread'),
    ...require('./JobAlert'),
}
