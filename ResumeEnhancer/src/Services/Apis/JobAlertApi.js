import BASE_URL from '../../utils/backendUrl'

export const JobAlertApi = {
  list: `${BASE_URL}/job-alerts`,
  create: `${BASE_URL}/job-alerts`,
  update: `${BASE_URL}/job-alerts`, // + /:alertId
  remove: `${BASE_URL}/job-alerts`, // + /:alertId
}
