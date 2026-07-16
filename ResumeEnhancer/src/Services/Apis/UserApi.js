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

export const Password = {
    forgotpassword: BASE_URL + "/forgot-password",
    resetpassword: BASE_URL + "/reset-password",
    changepassword: BASE_URL + "/change-password"
}

export const Profile = {
    getprofile: BASE_URL + "/profile",
    updatenotifications: BASE_URL + "/profile/notifications",
    completeonboarding: BASE_URL + "/profile/onboarding"
}
