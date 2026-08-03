const mongoose = require('mongoose')
const logger = require('../utils/logger')
const { supportsTransactions } = require('../utils/withTransaction')

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_DB_URL)
        logger.info('MongoDB connected')

        // BOOT-TIME check sir, so a misconfigured deployment is caught on deploy rather than on
        // the first customer payment. utils/withTransaction.js refuses non-atomic multi-document
        // writes in production; without this check that refusal would first surface as a failed
        // checkout for a real user. Surfacing it here makes it a deploy failure instead, which is
        // the cheap place to find out.
        if (process.env.NODE_ENV === 'production' && !supportsTransactions()) {
            if (process.env.ALLOW_NON_TRANSACTIONAL_WRITES === 'true') {
                logger.warn('MongoDB does not support transactions and ALLOW_NON_TRANSACTIONAL_WRITES is set — payment, credit-spend and account-deletion writes will NOT be atomic on this deployment.')
            } else {
                logger.error('MongoDB deployment does not support transactions (needs a replica set or sharded cluster; Atlas provides this by default). The payment path cannot run safely here. Set ALLOW_NON_TRANSACTIONAL_WRITES=true to start anyway and accept the risk.')
                process.exit(1)
            }
        }
    } catch (error) {
        logger.error('MongoDB connection failed', { err: error })
        process.exit(1)
    }
}

module.exports = connectDB
