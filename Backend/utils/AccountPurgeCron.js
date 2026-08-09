const User = require('../Models/User')
const Chat = require('../Models/Chat')
const Review = require('../Models/Review')
const { logSystemAction } = require('./AdminLog')
const { scheduleJob } = require('./scheduler')
const { withTransaction } = require('./withTransaction')
const logger = require('./logger')

// permanently deletes accounts whose 2-day recovery window (see deleteAccount/loginUser in
// controllers/user.js) has passed sir — same cascade scope as the admin dashboard's manual
// delete (Admin.js deleteUser): Chat + Review only, Payment/Resume/BuiltResume/CoverLetter
// records are kept
const purgeExpiredAccounts = async () => {
    // BufferTiming is stored as dd/mm/yy sir (see deleteAccount) — pull every buffered user
    // and check each one in JS since the stored format isn't a queryable Date field
    const buffered = await User.find({ Buffer: true }).select('_id email BufferTiming')

    for (const user of buffered) {
        if (!user.BufferTiming) continue

        const [dd, mm, yy] = user.BufferTiming.split('/')
        const deletionDate = new Date(2000 + Number(yy), Number(mm) - 1, Number(dd))

        if (Date.now() <= deletionDate.getTime()) continue

        // one transaction sir — deleting the User doc before its Chat/Review docs meant a crash
        // in between permanently orphaned them: the purge query only finds users that STILL
        // EXIST, so once the User doc was gone nothing would ever revisit those records again.
        await withTransaction(async (session) => {
            await Chat.deleteMany({ user: user._id }).session(session)
            await Review.deleteMany({ user: user._id }).session(session)
            await User.findByIdAndDelete(user._id).session(session)
        })
        logger.info('purged expired account', { email: user.email })
        logSystemAction('ACCOUNT_PURGED', { email: user.email }, { scheduledFor: user.BufferTiming })
    }
}

// registered once from index.js sir — 03:00 UTC daily, quiet hours and well clear of the
// streak/digest crons. The lease matters MOST here: this permanently deletes accounts, and two
// instances sweeping concurrently would race each other over the same records.
const startAccountPurgeCron = () => {
    scheduleJob({
        name: 'account-purge',
        schedule: '0 3 * * *',
        leaseMs: 15 * 60 * 1000,
        task: purgeExpiredAccounts,
    })
}

module.exports = { startAccountPurgeCron, purgeExpiredAccounts }
