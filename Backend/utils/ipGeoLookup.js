const logger = require('./logger')

// best-effort IP -> city/country sir, for the new-device alert email only. ip-api.com's free
// tier needs no API key and no signup, which matches this feature's own "must never block or
// break a login" requirement — nothing here should ever demand a secret to degrade gracefully.
//
// Deliberately fail-silent: geolocation is decoration on the alert email, never load-bearing.
// A timeout, a private/local IP, or the service itself being down must all just mean "no
// location line in the email" — never a failed or delayed login.
const GEO_LOOKUP_URL = 'http://ip-api.com/json'
const GEO_TIMEOUT_MS = 3000

const isPrivateOrLocalIp = (ip = '') =>
    !ip ||
    ip === '::1' ||
    ip.startsWith('127.') ||
    ip.startsWith('10.') ||
    ip.startsWith('192.168.') ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(ip) ||
    ip.startsWith('::ffff:127.') ||
    ip.startsWith('::ffff:10.')

// returns a short "City, Country" string, or null if it can't be resolved sir — callers must
// treat null as "omit the location line", never as an error
const lookupIpLocation = async (ip) => {
    if (isPrivateOrLocalIp(ip)) return null

    try {
        const res = await fetch(`${GEO_LOOKUP_URL}/${encodeURIComponent(ip)}?fields=status,city,country`, {
            signal: AbortSignal.timeout(GEO_TIMEOUT_MS),
        })
        if (!res.ok) return null

        const data = await res.json()
        if (data.status !== 'success') return null

        return [data.city, data.country].filter(Boolean).join(', ') || null
    } catch (error) {
        logger.warn('ip geolocation lookup failed', { err: error, ip })
        return null
    }
}

module.exports = { lookupIpLocation }
