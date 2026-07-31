import BASE_URL from '../../utils/backendUrl'

export const ApplicationData = {
    create: BASE_URL + "/applications",
    all: BASE_URL + "/applications",
    update: BASE_URL + "/applications",   // + /:applicationId
    remove: BASE_URL + "/applications",   // + /:applicationId
    analytics: BASE_URL + "/applications/analytics",
}
