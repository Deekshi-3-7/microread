import { useState } from 'react'

const STORAGE_KEY = 'microread-theme'

function isDarkActive(): boolean {
  if (typeof document === 'undefined') {
    return false
  }

  return document.documentElement.classList.contains('dark')
}

type ThemeToggleProps = {
  className?: string
}

/**
 * Toggles between light and dark mode. The initial theme is applied
 * before paint by the inline script in index.html; this button reads
 * the live state from the <html> class, flips it, and persists the
 * choice to localStorage.
 */
export default function ThemeToggle({
  className = '',
}: ThemeToggleProps) {
  const [isDark, setIsDark] = useState<boolean>(isDarkActive)

  function toggle() {
    const next = !isDark

    setIsDark(next)
    document.documentElement.classList.toggle('dark', next)

    try {
      localStorage.setItem(
        STORAGE_KEY,
        next ? 'dark' : 'light'
      )
    } catch {
      // Ignore storage failures (private mode, etc.).
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={isDark}
      className={`flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-100 ${className}`}
    >
      {isDark ? (
        <>☀️ Switch to light mode</>
      ) : (
        <>🌙 Switch to dark mode</>
      )}
    </button>
  )
}
