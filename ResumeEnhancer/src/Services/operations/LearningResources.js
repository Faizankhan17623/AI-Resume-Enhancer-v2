import { apiConnector } from '../apiConnector.js'
import { logApiError } from '../logApiError.js'
import { LearningResourcesData } from '../Apis/LearningResourcesApi.js'

// "find real courses" lookup sir, per 2026-11-16 audit — Dashboard/Report.jsx's
// LearningResourceFinder used to call apiConnector directly. No operations file existed for
// this domain despite LearningResourcesApi.js (the URL constants) and a real backend route
// already existing.
export async function SearchLearningResources(query, token) {
    try {
        const response = await apiConnector('POST', LearningResourcesData.search, { query }, {
            Authorization: `Bearer ${token}`
        })
        if (!response.data.success) {
            throw new Error(response.data.message)
        }
        return response.data.results || []
    } catch (error) {
        logApiError('Error finding learning resources', error)
        throw error
    }
}
