const Settings = require('../Models/Settings')
const { invalidateFeatureFlagCache } = require('./FeatureFlags')
const { logSystemAction } = require('./AdminLog')
const { scheduleJob } = require('./scheduler')

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

// registered once from index.js sir. Runs every 5 minutes — frequent enough that a scheduled
// re-enable feels timely without hammering the DB. Short lease (2 min) to stay well inside that
// interval, since the sweep itself is quick.
const startFeatureFlagCron = () => {
    scheduleJob({
        name: 'feature-flag-reenable',
        schedule: '*/5 * * * *',
        leaseMs: 2 * 60 * 1000,
        task: reEnableDueFlags,
    })
}

module.exports = { startFeatureFlagCron, reEnableDueFlags }
