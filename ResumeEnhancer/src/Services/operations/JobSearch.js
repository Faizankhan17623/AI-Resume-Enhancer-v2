import toast from "react-hot-toast";
import { apiConnector } from '../apiConnector.js'
import { setJobs, setLastQuery, setSearching } from '../../Slices/jobSearchSlice.js'
import { JobSearchData } from '../Apis/JobSearchApi.js'

const { search } = JobSearchData

// searches the live web via Tavily for real job postings matching the query sir — Pro+ feature
export function SearchJobs(query, token) {
    return async (dispatch) => {
        dispatch(setSearching(true))
        const toastId = toast.loading("Searching the web for matching jobs...")
        try {
            const response = await apiConnector("POST", search, { query }, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            dispatch(setJobs(response.data.jobs))
            dispatch(setLastQuery(query))

            if (response.data.jobs.length === 0) {
                toast("No matching jobs found, try a different search", { icon: '🔍' })
            } else {
                toast.success(`Found ${response.data.jobs.length} matching jobs`)
            }
        } catch (error) {
            console.error("Error searching for jobs", error)
            toast.error(error?.response?.data?.message || "Could not search for jobs right now")
        } finally {
            dispatch(setSearching(false))
            toast.dismiss(toastId)
        }
    }
}
