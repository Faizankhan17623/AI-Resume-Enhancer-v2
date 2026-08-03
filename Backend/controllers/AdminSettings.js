const Settings = require('../Models/Settings')
const logger = require('../utils/logger')
const { logAction } = require('../utils/AdminLog')
const { invalidateFeatureFlagCache } = require('../utils/FeatureFlags')

// the keys the admin UI is allowed to create/toggle sir — keeps this from becoming a
// free-form KV store; add a new key here when a controller gets a new gate
const KNOWN_KEYS = ['feature.review', 'feature.coverLetter', 'feature.jobSearch', 'feature.learningResources', 'feature.mockInterview']

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
                disabledUntil: doc?.disabledUntil || null,
                updatedAt: doc?.updatedAt || null,
            }
        })

        return res.status(200).json({
            success: true,
            settings,
        })
    } catch (error) {
        (req.log || logger).error('get settings failed', { err: error })
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while getting the settings',
        })
    }
}

// PATCH /admin/settings/:key sir — body { enabled, note, disabledUntil }
exports.upsertSetting = async (req, res) => {
    try {
        const adminId = req?.User.id
        const { key } = req.params
        const { enabled, note, disabledUntil } = req.body

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

        const existing = await Settings.findOne({ key }).select('enabled')
        const wasEnabled = existing ? existing.enabled : true
        const update = { key, enabled }

        if (enabled === false) {
            // only require a reason + future re-enable time on the actual ON->OFF transition sir —
            // while already off, an admin can keep adjusting note/disabledUntil freely below
            if (wasEnabled) {
                if (!note || !note.trim()) {
                    return res.status(400).json({
                        success: false,
                        message: 'A reason is required when disabling a feature',
                    })
                }
                if (!disabledUntil || Number.isNaN(new Date(disabledUntil).getTime()) || new Date(disabledUntil) <= new Date()) {
                    return res.status(400).json({
                        success: false,
                        message: 'Re-enable date/time must be in the future',
                    })
                }
            }
            update.note = note || ''
            if (disabledUntil !== undefined) {
                if (disabledUntil === null) {
                    update.disabledUntil = null
                } else if (!Number.isNaN(new Date(disabledUntil).getTime()) && new Date(disabledUntil) > new Date()) {
                    update.disabledUntil = disabledUntil
                } else {
                    return res.status(400).json({
                        success: false,
                        message: 'Re-enable date/time must be in the future',
                    })
                }
            }
        } else {
            // manually re-enabling supersedes any schedule sir
            update.note = note || ''
            update.disabledUntil = null
        }

        const setting = await Settings.findOneAndUpdate(
            { key },
            update,
            { new: true, upsert: true }
        )

        invalidateFeatureFlagCache(key)
        logAction(adminId, 'SETTING_CHANGE', null, { key, enabled, note: update.note, disabledUntil: update.disabledUntil })

        return res.status(200).json({
            success: true,
            message: `${key} is now ${enabled ? 'enabled' : 'disabled'}`,
            setting,
        })
    } catch (error) {
        (req.log || logger).error('upsert setting failed', { err: error })
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while updating the setting',
        })
    }
}
