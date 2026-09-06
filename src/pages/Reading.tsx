import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { getTrackingStartDate } from '../lib/readingStats'

type Book = {
  id: string
  title: string
  author: string
  current_page: number
  total_pages: number
}

type ReadingEntry = {
  id: string
  book_id: string
  reading_date: string
  start_page: number
  end_page: number
  minutes: number
  takeaway: string | null
}

type Member = {
  id: string
}

type CalendarDay = {
  date: string
  isCurrentMonth: boolean
}

function getTodayDate(): string {
  const today = new Date()

  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function formatDateForDisplay(dateString: string): string {
  const date = new Date(`${dateString}T00:00:00`)

  return date.toLocaleDateString('en-IN', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

function formatMonthTitle(
  year: number,
  month: number
): string {
  const date = new Date(year, month, 1)

  return date.toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  })
}

function getDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function getCalendarDays(
  year: number,
  month: number
): CalendarDay[] {
  const firstDay = new Date(year, month, 1)
  const firstDayOfWeek = firstDay.getDay()

  const daysInMonth = new Date(
    year,
    month + 1,
    0
  ).getDate()

  const previousMonthDays =
    firstDayOfWeek === 0
      ? 0
      : firstDayOfWeek

  const days: CalendarDay[] = []

  if (previousMonthDays > 0) {
    const previousMonthLastDay = new Date(
      year,
      month,
      0
    ).getDate()

    for (
      let index = previousMonthDays;
      index > 0;
      index--
    ) {
      const day =
        previousMonthLastDay - index + 1

      const date = new Date(
        year,
        month - 1,
        day
      )

      days.push({
        date: getDateKey(date),
        isCurrentMonth: false,
      })
    }
  }

  for (
    let day = 1;
    day <= daysInMonth;
    day++
  ) {
    const date = new Date(year, month, day)

    days.push({
      date: getDateKey(date),
      isCurrentMonth: true,
    })
  }

  const remainingDays =
    days.length % 7 === 0
      ? 0
      : 7 - (days.length % 7)

  for (
    let day = 1;
    day <= remainingDays;
    day++
  ) {
    const date = new Date(
      year,
      month + 1,
      day
    )

    days.push({
      date: getDateKey(date),
      isCurrentMonth: false,
    })
  }

  return days
}

function Reading() {
  const trackingStartDate =
    getTrackingStartDate()

  const [book, setBook] = useState<Book | null>(null)
  const [loadingBook, setLoadingBook] =
    useState<boolean>(true)

  const [todayEntries, setTodayEntries] =
    useState<ReadingEntry[]>([])
  const [loadingHistory, setLoadingHistory] =
    useState<boolean>(true)

  const [calendarEntries, setCalendarEntries] =
    useState<ReadingEntry[]>([])
  const [loadingCalendar, setLoadingCalendar] =
    useState<boolean>(true)

  const [today, setToday] =
    useState<string>(getTodayDate())

  const currentDate = new Date(
    `${today}T00:00:00`
  )

  const [calendarYear, setCalendarYear] =
    useState<number>(currentDate.getFullYear())

  const [calendarMonth, setCalendarMonth] =
    useState<number>(currentDate.getMonth())

  const [selectedDate, setSelectedDate] =
    useState<string | null>(null)

  const [fromPage, setFromPage] =
    useState<string>('')

  const [toPage, setToPage] =
    useState<string>('')

  const [minutes, setMinutes] =
    useState<string>('')

  const [takeaway, setTakeaway] =
    useState<string>('')

  const [saving, setSaving] =
    useState<boolean>(false)

  const [validationError, setValidationError] =
    useState<string>('')

  const [successMessage, setSuccessMessage] =
    useState<string>('')

  const pagesRead =
    Number(toPage) >= Number(fromPage)
      ? Number(toPage) - Number(fromPage)
      : 0

  const getMember =
    async (): Promise<Member | null> => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        console.error(
          'No authenticated user found'
        )

        return null
      }

      const { data: member, error } =
        await supabase
          .from('members')
          .select('id')
          .eq('auth_user_id', user.id)
          .single()

      if (error) {
        console.error(
          'Failed to find member:',
          error
        )

        return null
      }

      return member as Member
    }

  const loadCurrentBook =
    async (): Promise<void> => {
      setLoadingBook(true)

      try {
        const member = await getMember()

        if (!member) {
          return
        }

        const { data, error } =
          await supabase
            .from('books')
            .select(
              'id, title, author, current_page, total_pages'
            )
            .eq('member_id', member.id)
            .eq('status', 'reading')
            .order('created_at', {
              ascending: false,
            })
            .limit(1)
            .single()

        if (error) {
          console.error(
            'Failed to load current book:',
            error
          )

          return
        }

        const currentBook = data as Book

        setBook(currentBook)

        setFromPage(
          String(currentBook.current_page)
        )

        setToPage(
          String(currentBook.current_page)
        )
      } catch (error: unknown) {
        console.error(
          'Unexpected error while loading book:',
          error
        )
      } finally {
        setLoadingBook(false)
      }
    }

  const loadTodayHistory =
    async (): Promise<void> => {
      setLoadingHistory(true)

      try {
        const member = await getMember()

        if (!member) {
          return
        }

        const currentToday = getTodayDate()

        setToday(currentToday)

        const { data, error } =
          await supabase
            .from('reading_entries')
            .select(
              'id, book_id, reading_date, start_page, end_page, minutes, takeaway'
            )
            .eq('member_id', member.id)
            .eq(
              'reading_date',
              currentToday
            )
            .order('created_at', {
              ascending: false,
            })

        if (error) {
          console.error(
            "Failed to load today's reading history:",
            error
          )

          return
        }

        setTodayEntries(
          (data ?? []) as ReadingEntry[]
        )
      } catch (error: unknown) {
        console.error(
          "Unexpected error while loading today's history:",
          error
        )
      } finally {
        setLoadingHistory(false)
      }
    }

  const loadCalendarEntries =
    async (): Promise<void> => {
      setLoadingCalendar(true)

      try {
        const member = await getMember()

        if (!member) {
          return
        }

        const firstDay = new Date(
          calendarYear,
          calendarMonth,
          1
        )

        const lastDay = new Date(
          calendarYear,
          calendarMonth + 1,
          0
        )

        const startDate = getDateKey(firstDay)
        const endDate = getDateKey(lastDay)

        const { data, error } =
          await supabase
            .from('reading_entries')
            .select(
              'id, book_id, reading_date, start_page, end_page, minutes, takeaway'
            )
            .eq('member_id', member.id)
            .gte(
              'reading_date',
              startDate
            )
            .lte(
              'reading_date',
              endDate
            )
            .order('reading_date', {
              ascending: true,
            })

        if (error) {
          console.error(
            'Failed to load calendar entries:',
            error
          )

          return
        }

        setCalendarEntries(
          (data ?? []) as ReadingEntry[]
        )
      } catch (error: unknown) {
        console.error(
          'Unexpected error while loading calendar:',
          error
        )
      } finally {
        setLoadingCalendar(false)
      }
    }

  useEffect(() => {
    const loadPage = async (): Promise<void> => {
      await loadCurrentBook()
      await loadTodayHistory()
    }

    void loadPage()
  }, [])

  useEffect(() => {
    void loadCalendarEntries()
  }, [calendarYear, calendarMonth])

  const handlePreviousMonth = (): void => {
    if (calendarMonth === 0) {
      setCalendarMonth(11)
      setCalendarYear(
        (currentYear) => currentYear - 1
      )
    } else {
      setCalendarMonth(
        (currentMonth) => currentMonth - 1
      )
    }

    setSelectedDate(null)
  }

  const handleNextMonth = (): void => {
    if (calendarMonth === 11) {
      setCalendarMonth(0)
      setCalendarYear(
        (currentYear) => currentYear + 1
      )
    } else {
      setCalendarMonth(
        (currentMonth) => currentMonth + 1
      )
    }

    setSelectedDate(null)
  }

  const handleGoToToday = (): void => {
    const currentToday = getTodayDate()
    const currentTodayDate = new Date(
      `${currentToday}T00:00:00`
    )

    setToday(currentToday)

    setCalendarYear(
      currentTodayDate.getFullYear()
    )

    setCalendarMonth(
      currentTodayDate.getMonth()
    )

    setSelectedDate(currentToday)
  }

  const handleSaveReading = async (
    event: React.FormEvent<HTMLFormElement>
  ): Promise<void> => {
    event.preventDefault()

    setValidationError('')
    setSuccessMessage('')

    if (!book) {
      setValidationError(
        'No current book found.'
      )

      return
    }

    const start = Number(fromPage)
    const end = Number(toPage)
    const readingMinutes = Number(minutes)

    if (!Number.isInteger(start) || start < 1) {
      setValidationError(
        'From Page must be a valid page number.'
      )

      return
    }

    if (!Number.isInteger(end) || end < 1) {
      setValidationError(
        'To Page must be a valid page number.'
      )

      return
    }

    if (end < start) {
      setValidationError(
        'To Page cannot be less than From Page.'
      )

      return
    }

    if (start > book.total_pages) {
      setValidationError(
        `From Page cannot be greater than ${book.total_pages}.`
      )

      return
    }

    if (end > book.total_pages) {
      setValidationError(
        `To Page cannot be greater than ${book.total_pages}.`
      )

      return
    }

    if (
      !Number.isInteger(readingMinutes) ||
      readingMinutes <= 0
    ) {
      setValidationError(
        'Reading Time must be greater than 0 minutes.'
      )

      return
    }

    if (end === start) {
      setValidationError(
        'Please enter the page you reached after reading.'
      )

      return
    }

    setSaving(true)

    try {
      const member = await getMember()

      if (!member) {
        setValidationError(
          'Unable to find your member account.'
        )

        return
      }

      const currentToday = getTodayDate()

      const savedPages = end - start

      const { error: readingError } =
        await supabase
          .from('reading_entries')
          .insert({
            member_id: member.id,
            book_id: book.id,
            reading_date: currentToday,
            start_page: start,
            end_page: end,
            minutes: readingMinutes,
            takeaway:
              takeaway.trim() || null,
          })

      if (readingError) {
        console.error(
          'Failed to save reading:',
          readingError
        )

        if (
          readingError.code === '23505'
        ) {
          setValidationError(
            'You have already logged reading for this book today.'
          )
        } else {
          setValidationError(
            'Unable to save your reading. Please try again.'
          )
        }

        return
      }

      const {
        error: bookUpdateError,
      } = await supabase
        .from('books')
        .update({
          current_page: end,
        })
        .eq('id', book.id)

      if (bookUpdateError) {
        console.error(
          'Reading was saved, but current page could not be updated:',
          bookUpdateError
        )

        setValidationError(
          'Reading was saved, but the book progress could not be updated.'
        )

        return
      }

      setBook({
        ...book,
        current_page: end,
      })

      setFromPage(String(end))
      setToPage(String(end))
      setMinutes('')
      setTakeaway('')

      setSuccessMessage(
        `Reading saved successfully! You read ${savedPages} pages today.`
      )

      await loadTodayHistory()
      await loadCalendarEntries()
    } catch (error: unknown) {
      console.error(
        'Unexpected error while saving reading:',
        error
      )

      setValidationError(
        'Something went wrong while saving your reading.'
      )
    } finally {
      setSaving(false)
    }
  }

  const calendarDays =
    getCalendarDays(
      calendarYear,
      calendarMonth
    )

  const entriesByDate =
    new Map<string, ReadingEntry[]>()

  calendarEntries.forEach((entry) => {
    const existing =
      entriesByDate.get(
        entry.reading_date
      ) ?? []

    existing.push(entry)

    entriesByDate.set(
      entry.reading_date,
      existing
    )
  })

  const selectedDateEntries =
    selectedDate
      ? entriesByDate.get(selectedDate) ?? []
      : []

  const isCurrentMonth =
    calendarYear ===
      currentDate.getFullYear() &&
    calendarMonth ===
      currentDate.getMonth()

  const daysInSelectedMonth =
    new Date(
      calendarYear,
      calendarMonth + 1,
      0
    ).getDate()

  const trackedCalendarEntries =
    calendarEntries.filter(
      (entry) =>
        entry.reading_date >=
        trackingStartDate
    )

  const consideredCalendarEntries =
    trackedCalendarEntries.filter(
      (entry) => {
        if (!isCurrentMonth) {
          return true
        }

        return entry.reading_date <= today
      }
    )

  const readingDays = new Set(
    consideredCalendarEntries.map(
      (entry) => entry.reading_date
    )
  ).size

  const daysConsidered =
    calendarYear ===
        new Date(
          `${trackingStartDate}T00:00:00`
        ).getFullYear() &&
    calendarMonth ===
        new Date(
          `${trackingStartDate}T00:00:00`
        ).getMonth()
      ? Math.max(
          currentDate.getDate() -
            Number(
              trackingStartDate.slice(-2)
            ) +
            1,
          0
        )
      : isCurrentMonth
        ? currentDate.getDate()
        : daysInSelectedMonth

  const effectiveDaysConsidered =
    calendarYear <
        new Date(
          `${trackingStartDate}T00:00:00`
        ).getFullYear() ||
    (calendarYear ===
        new Date(
          `${trackingStartDate}T00:00:00`
        ).getFullYear() &&
      calendarMonth <
        new Date(
          `${trackingStartDate}T00:00:00`
        ).getMonth())
      ? 0
      : daysConsidered

  const noReadingDays = Math.max(
    effectiveDaysConsidered -
      readingDays,
    0
  )

  const totalPagesRead =
    consideredCalendarEntries.reduce(
      (total, entry) =>
        total +
        (entry.end_page - entry.start_page),
      0
    )

  const totalMinutes =
    consideredCalendarEntries.reduce(
      (total, entry) =>
        total + entry.minutes,
      0
    )

  if (loadingBook) {
    return (
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          My Reading
        </h1>

        <p className="mt-2 text-gray-600">
          Loading your current book...
        </p>
      </div>
    )
  }

  if (!book) {
    return (
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          My Reading
        </h1>

        <p className="mt-2 text-gray-600">
          You don't have a book currently marked
          as reading.
        </p>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900">
        My Reading
      </h1>

      <p className="mt-2 text-gray-600">
        Track your daily reading progress.
      </p>

      {/* Today's Reading */}
      <div className="mt-8 rounded-2xl bg-white p-6 shadow-sm">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            Today's Reading
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            {new Date().toLocaleDateString(
              'en-IN',
              {
                weekday: 'long',
                day: '2-digit',
                month: 'long',
                year: 'numeric',
              }
            )}
          </p>
        </div>

        {successMessage && (
          <div className="mt-6 rounded-lg bg-green-50 p-4 text-sm text-green-700">
            ✓ {successMessage}
          </div>
        )}

        <div className="mt-6 rounded-xl border border-gray-200 p-5">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {book.title}
            </h3>

            <p className="mt-1 text-sm text-gray-500">
              {book.author}
            </p>

            <p className="mt-3 text-sm text-gray-600">
              Current page: {book.current_page} /{' '}
              {book.total_pages}
            </p>
          </div>

          <form
            onSubmit={handleSaveReading}
            className="mt-6"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="fromPage"
                  className="block text-sm font-medium text-gray-700"
                >
                  From Page
                </label>

                <input
                  id="fromPage"
                  type="number"
                  min="1"
                  max={book.total_pages}
                  value={fromPage}
                  onChange={(event) => {
                    setFromPage(
                      event.target.value
                    )
                    setValidationError('')
                    setSuccessMessage('')
                  }}
                  className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-black"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="toPage"
                  className="block text-sm font-medium text-gray-700"
                >
                  To Page
                </label>

                <input
                  id="toPage"
                  type="number"
                  min="1"
                  max={book.total_pages}
                  value={toPage}
                  onChange={(event) => {
                    setToPage(
                      event.target.value
                    )
                    setValidationError('')
                    setSuccessMessage('')
                  }}
                  className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-black"
                  required
                />
              </div>
            </div>

            <div className="mt-4 rounded-lg bg-gray-50 p-4">
              <p className="text-sm text-gray-500">
                Pages Read
              </p>

              <p className="mt-1 text-2xl font-bold text-gray-900">
                {pagesRead}
              </p>
            </div>

            <div className="mt-4">
              <label
                htmlFor="minutes"
                className="block text-sm font-medium text-gray-700"
              >
                Reading Time
              </label>

              <input
                id="minutes"
                type="number"
                min="1"
                placeholder="Minutes"
                value={minutes}
                onChange={(event) => {
                  setMinutes(
                    event.target.value
                  )
                  setValidationError('')
                  setSuccessMessage('')
                }}
                className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-black"
                required
              />
            </div>

            <div className="mt-4">
              <label
                htmlFor="takeaway"
                className="block text-sm font-medium text-gray-700"
              >
                Takeaway
                <span className="ml-1 text-gray-400">
                  (optional)
                </span>
              </label>

              <textarea
                id="takeaway"
                rows={4}
                placeholder="What did you learn today?"
                value={takeaway}
                onChange={(event) => {
                  setTakeaway(
                    event.target.value
                  )
                  setValidationError('')
                  setSuccessMessage('')
                }}
                className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-black"
              />
            </div>

            {validationError && (
              <div className="mt-4 rounded-lg bg-red-50 p-4 text-sm text-red-700">
                {validationError}
              </div>
            )}

            <button
              type="submit"
              disabled={saving}
              className="mt-6 w-full rounded-lg bg-black px-5 py-3 font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving
                ? 'Saving...'
                : 'Save Reading'}
            </button>
          </form>
        </div>

        {/* Today's Reading History */}
        <div className="mt-8">
          <h2 className="text-xl font-semibold text-gray-900">
            Today's Reading History
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Your reading activity logged today.
          </p>

          {loadingHistory ? (
            <div className="mt-4 rounded-xl border border-gray-200 p-5">
              <p className="text-sm text-gray-500">
                Loading today's reading history...
              </p>
            </div>
          ) : todayEntries.length === 0 ? (
            <div className="mt-4 rounded-xl border border-dashed border-gray-300 p-5">
              <p className="text-sm text-gray-500">
                No reading logged today yet.
              </p>
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              {todayEntries.map((entry) => {
                const entryPages =
                  entry.end_page -
                  entry.start_page

                return (
                  <div
                    key={entry.id}
                    className="rounded-xl border border-gray-200 p-5"
                  >
                    <h3 className="font-semibold text-gray-900">
                      📖 {book.title}
                    </h3>

                    <p className="mt-2 text-sm text-gray-600">
                      Pages: {entry.start_page} →{' '}
                      {entry.end_page} ·{' '}
                      {entryPages}{' '}
                      {entryPages === 1
                        ? 'page'
                        : 'pages'}
                    </p>

                    <p className="mt-1 text-sm text-gray-600">
                      Time: {entry.minutes}{' '}
                      {entry.minutes === 1
                        ? 'minute'
                        : 'minutes'}
                    </p>

                    {entry.takeaway && (
                      <div className="mt-4 rounded-lg bg-gray-50 p-4">
                        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                          Takeaway
                        </p>

                        <p className="mt-1 text-sm text-gray-700">
                          {entry.takeaway}
                        </p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Reading Calendar */}
      <div className="mt-8 rounded-2xl bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Reading Calendar
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Tracking started on September 6,
              2026.
            </p>
          </div>

          <button
            type="button"
            onClick={handleGoToToday}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Go to Today
          </button>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <button
            type="button"
            onClick={handlePreviousMonth}
            className="rounded-lg border border-gray-200 px-3 py-2 text-gray-700 hover:bg-gray-50"
            aria-label="Previous month"
          >
            ←
          </button>

          <h3 className="text-lg font-semibold text-gray-900">
            {formatMonthTitle(
              calendarYear,
              calendarMonth
            )}
          </h3>

          <button
            type="button"
            onClick={handleNextMonth}
            className="rounded-lg border border-gray-200 px-3 py-2 text-gray-700 hover:bg-gray-50"
            aria-label="Next month"
          >
            →
          </button>
        </div>

        {loadingCalendar ? (
          <div className="mt-6 rounded-xl border border-gray-200 p-5">
            <p className="text-sm text-gray-500">
              Loading reading calendar...
            </p>
          </div>
        ) : (
          <>
            <div className="mt-6 grid grid-cols-7 gap-2 text-center">
              {[
                'Sun',
                'Mon',
                'Tue',
                'Wed',
                'Thu',
                'Fri',
                'Sat',
              ].map((day) => (
                <div
                  key={day}
                  className="py-2 text-xs font-semibold text-gray-500"
                >
                  {day}
                </div>
              ))}

              {calendarDays.map((calendarDay) => {
                const date =
                  calendarDay.date

                const entries =
                  entriesByDate.get(date) ?? []

                const hasReading =
                  entries.length > 0

                const isBeforeTracking =
                  date < trackingStartDate

                const isToday =
                  date === today

                const isFuture =
                  date > today

                const isPastWithoutReading =
                  !isBeforeTracking &&
                  calendarDay.isCurrentMonth &&
                  !hasReading &&
                  !isToday &&
                  !isFuture

                const isSelected =
                  selectedDate === date

                return (
                  <button
                    type="button"
                    key={date}
                    disabled={
                      !calendarDay.isCurrentMonth
                    }
                    onClick={() => {
                      if (
                        calendarDay.isCurrentMonth
                      ) {
                        setSelectedDate(date)
                      }
                    }}
                    className={`relative flex min-h-[52px] flex-col items-center justify-center rounded-lg border p-1 transition sm:min-h-[64px] ${
                      !calendarDay.isCurrentMonth
                        ? 'border-transparent text-gray-300'
                        : isSelected
                          ? isBeforeTracking
                            ? 'border-gray-400 bg-gray-400 text-white'
                            : hasReading
                              ? 'border-gray-900 bg-gray-900 text-white'
                              : isPastWithoutReading
                                ? 'border-red-600 bg-red-600 text-white'
                                : isToday
                                  ? 'border-yellow-500 bg-yellow-500 text-white'
                                  : 'border-gray-900 bg-gray-900 text-white'
                          : isBeforeTracking
                            ? 'border-gray-100 bg-gray-50 text-gray-300'
                            : hasReading
                              ? 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100'
                              : isToday
                                ? 'border-yellow-300 bg-yellow-50 text-yellow-700 hover:bg-yellow-100'
                                : isFuture
                                  ? 'border-transparent bg-white text-gray-300'
                                  : 'border-red-200 bg-red-50 text-red-600 hover:bg-red-100'
                    }`}
                  >
                    <span className="text-sm font-medium">
                      {Number(
                        date.slice(-2)
                      )}
                    </span>

                    <span className="mt-1 text-sm">
                      {isBeforeTracking
                        ? '—'
                        : isFuture
                          ? '—'
                          : hasReading
                            ? '✓'
                            : isToday
                              ? '⏳'
                              : '✕'}
                    </span>
                  </button>
                )
              })}
            </div>

            {/* Calendar Legend */}
            <div className="mt-6 flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-green-600">
                  ✓
                </span>
                <span className="text-gray-600">
                  Read
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-red-600">
                  ✕
                </span>
                <span className="text-gray-600">
                  No reading recorded
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-yellow-600">
                  ⏳
                </span>
                <span className="text-gray-600">
                  Today
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-gray-400">
                  —
                </span>
                <span className="text-gray-600">
                  Not tracked / Future
                </span>
              </div>
            </div>

            {/* Monthly Summary */}
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl bg-green-50 p-4">
                <p className="text-sm text-green-700">
                  Reading Days
                </p>

                <p className="mt-1 text-2xl font-bold text-green-800">
                  {readingDays}
                </p>
              </div>

              <div className="rounded-xl bg-red-50 p-4">
                <p className="text-sm text-red-700">
                  No Reading
                </p>

                <p className="mt-1 text-2xl font-bold text-red-800">
                  {noReadingDays}
                </p>
              </div>

              <div className="rounded-xl bg-gray-50 p-4">
                <p className="text-sm text-gray-600">
                  Pages Read
                </p>

                <p className="mt-1 text-2xl font-bold text-gray-900">
                  {totalPagesRead}
                </p>
              </div>
            </div>

            <div className="mt-3 rounded-xl bg-gray-50 p-4">
              <p className="text-sm text-gray-600">
                Reading time this month
              </p>

              <p className="mt-1 text-xl font-bold text-gray-900">
                {totalMinutes} minutes
              </p>
            </div>

            {/* Selected Day */}
            {selectedDate && (
              <div className="mt-6 border-t border-gray-200 pt-6">
                <h3 className="text-lg font-semibold text-gray-900">
                  Reading Details
                </h3>

                <p className="mt-1 text-sm text-gray-500">
                  {formatDateForDisplay(
                    selectedDate
                  )}
                </p>

                {selectedDate <
                trackingStartDate ? (
                  <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <p className="font-medium text-gray-500">
                      — Not tracked
                    </p>

                    <p className="mt-1 text-sm text-gray-500">
                      MicroRead tracking started
                      on September 6, 2026.
                    </p>
                  </div>
                ) : selectedDateEntries.length >
                  0 ? (
                  <div className="mt-4 space-y-4">
                    {selectedDateEntries.map(
                      (entry) => {
                        const entryPages =
                          entry.end_page -
                          entry.start_page

                        return (
                          <div
                            key={entry.id}
                            className="rounded-xl border border-green-200 bg-green-50 p-4"
                          >
                            <p className="font-medium text-green-800">
                              ✓ Reading completed
                            </p>

                            <p className="mt-3 text-sm text-gray-700">
                              📖 {book.title}
                            </p>

                            <p className="mt-1 text-sm text-gray-600">
                              Pages:{' '}
                              {
                                entry.start_page
                              } →{' '}
                              {
                                entry.end_page
                              }{' '}
                              · {entryPages}{' '}
                              {entryPages ===
                              1
                                ? 'page'
                                : 'pages'}
                            </p>

                            <p className="mt-1 text-sm text-gray-600">
                              Time:{' '}
                              {entry.minutes}{' '}
                              {entry.minutes ===
                              1
                                ? 'minute'
                                : 'minutes'}
                            </p>

                            {entry.takeaway && (
                              <div className="mt-4 rounded-lg bg-white p-4">
                                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                  Takeaway
                                </p>

                                <p className="mt-1 text-sm text-gray-700">
                                  {
                                    entry.takeaway
                                  }
                                </p>
                              </div>
                            )}
                          </div>
                        )
                      }
                    )}
                  </div>
                ) : selectedDate === today ? (
                  <div className="mt-4 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
                    <p className="font-medium text-yellow-700">
                      ⏳ Not updated yet
                    </p>

                    <p className="mt-1 text-sm text-yellow-700">
                      Your next small step can
                      start today. 🌱
                    </p>
                  </div>
                ) : selectedDate < today ? (
                  <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4">
                    <p className="font-medium text-red-700">
                      ✕ No reading recorded
                    </p>

                    <p className="mt-1 text-sm text-red-600">
                      You didn't read on this
                      day.
                    </p>

                    <p className="mt-1 text-sm text-red-600">
                      That's okay. Start again
                      today. 🌱
                    </p>
                  </div>
                ) : (
                  <div className="mt-4 rounded-lg bg-gray-50 p-4">
                    <p className="font-medium text-gray-500">
                      — Future day
                    </p>

                    <p className="mt-1 text-sm text-gray-500">
                      Your next reading step is
                      still ahead.
                    </p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default Reading