import { useEffect, useState } from 'react'
import {
  PALETTES,
  getStoredPalette,
  getStoredMode,
  applyPalette,
  applyMode,
  resolveDark,
  watchSystemMode,
  type PaletteId,
  type ThemeMode,
} from '../lib/theme'

const MODES: { id: ThemeMode; label: string; icon: string }[] = [
  { id: 'light', label: 'Light', icon: '☀️' },
  { id: 'dark', label: 'Dark', icon: '🌙' },
  { id: 'system', label: 'System', icon: '🖥️' },
]

/**
 * Theme & Appearance control: pick one of five color palettes and a
 * light / dark / system mode. Changes apply immediately and persist via
 * the theme engine; each palette shows a small live preview that follows
 * the currently resolved light/dark appearance.
 */
export default function ThemePicker() {
  const [palette, setPalette] = useState<PaletteId>(getStoredPalette)
  const [mode, setMode] = useState<ThemeMode>(getStoredMode)
  const [isDark, setIsDark] = useState<boolean>(() =>
    resolveDark(getStoredMode())
  )

  // Keep previews honest when the OS flips while we're on "System".
  useEffect(
    () =>
      watchSystemMode(() => {
        if (getStoredMode() === 'system') {
          setIsDark(resolveDark('system'))
        }
      }),
    []
  )

  function choosePalette(id: PaletteId) {
    setPalette(id)
    applyPalette(id)
  }

  function chooseMode(next: ThemeMode) {
    setMode(next)
    applyMode(next)
    setIsDark(resolveDark(next))
  }

  return (
    <div className="space-y-6">
      {/* Mode: light / dark / system */}
      <div>
        <p className="mb-2 text-sm font-medium text-gray-700">
          Appearance
        </p>

        <div
          role="radiogroup"
          aria-label="Appearance mode"
          className="grid grid-cols-3 gap-2 rounded-2xl border border-gray-200 bg-gray-50 p-1.5 sm:max-w-md"
        >
          {MODES.map((option) => {
            const active = mode === option.id

            return (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => chooseMode(option.id)}
                className={`press flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  active
                    ? 'nav-active'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <span aria-hidden="true">{option.icon}</span>
                {option.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Palette picker */}
      <div>
        <p className="mb-2 text-sm font-medium text-gray-700">
          Color theme
        </p>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {PALETTES.map((option) => {
            const active = palette === option.id
            const swatch = isDark ? option.dark : option.light

            return (
              <button
                key={option.id}
                type="button"
                aria-pressed={active}
                onClick={() => choosePalette(option.id)}
                className={`press group rounded-2xl border p-3 text-left transition ${
                  active
                    ? 'border-transparent ring-2 ring-[color:var(--brand)] ring-offset-2 ring-offset-[color:var(--color-white)]'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                {/* Mini preview */}
                <div
                  className="relative mb-3 h-16 overflow-hidden rounded-xl border border-black/5"
                  style={{ background: swatch.bg }}
                >
                  <div
                    className="absolute inset-x-2 bottom-2 top-5 rounded-lg shadow-sm"
                    style={{ background: swatch.surface }}
                  />
                  <span
                    className="absolute left-3 top-2.5 h-3 w-3 rounded-full"
                    style={{ background: option.accent }}
                  />
                  <span
                    className="absolute bottom-3 right-3 h-2 w-10 rounded-full"
                    style={{ background: option.accent }}
                  />
                </div>

                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-gray-900">
                    {option.label}
                  </p>

                  {active && (
                    <span className="gradient-text text-xs font-bold">
                      ✓
                    </span>
                  )}
                </div>

                <p className="mt-0.5 text-xs leading-4 text-gray-500">
                  {option.description}
                </p>
              </button>
            )
          })}
        </div>
      </div>

      <p className="text-xs text-gray-400">
        Your theme is saved on this device and applies across MicroRead.
      </p>
    </div>
  )
}
