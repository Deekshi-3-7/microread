import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import {
  calculateCurrentStreak,
  calculateLongestStreak,
  buildDailyPages,
  formatDuration,
  formatShortDate,
  getTodayDate,
  formatLogTime,
  timeOfDayEmoji,
} from '../lib/readingStats'

type Member = {
  id: string
  name: string
  email: string
}

type Book = {
  id: string
  title: string
  author: string
  total_pages: number
  current_page: number
  start_date: string
  completion_date: string | null
  status: 'reading' | 'completed' | 'paused'
}

type Entry = {
  book_id: string
  reading_date: string
  pages_read: number
  minutes: number
  created_at: string
}

function compactDuration(
  minutes: number
): string {
  if (minutes < 60) {
    return `${minutes} min`
  }

  const hours = Math.floor(minutes / 60)
  const remaining = minutes % 60

  return remaining > 0
    ? `${hours}h ${remaining}m`
    : `${hours}h`
}

export default function FriendDetail() {
  const { memberId } = useParams()

  const [member, setMember] =
    useState<Member | null>(null)
  const [books, setBooks] = useState<Book[]>([])
  const [entries, setEntries] = useState<
    Entry[]
  >([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (memberId) {
      loadMember(memberId)
    }
  }, [memberId])

  async function loadMember(id: string) {
    setLoading(true)
    setError('')

    try {
      const [
        { data: memberData, error: memberError },
        { data: bookData, error: bookError },
        { data: entryData, error: entryError },
      ] = await Promise.all([
        supabase
          .from('members')
          .select('id, name, email')
          .eq('id', id)
          .single(),

        supabase
          .from('books')
          .select(
            'id, title, author, total_pages, current_page, start_date, completion_date, status'
          )
          .eq('member_id', id)
          .order('created_at', {
            ascending: false,
          }),

        supabase
          .from('reading_entries')
          .select(
            'book_id, reading_date, pages_read, minutes, created_at'
          )
          .eq('member_id', id),
      ])

      if (memberError) {
        throw memberError
      }

      if (bookError) {
        throw bookError
      }

      if (entryError) {
        throw entryError
      }

      setMember(memberData)
      setBooks((bookData ?? []) as Book[])
      setEntries((entryData ?? []) as Entry[])
    } catch (err) {
      console.error(
        'Failed to load friend detail:',
        err
      )

      setError(
        'Unable to load this reader’s journey.'
      )
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-gray-500">
          Loading reader…
        </p>
      </div>
    )
  }

  if (error || !member) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Link
          to="/friends"
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 transition hover:text-gray-900"
        >
          ← Back to Friends
        </Link>

        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
          {error || 'Reader not found.'}
        </div>
      </div>
    )
  }

  const totalPages = entries.reduce(
    (total, entry) =>
      total + Number(entry.pages_read || 0),
    0
  )

  const totalMinutes = entries.reduce(
    (total, entry) =>
      total + Number(entry.minutes || 0),
    0
  )

  const readingDays = new Set(
    entries.map((entry) => entry.reading_date)
  ).size

  const currentStreak =
    calculateCurrentStreak(entries)
  const longestStreak =
    calculateLongestStreak(entries)

  const avgPages =
    readingDays > 0
      ? Math.round(totalPages / readingDays)
      : 0
  const avgMinutes =
    readingDays > 0
      ? Math.round(totalMinutes / readingDays)
      : 0

  const currentReading = books.filter(
    (book) => book.status === 'reading'
  )

  const completedBooks = books
    .filter(
      (book) => book.status === 'completed'
    )
    .sort((a, b) =>
      (b.completion_date ?? '').localeCompare(
        a.completion_date ?? ''
      )
    )

  const journey = buildDailyPages(entries, 30)
  const journeyMax = Math.max(
    1,
    ...journey.map((item) => item.pages)
  )
  const journeyHasData = journey.some(
    (item) => item.pages > 0
  )

  const todaysEntries = entries.filter(
    (entry) =>
      entry.reading_date === getTodayDate()
  )
  const lastLogAt = todaysEntries.reduce<
    string | null
  >((latest, entry) => {
    if (!latest || entry.created_at > latest) {
      return entry.created_at
    }

    return latest
  }, null)

  const statTiles = [
    {
      label: 'Total Pages',
      value: totalPages.toLocaleString('en-IN'),
    },
    {
      label: 'Reading Time',
      value: formatDuration(totalMinutes),
    },
    {
      label: 'Reading Days',
      value: String(readingDays),
    },
    {
      label: 'Books Finished',
      value: `🏆 ${completedBooks.length}`,
    },
  ]

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link
        to="/friends"
        className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 transition hover:text-gray-900"
      >
        ← Back to Friends
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-xl font-semibold text-gray-700 dark:bg-[#cdd3dc] dark:text-[#16181d]">
            {member.name
              .charAt(0)
              .toUpperCase()}
          </div>

          <div className="min-w-0">
            <h1 className="truncate text-2xl font-bold text-gray-900">
              {member.name}
            </h1>

            <p className="truncate text-sm text-gray-500">
              {member.email}
            </p>
          </div>
        </div>

        <span
          className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold ${
            lastLogAt
              ? 'border-green-200 bg-green-50 text-green-700'
              : 'border-gray-200 bg-gray-50 text-gray-500'
          }`}
        >
          {lastLogAt
            ? `${timeOfDayEmoji(
                lastLogAt
              )} Read at ${formatLogTime(
                lastLogAt
              )}`
            : 'Not yet today'}
        </span>
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statTiles.map((tile) => (
          <div
            key={tile.label}
            className="rounded-xl border border-gray-200 bg-white p-5"
          >
            <p className="text-sm text-gray-500">
              {tile.label}
            </p>

            <p className="mt-2 text-2xl font-bold text-gray-900">
              {tile.value}
            </p>
          </div>
        ))}
      </div>

      {/* Consistency & pace */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900">
            Consistency 🔥
          </h2>

          <div className="mt-6 grid grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-gray-500">
                Current Streak
              </p>
              <p className="mt-2 text-3xl font-bold text-gray-900">
                {currentStreak}
              </p>
              <p className="text-sm text-gray-500">
                days
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">
                Longest Streak
              </p>
              <p className="mt-2 text-3xl font-bold text-gray-900">
                {longestStreak}
              </p>
              <p className="text-sm text-gray-500">
                days
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900">
            Reading Pace
          </h2>

          <div className="mt-6 grid grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-gray-500">
                Avg. Pages / Day
              </p>
              <p className="mt-2 text-3xl font-bold text-gray-900">
                {avgPages}
              </p>
              <p className="text-sm text-gray-500">
                pages
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">
                Avg. Time / Day
              </p>
              <p className="mt-2 text-3xl font-bold text-gray-900">
                {avgMinutes}
              </p>
              <p className="text-sm text-gray-500">
                minutes
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Currently reading */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900">
          Currently Reading
        </h2>

        {currentReading.length > 0 ? (
          <div className="mt-5 space-y-5">
            {currentReading.map((book) => {
              const progress =
                book.total_pages > 0
                  ? Math.round(
                      (book.current_page /
                        book.total_pages) *
                        100
                    )
                  : 0

              return (
                <div key={book.id}>
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900">
                        {book.title}
                      </h3>
                      <p className="mt-1 text-sm text-gray-500">
                        {book.author}
                      </p>
                    </div>

                    <p className="text-2xl font-bold text-gray-900">
                      {progress}%
                    </p>
                  </div>

                  <div className="mt-4 h-3 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-gray-900"
                      style={{
                        width: `${Math.min(
                          progress,
                          100
                        )}%`,
                      }}
                    />
                  </div>

                  <p className="mt-2 text-sm text-gray-500">
                    Page {book.current_page} of{' '}
                    {book.total_pages}
                  </p>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="mt-4 text-sm text-gray-500">
            No book currently in progress.
          </p>
        )}
      </div>

      {/* Reading journey */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900">
          Reading Journey 📈
        </h2>

        <p className="mt-1 text-sm text-gray-500">
          Pages per day
          {journey.length >= 30
            ? ' (last 30 days)'
            : ''}
          . Hover a bar for details.
        </p>

        {journeyHasData ? (
          <>
            <div className="mt-6 flex h-40 items-end gap-1">
              {journey.map((item) => (
                <div
                  key={item.date}
                  title={`${formatShortDate(
                    item.date
                  )} · ${item.pages} page${
                    item.pages === 1 ? '' : 's'
                  }`}
                  className="flex h-full flex-1 items-end"
                >
                  <div
                    className={`w-full rounded-t ${
                      item.pages > 0
                        ? 'bg-green-600'
                        : 'bg-gray-100'
                    }`}
                    style={{
                      height:
                        item.pages > 0
                          ? `${Math.max(
                              6,
                              (item.pages /
                                journeyMax) *
                                100
                            )}%`
                          : '3px',
                    }}
                  />
                </div>
              ))}
            </div>

            <div className="mt-2 flex justify-between text-xs text-gray-400">
              <span>
                {formatShortDate(
                  journey[0].date
                )}
              </span>
              <span>Today</span>
            </div>
          </>
        ) : (
          <p className="mt-4 text-sm text-gray-500">
            No reading logged in this window yet.
          </p>
        )}
      </div>

      {/* Completed books */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900">
          Completed Books 🏆
        </h2>

        {completedBooks.length === 0 ? (
          <p className="mt-4 text-sm text-gray-500">
            No books finished yet.
          </p>
        ) : (
          <div className="mt-5 space-y-3">
            {completedBooks.map((book) => {
              const bookEntries = entries.filter(
                (entry) =>
                  entry.book_id === book.id
              )

              const bookMinutes =
                bookEntries.reduce(
                  (total, entry) =>
                    total +
                    Number(entry.minutes || 0),
                  0
                )

              const bookReadingDays = new Set(
                bookEntries.map(
                  (entry) => entry.reading_date
                )
              ).size

              return (
                <div
                  key={book.id}
                  className="rounded-xl bg-gray-50 p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-gray-900">
                        {book.title}
                      </p>
                      <p className="truncate text-sm text-gray-500">
                        {book.author} ·{' '}
                        {book.total_pages} pages
                      </p>
                    </div>

                    <p className="shrink-0 text-sm text-gray-500">
                      {book.completion_date
                        ? `Finished ${formatShortDate(
                            book.completion_date
                          )}`
                        : ''}
                    </p>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
                    <span>
                      ⏱️{' '}
                      {compactDuration(
                        bookMinutes
                      )}{' '}
                      reading time
                    </span>

                    <span>
                      📅 {bookReadingDays} day
                      {bookReadingDays === 1
                        ? ''
                        : 's'}{' '}
                      read
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
