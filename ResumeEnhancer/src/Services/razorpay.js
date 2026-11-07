// shared by Services/operations/Payment.js and RecruiterPayment.js sir — was duplicated
// identically in both until the 2026-11-08 audit flagged it
export function loadRazorpayScript() {
    return new Promise((resolve) => {
        if (window.Razorpay) return resolve(true)
        const script = document.createElement("script")
        script.src = "https://checkout.razorpay.com/v1/checkout.js"
        script.onload = () => resolve(true)
        script.onerror = () => resolve(false)
        document.body.appendChild(script)
    })
}
