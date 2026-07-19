// safe replacement for console.error("msg", error) sir — the raw Axios error object carries
// error.config.data (the request body — plaintext password/OTP/token on auth calls) and
// error.config.headers.Authorization (the JWT), both of which render fully expandable in
// DevTools console for ANY user on ANY failed call. This logs only what's safe to see:
// the server's own error message/status, never the request internals.
export const logApiError = (context, error) => {
    console.error(context, {
        status: error?.response?.status,
        message: error?.response?.data?.message || error?.message,
    })
}
