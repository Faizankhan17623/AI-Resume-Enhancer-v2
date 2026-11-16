import { apiConnector } from '../apiConnector.js'
import { logApiError } from '../logApiError.js'
import { Testimonials as TestimonialsApi } from '../Apis/AdminApi.js'

// homepage testimonials sir, per 2026-11-16 audit — Home/Testimonials.jsx and
// Dashboard/ShareTestimonialCard.jsx both used to call apiConnector directly. No operations
// file existed for this domain despite the Testimonials URL constants and real backend routes
// already existing. Plain async functions, not thunks — no slice exists for either caller.

export async function GetApprovedTestimonials() {
    try {
        const response = await apiConnector('GET', TestimonialsApi.approved)
        if (!response.data.success) {
            throw new Error(response.data.message)
        }
        return response.data.testimonials
    } catch (error) {
        // static fallback is fine sir, same as the caller's own prior behavior — never block
        // the homepage for this
        logApiError('Error fetching testimonials', error)
        return null
    }
}

export async function GetMyTestimonial(token) {
    try {
        const response = await apiConnector('GET', TestimonialsApi.mine, null, {
            Authorization: `Bearer ${token}`,
        })
        if (!response.data.success) {
            throw new Error(response.data.message)
        }
        return response.data.testimonial
    } catch (error) {
        logApiError('Error fetching your testimonial', error)
        return null
    }
}

export async function SubmitTestimonial(role, quote, rating, token) {
    try {
        const response = await apiConnector(
            'POST',
            TestimonialsApi.submit,
            { role, quote, rating },
            { Authorization: `Bearer ${token}` }
        )
        if (!response.data.success) {
            throw new Error(response.data.message)
        }
        return { message: response.data.message, testimonial: response.data.testimonial }
    } catch (error) {
        logApiError('Error submitting testimonial', error)
        throw error
    }
}
