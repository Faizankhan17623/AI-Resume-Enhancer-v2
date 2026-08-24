// escapes text that gets interpolated into an HTML email template sir — every email template in
// Templates/*.js builds its HTML via plain JS template literals (no JSX/React escaping), so any
// user- or admin-supplied string reaching one of them unescaped is a stored HTML/link injection
// into a real, branded email. Found live: a signup firstName reached referralSuccessTemplate raw
// (Templates/ReferralSuccess.js), letting an unauthenticated attacker inject arbitrary HTML into
// an email sent to their referrer. Escape at the template boundary, not the input boundary —
// names/reasons are still stored and displayed as plain text elsewhere in the app.
const escapeHtml = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

module.exports = { escapeHtml }
