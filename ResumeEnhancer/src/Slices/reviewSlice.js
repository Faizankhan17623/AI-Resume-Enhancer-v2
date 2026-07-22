import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    // the review the user is looking at right now sir
    review: null,
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
    progress: null,
    loading: false,
    // free grammar/spell pre-check sir — separate from the paid AI review
    grammar: null,
    grammarChecking: false,
    // activity streak badge + the anonymized leaderboards sir — three boards, same list shape
    streak: null,
    leaderboard: [],
    weeklyReviewsLeaderboard: [],
    streaksLeaderboard: []
};

const reviewSlice = createSlice({
    name: "review",
    initialState: initialState,
    reducers: {
        setReview(state, value) {
            state.review = value.payload
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
            state.shareAudience = value.payload.shareAudience ?? 'friend'
        },
        setAllReviews(state, value) {
            state.allReviews = value.payload
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
        }
    }
})

export const {
    setReview, setReviewId, setFormattingCheck, setShareState, setAllReviews, setProgress, setLoading,
    setGrammar, setGrammarChecking, setStreak, setLeaderboard, setWeeklyReviewsLeaderboard, setStreaksLeaderboard
} = reviewSlice.actions
export default reviewSlice.reducer
