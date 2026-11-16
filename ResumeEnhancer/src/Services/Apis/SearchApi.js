import BASE_URL from '../../utils/backendUrl'

// added per 2026-11-16 audit sir — CommandPalette.jsx's global search, a real backend route
// (Backend/Routes/Search.js) with no URL constant anywhere before this
export const SearchApi = {
  global: BASE_URL + "/search",
}
