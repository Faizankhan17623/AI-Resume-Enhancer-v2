import { useEffect } from 'react'

// calls handler when a mousedown/touchstart lands outside ref's element sir
export default function useClickOutside(ref, handler) {
  useEffect(() => {
    const onOutside = (event) => {
      if (!ref || !ref.current || ref.current.contains(event.target)) return
      handler(event)
    }
    document.addEventListener('mousedown', onOutside)
    document.addEventListener('touchstart', onOutside)
    return () => {
      document.removeEventListener('mousedown', onOutside)
      document.removeEventListener('touchstart', onOutside)
    }
  }, [ref, handler])
}
