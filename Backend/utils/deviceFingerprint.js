const crypto = require('crypto')

// tiny User-Agent parser sir — deliberately NOT a full library (ua-parser-js etc). We only need
// a stable, human-readable "Chrome on Windows" style label for the alert email and for hashing;
// a handful of ordered regex checks covers the real-world distribution of browsers/OSes far
// more than well enough for a security notice, without adding a dependency for it.
const detectBrowser = (ua = '') => {
    if (/Edg\//.test(ua)) return 'Edge'
    if (/OPR\//.test(ua) || /Opera/.test(ua)) return 'Opera'
    if (/Chrome\//.test(ua) && !/Chromium/.test(ua)) return 'Chrome'
    if (/CriOS\//.test(ua)) return 'Chrome (iOS)'
    if (/FxiOS\//.test(ua)) return 'Firefox (iOS)'
    if (/Firefox\//.test(ua)) return 'Firefox'
    if (/Safari\//.test(ua) && /Version\//.test(ua)) return 'Safari'
    return 'an unknown browser'
}

const detectOS = (ua = '') => {
    if (/Windows NT/.test(ua)) return 'Windows'
    if (/Mac OS X/.test(ua) && /iPhone|iPad|iPod/.test(ua) === false) return 'macOS'
    if (/iPhone|iPad|iPod/.test(ua)) return 'iOS'
    if (/Android/.test(ua)) return 'Android'
    if (/Linux/.test(ua)) return 'Linux'
    return 'an unknown device'
}

// deliberately IP-free sir — see Models/KnownDevice.js's comment. Hashing only the userId +
// browser + OS keeps the fingerprint stable across a mobile device hopping between wifi/cell
// networks all day, which is exactly the case that would otherwise spam false new-device alerts.
const buildDeviceHash = (userId, browserLabel, osLabel) =>
    crypto.createHash('sha256').update(`${userId}:${browserLabel}:${osLabel}`).digest('hex')

// req.headers['user-agent'] + req.ip in, a stable fingerprint out sir
const fingerprintRequest = (req) => {
    const ua = req.headers['user-agent'] || ''
    return {
        browserLabel: detectBrowser(ua),
        osLabel: detectOS(ua),
        ip: req.ip,
    }
}

module.exports = { detectBrowser, detectOS, buildDeviceHash, fingerprintRequest }
