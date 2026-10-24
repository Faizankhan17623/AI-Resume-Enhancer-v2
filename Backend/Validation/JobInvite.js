// Job invite schemas sir — see Models/JobInvite.js and controllers/JobInvite.js

const { z } = require('zod')

// recruiter inviting one email to an invite_only job sir
const sendJobInviteSchema = z.object({
    email: z.string().trim().toLowerCase().email({ error: 'Enter a valid email address' }).max(254),
})

module.exports = {
    sendJobInviteSchema,
}
