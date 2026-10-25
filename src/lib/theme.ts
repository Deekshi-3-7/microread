/**
 * Theme engine.
 *
 * Appearance is two independent choices:
 *   • palette — the brand/color family (data-theme attribute on <html>)
 *   • mode    — light, dark, or follow the system setting (.dark class)
 *
 * Both persist to localStorage and are applied before paint by the
 * inline script in index.html; this module is the source of truth the
 * React side uses to read and change them at runtime.
 */

export type ThemeMode = 'light' | 'dark' | 'system'
export type PaletteId =
  | 'emerald'
  | 'midnight'
  | 'editorial'
  | 'cosmic'
  | 'mono'

export const PALETTE_STORAGE_KEY = 'microread-palette'
export const MODE_STORAGE_KEY = 'microread-mode'

/** Pre-redesign key: stored only 'light' | 'dark'. */
const LEGACY_MODE_KEY = 'microread-theme'

export type PaletteSwatch = {
  /** page background shown behind the preview */
  bg: string
  /** card surface shown on top */
  surface: string
}

export type PaletteMeta = {
  id: PaletteId
  label: string
  description: string
  /** representative accent for the picker dot */
  accent: string
  light: PaletteSwatch
  dark: PaletteSwatch
}

/**
 * Preview colors for the Settings picker. These mirror the tokens in
 * index.css closely enough to give an honest preview; the live theme
 * still comes entirely from the stylesheet.
 */
export const PALETTES: PaletteMeta[] = [
  {
    id: 'emerald',
    label: 'Emerald',
    description: 'Fresh green — growth & progress',
    accent: '#10b981',
    light: { bg: '#f9fafb', surface: '#ffffff' },
    dark: { bg: '#0d0f12', surface: '#16181d' },
  },
  {
    id: 'midnight',
    label: 'Midnight Blue',
    description: 'Deep navy, sophisticated blue',
    accent: '#2563eb',
    light: { bg: '#f1f5fd', surface: '#ffffff' },
    dark: { bg: '#0a0f1e', surface: '#111a2e' },
  },
  {
    id: 'editorial',
    label: 'Warm Editorial',
    description: 'Cream & muted terracotta',
    accent: '#c2663f',
    light: { bg: '#f7f1e8', surface: '#fffdf9' },
    dark: { bg: '#17120d', surface: '#241c15' },
  },
  {
    id: 'cosmic',
    label: 'Cosmic Violet',
    description: 'Deep purple, restrained violet',
    accent: '#7c3aed',
    light: { bg: '#f6f3fd', surface: '#ffffff' },
    dark: { bg: '#120b20', surface: '#1b1430' },
  },
  {
    id: 'mono',
    label: 'Monochrome',
    description: 'Charcoal & white, strong contrast',
    accent: '#374151',
    light: { bg: '#f4f4f5', surface: '#ffffff' },
    dark: { bg: '#0d0f12', surface: '#16181d' },
  },
]

const PALETTE_IDS = PALETTES.map((palette) => palette.id)

function isPaletteId(value: string | null): value is PaletteId {
  return value !== null && PALETTE_IDS.includes(value as PaletteId)
}

export function getStoredPalette(): PaletteId {
  try {
    const saved = localStorage.getItem(PALETTE_STORAGE_KEY)

    if (isPaletteId(saved)) {
      return saved
    }
  } catch {
    // Ignore storage access failures (private mode, etc.).
  }

  return 'cosmic'
}

export function getStoredMode(): ThemeMode {
  try {
    const saved = localStorage.getItem(MODE_STORAGE_KEY)

    if (saved === 'light' || saved === 'dark' || saved === 'system') {
      return saved
    }

    // Migrate the pre-redesign light/dark preference.
    const legacy = localStorage.getItem(LEGACY_MODE_KEY)

    if (legacy === 'light' || legacy === 'dark') {
      return legacy
    }
  } catch {
    // Ignore storage access failures.
  }

  return 'dark'
}

export function systemPrefersDark(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) {
    return false
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

/** Whether the given mode resolves to a dark appearance right now. */
export function resolveDark(mode: ThemeMode): boolean {
  if (mode === 'dark') return true
  if (mode === 'light') return false

  return systemPrefersDark()
}

export function applyPalette(id: PaletteId): void {
  if (typeof document === 'undefined') return

  document.documentElement.setAttribute('data-theme', id)

  try {
    localStorage.setItem(PALETTE_STORAGE_KEY, id)
  } catch {
    // Ignore storage access failures.
  }
}

export function applyMode(mode: ThemeMode): void {
  if (typeof document === 'undefined') return

  document.documentElement.classList.toggle('dark', resolveDark(mode))

  try {
    localStorage.setItem(MODE_STORAGE_KEY, mode)
    // Keep the legacy key roughly in sync for any old readers.
    if (mode !== 'system') {
      localStorage.setItem(LEGACY_MODE_KEY, mode)
    }
  } catch {
    // Ignore storage access failures.
  }
}

/** Apply both palette and mode together. */
export function applyTheme(palette: PaletteId, mode: ThemeMode): void {
  applyPalette(palette)
  applyMode(mode)
}

/**
 * Subscribe to OS light/dark changes. Only meaningful while the mode is
 * 'system'; callers re-check the current mode inside the callback.
 * Returns an unsubscribe function.
 */
export function watchSystemMode(callback: () => void): () => void {
  if (typeof window === 'undefined' || !window.matchMedia) {
    return () => {}
  }

  const media = window.matchMedia('(prefers-color-scheme: dark)')
  media.addEventListener('change', callback)

  return () => media.removeEventListener('change', callback)
}
