import BASE_URL from '../../utils/backendUrl'

// same lightweight "plain object of URLs, apiConnector called directly, no Redux thunk" pattern
// as CareerApi.js sir — this feature's own state (proposed slots, confirm/cancel) is simple
// enough that a dedicated slice/thunk pair would be pure boilerplate over what useState already
// covers in the two pages that use this.
export const InterviewApi = {
  myInterviews: `${BASE_URL}/interviews/mine`,
  confirmSlot: `${BASE_URL}/interviews`,          // + /:scheduleId/confirm
  cancelInterview: `${BASE_URL}/interviews`,      // + /:scheduleId/cancel
  scheduleInterview: `${BASE_URL}/job-applications`, // + /:applicationId/schedule-interview
  getInterviewForApplication: `${BASE_URL}/job-applications`, // + /:applicationId/interview
}
