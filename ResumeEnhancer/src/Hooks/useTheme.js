import { useEffect, useRef, useState } from 'react'

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
    const isFirstRun = useRef(true)

    useEffect(() => {
        // skip the transition class on mount sir — only actual toggles should crossfade,
        // not the very first render (which already matches localStorage/system preference)
        if (isFirstRun.current) {
            isFirstRun.current = false
            document.documentElement.classList.toggle('dark', theme === 'dark')
            localStorage.setItem(STORAGE_KEY, theme)
            return
        }

        const root = document.documentElement
        root.classList.add('theme-transitioning')
        root.classList.toggle('dark', theme === 'dark')
        localStorage.setItem(STORAGE_KEY, theme)

        const timer = setTimeout(() => root.classList.remove('theme-transitioning'), 5000)
        return () => clearTimeout(timer)
    }, [theme])

    const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))

    return { theme, toggleTheme }
}

export default useTheme
