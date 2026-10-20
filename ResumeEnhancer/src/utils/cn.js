import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

// class-name merger sir — clsx for conditionals, twMerge so a later tailwind class wins over an
// earlier conflicting one. Used by the animated component library in Components/Animated.
export function cn(...inputs) {
  return twMerge(clsx(inputs))
}
