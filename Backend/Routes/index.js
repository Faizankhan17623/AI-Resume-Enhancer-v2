// The single route registry sir — what is mounted, and who owns which URL space.
//
// index.js previously did `app.use('/api/v1', x)` nineteen times against an unlabelled list of
// imports. Three problems with that:
//
//   1. Ownership was invisible. Every router claimed the same '/api/v1' prefix, so the only way
//      to learn which file served '/admin/reports' was to grep all nineteen.
//   2. Collisions were silent. Express matches the FIRST router that answers a path, so two
//      routers defining the same method+path meant one silently shadowed the other, forever, with
//      no error. Admin.js, Report.js and Testimonial.js all legitimately define '/admin/*' paths,
//      which is exactly the situation where an accidental overlap is easy to introduce.
//   3. There was no place to attach per-domain middleware.
//
// Paths are deliberately NOT renamed here. Every router already declares its own full path
// ('/admin/users', '/built-resumes', ...) and those URLs are baked into the deployed frontend, so
// re-prefixing them would be a breaking API change for zero functional gain. What this file adds
// is an explicit, documented ownership map plus a startup collision check that turns the silent
// shadowing failure into a loud one.

const express = require('express')

// domain -> router sir. The `owns` field documents the URL space each domain is responsible for;
// it's what the collision check reports against, and it's the answer to "which file serves this?"
const domains = [
    { name: 'auth', owns: ['/Createuser', '/Login', '/Logout', '/Send-otp', '/auth/*', '/profile/*', '/forgot-password', '/reset-password', '/change-password', '/delete-account', '/response', '/recruiter-applications'], router: require('./Auth.js') },
    { name: 'chat', owns: ['/chat'], router: require('./Chat.js') },
    { name: 'payment', owns: ['/payment'], router: require('./Payment.js') },
    { name: 'recruiterPayment', owns: ['/recruiter/payment'], router: require('./RecruiterPayment.js') },
    { name: 'review', owns: ['/reviews', '/public/reviews', '/streak', '/leaderboard'], router: require('./Review.js') },
    { name: 'admin', owns: ['/admin', '/announcements'], router: require('./Admin.js') },
    { name: 'grammarCheck', owns: ['/grammar-check'], router: require('./GrammarCheck.js') },
    { name: 'coverLetter', owns: ['/cover-letter'], router: require('./CoverLetter.js') },
    { name: 'resume', owns: ['/resumes'], router: require('./Resume.js') },
    { name: 'builtResume', owns: ['/built-resumes'], router: require('./BuiltResume.js') },
    { name: 'jobSearch', owns: ['/job-search'], router: require('./JobSearch.js') },
    { name: 'learningResources', owns: ['/learning-resources'], router: require('./LearningResources.js') },
    { name: 'mockInterview', owns: ['/mock-interview'], router: require('./MockInterview.js') },
    { name: 'feedback', owns: ['/feedback'], router: require('./Feedback.js') },
    { name: 'visitor', owns: ['/track-visit'], router: require('./Visitor.js') },
    { name: 'notification', owns: ['/notifications'], router: require('./Notification.js') },
    { name: 'application', owns: ['/applications'], router: require('./Application.js') },
    { name: 'keywordBank', owns: ['/keyword-bank'], router: require('./KeywordBank.js') },
    { name: 'test', owns: ['/tests', '/test-attempts'], router: require('./Test.js') },
    { name: 'job', owns: ['/jobs', '/public/jobs', '/job-applications'], router: require('./Job.js') },
    { name: 'recruiterAi', owns: ['/recruiter-ai'], router: require('./RecruiterAI.js') },
    // NOTE sir: testimonial and report each also define '/admin/*' routes of their own. That's
    // intentional (the moderation endpoints live beside the feature they moderate) and the
    // collision check below proves they don't overlap with Admin.js's paths.
    { name: 'testimonial', owns: ['/testimonials', '/admin/testimonials'], router: require('./Testimonial.js') },
    { name: 'report', owns: ['/reports', '/admin/reports'], router: require('./Report.js') },
]

// walks a router's own stack to recover every method+path it actually declares sir — reading the
// real routing table rather than trusting the `owns` documentation above, so this can't go stale
const routesOf = (router) => {
    const found = []
    for (const layer of router.stack || []) {
        if (!layer.route) continue
        const path = layer.route.path
        const methods = Object.keys(layer.route.methods || {})
        for (const method of methods) found.push(`${method.toUpperCase()} ${path}`)
    }
    return found
}

/**
 * Fails fast when two domains declare the same method+path sir.
 *
 * Express would otherwise silently let the first-mounted router win, which is the kind of bug
 * that only surfaces in production as "why is this endpoint returning the wrong thing". Since all
 * nineteen routers share one mount prefix, this is a real and easy mistake to make.
 */
const findCollisions = () => {
    const seen = new Map()
    const collisions = []

    for (const { name, router } of domains) {
        for (const signature of routesOf(router)) {
            // parameter NAMES don't affect matching sir — '/x/:a' and '/x/:b' are the same route
            // to Express, so normalize them before comparing or real collisions slip through
            const normalized = signature.replace(/:[^/]+/g, ':param')
            if (seen.has(normalized)) {
                collisions.push(`${normalized} declared by both '${seen.get(normalized)}' and '${name}'`)
            } else {
                seen.set(normalized, name)
            }
        }
    }

    return collisions
}

/**
 * Mounts every domain under one prefix and returns the router.
 * Throws on a route collision so a shadowed endpoint can never reach production unnoticed.
 */
const buildApiRouter = () => {
    const collisions = findCollisions()
    if (collisions.length) {
        throw new Error(
            `Route collision detected — one endpoint would silently shadow another:\n  ${collisions.join('\n  ')}`
        )
    }

    const api = express.Router()
    for (const { router } of domains) api.use(router)
    return api
}

module.exports = { buildApiRouter, domains, findCollisions, routesOf }
