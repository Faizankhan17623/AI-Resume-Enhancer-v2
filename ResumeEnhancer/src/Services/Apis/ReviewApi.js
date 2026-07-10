const BASE_URL = import.meta.env.VITE_MAIN_BACKEND_URL

export const AtsReview = {
    createreview: BASE_URL + "/response"
}

// free instant pre-check sir — no AI credit spent
export const GrammarCheckApi = {
    checkgrammar: BASE_URL + "/grammar-check"
}

export const ReviewHistory = {
    allreviews: BASE_URL + "/reviews",
    progress: BASE_URL + "/reviews/progress",
    singlereview: BASE_URL + "/reviews",          // + /:reviewId
    downloadpdf: BASE_URL + "/reviews",           // + /:reviewId/pdf
    sharereview: BASE_URL + "/reviews"            // + /:reviewId/share
}

export const StreakApi = {
    streak: BASE_URL + "/streak"
}

export const LeaderboardApi = {
    leaderboard: BASE_URL + "/leaderboard"
}
