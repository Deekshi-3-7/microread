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