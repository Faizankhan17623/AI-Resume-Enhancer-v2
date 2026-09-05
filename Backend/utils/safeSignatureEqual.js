const crypto = require('crypto')

// constant-time hex-signature comparison sir — plain `===`/`!==` on the two hex strings leaks
// timing information proportional to how many leading bytes match, which is the textbook setup
// for a timing side-channel attack against an HMAC signature check. crypto.timingSafeEqual()
// closes that, but it throws if the two buffers differ in length (which garbage/forged input
// easily can) — that mismatch itself is safe to bail out on early since it needs no timing
// protection: a wrong-length signature can never be the real one no matter how fast we reject it.
const safeSignatureEqual = (expectedHex, receivedHex) => {
    if (typeof receivedHex !== 'string' || typeof expectedHex !== 'string') return false

    const expected = Buffer.from(expectedHex, 'hex')
    const received = Buffer.from(receivedHex, 'hex')
    if (expected.length === 0 || received.length !== expected.length) return false

    return crypto.timingSafeEqual(expected, received)
}

module.exports = { safeSignatureEqual }
