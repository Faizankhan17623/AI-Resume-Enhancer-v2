const BASE_URL = import.meta.env.VITE_MAIN_BACKEND_URL

export const BuiltResumeData = {
    create: BASE_URL + "/built-resumes",
    all: BASE_URL + "/built-resumes",
    single: BASE_URL + "/built-resumes",         // + /:resumeId
    update: BASE_URL + "/built-resumes",         // + /:resumeId
    remove: BASE_URL + "/built-resumes",          // + /:resumeId
    generate: BASE_URL + "/built-resumes/generate",
    tailor: BASE_URL + "/built-resumes/tailor",
    review: BASE_URL + "/built-resumes",          // + /:resumeId/review
}
