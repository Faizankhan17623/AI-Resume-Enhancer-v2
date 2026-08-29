import toast from "react-hot-toast";
import { apiConnector } from '../apiConnector.js'
import { logApiError } from '../logApiError.js'
import { setPlans, setHistory, setLoading } from '../../Slices/paymentSlice.js'
import { setUser } from '../../Slices/authSlice.js'
import { PaymentData } from '../Apis/PaymentApi.js'

const { allplans, createorder, verifypayment, paymenthistory } = PaymentData

// loads the razorpay checkout script once sir
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

export function GetAllPlans() {
    return async (dispatch) => {
        dispatch(setLoading(true))
        try {
            const response = await apiConnector("GET", allplans)

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            dispatch(setPlans(response.data.plans))
        } catch (error) {
            logApiError("Error fetching the plans", error)
        } finally {
            dispatch(setLoading(false))
        }
    }
}

// the full purchase flow sir — order → razorpay checkout → verify (the payment-session cookie rides along)
// returns a promise that resolves once the razorpay window is open (or the setup step failed) sir,
// so the caller's `buying` state only needs to stay true for THIS setup phase — not the whole
// checkout, which can otherwise sit open for minutes waiting on the user to pay
export function BuyPlan(plan, token, user, navigate, onLoadingChange, billingCycle = 'monthly') {
    return async (dispatch) => {
        onLoadingChange?.(true, "Setting up the payment...")
        try {
            const scriptLoaded = await loadRazorpayScript()
            if (!scriptLoaded) {
                throw new Error("Could not load the payment window, check your connection")
            }

            // create the order sir — this also sets the 30-minute payment session cookie
            const orderResponse = await apiConnector("POST", createorder, { plan, billingCycle }, {
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
                name: "Resumify",
                description: `${plan} plan purchase`,
                prefill: {
                    name: `${user?.firstName || ''} ${user?.lastName || ''}`,
                    email: user?.email || ''
                },
                theme: { color: "#FFD60A" },
                handler: async function (razorpayResponse) {
                    // verify on our server sir — signature + the session cookie must both match
                    onLoadingChange?.(true, "Verifying your payment...")
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

                        // keep the navbar plan badge fresh sir — the reducer persists the cache
                        // itself now (see Slices/authSlice.js), so there is no separate
                        // localStorage write here that could fall out of step with redux
                        dispatch(setUser({ ...user, SubType: verifyResponse.data.plan }))

                        if (navigate) navigate("/Dashboard")
                    } catch (error) {
                        logApiError("Error verifying the payment", error)
                        toast.error(error?.response?.data?.message || "Payment verification failed")
                    } finally {
                        onLoadingChange?.(false)
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
            onLoadingChange?.(false)
        }
    }
}

export function GetPaymentHistory(token) {
    return async (dispatch) => {
        try {
            const response = await apiConnector("GET", paymenthistory, null, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            dispatch(setHistory(response.data.payments))
        } catch (error) {
            logApiError("Error fetching the payment history", error)
        }
    }
}
