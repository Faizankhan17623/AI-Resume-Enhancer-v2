// shared non-component constants used by both Dashboard/Account.jsx and
// Recruiter/RecruiterAccount.jsx sir — kept out of Account.jsx itself so that file can stay a
// component-only export (react-refresh/only-export-components), same reasoning as
// utils/homeNavLinks.js for Navbar.jsx.

export const swalDark = { background: '#1F1C16', color: '#F3EFE6', confirmButtonColor: '#2F6F5E', cancelButtonColor: '#3A3428' }

export const passwordInputClass = "w-full rounded-xl bg-richblack-900 border border-richblack-600 px-4 py-2.5 text-richblack-5 text-sm placeholder:text-richblack-400 focus:outline-none focus:border-yellow-50 transition-colors duration-200"
export const passwordLabelClass = "text-sm font-medium text-richblack-100 mb-1.5 block"
export const passwordErrorClass = "mt-1 text-xs text-pink-200"
