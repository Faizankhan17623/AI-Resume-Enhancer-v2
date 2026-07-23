const BASE_URL = import.meta.env.VITE_MAIN_BACKEND_URL

export const CreateUser = {
    createuser: BASE_URL + "/Createuser"
}

export const SendOtp = {
    createotp: BASE_URL + "/Send-otp"
}

export const Login = {
    login: BASE_URL + "/Login"
}

export const OAuth = {
    // full-page redirects sir — each button just navigates the browser here
    google: BASE_URL + "/auth/google",
    facebook: BASE_URL + "/auth/facebook",
    github: BASE_URL + "/auth/github",
    linkedin: BASE_URL + "/auth/linkedin",
    // OAuthComplete.jsx POSTs to the matching one of these to trade the one-time code for
    // the real token, body-only — keyed by the ?provider= query param on the redirect back
    exchange: {
        google: BASE_URL + "/auth/google/exchange",
        facebook: BASE_URL + "/auth/facebook/exchange",
        github: BASE_URL + "/auth/github/exchange",
        linkedin: BASE_URL + "/auth/linkedin/exchange",
    }
}

export const Password = {
    forgotpassword: BASE_URL + "/forgot-password",
    resetpassword: BASE_URL + "/reset-password",
    changepassword: BASE_URL + "/change-password"
}

export const Account = {
    deleteaccount: BASE_URL + "/delete-account"
}

export const Profile = {
    getprofile: BASE_URL + "/profile",
    updatenotifications: BASE_URL + "/profile/notifications",
    completeonboarding: BASE_URL + "/profile/onboarding",
    updatefirstname: BASE_URL + "/profile/first-name",
    updatelastname: BASE_URL + "/profile/last-name",
    updateemail: BASE_URL + "/profile/email",
    updatenumber: BASE_URL + "/profile/number",
    exportdata: BASE_URL + "/profile/export"
}

export const Notifications = {
    list: BASE_URL + "/notifications",
    unreadcount: BASE_URL + "/notifications/unread-count",
    readall: BASE_URL + "/notifications/read-all",
    markread: BASE_URL + "/notifications"   // + /:notificationId/read
}
