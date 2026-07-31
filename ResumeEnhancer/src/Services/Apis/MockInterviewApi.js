import BASE_URL from '../../utils/backendUrl'

export const MockInterviewData = {
    start: BASE_URL + "/mock-interview",
    allsessions: BASE_URL + "/mock-interview",
    singlesession: BASE_URL + "/mock-interview",   // + /:sessionId
    answer: BASE_URL + "/mock-interview",          // + /:sessionId/answer
    deletesession: BASE_URL + "/mock-interview"    // + /:sessionId
}
