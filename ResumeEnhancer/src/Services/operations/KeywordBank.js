import toast from "react-hot-toast";
import { apiConnector } from '../apiConnector.js'
import { logApiError } from '../logApiError.js'
import { setItems, setSummary, setLoading } from '../../Slices/keywordBankSlice.js'
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
        } catch (error) {
            logApiError("Error fetching your keyword bank", error)
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
