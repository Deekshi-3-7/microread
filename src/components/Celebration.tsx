import {
  useEffect,
  useRef,
} from 'react'
import { createPortal } from 'react-dom'

/**
 * A lightweight, dependency-free celebration overlay: confetti cannons on a
 * full-screen canvas plus a centered congratulatory card.
 *
 * - The canvas is pointer-events-none, so it never blocks the app underneath.
 * - The confetti is time-bounded (`durationMs`), but the card stays until the
 *   user dismisses it (Keep it up / ✕ / backdrop) — it never auto-closes.
 * - Respects prefers-reduced-motion: the card still shows, the confetti doesn't.
 * - Cleans up its animation frame and timers on close/unmount.
 */

type CelebrationItem = {
  title: string
  subtitle?: string
}

type CelebrationProps = {
  open: boolean
  title: string
  message: string
  lines?: string[]
  items?: CelebrationItem[]
  durationMs?: number
  onClose: () => void
}

const CONFETTI_COLORS = [
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#10b981',
  '#3b82f6',
  '#ec4899',
  '#f97316',
  '#14b8a6',
]

type Particle = {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  color: string
  rotation: number
  spin: number
  round: boolean
}

function prefersReducedMotion(): boolean {
  if (
    typeof window === 'undefined' ||
    !window.matchMedia
  ) {
    return false
  }

  return window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches
}

export default function Celebration({
  open,
  title,
  message,
  lines = [],
  items = [],
  durationMs = 5500,
  onClose,
}: CelebrationProps) {
  const canvasRef =
    useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    if (!open) {
      return
    }

    // The confetti is time-bounded, but the card stays open until the user
    // dismisses it — so there's no auto-dismiss timer here.
    if (prefersReducedMotion()) {
      return
    }

    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')

    if (!canvas || !ctx) {
      return
    }

    const width = window.innerWidth
    const height = window.innerHeight
    const dpr = Math.min(
      window.devicePixelRatio || 1,
      2
    )

    canvas.width = width * dpr
    canvas.height = height * dpr
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`
    ctx.scale(dpr, dpr)

    const particles: Particle[] = []

    const addBurst = (
      originX: number,
      angleDegrees: number
    ) => {
      for (let i = 0; i < 70; i++) {
        const angle =
          ((angleDegrees +
            (Math.random() * 40 - 20)) *
            Math.PI) /
          180

        const speed =
          6 + Math.random() * 7

        particles.push({
          x: originX,
          y: height + 10,
          vx: Math.cos(angle) * speed,
          vy: -Math.sin(angle) * speed,
          size: 6 + Math.random() * 6,
          color:
            CONFETTI_COLORS[
              Math.floor(
                Math.random() *
                  CONFETTI_COLORS.length
              )
            ],
          rotation: Math.random() * Math.PI,
          spin:
            (Math.random() - 0.5) * 0.3,
          round: Math.random() > 0.55,
        })
      }
    }

    // Two cannons firing up-and-inward, plus a second volley for richness.
    addBurst(width * 0.15, 60)
    addBurst(width * 0.85, 120)

    const secondVolley = window.setTimeout(
      () => {
        addBurst(width * 0.3, 75)
        addBurst(width * 0.7, 105)
      },
      300
    )

    const gravity = 0.18
    const start =
      typeof performance !== 'undefined'
        ? performance.now()
        : Date.now()

    let frame = 0

    const render = (now: number) => {
      const elapsed = now - start

      ctx.clearRect(0, 0, width, height)

      for (const p of particles) {
        p.vy += gravity
        p.vx *= 0.99
        p.x += p.vx
        p.y += p.vy
        p.rotation += p.spin
      }

      // Fade out over the final second.
      const alpha =
        elapsed > durationMs - 1000
          ? Math.max(
              0,
              (durationMs - elapsed) / 1000
            )
          : 1

      ctx.globalAlpha = alpha

      for (const p of particles) {
        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rotation)
        ctx.fillStyle = p.color

        if (p.round) {
          ctx.beginPath()
          ctx.arc(
            0,
            0,
            p.size / 2,
            0,
            Math.PI * 2
          )
          ctx.fill()
        } else {
          ctx.fillRect(
            -p.size / 2,
            -p.size / 4,
            p.size,
            p.size / 2
          )
        }

        ctx.restore()
      }

      ctx.globalAlpha = 1

      if (elapsed < durationMs) {
        frame =
          window.requestAnimationFrame(render)
      }
    }

    frame =
      window.requestAnimationFrame(render)

    return () => {
      window.clearTimeout(secondVolley)
      window.cancelAnimationFrame(frame)
      ctx.clearRect(0, 0, width, height)
    }
  }, [open, durationMs])

  if (!open) {
    return null
  }

  // Portal to <body> so the overlay escapes any transformed ancestor (e.g. the
  // page's animate-fade-up wrapper), which would otherwise make `fixed` resolve
  // against the tall page content and push the card far down on mobile.
  return createPortal(
    <div
      className="fixed inset-0 z-[60] overflow-y-auto"
      role="dialog"
      aria-live="polite"
      aria-label={title}
    >
      {/* Tap-anywhere-to-dismiss backdrop (very light, non-blocking feel). */}
      <button
        type="button"
        aria-label="Dismiss celebration"
        onClick={onClose}
        className="fixed inset-0 h-full w-full cursor-default bg-gray-900/10 backdrop-blur-[1px]"
      />

      <canvas
        ref={canvasRef}
        className="pointer-events-none fixed inset-0 h-full w-full"
        aria-hidden="true"
      />

      {/* Centering layer: centers the card when it fits, scrolls when it doesn't. */}
      <div className="relative flex min-h-full items-center justify-center p-4">
      <div className="animate-pop relative w-full max-w-sm rounded-3xl border border-gray-200 bg-white p-6 text-center shadow-xl sm:p-8">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
        >
          ✕
        </button>

        <div className="brand-badge mx-auto flex h-16 w-16 items-center justify-center rounded-3xl text-3xl">
          🎉
        </div>

        <h2 className="mt-4 text-2xl font-bold tracking-tight text-gray-900">
          {title}
        </h2>

        <p className="mt-2 text-sm text-gray-600">
          {message}
        </p>

        {lines.length > 0 && (
          <div className="mt-4 space-y-1 rounded-2xl bg-gray-50 p-4">
            {lines.map((line, index) => (
              <p
                key={index}
                className={
                  index === 0
                    ? 'text-sm font-semibold text-gray-900'
                    : 'text-xs text-gray-500'
                }
              >
                {line}
              </p>
            ))}
          </div>
        )}

        {items.length > 0 && (
          <div className="mt-4 max-h-52 space-y-2 overflow-y-auto">
            {items.map((item, index) => (
              <div
                key={index}
                className="brand-soft flex items-center gap-3 rounded-2xl p-3 text-left"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/70 text-lg dark:bg-black/20">
                  🏆
                </span>

                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-gray-900">
                    {item.title}
                  </p>

                  {item.subtitle && (
                    <p className="truncate text-xs text-gray-500">
                      {item.subtitle}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={onClose}
          className="btn-brand mt-6 w-full rounded-2xl px-6 py-3 text-sm font-semibold"
        >
          Keep it up 🌱
        </button>
      </div>
      </div>
    </div>,
    document.body
  )
}
