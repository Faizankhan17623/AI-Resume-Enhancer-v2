const Razorpay = require('razorpay');

// one shared razorpay instance for the whole app sir
const RazorpayInstance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

module.exports = RazorpayInstance;