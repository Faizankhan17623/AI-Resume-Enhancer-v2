import { apiConnector } from '../apiConnector.js'
import { SearchApi } from '../Apis/SearchApi.js'

// CommandPalette.jsx's global search sir, per 2026-11-16 audit — used to call apiConnector
// directly with a hand-built BASE_URL string. Thin wrapper only, not a thunk — the caller owns
// its own debounce/alive-guard state, which belongs in the component.
export function GlobalCommandSearch(query, token) {
    return apiConnector('GET', SearchApi.global, null, { Authorization: `Bearer ${token}` }, { q: query })
}
