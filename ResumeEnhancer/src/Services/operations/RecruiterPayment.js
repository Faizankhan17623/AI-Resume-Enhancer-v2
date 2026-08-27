import toast from "react-hot-toast";
import { apiConnector } from '../apiConnector.js'
import { logApiError } from '../logApiError.js'
import { setUser } from '../../Slices/authSlice.js'
import { RecruiterPaymentData } from '../Apis/RecruiterPaymentApi.js'

// completely separate from Services/operations/Payment.js sir — same Razorpay checkout mechanics
// (own script-load helper, own order/verify calls), but this dispatches setUser with
// recruiterPlan, NEVER SubType — the two plan systems must never share a Redux write path either

const { allplans, createorder, verifypayment, paymenthistory } = RecruiterPaymentData

function loadRazorpayScript() {
    return new Promise((resolve) => {
        if (window.Razorpay) return resolve(true)
        const script = document.createElement("script")
        script.src = "https://checkout.razorpay.com/v1/checkout.js"
        script.onload = () => resolve(true)
        script.onerror = () => resolve(false)
        document.body.appendChild(script)
    })
}

export function GetAllRecruiterPlans() {
    return async () => {
        try {
            const response = await apiConnector("GET", allplans)

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            return response.data.plans
        } catch (error) {
            logApiError("Error fetching the recruiter plans", error)
            return []
        }
    }
}

export function BuyRecruiterPlan(plan, token, user, onSuccess) {
    return async (dispatch) => {
        const toastId = toast.loading("Setting up the payment...")
        try {
            const scriptLoaded = await loadRazorpayScript()
            if (!scriptLoaded) {
                throw new Error("Could not load the payment window, check your connection")
            }

            const orderResponse = await apiConnector("POST", createorder, { plan }, {
                Authorization: `Bearer ${token}`
            })

            if (!orderResponse.data.success) {
                throw new Error(orderResponse.data.message)
            }

            const { order, key } = orderResponse.data

            const options = {
                key,
                amount: order.amount,
                currency: order.currency,
                order_id: order.id,
                name: "Resumify Recruiter",
                description: `Recruiter ${plan} plan purchase`,
                prefill: {
                    name: `${user?.firstName || ''} ${user?.lastName || ''}`,
                    email: user?.email || ''
                },
                theme: { color: "#FFD60A" },
                handler: async function (razorpayResponse) {
                    const verifyToast = toast.loading("Verifying your payment...")
                    try {
                        const verifyResponse = await apiConnector("POST", verifypayment, {
                            razorpay_order_id: razorpayResponse.razorpay_order_id,
                            razorpay_payment_id: razorpayResponse.razorpay_payment_id,
                            razorpay_signature: razorpayResponse.razorpay_signature
                        }, {
                            Authorization: `Bearer ${token}`
                        })

                        if (!verifyResponse.data.success) {
                            throw new Error(verifyResponse.data.message)
                        }

                        toast.success(verifyResponse.data.message)

                        // recruiterPlan ONLY sir — never SubType, that's the User plan field
                        dispatch(setUser({ ...user, recruiterPlan: verifyResponse.data.plan }))

                        if (onSuccess) onSuccess()
                    } catch (error) {
                        logApiError("Error verifying the payment", error)
                        toast.error(error?.response?.data?.message || "Payment verification failed")
                    } finally {
                        toast.dismiss(verifyToast)
                    }
                }
            }

            const razorpayWindow = new window.Razorpay(options)
            razorpayWindow.on("payment.failed", function () {
                toast.error("The payment failed, you have not been charged")
            })
            razorpayWindow.open()
        } catch (error) {
            logApiError("Error starting the payment", error)
            toast.error(error?.response?.data?.message || "Could not start the payment")
        } finally {
            toast.dismiss(toastId)
        }
    }
}

export function GetRecruiterPaymentHistory(token) {
    return async () => {
        try {
            const response = await apiConnector("GET", paymenthistory, null, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            return response.data.payments
        } catch (error) {
            logApiError("Error fetching the recruiter payment history", error)
            return []
        }
    }
}
