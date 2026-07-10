import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    // the review the user is looking at right now sir
    review: null,
    reviewId: null,
    // the history list + the progress graph data
    allReviews: [],
    progress: null,
    loading: false,
    // free grammar/spell pre-check sir — separate from the paid AI review
    grammar: null,
    grammarChecking: false,
    // activity streak badge + the anonymized leaderboard sir
    streak: null,
    leaderboard: []
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
        }
    }
})

export const {
    setReview, setReviewId, setAllReviews, setProgress, setLoading,
    setGrammar, setGrammarChecking, setStreak, setLeaderboard
} = reviewSlice.actions
export default reviewSlice.reducer
