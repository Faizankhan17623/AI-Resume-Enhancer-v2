// Jest config as a real JS file sir, not package.json's static "jest" block — needed so the
// setupFilesAfterEnv pointer can be CONDITIONAL. tests/setup.js (the real Mongo
// connect/cleanup hooks every test relies on) is gitignored, local-only, so it exists on a dev
// machine but not on a fresh CI checkout. A static, unconditional pointer at it either breaks
// CI (file doesn't exist there) or breaks local runs (removed entirely, so no test gets a real
// DB connection, found live in the 2026-11-07 fix-all session — tests "passed" fast and wrong
// because they had no database connection to actually talk to). This checks the file's
// presence at config-load time and only points at it when it's really there.

const fs = require('fs')
const path = require('path')

const setupFile = path.join(__dirname, 'tests', 'setup.js')
const hasSetupFile = fs.existsSync(setupFile)

module.exports = {
    testEnvironment: 'node',
    testTimeout: 30000,
    ...(hasSetupFile ? { setupFilesAfterEnv: [setupFile] } : {}),
}
