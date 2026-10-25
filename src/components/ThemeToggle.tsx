import { useState } from 'react'
import { applyMode } from '../lib/theme'

function isDarkActive(): boolean {
  if (typeof document === 'undefined') {
    return false
  }

  return document.documentElement.classList.contains('dark')
}

type ThemeToggleProps = {
  className?: string
  compact?: boolean
}

/**
 * Quick light/dark switch for the sidebar and mobile header. The full
 * palette + light/dark/system controls live in Settings; this button is
 * the one-tap shortcut. It reads the live state from the <html> class,
 * flips to an explicit mode, and persists via the theme engine.
 */
export default function ThemeToggle({
  className = '',
  compact = false,
}: ThemeToggleProps) {
  const [isDark, setIsDark] = useState<boolean>(isDarkActive)

  function toggle() {
    const next = !isDark

    setIsDark(next)
    applyMode(next ? 'dark' : 'light')
  }

  const label = isDark
    ? 'Switch to light mode'
    : 'Switch to dark mode'

  if (compact) {
    return (
      <button
        type="button"
        onClick={toggle}
        aria-pressed={isDark}
        aria-label={label}
        title={label}
        className={`press flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gray-200 text-lg text-gray-700 transition hover:bg-gray-100 ${className}`}
      >
        {isDark ? '☀️' : '🌙'}
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={isDark}
      className={`press flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-100 ${className}`}
    >
      {isDark ? (
        <>☀️ Switch to light mode</>
      ) : (
        <>🌙 Switch to dark mode</>
      )}
    </button>
  )
}
