import BASE_URL from '../../utils/backendUrl'

export const RecruiterAiData = {
    jobDescription: BASE_URL + "/recruiter-ai/job-description",
    interviewQuestions: BASE_URL + "/recruiter-ai/interview-questions",
    candidateSummary: BASE_URL + "/recruiter-ai/applications", // + /:applicationId/summary
}
