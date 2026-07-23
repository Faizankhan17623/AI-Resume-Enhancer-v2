const BASE_URL = import.meta.env.VITE_MAIN_BACKEND_URL

export const ApplicationData = {
    create: BASE_URL + "/applications",
    all: BASE_URL + "/applications",
    update: BASE_URL + "/applications",   // + /:applicationId
    remove: BASE_URL + "/applications",   // + /:applicationId
}
