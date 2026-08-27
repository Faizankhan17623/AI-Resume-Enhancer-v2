import BASE_URL from '../../utils/backendUrl'

// completely separate from PaymentApi.js sir — the Recruiter plan system never shares a code
// path with the User plan system, see Backend/controllers/RecruiterPayment.js
export const RecruiterPaymentData = {
    allplans: BASE_URL + "/recruiter/payment/plans",
    createorder: BASE_URL + "/recruiter/payment/create-order",
    verifypayment: BASE_URL + "/recruiter/payment/verify",
    paymenthistory: BASE_URL + "/recruiter/payment/history",
}
