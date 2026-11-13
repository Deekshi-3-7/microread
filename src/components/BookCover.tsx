import { useEffect, useState } from 'react'
import { fetchBookCover } from '../lib/bookCovers'

/**
 * A book cover that shows the real cover image (fetched by title + author from
 * free public APIs) inside the app's 3D `.book-cover` treatment. While loading,
 * or when no cover is found online, it falls back to the stylized title spine —
 * so the layout never breaks and offline/unknown books still look intentional.
 *
 * The container's aspect ratio is set inline (so it never depends on a utility
 * class being generated) and, once the image loads, is matched to the image's
 * real dimensions — so the cover fills the box completely with no letterboxing
 * and no cropping, whatever its proportions.
 */

const DEFAULT_ASPECT = '2 / 3'

type BookCoverProps = {
  title: string
  author: string
  /** Sizing + layout classes applied to the cover container. */
  className?: string
  /** Classes for the fallback title text (shown when there's no image). */
  textClassName?: string
}

export default function BookCover({
  title,
  author,
  className = '',
  textClassName = '',
}: BookCoverProps) {
  const [src, setSrc] = useState<string | null>(
    null
  )
  const [aspect, setAspect] = useState(
    DEFAULT_ASPECT
  )

  useEffect(() => {
    let active = true

    setSrc(null)
    setAspect(DEFAULT_ASPECT)

    fetchBookCover(title, author)
      .then((url) => {
        if (active) {
          setSrc(url)
        }
      })
      .catch(() => {
        // Lookup failed — the fallback spine stays.
      })

    return () => {
      active = false
    }
  }, [title, author])

  return (
    <div
      className={`book-cover ${className}`}
      style={{ aspectRatio: aspect }}
    >
      {src ? (
        <img
          src={src}
          alt={`Cover of ${title}`}
          loading="lazy"
          onLoad={(event) => {
            const image = event.currentTarget

            if (
              image.naturalWidth &&
              image.naturalHeight
            ) {
              setAspect(
                `${image.naturalWidth} / ${image.naturalHeight}`
              )
            }
          }}
          onError={() => setSrc(null)}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <span className={textClassName}>
          {title}
        </span>
      )}
    </div>
  )
}
