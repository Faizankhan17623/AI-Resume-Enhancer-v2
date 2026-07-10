import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

// every route change starts at the top of the page sir
const ScrollToTop = () => {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }, [pathname])

  return null
}

export default ScrollToTop
