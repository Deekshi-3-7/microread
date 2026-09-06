import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { calculateCurrentStreak } from '../lib/readingStats'

type Book = {
  id: string
  title: string
  author: string
  total_pages: number
  current_page: number
  status: 'reading' | 'completed' | 'paused'
}

type ReadingEntry = {
  reading_date: string
  pages_read: number
  minutes: number
}

type MonthlyStat = {
  month: string
  pages: number
  minutes: number
  days: number
}

function calculateLongestStreak(
  entries: ReadingEntry[]
): number {
  const uniqueDates = Array.from(
    new Set(
      entries.map(
        (entry) => entry.reading_date
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
    const previous = new Date(
      uniqueDates[index - 1]
    )

    const currentDate = new Date(
      uniqueDates[index]
    )

    const difference =
      Math.round(
        (currentDate.getTime() -
          previous.getTime()) /
          (1000 * 60 * 60 * 24)
      )

    if (difference === 1) {
      current++
      longest = Math.max(
        longest,
        current
      )
    } else {
      current = 1
    }
  }

  return longest
}

function formatMonth(
  month: string
): string {
  const date = new Date(
    month + '-01'
  )

  return date.toLocaleDateString(
    'en-IN',
    {
      month: 'long',
      year: 'numeric',
    }
  )
}

export default function Insights() {
  const [entries, setEntries] =
    useState<ReadingEntry[]>([])

  const [currentBook, setCurrentBook] =
    useState<Book | null>(null)

  const [completedBooks, setCompletedBooks] =
    useState(0)

  const [loading, setLoading] =
    useState(true)

  const [errorMessage, setErrorMessage] =
    useState('')

  useEffect(() => {
    loadInsights()
  }, [])

  async function loadInsights() {
    setLoading(true)
    setErrorMessage('')

    try {
      const {
        data: userData,
        error: userError,
      } = await supabase.auth.getUser()

      if (userError) {
        throw userError
      }

      const user = userData.user

      if (!user) {
        throw new Error(
          'User is not logged in.'
        )
      }

      const {
        data: memberData,
        error: memberError,
      } = await supabase
        .from('members')
        .select('id')
        .eq(
          'auth_user_id',
          user.id
        )
        .single()

      if (memberError) {
        throw memberError
      }

      const memberId = memberData.id

      const [
        {
          data: entriesData,
          error: entriesError,
        },
        {
          data: booksData,
          error: booksError,
        },
      ] = await Promise.all([
        supabase
          .from('reading_entries')
          .select(
            'reading_date, pages_read, minutes'
          )
          .eq(
            'member_id',
            memberId
          )
          .order(
            'reading_date',
            {
              ascending: true,
            }
          ),

        supabase
          .from('books')
          .select(
            'id, title, author, total_pages, current_page, status'
          )
          .eq(
            'member_id',
            memberId
          ),
      ])

      if (entriesError) {
        throw entriesError
      }

      if (booksError) {
        throw booksError
      }

      const readingEntries =
        (entriesData ??
          []) as ReadingEntry[]

      const books =
        (booksData ?? []) as Book[]

      setEntries(readingEntries)

      const readingBook =
        books.find(
          (book) =>
            book.status ===
            'reading'
        ) ?? null

      setCurrentBook(
        readingBook
      )

      setCompletedBooks(
        books.filter(
          (book) =>
            book.status ===
            'completed'
        ).length
      )
    } catch (error) {
      console.error(
        'Error loading insights:',
        error
      )

      setErrorMessage(
        'Unable to load your reading insights. Please try again.'
      )
    } finally {
      setLoading(false)
    }
  }

  const totalPages =
    entries.reduce(
      (total, entry) =>
        total +
        Number(
          entry.pages_read || 0
        ),
      0
    )

  const totalMinutes =
    entries.reduce(
      (total, entry) =>
        total +
        Number(
          entry.minutes || 0
        ),
      0
    )

  const readingDays =
    new Set(
      entries.map(
        (entry) =>
          entry.reading_date
      )
    ).size

  const currentStreak =
    calculateCurrentStreak(
      entries
    )

  const longestStreak =
    calculateLongestStreak(
      entries
    )

  const averagePages =
    readingDays > 0
      ? Math.round(
          totalPages /
            readingDays
        )
      : 0

  const averageMinutes =
    readingDays > 0
      ? Math.round(
          totalMinutes /
            readingDays
        )
      : 0

  const currentBookProgress =
    currentBook &&
    currentBook.total_pages > 0
      ? Math.round(
          (currentBook.current_page /
            currentBook.total_pages) *
            100
        )
      : 0

  const monthlyMap =
    new Map<
      string,
      MonthlyStat
    >()

  entries.forEach(
    (entry) => {
      const month =
        entry.reading_date.substring(
          0,
          7
        )

      const existing =
        monthlyMap.get(month)

      if (existing) {
        existing.pages +=
          Number(
            entry.pages_read ||
              0
          )

        existing.minutes +=
          Number(
            entry.minutes ||
              0
          )

        existing.days =
          new Set(
            entries
              .filter(
                (item) =>
                  item.reading_date.substring(
                    0,
                    7
                  ) === month
              )
              .map(
                (item) =>
                  item.reading_date
              )
          ).size
      } else {
        monthlyMap.set(
          month,
          {
            month,
            pages: Number(
              entry.pages_read ||
                0
            ),
            minutes: Number(
              entry.minutes ||
                0
            ),
            days: 1,
          }
        )
      }
    }
  )

  const monthlyStats =
    Array.from(
      monthlyMap.values()
    ).sort((a, b) =>
      b.month.localeCompare(
        a.month
      )
    )

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Insights
          </h1>

          <p className="mt-1 text-gray-600">
            Understand your reading
            journey and consistency.
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
          <p className="text-gray-500">
            Loading your reading
            insights...
          </p>
        </div>
      </div>
    )
  }

  if (errorMessage) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Insights
          </h1>

          <p className="mt-1 text-gray-600">
            Understand your reading
            journey and consistency.
          </p>
        </div>

        <div className="rounded-xl border border-red-200 bg-red-50 p-6">
          <p className="text-red-700">
            {errorMessage}
          </p>

          <button
            onClick={
              loadInsights
            }
            className="mt-4 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Insights
        </h1>

        <p className="mt-1 text-gray-600">
          Understand your reading
          journey and consistency.
        </p>
      </div>

      {/* Main metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-sm text-gray-500">
            Total Pages
          </p>

          <p className="mt-2 text-3xl font-bold text-gray-900">
            {totalPages}
          </p>

          <p className="mt-1 text-xs text-gray-500">
            pages read
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-sm text-gray-500">
            Reading Time
          </p>

          <p className="mt-2 text-3xl font-bold text-gray-900">
            {totalMinutes}
          </p>

          <p className="mt-1 text-xs text-gray-500">
            minutes
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-sm text-gray-500">
            Reading Days
          </p>

          <p className="mt-2 text-3xl font-bold text-gray-900">
            {readingDays}
          </p>

          <p className="mt-1 text-xs text-gray-500">
            days logged
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-sm text-gray-500">
            Books Completed
          </p>

          <p className="mt-2 text-3xl font-bold text-gray-900">
            {completedBooks}
          </p>

          <p className="mt-1 text-xs text-gray-500">
            books finished
          </p>
        </div>
      </div>

      {/* Streak and averages */}
      <div className="grid gap-6 lg:grid-cols-2">
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
                {averagePages}
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
                {averageMinutes}
              </p>

              <p className="text-sm text-gray-500">
                minutes
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Current book */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900">
          Current Book
        </h2>

        {currentBook ? (
          <div className="mt-5">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">
                  {currentBook.title}
                </h3>

                <p className="mt-1 text-sm text-gray-500">
                  {currentBook.author}
                </p>
              </div>

              <p className="text-2xl font-bold text-gray-900">
                {currentBookProgress}%
              </p>
            </div>

            <div className="mt-4 h-3 overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-gray-900"
                style={{
                  width: `${Math.min(
                    currentBookProgress,
                    100
                  )}%`,
                }}
              />
            </div>

            <p className="mt-2 text-sm text-gray-500">
              Page{' '}
              {
                currentBook.current_page
              }{' '}
              of{' '}
              {
                currentBook.total_pages
              }
            </p>
          </div>
        ) : (
          <p className="mt-4 text-sm text-gray-500">
            You don't have a book
            currently in progress.
          </p>
        )}
      </div>

      {/* Monthly summary */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900">
          Monthly Summary
        </h2>

        {monthlyStats.length ===
        0 ? (
          <p className="mt-4 text-sm text-gray-500">
            Your monthly reading
            summary will appear here
            once you start logging
            reading sessions.
          </p>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[600px] text-left">
              <thead>
                <tr className="border-b border-gray-200 text-sm text-gray-500">
                  <th className="pb-3 font-medium">
                    Month
                  </th>

                  <th className="pb-3 font-medium">
                    Reading Days
                  </th>

                  <th className="pb-3 font-medium">
                    Pages
                  </th>

                  <th className="pb-3 font-medium">
                    Time
                  </th>
                </tr>
              </thead>

              <tbody>
                {monthlyStats.map(
                  (stat) => (
                    <tr
                      key={
                        stat.month
                      }
                      className="border-b border-gray-100 last:border-0"
                    >
                      <td className="py-4 font-medium text-gray-900">
                        {formatMonth(
                          stat.month
                        )}
                      </td>

                      <td className="py-4 text-gray-600">
                        {stat.days}
                      </td>

                      <td className="py-4 text-gray-600">
                        {stat.pages}
                      </td>

                      <td className="py-4 text-gray-600">
                        {stat.minutes}{' '}
                        min
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Motivation */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900">
          Keep Going 🌱
        </h2>

        <p className="mt-2 text-sm leading-6 text-gray-600">
          The goal isn't to read as
          much as possible in one day.
          It's to keep showing up.
          Small pages, repeated
          consistently, can create
          meaningful change over time.
        </p>
      </div>
    </div>
  )
}