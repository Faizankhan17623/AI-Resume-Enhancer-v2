const cron = require('node-cron')
const User = require('../Models/User')
const Chat = require('../Models/Chat')
const Review = require('../Models/Review')

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

        await User.findByIdAndDelete(user._id)
        await Promise.all([
            Chat.deleteMany({ user: user._id }),
            Review.deleteMany({ user: user._id }),
        ])
        console.log(`Purged expired account: ${user.email}`)
    }
}

// registered once from index.js sir, guarded by NODE_ENV !== 'test' same as the streak cron
// runs once a day at 03:00 UTC — quiet hours, well clear of the streak/digest crons
const startAccountPurgeCron = () => {
    cron.schedule('0 3 * * *', async () => {
        try {
            await purgeExpiredAccounts()
        } catch (err) {
            console.log('Account purge cron failed:', err.message)
        }
    })
}

module.exports = { startAccountPurgeCron, purgeExpiredAccounts }
