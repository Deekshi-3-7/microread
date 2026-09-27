const TRACKING_START_DATE = '2026-09-06'

export function getTrackingStartDate(): string {
  return TRACKING_START_DATE
}

export function getTodayDate(): string {
  const today = new Date()

  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

export function getPreviousDate(dateString: string): string {
  const date = new Date(`${dateString}T00:00:00`)

  date.setDate(date.getDate() - 1)

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

export function calculateCurrentStreak(
  entries: { reading_date: string }[]
): number {
  if (entries.length === 0) {
    return 0
  }

  const uniqueDates = Array.from(
    new Set(
      entries
        .map((entry) => entry.reading_date)
        .filter(
          (date) =>
            date >= TRACKING_START_DATE
        )
    )
  ).sort((a, b) => b.localeCompare(a))

  if (uniqueDates.length === 0) {
    return 0
  }

  const today = getTodayDate()

  // A current streak can continue from today or yesterday.
  if (
    uniqueDates[0] !== today &&
    uniqueDates[0] !== getPreviousDate(today)
  ) {
    return 0
  }

  let streak = 1

  for (
    let index = 1;
    index < uniqueDates.length;
    index++
  ) {
    const previousDate = uniqueDates[index - 1]
    const currentDate = uniqueDates[index]

    // Never allow the streak calculation to move
    // before the official MicroRead tracking date.
    if (
      currentDate < TRACKING_START_DATE
    ) {
      break
    }

    if (
      currentDate ===
      getPreviousDate(previousDate)
    ) {
      streak++
    } else {
      break
    }
  }

  return streak
}

export function formatLogTime(
  timestamp: string
): string {
  return new Date(timestamp).toLocaleTimeString(
    'en-IN',
    {
      hour: 'numeric',
      minute: '2-digit',
    }
  )
}

export function timeOfDayEmoji(
  timestamp: string
): string {
  const hour = new Date(timestamp).getHours()

  if (hour >= 5 && hour < 12) {
    return '☀️'
  }

  if (hour >= 12 && hour < 17) {
    return '🌤️'
  }

  if (hour >= 17 && hour < 21) {
    return '🌆'
  }

  return '🌙'
}

export function calculateLongestStreak(
  entries: { reading_date: string }[]
): number {
  const uniqueDates = Array.from(
    new Set(
      entries
        .map((entry) => entry.reading_date)
        .filter(
          (date) => date >= TRACKING_START_DATE
        )
    )
  ).sort()

  if (uniqueDates.length === 0) {
    return 0
  }

  let longest = 1
  let current = 1

  for (
    let index = 1;
    index < uniqueDates.length;
    index++
  ) {
    if (
      getPreviousDate(uniqueDates[index]) ===
      uniqueDates[index - 1]
    ) {
      current++

      if (current > longest) {
        longest = current
      }
    } else {
      current = 1
    }
  }

  return longest
}

export function formatDuration(
  minutes: number
): string {
  if (minutes < 60) {
    return `${minutes} min`
  }

  const hours = Math.floor(minutes / 60)
  const remaining = minutes % 60

  return `${hours}h ${remaining}m · ${minutes} min`
}

export function formatShortDate(
  dateKey: string
): string {
  return new Date(
    `${dateKey}T00:00:00`
  ).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  })
}

export function buildDailyPages(
  entries: {
    reading_date: string
    pages_read?: number | null
  }[],
  windowDays: number
): { date: string; pages: number }[] {
  const pagesByDate = new Map<string, number>()

  entries.forEach((entry) => {
    pagesByDate.set(
      entry.reading_date,
      (pagesByDate.get(entry.reading_date) ??
        0) + Number(entry.pages_read || 0)
    )
  })

  const days: string[] = []
  let cursor = getTodayDate()

  for (
    let index = 0;
    index < windowDays;
    index++
  ) {
    if (cursor >= TRACKING_START_DATE) {
      days.push(cursor)
    }

    cursor = getPreviousDate(cursor)
  }

  days.reverse()

  return days.map((date) => ({
    date,
    pages: pagesByDate.get(date) ?? 0,
  }))
}