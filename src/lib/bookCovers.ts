/**
 * Look up a book's cover image from free, keyless public APIs, given its title
 * and author.
 *
 * Primary: Apple's iTunes Search API — fast (~0.5s), CORS-enabled, and its
 * artwork is served from Apple's CDN in high resolution (600×600).
 * Fallback: Open Library — broader catalog for older/obscure titles, but its
 * cover CDN is noticeably slower, so it's only used when iTunes has no match.
 *
 * Results (hits and misses) are cached in memory and localStorage, keyed by
 * title|author, so covers load instantly on re-render and revisits. All network
 * and storage access is guarded so failures degrade to "no cover", never throw.
 */

const memoryCache = new Map<string, string | null>()

// Bump the version suffix whenever the source/URL format changes, so previously
// cached URLs are re-fetched instead of reused.
function cacheKey(
  title: string,
  author: string
): string {
  return `microread-cover:v4:${title}|${author}`
    .trim()
    .toLowerCase()
}

/** Lowercase, strip accents and smart quotes, collapse whitespace. */
function normalize(value: string): string {
  return (value || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[‘’“”]/g, "'")
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

// Companion products that pollute ebook search but aren't the book itself.
const JUNK_PATTERN =
  /(summary|study guide|insights? on|workbook|companion|analysis|sparknotes|key takeaways|quicklet|conversation starters|a guide to|review and analysis|instaread|for teens|for kids)/

/**
 * Score an iTunes result against the wanted book. Rejects summaries/guides and
 * anything whose name doesn't contain the title; rewards an exact title and a
 * matching author so the real edition beats same-title look-alikes.
 */
function scoreItunesResult(
  result: {
    trackName?: string
    artistName?: string
  },
  title: string,
  author: string
): number {
  const name = normalize(result.trackName ?? '')
  const artist = normalize(result.artistName ?? '')
  const wantedTitle = normalize(title)

  if (JUNK_PATTERN.test(name) || JUNK_PATTERN.test(artist)) {
    return -1
  }

  let score: number

  if (name === wantedTitle) {
    score = 3
  } else if (name.includes(wantedTitle)) {
    score = 2
  } else {
    return -1
  }

  const authorTokens = normalize(author)
    .split(' ')
    .filter(
      (token) =>
        token.length > 2 && token !== 'and'
    )

  if (
    authorTokens.some((token) =>
      artist.includes(token)
    )
  ) {
    score += 2
  }

  return score
}

async function fromItunes(
  title: string,
  author: string
): Promise<string | null> {
  // Use only the first author — appending co-authors makes iTunes rank
  // summaries/study guides above the real book.
  const primaryAuthor =
    author.split(/\s*(?:,|&|\band\b)\s*/i)[0] ||
    author

  const term = encodeURIComponent(
    `${title} ${primaryAuthor}`.trim()
  )

  const response = await fetch(
    `https://itunes.apple.com/search?term=${term}&entity=ebook&limit=6`
  )

  if (!response.ok) {
    return null
  }

  const data = await response.json()
  const results: {
    trackName?: string
    artistName?: string
    artworkUrl100?: string
  }[] = data?.results ?? []

  let best: (typeof results)[number] | null =
    null
  let bestScore = 0

  for (const result of results) {
    const score = scoreItunesResult(
      result,
      title,
      author
    )

    if (score > bestScore) {
      bestScore = score
      best = result
    }
  }

  if (!best?.artworkUrl100) {
    return null
  }

  // Upgrade the default 100×100 thumbnail to a crisp 600×600 render.
  return best.artworkUrl100.replace(
    '100x100bb',
    '600x600bb'
  )
}

async function fromOpenLibrary(
  title: string,
  author: string
): Promise<string | null> {
  const params = `title=${encodeURIComponent(
    title
  )}&author=${encodeURIComponent(
    author
  )}&limit=1&fields=cover_i,isbn`

  const response = await fetch(
    `https://openlibrary.org/search.json?${params}`
  )

  if (!response.ok) {
    return null
  }

  const data = await response.json()
  const doc = data?.docs?.[0]

  if (doc?.cover_i) {
    return `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`
  }

  if (doc?.isbn?.[0]) {
    return `https://covers.openlibrary.org/b/isbn/${doc.isbn[0]}-L.jpg`
  }

  return null
}

export async function fetchBookCover(
  title: string,
  author: string
): Promise<string | null> {
  const key = cacheKey(title, author)

  if (memoryCache.has(key)) {
    return memoryCache.get(key) ?? null
  }

  try {
    const stored = localStorage.getItem(key)

    if (stored !== null) {
      const value = stored === '' ? null : stored
      memoryCache.set(key, value)
      return value
    }
  } catch {
    // Storage unavailable — fall through to a live lookup.
  }

  let url: string | null

  try {
    url =
      (await fromItunes(title, author)) ??
      (await fromOpenLibrary(title, author))
  } catch {
    url = null
  }

  memoryCache.set(key, url)

  try {
    localStorage.setItem(key, url ?? '')
  } catch {
    // Storage unavailable — keep the in-memory cache only.
  }

  return url
}
