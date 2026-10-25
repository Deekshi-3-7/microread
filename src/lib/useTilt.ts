import { useEffect, useRef } from 'react'

/**
 * Cursor-responsive 3D tilt for a card. Attach the returned ref to an
 * element that also has the `.tilt` CSS class; on pointer move this sets
 * the `--rx` / `--ry` custom properties the class reads.
 *
 * It no-ops on touch / coarse-pointer devices and when the user prefers
 * reduced motion, so the effect is desktop-only and never gets in the
 * way of tapping or scrolling.
 */
export function useTilt<T extends HTMLElement>(max = 6) {
  const ref = useRef<T>(null)

  useEffect(() => {
    const el = ref.current

    if (!el || typeof window === 'undefined' || !window.matchMedia) {
      return
    }

    const finePointer = window.matchMedia(
      '(hover: hover) and (pointer: fine)'
    ).matches

    const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches

    if (!finePointer || reducedMotion) {
      return
    }

    function handleMove(event: MouseEvent) {
      if (!el) return

      const rect = el.getBoundingClientRect()
      const px = (event.clientX - rect.left) / rect.width
      const py = (event.clientY - rect.top) / rect.height

      const rotateY = (px - 0.5) * 2 * max
      const rotateX = (0.5 - py) * 2 * max

      el.style.setProperty('--rx', `${rotateY.toFixed(2)}deg`)
      el.style.setProperty('--ry', `${rotateX.toFixed(2)}deg`)
    }

    function handleLeave() {
      if (!el) return

      el.style.setProperty('--rx', '0deg')
      el.style.setProperty('--ry', '0deg')
    }

    el.addEventListener('mousemove', handleMove)
    el.addEventListener('mouseleave', handleLeave)

    return () => {
      el.removeEventListener('mousemove', handleMove)
      el.removeEventListener('mouseleave', handleLeave)
    }
  }, [max])

  return ref
}
