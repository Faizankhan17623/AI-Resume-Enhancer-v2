const cron = require('node-cron')
const Settings = require('../Models/Settings')
const { invalidateFeatureFlagCache } = require('./FeatureFlags')
const { logSystemAction } = require('./AdminLog')

// finds flags an admin scheduled a re-enable for, and whose time has come sir —
// clears note/disabledUntil on the way back on, matching manual re-enable behavior
const reEnableDueFlags = async () => {
    const due = await Settings.find({ enabled: false, disabledUntil: { $lte: new Date() } })

    for (const setting of due) {
        setting.enabled = true
        setting.note = ''
        setting.disabledUntil = undefined
        await setting.save()

        invalidateFeatureFlagCache(setting.key)
        logSystemAction('FEATURE_AUTO_REENABLE', {}, { key: setting.key })
    }
}

// registered once from index.js sir, guarded by NODE_ENV !== 'test' same as the other crons.
// runs every 5 minutes — frequent enough that a scheduled re-enable feels timely without
// hammering the DB.
const startFeatureFlagCron = () => {
    cron.schedule('*/5 * * * *', async () => {
        try {
            await reEnableDueFlags()
        } catch (err) {
            console.log('feature flag cron failed:', err.message)
        }
    })
}

module.exports = { startFeatureFlagCron }
