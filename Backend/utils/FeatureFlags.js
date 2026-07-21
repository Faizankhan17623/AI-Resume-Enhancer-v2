const Settings = require('../Models/Settings')

// short in-process cache sir — an AI controller checks this on every request, so we don't
// want a DB round-trip per call; 30s is short enough that an admin toggle takes effect fast
const CACHE_TTL_MS = 30 * 1000
const cache = new Map() // key -> { enabled, expiresAt }

// fail-open sir — a key with no Settings doc (never toggled, or the toggle was deleted)
// must behave exactly like the feature always did: enabled
const isFeatureEnabled = async (key) => {
    const cached = cache.get(key)
    if (cached && cached.expiresAt > Date.now()) {
        return cached.enabled
    }

    const setting = await Settings.findOne({ key }).select('enabled')
    const enabled = setting ? setting.enabled : true

    cache.set(key, { enabled, expiresAt: Date.now() + CACHE_TTL_MS })
    return enabled
}

// call this right after an admin write so the change is visible immediately instead of
// waiting out the cache TTL sir
const invalidateFeatureFlagCache = (key) => {
    cache.delete(key)
}

module.exports = { isFeatureEnabled, invalidateFeatureFlagCache }
