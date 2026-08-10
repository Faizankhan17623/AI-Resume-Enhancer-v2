import BASE_URL from '../../utils/backendUrl'

export const TestData = {
    // recruiter management
    createTest: BASE_URL + "/tests",
    listMyTests: BASE_URL + "/tests",
    getTest: BASE_URL + "/tests",              // + /:testId
    updateTest: BASE_URL + "/tests",           // + /:testId
    publishTest: BASE_URL + "/tests",          // + /:testId/publish
    getTestAttempts: BASE_URL + "/tests",      // + /:testId/attempts
    getAttemptDetail: BASE_URL + "/test-attempts", // + /:attemptId

    // candidate attempt flow
    startAttempt: BASE_URL + "/test-attempts/start", // + /:inviteCode
    submitAnswers: BASE_URL + "/test-attempts",      // + /:attemptId/answers
    logViolation: BASE_URL + "/test-attempts",       // + /:attemptId/violations
}
