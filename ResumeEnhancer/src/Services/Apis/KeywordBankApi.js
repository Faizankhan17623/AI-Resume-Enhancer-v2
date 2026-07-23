const BASE_URL = import.meta.env.VITE_MAIN_BACKEND_URL

export const KeywordBankData = {
    all: BASE_URL + "/keyword-bank",
    update: BASE_URL + "/keyword-bank",   // + /:itemId
}
