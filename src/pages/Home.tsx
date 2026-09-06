import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

type Member = {
  id: string
  name: string
}

type Book = {
  id: string
  title: string
  author: string
  total_pages: number
  current_page: number
  status: 'reading' | 'completed' | 'paused'
}

type ReadingEntry = {
  id: string
  reading_date: string
  start_page: number
  end_page: number
  pages_read: number
  minutes: number
  book_id: string
}

export default function Home() {
  const [member, setMember] = useState<Member | null>(null)
  const [currentBook, setCurrentBook] =
    useState<Book | null>(null)

  const [todayEntry, setTodayEntry] =
    useState<ReadingEntry | null>(null)

  const [currentStreak, setCurrentStreak] =
    useState(0)

  const [friendCount, setFriendCount] =
    useState(0)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadDashboard()
  }, [])

  async function loadDashboard() {
    setLoading(true)
    setError('')

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        throw new Error('You are not logged in.')
      }

      const {
        data: memberData,
        error: memberError,
      } = await supabase
        .from('members')
        .select('id, name')
        .eq('auth_user_id', user.id)
        .single()

      if (memberError) {
        throw memberError
      }

      setMember(memberData)

      const today = getTodayDate()

      const [
        {
          data: bookData,
          error: bookError,
        },
        {
          data: todayData,
          error: todayError,
        },
        {
          data: readingData,
          error: readingError,
        },
        {
          count: membersCount,
          error: membersError,
        },
      ] = await Promise.all([
        supabase
          .from('books')
          .select(
            'id, title, author, total_pages, current_page, status'
          )
          .eq('member_id', memberData.id)
          .eq('status', 'reading')
          .order('created_at', {
            ascending: false,
          })
          .limit(1),

        supabase
          .from('reading_entries')
          .select(
            'id, reading_date, start_page, end_page, pages_read, minutes, book_id'
          )
          .eq('member_id', memberData.id)
          .eq('reading_date', today)
          .limit(1),

        supabase
          .from('reading_entries')
          .select('reading_date')
          .eq('member_id', memberData.id)
          .order('reading_date', {
            ascending: false,
          }),

        supabase
          .from('members')
          .select('id', {
            count: 'exact',
            head: true,
          })
          .eq('active', true),
      ])

      if (bookError) {
        throw bookError
      }

      if (todayError) {
        throw todayError
      }

      if (readingError) {
        throw readingError
      }

      if (membersError) {
        throw membersError
      }

      setCurrentBook(bookData?.[0] || null)
      setTodayEntry(todayData?.[0] || null)

      setFriendCount(
        Math.max((membersCount || 1) - 1, 0)
      )

      setCurrentStreak(
        calculateCurrentStreak(readingData || [])
      )
    } catch (err) {
      console.error(
        'Home dashboard error:',
        err
      )

      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError(
          'Unable to load your dashboard.'
        )
      }
    } finally {
      setLoading(false)
    }
  }

  function calculateCurrentStreak(
    entries: { reading_date: string }[]
  ): number {
    if (entries.length === 0) {
      return 0
    }

    const uniqueDates = Array.from(
      new Set(
        entries.map(
          (entry) => entry.reading_date
        )
      )
    ).sort((a, b) => b.localeCompare(a))

    const today = getTodayDate()

    if (
      uniqueDates[0] !== today &&
      uniqueDates[0] !==
        getPreviousDate(today)
    ) {
      return 0
    }

    let streak = 1

    for (
      let index = 1;
      index < uniqueDates.length;
      index++
    ) {
      const previousDate =
        uniqueDates[index - 1]

      const currentDate =
        uniqueDates[index]

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

  function getTodayDate(): string {
    const today = new Date()

    const year = today.getFullYear()

    const month = String(
      today.getMonth() + 1
    ).padStart(2, '0')

    const day = String(
      today.getDate()
    ).padStart(2, '0')

    return `${year}-${month}-${day}`
  }

  function getPreviousDate(
    dateString: string
  ): string {
    const date = new Date(
      `${dateString}T00:00:00`
    )

    date.setDate(
      date.getDate() - 1
    )

    const year = date.getFullYear()

    const month = String(
      date.getMonth() + 1
    ).padStart(2, '0')

    const day = String(
      date.getDate()
    ).padStart(2, '0')

    return `${year}-${month}-${day}`
  }

  function getProgressPercentage(): number {
    if (
      !currentBook ||
      currentBook.total_pages <= 0
    ) {
      return 0
    }

    return Math.min(
      Math.round(
        (currentBook.current_page /
          currentBook.total_pages) *
          100
      ),
      100
    )
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-gray-500">
          Loading your reading journey...
        </p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
          {error}
        </div>
      </div>
    )
  }

  const progress =
    getProgressPercentage()

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Good morning,{' '}
          {member?.name || 'Reader'} 👋
        </h1>

        <p className="mt-2 text-gray-600">
          Small pages. Daily steps. Lasting
          growth.
        </p>
      </div>

      <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-6">
          <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            Today's Reading
          </p>

          <h2 className="mt-2 text-2xl font-bold text-gray-900">
            {todayEntry
              ? 'You showed up today. 🌱'
              : 'Ready for your next small step?'}
          </h2>
        </div>

        {currentBook ? (
          <>
            <div className="rounded-2xl bg-gray-50 p-5">
              <div className="flex items-start gap-4">
                <div className="text-3xl">
                  📖
                </div>

                <div className="min-w-0 flex-1">
                  <h3 className="text-xl font-bold text-gray-900">
                    {currentBook.title}
                  </h3>

                  <p className="mt-1 text-sm text-gray-500">
                    {currentBook.author}
                  </p>

                  <div className="mt-5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-gray-700">
                        Page{' '}
                        {currentBook.current_page}{' '}
                        of{' '}
                        {currentBook.total_pages}
                      </span>

                      <span className="font-semibold text-gray-700">
                        {progress}%
                      </span>
                    </div>

                    <div className="mt-2 h-3 overflow-hidden rounded-full bg-gray-200">
                      <div
                        className="h-full rounded-full bg-gray-900 transition-all"
                        style={{
                          width: `${progress}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {todayEntry ? (
              <div className="mt-5 rounded-2xl border border-green-200 bg-green-50 p-5">
                <div className="flex items-center gap-2">
                  <span className="text-xl">
                    ✅
                  </span>

                  <p className="font-semibold text-green-800">
                    Today's reading is complete
                  </p>
                </div>

                <p className="mt-2 text-sm text-green-700">
                  {todayEntry.minutes} min ·{' '}
                  {todayEntry.pages_read}{' '}
                  pages
                </p>

                <p className="mt-1 text-sm text-green-700">
                  Page{' '}
                  {todayEntry.start_page} →{' '}
                  {todayEntry.end_page}
                </p>
              </div>
            ) : (
              <Link
                to="/reading"
                className="mt-5 flex w-full items-center justify-center rounded-2xl bg-gray-900 px-6 py-4 text-base font-semibold text-white transition hover:bg-gray-800"
              >
                ➕ Update Today's Reading
              </Link>
            )}
          </>
        ) : (
          <div className="rounded-2xl bg-gray-50 p-6 text-center">
            <div className="text-4xl">
              📚
            </div>

            <h3 className="mt-3 font-semibold text-gray-900">
              Start your reading journey
            </h3>

            <p className="mt-1 text-sm text-gray-500">
              Add a book and take your first
              small step.
            </p>

            <Link
              to="/books"
              className="mt-4 inline-flex rounded-xl bg-gray-900 px-5 py-3 text-sm font-semibold text-white hover:bg-gray-800"
            >
              + Add a Book
            </Link>
          </div>
        )}
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">
            Current Streak
          </p>

          <p className="mt-2 text-2xl font-bold text-gray-900">
            🔥 {currentStreak}{' '}
            {currentStreak === 1
              ? 'day'
              : 'days'}
          </p>

          <p className="mt-1 text-sm text-gray-500">
            Keep showing up.
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">
            Your Reading Circle
          </p>

          <p className="mt-2 text-2xl font-bold text-gray-900">
            👥 {friendCount}{' '}
            {friendCount === 1
              ? 'friend'
              : 'friends'}
          </p>

          <p className="mt-1 text-sm text-gray-500">
            Growing the habit together.
          </p>
        </div>
      </div>

      <section className="rounded-2xl border border-gray-200 bg-gray-50 p-6 text-center">
        <p className="text-sm font-semibold text-gray-500">
          🌱 Your next small step
        </p>

        <p className="mt-2 text-lg font-semibold text-gray-900">
          {todayEntry
            ? 'You have done your part today. Come back tomorrow.'
            : 'Read for 10 minutes today.'}
        </p>

        <p className="mt-2 text-sm text-gray-500">
          You don't need to read a lot. Just
          keep the habit alive.
        </p>
      </section>
    </div>
  )
}