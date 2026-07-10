// one-off script to promote the FIRST admin sir — after that, promote from the dashboard itself
// usage:  node scripts/makeAdmin.js your@email.com
require('dotenv').config({ quiet: true })
const mongoose = require('mongoose')
const User = require('../Models/User')

const run = async () => {
    const email = process.argv[2]

    if (!email) {
        console.log('Usage: node scripts/makeAdmin.js <email>')
        process.exit(1)
    }

    // same env var the app itself uses in Installation/mongo.js sir
    await mongoose.connect(process.env.MONGO_DB_URL)

    const user = await User.findOneAndUpdate(
        { email: email.toLowerCase().trim() },
        { role: 'Admin' },
        { new: true }
    ).select('firstName lastName email role')

    if (!user) {
        console.log(`No user found with the email ${email} sir — sign them up first`)
    } else {
        console.log(`${user.email} is now an Administrator sir`)
    }

    await mongoose.disconnect()
    process.exit(0)
}

run().catch((err) => {
    console.log(err.message)
    process.exit(1)
})
