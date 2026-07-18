const BASE_URL = import.meta.env.VITE_MAIN_BACKEND_URL

export const FeedbackApi = {
    status: BASE_URL + "/feedback/status",
    submit: BASE_URL + "/feedback"
}
