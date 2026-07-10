import axios from "axios";

// withCredentials so the httpOnly cookies flow sir — the login token and the payment session need it
export const axiosinstance = axios.create({
    withCredentials: true
})


export const apiConnector = (method, url, bodyData = null , headers ={}, params)=>{
    return axiosinstance({
        method: `${method}`,
        url: `${url}`,
        data: bodyData ? bodyData : null,
        headers: headers ? headers : null,
        params: params ? params : null
    });
}
