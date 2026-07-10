import { useEffect, useState } from 'react'

const STORAGE_KEY = 'theme'

const getInitialTheme = () => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'light' || saved === 'dark') return saved
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

// single source of truth is the "dark" class on <html> sir — index.html has an inline
// script that applies it before first paint so there's no light-mode flash on load
const useTheme = () => {
    const [theme, setTheme] = useState(getInitialTheme)

    useEffect(() => {
        document.documentElement.classList.toggle('dark', theme === 'dark')
        localStorage.setItem(STORAGE_KEY, theme)
    }, [theme])

    const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))

    return { theme, toggleTheme }
}

export default useTheme
