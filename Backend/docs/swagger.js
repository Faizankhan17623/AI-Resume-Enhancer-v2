// hand-written OpenAPI 3 spec sir — one file is easier to keep in sync than scattering
// JSDoc comments across every route file for ~30 endpoints

const swaggerDocument = {
    openapi: '3.0.3',
    info: {
        title: 'AI Resume Enhancer API',
        version: '1.0.0',
        description: 'REST API for AI-powered resume review, chat coaching, payments, and admin tooling.',
    },
    servers: [{ url: '/api/v1' }],
    components: {
        securitySchemes: {
            bearerAuth: {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT',
                description: 'Token can also be sent as an httpOnly "token" cookie set by /Login',
            },
        },
        schemas: {
            SuccessMessage: {
                type: 'object',
                properties: { success: { type: 'boolean' }, message: { type: 'string' } },
            },
            ErrorResponse: {
                type: 'object',
                properties: {
                    success: { type: 'boolean', example: false },
                    message: { type: 'string' },
                },
            },
        },
    },
    security: [{ bearerAuth: [] }],
    tags: [
        { name: 'Auth', description: 'Signup, login, OTP, profile' },
        { name: 'AI Review', description: 'ATS resume review' },
        { name: 'Chat', description: 'AI resume coach chat' },
        { name: 'Resumes', description: 'Saved resume library — save once, reuse across reviews/chats/cover letters' },
        { name: 'Cover Letter', description: 'AI-drafted cover letters (Pro+ feature)' },
        { name: 'Job Search', description: 'Live web job search via Tavily (Pro+ feature)' },
        { name: 'Payment', description: 'Plans and Razorpay checkout' },
        { name: 'Reviews', description: 'Saved review history and PDF export' },
        { name: 'Grammar', description: 'Free grammar/spell pre-check (no AI credit spent)' },
        { name: 'Streak', description: 'Consecutive-day activity streak' },
        { name: 'Leaderboard', description: 'Anonymized top ATS scores' },
        { name: 'Admin', description: 'Admin/support dashboard (role-gated)' },
        { name: 'Announcements', description: 'Site-wide banners' },
    ],
    paths: {
        '/Send-otp': {
            post: {
                tags: ['Auth'], summary: 'Send a signup OTP to an email', security: [],
                requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { email: { type: 'string' } }, required: ['email'] } } } },
                responses: { 200: { description: 'OTP sent' }, 401: { description: 'Email already registered' } },
            },
        },
        '/Createuser': {
            post: {
                tags: ['Auth'], summary: 'Register a new user (requires a valid OTP)', security: [],
                requestBody: {
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    firstName: { type: 'string' }, lastName: { type: 'string' },
                                    email: { type: 'string' }, password: { type: 'string' },
                                    number: { type: 'string' }, Code: { type: 'string' }, otp: { type: 'string' },
                                },
                                required: ['firstName', 'lastName', 'email', 'password', 'number', 'Code', 'otp'],
                            },
                        },
                    },
                },
                responses: { 201: { description: 'User created' }, 400: { description: 'Missing fields or invalid OTP' }, 409: { description: 'Duplicate field' } },
            },
        },
        '/Login': {
            post: {
                tags: ['Auth'], summary: 'Log in and receive a JWT', security: [],
                description: 'Per-account lockout: 5 consecutive failed attempts locks the account for 15 minutes, on top of the IP-based rate limiter.',
                requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { email: { type: 'string' }, password: { type: 'string' } }, required: ['email', 'password'] } } } },
                responses: { 200: { description: 'Logged in, token + user returned' }, 401: { description: 'Wrong password' }, 404: { description: 'No account with this email' }, 423: { description: 'Account locked from too many failed attempts, try again later' } },
            },
        },
        '/profile': {
            get: {
                tags: ['Auth'], summary: 'Get the logged-in user\'s profile, effective plan, and activity counts',
                responses: { 200: { description: 'Profile data' }, 401: { description: 'Not authenticated' } },
            },
        },
        '/profile/notifications': {
            patch: {
                tags: ['Auth'], summary: 'Update per-type email notification preferences',
                requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { notifyStreak: { type: 'boolean' }, notifyWinBack: { type: 'boolean' }, notifyDigest: { type: 'boolean' } } } } } },
                responses: { 200: { description: 'Updated preferences' }, 400: { description: 'At least one preference is required' } },
            },
        },
        '/response': {
            post: {
                tags: ['AI Review'], summary: 'Upload a resume PDF + job description for an AI ATS review (consumes a credit)',
                requestBody: { content: { 'multipart/form-data': { schema: { type: 'object', properties: { resume: { type: 'string', format: 'binary' }, jd: { type: 'string' } } } } } },
                responses: { 200: { description: 'AI review generated and saved' }, 400: { description: 'Out of credits / bad input' } },
            },
        },
        '/response/from-resume/{resumeId}': {
            post: {
                tags: ['AI Review'], summary: 'Run an AI ATS review using a previously saved resume (consumes a credit)',
                parameters: [{ name: 'resumeId', in: 'path', required: true, schema: { type: 'string' } }],
                requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { jd: { type: 'string' } } } } } },
                responses: { 200: { description: 'AI review generated and saved' }, 404: { description: 'Saved resume not found' } },
            },
        },
        '/chat': {
            post: {
                tags: ['Chat'], summary: 'Start a new AI coach chat with a resume + job description (consumes a credit)',
                responses: { 201: { description: 'Chat created' } },
            },
            get: {
                tags: ['Chat'], summary: 'List the logged-in user\'s chats',
                responses: { 200: { description: 'Chat list' } },
            },
        },
        '/chat/{chatId}': {
            get: {
                tags: ['Chat'], summary: 'Get a single chat with full message history',
                parameters: [{ name: 'chatId', in: 'path', required: true, schema: { type: 'string' } }],
                responses: { 200: { description: 'Chat detail' }, 404: { description: 'Not found' } },
            },
            delete: {
                tags: ['Chat'], summary: 'Delete a chat',
                parameters: [{ name: 'chatId', in: 'path', required: true, schema: { type: 'string' } }],
                responses: { 200: { description: 'Deleted' } },
            },
        },
        '/chat/{chatId}/message': {
            post: {
                tags: ['Chat'], summary: 'Send a message in an existing chat (plan-limited)',
                parameters: [{ name: 'chatId', in: 'path', required: true, schema: { type: 'string' } }],
                requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { message: { type: 'string' } } } } } },
                responses: { 200: { description: 'AI reply appended' }, 400: { description: 'Message cap reached for this plan' } },
            },
        },
        '/resumes': {
            post: {
                tags: ['Resumes'], summary: 'Save a parsed resume to the library for reuse (no AI call, no credit spent)',
                requestBody: { content: { 'multipart/form-data': { schema: { type: 'object', properties: { PDf: { type: 'string', format: 'binary' }, label: { type: 'string' } }, required: ['PDf'] } } } },
                responses: { 201: { description: 'Resume saved' }, 400: { description: 'Missing/invalid file' } },
            },
            get: {
                tags: ['Resumes'], summary: 'List the logged-in user\'s saved resumes (newest first)',
                responses: { 200: { description: 'Resume list (label/filename/isDefault, no text)' } },
            },
        },
        '/resumes/{resumeId}': {
            patch: {
                tags: ['Resumes'], summary: 'Rename a saved resume or set it as the default',
                parameters: [{ name: 'resumeId', in: 'path', required: true, schema: { type: 'string' } }],
                requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { label: { type: 'string' }, isDefault: { type: 'boolean' } } } } } },
                responses: { 200: { description: 'Resume updated' }, 404: { description: 'Not found' } },
            },
            delete: {
                tags: ['Resumes'], summary: 'Delete a saved resume (promotes the next most recent to default, if the deleted one was it)',
                parameters: [{ name: 'resumeId', in: 'path', required: true, schema: { type: 'string' } }],
                responses: { 200: { description: 'Deleted' }, 404: { description: 'Not found' } },
            },
        },
        '/cover-letter': {
            post: {
                tags: ['Cover Letter'], summary: 'Generate an AI-drafted cover letter from a resume PDF + JD (Pro+ feature)',
                requestBody: { content: { 'multipart/form-data': { schema: { type: 'object', properties: { PDf: { type: 'string', format: 'binary' }, jd: { type: 'string' } }, required: ['PDf', 'jd'] } } } },
                responses: { 200: { description: 'Cover letter generated and saved' }, 400: { description: 'Missing file or JD' }, 403: { description: 'Basic plan — upgrade required' } },
            },
            get: {
                tags: ['Cover Letter'], summary: 'List the logged-in user\'s saved cover letters (newest first)',
                responses: { 200: { description: 'Cover letter list' } },
            },
        },
        '/cover-letter/{coverLetterId}': {
            get: {
                tags: ['Cover Letter'], summary: 'Get one saved cover letter',
                parameters: [{ name: 'coverLetterId', in: 'path', required: true, schema: { type: 'string' } }],
                responses: { 200: { description: 'Cover letter detail' }, 404: { description: 'Not found' } },
            },
        },
        '/job-search': {
            post: {
                tags: ['Job Search'], summary: 'Search the live web for job postings matching a query, via Tavily (Pro+ feature)',
                requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] } } } },
                responses: { 200: { description: 'Job results (title/url/snippet/score)' }, 400: { description: 'Missing query' }, 403: { description: 'Basic plan — upgrade required' } },
            },
        },
        '/payment/plans': {
            get: {
                tags: ['Payment'], summary: 'List the three plans (public)', security: [],
                responses: { 200: { description: 'Basic, Pro, ProMax configs' } },
            },
        },
        '/payment/create-order': {
            post: {
                tags: ['Payment'], summary: 'Create a Razorpay order for Pro or ProMax',
                requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { plan: { type: 'string', enum: ['Pro', 'ProMax'] } } } } } },
                responses: { 200: { description: 'Order created, sets a 30-minute payment-session cookie' }, 400: { description: 'Invalid plan' } },
            },
        },
        '/payment/verify': {
            post: {
                tags: ['Payment'], summary: 'Verify a Razorpay payment signature and unlock the plan',
                requestBody: {
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    razorpay_order_id: { type: 'string' },
                                    razorpay_payment_id: { type: 'string' },
                                    razorpay_signature: { type: 'string' },
                                },
                            },
                        },
                    },
                },
                responses: { 200: { description: 'Payment verified, plan unlocked' }, 400: { description: 'Signature mismatch or expired session' } },
            },
        },
        '/payment/history': {
            get: {
                tags: ['Payment'], summary: 'The logged-in user\'s payment history',
                responses: { 200: { description: 'Payment list' } },
            },
        },
        '/reviews': {
            get: { tags: ['Reviews'], summary: 'List the logged-in user\'s saved reviews', responses: { 200: { description: 'Review list' } } },
        },
        '/reviews/progress': {
            get: { tags: ['Reviews'], summary: 'Score-over-time progress data', responses: { 200: { description: 'Progress points + stats' } } },
        },
        '/reviews/{reviewId}': {
            get: {
                tags: ['Reviews'], summary: 'Get one full saved review',
                parameters: [{ name: 'reviewId', in: 'path', required: true, schema: { type: 'string' } }],
                responses: { 200: { description: 'Review detail' }, 404: { description: 'Not found' } },
            },
        },
        '/reviews/{reviewId}/pdf': {
            get: {
                tags: ['Reviews'], summary: 'Download the review as a PDF (Pro/ProMax only)',
                parameters: [{ name: 'reviewId', in: 'path', required: true, schema: { type: 'string' } }],
                responses: { 200: { description: 'PDF stream', content: { 'application/pdf': {} } }, 403: { description: 'Plan does not include PDF export' } },
            },
        },
        '/reviews/{reviewId}/share': {
            post: {
                tags: ['Reviews'], summary: 'Toggle a review\'s public share link on/off',
                parameters: [{ name: 'reviewId', in: 'path', required: true, schema: { type: 'string' } }],
                responses: { 200: { description: 'isPublic + shareId (when public)' }, 404: { description: 'Not found' } },
            },
        },
        '/public/reviews/{shareId}': {
            get: {
                tags: ['Reviews'], summary: 'Public summary card for a shared review (no auth, safe subset only)', security: [],
                parameters: [{ name: 'shareId', in: 'path', required: true, schema: { type: 'string' } }],
                responses: { 200: { description: 'Public report summary' }, 404: { description: 'Not found or no longer public' } },
            },
        },
        '/grammar-check': {
            post: {
                tags: ['Grammar'], summary: 'Free spelling/style pre-check on an uploaded resume PDF (no AI credit spent)',
                requestBody: { content: { 'multipart/form-data': { schema: { type: 'object', properties: { PDf: { type: 'string', format: 'binary' } }, required: ['PDf'] } } } },
                responses: { 200: { description: 'issues + a text-quality score' }, 400: { description: 'Missing/invalid file' } },
            },
        },
        '/streak': {
            get: { tags: ['Streak'], summary: 'The logged-in user\'s current/longest streak', responses: { 200: { description: 'Streak info' } } },
        },
        '/leaderboard': {
            get: { tags: ['Leaderboard'], summary: 'Anonymized top ATS scores across all users', responses: { 200: { description: 'Leaderboard rows' } } },
        },
        '/admin/stats': { get: { tags: ['Admin'], summary: 'Dashboard stats (Support+)', responses: { 200: { description: 'OK' }, 403: { description: 'Forbidden' } } } },
        '/admin/users': { get: { tags: ['Admin'], summary: 'Paginated/searchable user list (Support+)', responses: { 200: { description: 'OK' } } } },
        '/admin/users/{userId}/reviews': { get: { tags: ['Admin'], summary: 'A user\'s reviews (Support+)', parameters: [{ name: 'userId', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'OK' } } } },
        '/admin/users/{userId}/chats': { get: { tags: ['Admin'], summary: 'A user\'s chats (Support+)', parameters: [{ name: 'userId', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'OK' } } } },
        '/admin/chats/{chatId}': { get: { tags: ['Admin'], summary: 'Any chat detail (Support+)', parameters: [{ name: 'chatId', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'OK' } } } },
        '/admin/users/{userId}/credits': { patch: { tags: ['Admin'], summary: 'Adjust a user\'s used-credit count (Support+)', parameters: [{ name: 'userId', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'OK' } } } },
        '/admin/payments': { get: { tags: ['Admin'], summary: 'Payments dashboard (Support+)', responses: { 200: { description: 'OK' } } } },
        '/admin/ai': { get: { tags: ['Admin'], summary: 'AI cost/health stats (Support+)', responses: { 200: { description: 'OK' } } } },
        '/admin/health': { get: { tags: ['Admin'], summary: 'System health check (Support+)', responses: { 200: { description: 'OK' } } } },
        '/admin/insights': { get: { tags: ['Admin'], summary: 'Product insights (Support+)', responses: { 200: { description: 'OK' } } } },
        '/admin/announcements': {
            get: { tags: ['Admin'], summary: 'List all announcements (Support+)', responses: { 200: { description: 'OK' } } },
            post: { tags: ['Admin'], summary: 'Create an announcement (Admin only)', responses: { 200: { description: 'OK' }, 403: { description: 'Forbidden' } } },
        },
        '/admin/users/{userId}/role': { patch: { tags: ['Admin'], summary: 'Change a user\'s role (Admin only)', parameters: [{ name: 'userId', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'OK' } } } },
        '/admin/users/{userId}/plan': { patch: { tags: ['Admin'], summary: 'Manually set a user\'s plan (Admin only)', parameters: [{ name: 'userId', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'OK' } } } },
        '/admin/users/{userId}/ban': { patch: { tags: ['Admin'], summary: 'Ban or unban a user (Admin only)', parameters: [{ name: 'userId', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'OK' } } } },
        '/admin/users/{userId}/impersonate': { post: { tags: ['Admin'], summary: 'Get a 15-minute impersonation token (Admin only)', parameters: [{ name: 'userId', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'OK' } } } },
        '/admin/users/{userId}': {
            get: { tags: ['Admin'], summary: 'User detail (Support+)', parameters: [{ name: 'userId', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'OK' } } },
            delete: { tags: ['Admin'], summary: 'Delete a user and cascade their chats/reviews (Admin only)', parameters: [{ name: 'userId', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'OK' } } },
        },
        '/admin/audit': { get: { tags: ['Admin'], summary: 'Audit log (Admin only)', responses: { 200: { description: 'OK' } } } },
        '/admin/announcements/{announcementId}': {
            patch: { tags: ['Admin'], summary: 'Toggle an announcement live/off (Admin only)', parameters: [{ name: 'announcementId', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'OK' } } },
            delete: { tags: ['Admin'], summary: 'Delete an announcement (Admin only)', parameters: [{ name: 'announcementId', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'OK' } } },
        },
        '/announcements/active': {
            get: { tags: ['Announcements'], summary: 'Get the current live announcement banner (public)', security: [], responses: { 200: { description: 'Active announcement or null' } } },
        },
    },
}

module.exports = swaggerDocument
