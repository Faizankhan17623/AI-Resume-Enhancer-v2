const logger = require('./logger')

// best-effort IP -> city/country sir, for the new-device alert email only. geo.ipify.org (per
// direct request, swapped from ip-api.com), called server-side against req.ip — the real,
// server-detected client IP, never anything the browser self-reports (see deviceFingerprint.js's
// own header comment on why User-Agent header parsing is used instead of navigator.userAgent for
// the same reason: client-reported data is trivially spoofable by exactly the attacker this
// alert exists to catch, so nothing in this whole feature ever trusts navigator.*).
//
// Deliberately fail-silent: geolocation is decoration on the alert email, never load-bearing.
// A timeout, a private/local IP, a missing API key, or the service itself being down must all
// just mean "no location line in the email" — never a failed or delayed login.
const GEO_LOOKUP_URL = 'https://geo.ipify.org/api/v2/country,city'
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
    if (!process.env.IPIFY_API_KEY) return null

    try {
        const url = `${GEO_LOOKUP_URL}?apiKey=${process.env.IPIFY_API_KEY}&ipAddress=${encodeURIComponent(ip)}`
        const res = await fetch(url, {
            signal: AbortSignal.timeout(GEO_TIMEOUT_MS),
        })
        if (!res.ok) return null

        const data = await res.json()
        const city = data?.location?.city
        const country = data?.location?.country
        return [city, country].filter(Boolean).join(', ') || null
    } catch (error) {
        logger.warn('ip geolocation lookup failed', { err: error, ip })
        return null
    }
}

module.exports = { lookupIpLocation }
