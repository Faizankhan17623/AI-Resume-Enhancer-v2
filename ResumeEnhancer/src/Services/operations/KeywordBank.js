import toast from "react-hot-toast";
import { apiConnector } from '../apiConnector.js'
import { logApiError } from '../logApiError.js'
import { setItems, setSummary, setLoading, setLoadError } from '../../Slices/keywordBankSlice.js'
import { KeywordBankData } from '../Apis/KeywordBankApi.js'

const { all, update } = KeywordBankData

export function GetKeywordBank(token) {
    return async (dispatch) => {
        dispatch(setLoading(true))
        try {
            const response = await apiConnector("GET", all, null, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            dispatch(setItems(response.data.items))
            dispatch(setSummary(response.data.summary))
            dispatch(setLoadError(false))
        } catch (error) {
            logApiError("Error fetching your keyword bank", error)
            // toast sir, per 2026-11-08 audit — this used to only log, leaving items/summary
            // whatever they were before (often empty on first load), rendering as a false "no
            // keywords tracked yet" with no indication the fetch actually failed. loadError added
            // per 2026-11-27 audit — the toast alone fades after a few seconds and the page still
            // looked like a genuine empty bank afterward
            toast.error(error?.response?.data?.message || "Could not load your keyword bank")
            dispatch(setLoadError(true))
        } finally {
            dispatch(setLoading(false))
        }
    }
}

export function UpdateKeywordStatus(itemId, status, token) {
    return async (dispatch) => {
        try {
            const response = await apiConnector("PATCH", `${update}/${itemId}`, { status }, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            dispatch(GetKeywordBank(token))
        } catch (error) {
            logApiError("Error updating the keyword", error)
            toast.error(error?.response?.data?.message || "Could not update the keyword")
        }
    }
}
