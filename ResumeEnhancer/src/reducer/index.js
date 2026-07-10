import { combineReducers } from "redux";
import authReducer from '../Slices/authSlice'
import reviewReducer from '../Slices/reviewSlice'
import chatReducer from '../Slices/chatSlice'
import paymentReducer from '../Slices/paymentSlice'
import profileReducer from '../Slices/profileSlice'
import adminReducer from '../Slices/adminSlice'
import coverLetterReducer from '../Slices/coverLetterSlice'
import resumeReducer from '../Slices/resumeSlice'

const rootReduers = combineReducers({
    auth: authReducer,
    review: reviewReducer,
    chat: chatReducer,
    payment: paymentReducer,
    profile: profileReducer,
    admin: adminReducer,
    coverLetter: coverLetterReducer,
    resume: resumeReducer,
})


export default rootReduers
