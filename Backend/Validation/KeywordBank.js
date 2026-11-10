// Keyword bank schemas sir — see Models/KeywordBankItem.js and controllers/KeywordBank.js

const { z } = require('zod')

const updateKeywordStatusSchema = z.object({
    status: z.enum(['added', 'ignored', 'missing'], { error: 'Status must be added, ignored, or missing' }),
})

module.exports = {
    updateKeywordStatusSchema,
}
