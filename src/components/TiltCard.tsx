import type { ReactNode } from 'react'
import { useTilt } from '../lib/useTilt'

type TiltCardProps = {
  children: ReactNode
  className?: string
  /** max rotation in degrees (desktop fine-pointer only) */
  max?: number
}

/**
 * A card that gently tilts toward the cursor on desktop. Pairs the
 * `useTilt` hook with the `.tilt` CSS class; on touch / reduced-motion
 * it just renders a normal card.
 */
export default function TiltCard({
  children,
  className = '',
  max = 6,
}: TiltCardProps) {
  const ref = useTilt<HTMLDivElement>(max)

  return (
    <div ref={ref} className={`tilt ${className}`}>
      {children}
    </div>
  )
}
