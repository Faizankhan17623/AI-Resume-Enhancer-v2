import BASE_URL from '../../utils/backendUrl'

export const PaymentData = {
    allplans: BASE_URL + "/payment/plans",
    createorder: BASE_URL + "/payment/create-order",
    verifypayment: BASE_URL + "/payment/verify",
    paymenthistory: BASE_URL + "/payment/history"
}

export const Announcement = {
    activeannouncement: BASE_URL + "/announcements/active"
}
