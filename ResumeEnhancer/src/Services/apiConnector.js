import axios from "axios";
import toast from "react-hot-toast";

// withCredentials so the httpOnly cookies flow sir — the login token and the payment session need it
export const axiosinstance = axios.create({
    withCredentials: true
})

// session-expiry handling sir — this file has no access to the Redux store or useNavigate
// (it's outside any component), so a 401 here clears the SAME localStorage keys LogoutUser
// uses in Services/operations/Auth.js and does a hard redirect via window.location.href.
// A hard redirect (not react-router navigate) also guarantees Redux state gets wiped clean
// on the next load, since there's no store dispatch reachable from an axios interceptor.
let sessionExpiredHandled = false
axiosinstance.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error?.response?.status === 401 && !sessionExpiredHandled) {
            sessionExpiredHandled = true
            localStorage.removeItem("token")
            localStorage.removeItem("user")
            toast.error("Session expired, please log in again")
            if (window.location.pathname !== '/Login') {
                window.location.href = '/Login'
            }
        }
        return Promise.reject(error)
    }
)

export const apiConnector = (method, url, bodyData = null , headers ={}, params)=>{
    return axiosinstance({
        method: `${method}`,
        url: `${url}`,
        data: bodyData ? bodyData : null,
        headers: headers ? headers : null,
        params: params ? params : null
    });
}
