const BASE_URL = import.meta.env.VITE_MAIN_BACKEND_URL

export const ResumeData = {
    save: BASE_URL + "/resumes",
    all: BASE_URL + "/resumes",
    update: BASE_URL + "/resumes",             // + /:resumeId
    remove: BASE_URL + "/resumes",              // + /:resumeId
    reviewFromResume: BASE_URL + "/response/from-resume"   // + /:resumeId
}
