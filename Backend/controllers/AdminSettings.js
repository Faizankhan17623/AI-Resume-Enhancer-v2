const Settings = require('../Models/Settings')
const { logAction } = require('../utils/AdminLog')
const { invalidateFeatureFlagCache } = require('../utils/FeatureFlags')

// the keys the admin UI is allowed to create/toggle sir — keeps this from becoming a
// free-form KV store; add a new key here when a controller gets a new gate
const KNOWN_KEYS = ['feature.review', 'feature.coverLetter', 'feature.jobSearch']

// GET /admin/settings sir — the known keys, defaulting missing ones to enabled so the UI
// always shows every togglable feature even before it's ever been touched
exports.getSettings = async (req, res) => {
    try {
        const existing = await Settings.find({ key: { $in: KNOWN_KEYS } })
        const byKey = new Map(existing.map((s) => [s.key, s]))

        const settings = KNOWN_KEYS.map((key) => {
            const doc = byKey.get(key)
            return {
                key,
                enabled: doc ? doc.enabled : true,
                note: doc?.note || '',
                updatedAt: doc?.updatedAt || null,
            }
        })

        return res.status(200).json({
            success: true,
            settings,
        })
    } catch (error) {
        console.log(error)
        console.log(error.message)
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while getting the settings',
        })
    }
}

// PATCH /admin/settings/:key sir — body { enabled, note }
exports.upsertSetting = async (req, res) => {
    try {
        const adminId = req?.User.id
        const { key } = req.params
        const { enabled, note } = req.body

        if (!KNOWN_KEYS.includes(key)) {
            return res.status(400).json({
                success: false,
                message: 'Unknown setting key',
            })
        }

        if (typeof enabled !== 'boolean') {
            return res.status(400).json({
                success: false,
                message: 'enabled must be true or false',
            })
        }

        const setting = await Settings.findOneAndUpdate(
            { key },
            { key, enabled, note: note || '' },
            { new: true, upsert: true }
        )

        invalidateFeatureFlagCache(key)
        logAction(adminId, 'SETTING_CHANGE', null, { key, enabled, note })

        return res.status(200).json({
            success: true,
            message: `${key} is now ${enabled ? 'enabled' : 'disabled'}`,
            setting,
        })
    } catch (error) {
        console.log(error)
        console.log(error.message)
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while updating the setting',
        })
    }
}
