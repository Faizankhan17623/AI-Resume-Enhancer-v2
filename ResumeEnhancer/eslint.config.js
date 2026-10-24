import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    ignores: ['api/**'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },
  {
    // third-party animated components sir (motion-primitives / cult-ui, MIT) ported to JSX — they
    // are written against looser react-hooks / fast-refresh rules than this project enforces, so
    // those few rules are relaxed for this folder only. Everything else still lints normally.
    files: ['src/Components/Animated/**/*.{js,jsx}'],
    rules: {
      'react-hooks/static-components': 'off',
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/refs': 'off',
      'react-hooks/exhaustive-deps': 'off',
      'react-refresh/only-export-components': 'off',
      'no-useless-assignment': 'off',
      'no-unused-vars': ['error', { ignoreRestSiblings: true }],
    },
  },
  {
    // Vercel serverless functions sir — these run under Node, not the browser
    files: ['api/**/*.js'],
    extends: [js.configs.recommended],
    languageOptions: {
      globals: globals.node,
    },
  },
])
