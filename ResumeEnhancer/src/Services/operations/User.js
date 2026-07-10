import { apiConnector } from '../apiConnector.js'
import { setProfile, setLoading } from '../../Slices/profileSlice.js'
import { Profile } from '../Apis/UserApi.js'

const { getprofile } = Profile

// the account page loads everything from this one call sir
export function GetProfile(token) {
    return async (dispatch) => {
        dispatch(setLoading(true))
        try {
            const response = await apiConnector("GET", getprofile, null, {
                Authorization: `Bearer ${token}`
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            dispatch(setProfile(response.data))
        } catch (error) {
            console.error("Error fetching the profile", error)
        } finally {
            dispatch(setLoading(false))
        }
    }
}
