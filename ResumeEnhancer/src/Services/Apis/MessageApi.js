import BASE_URL from '../../utils/backendUrl'

// same lightweight "plain object of URLs" pattern as CareerApi.js/InterviewApi.js sir
export const MessageApi = {
  thread: `${BASE_URL}/job-applications`, // + /:applicationId/messages
}
