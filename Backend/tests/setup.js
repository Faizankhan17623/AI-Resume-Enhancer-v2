process.env.NODE_ENV = 'test'
process.env.JWT_PRIVATE_KEY = process.env.JWT_PRIVATE_KEY || 'test-jwt-secret'
process.env.RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || 'rzp_test_dummy'
process.env.RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || 'test-razorpay-secret'
process.env.CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || 'test-cloud'
process.env.CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY || 'test-key'
process.env.CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET || 'test-secret'

const mongoose = require('mongoose')
const { MongoMemoryServer } = require('mongodb-memory-server')

let mongod

beforeAll(async () => {
    mongod = await MongoMemoryServer.create()
    await mongoose.connect(mongod.getUri())
}, 60000)

afterEach(async () => {
    const { collections } = mongoose.connection
    for (const key in collections) {
        await collections[key].deleteMany({})
    }
})

afterAll(async () => {
    await mongoose.disconnect()
    if (mongod) await mongod.stop()
})
