import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    // the review the user is looking at right now sir
    review: null,
    // a failed GetSingleReview fetch used to leave `review` null forever, which Report.jsx's own
    // `loading || !review` guard rendered as an endless loading spinner instead of an error sir
    singleReviewLoadError: false,
    reviewId: null,
    // share state for the review currently open sir
    isPublic: false,
    shareId: null,
    shareAudience: 'friend',
    // structural ATS parse-safety scan for the review currently open sir — separate from the
    // AI's subjective review JSON above
    formattingCheck: null,
    // the history list + the progress graph data
    allReviews: [],
    // a failed GetAllReviews fetch used to leave `allReviews` at its empty initial value with no
    // signal sir — History.jsx/DashboardHome.jsx now check this before their empty-state render
    loadError: false,
    progress: null,
    loading: false,
    // free grammar/spell pre-check sir — separate from the paid AI review
    grammar: null,
    grammarChecking: false,
    // activity streak badge + the anonymized leaderboards sir — three boards, same list shape
    streak: null,
    leaderboard: [],
    weeklyReviewsLeaderboard: [],
    streaksLeaderboard: [],
    // one loading flag PER board sir, per 2026-11-15 audit — these three used to all share the
    // single `loading` flag above. Leaderboard.jsx fires all three fetches in the same effect
    // tick; whichever resolved first flipped the shared flag to false while the other two were
    // still in flight, flashing a false "No scores yet"/"No reviews this week"/"No active
    // streaks" empty-state for whichever board(s) hadn't finished yet.
    leaderboardLoading: false,
    weeklyReviewsLoading: false,
    streaksLoading: false,
    // one loadError PER board sir, same reasoning as the per-board loading flags above — each
    // board's toast fades after a few seconds, after which a failed fetch looked identical to a
    // genuinely empty board with nothing in it
    leaderboardLoadError: false,
    weeklyReviewsLoadError: false,
    streaksLoadError: false
};

const reviewSlice = createSlice({
    name: "review",
    initialState: initialState,
    reducers: {
        setReview(state, value) {
            state.review = value.payload
        },
        setSingleReviewLoadError(state, value) {
            state.singleReviewLoadError = value.payload
        },
        setReviewId(state, value) {
            state.reviewId = value.payload
        },
        setFormattingCheck(state, value) {
            state.formattingCheck = value.payload
        },
        setShareState(state, value) {
            state.isPublic = value.payload.isPublic
            // shareId is omitted (not null) when only the audience changed sir — don't wipe
            // the existing link in that case, only ToggleShare's own response carries a fresh one
            if ('shareId' in value.payload) {
                state.shareId = value.payload.shareId ?? null
            }
            // same reasoning as shareId above sir — GetSingleReview's dispatch used to omit this
            // field entirely, which fell through to the unconditional 'friend' default below and
            // silently overwrote a saved 'recruiter'/other audience back to 'friend' on every
            // page load, even though the backend still had the real value stored
            if ('shareAudience' in value.payload) {
                state.shareAudience = value.payload.shareAudience ?? 'friend'
            }
        },
        setAllReviews(state, value) {
            state.allReviews = value.payload
        },
        setReviewsLoadError(state, value) {
            state.loadError = value.payload
        },
        setProgress(state, value) {
            state.progress = value.payload
        },
        setLoading(state, value) {
            state.loading = value.payload
        },
        setGrammar(state, value) {
            state.grammar = value.payload
        },
        setGrammarChecking(state, value) {
            state.grammarChecking = value.payload
        },
        setStreak(state, value) {
            state.streak = value.payload
        },
        setLeaderboard(state, value) {
            state.leaderboard = value.payload
        },
        setWeeklyReviewsLeaderboard(state, value) {
            state.weeklyReviewsLeaderboard = value.payload
        },
        setStreaksLeaderboard(state, value) {
            state.streaksLeaderboard = value.payload
        },
        setLeaderboardLoading(state, value) {
            state.leaderboardLoading = value.payload
        },
        setWeeklyReviewsLoading(state, value) {
            state.weeklyReviewsLoading = value.payload
        },
        setStreaksLoading(state, value) {
            state.streaksLoading = value.payload
        },
        setLeaderboardLoadError(state, value) {
            state.leaderboardLoadError = value.payload
        },
        setWeeklyReviewsLoadError(state, value) {
            state.weeklyReviewsLoadError = value.payload
        },
        setStreaksLoadError(state, value) {
            state.streaksLoadError = value.payload
        }
    }
})

export const {
    setReview, setSingleReviewLoadError, setReviewId, setFormattingCheck, setShareState, setAllReviews, setReviewsLoadError, setProgress, setLoading,
    setGrammar, setGrammarChecking, setStreak, setLeaderboard, setWeeklyReviewsLeaderboard, setStreaksLeaderboard,
    setLeaderboardLoadError, setWeeklyReviewsLoadError, setStreaksLoadError,
    setLeaderboardLoading, setWeeklyReviewsLoading, setStreaksLoading
} = reviewSlice.actions
export default reviewSlice.reducer
