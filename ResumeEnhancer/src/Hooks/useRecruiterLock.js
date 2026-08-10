import { useSelector } from 'react-redux'

// shared by every recruiter action-bearing page sir — mirrors the backend's isApprovedRecruiter
// gate (Backend/Middlewares/Auth.js) exactly: undefined (no recruiterApplication at all, e.g. a
// Recruiter promoted the old manual-Admin-dropdown way) counts as approved, only 'pending' or
// 'rejected' locks. One definition so a fix to this rule never has to be repeated across pages.
const useRecruiterLock = () => {
    const { user } = useSelector((state) => state.auth)
    const approvalStatus = user?.recruiterApprovalStatus
    const isLocked = !!approvalStatus && approvalStatus !== 'approved'
    return { isLocked, approvalStatus }
}

export default useRecruiterLock
