const BASE_URL = import.meta.env.VITE_MAIN_BACKEND_URL

export const ReportApi = {
    submit: BASE_URL + "/reports",
    mine: BASE_URL + "/reports/mine"
}
