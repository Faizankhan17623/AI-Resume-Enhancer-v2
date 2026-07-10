const BASE_URL = import.meta.env.VITE_MAIN_BACKEND_URL

export const CoverLetterData = {
    generate: BASE_URL + "/cover-letter",
    all: BASE_URL + "/cover-letter",
    single: BASE_URL + "/cover-letter"           // + /:coverLetterId
}
