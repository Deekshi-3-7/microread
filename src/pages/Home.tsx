import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import {
  calculateCurrentStreak,
  getPreviousDate,
  getTrackingStartDate,
} from '../lib/readingStats'
import ThemeToggle from '../components/ThemeToggle'

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

type Goal = {
  goal_type: 'minutes' | 'pages'
  target: number
}

export default function Home() {
  const [member, setMember] = useState<Member | null>(null)
  const [currentBook, setCurrentBook] =
    useState<Book | null>(null)

  const [todayEntry, setTodayEntry] =
    useState<ReadingEntry | null>(null)

  const [goal, setGoal] =
    useState<Goal | null>(null)

  const [todayMinutes, setTodayMinutes] =
    useState(0)

  const [todayPages, setTodayPages] =
    useState(0)

  const [currentStreak, setCurrentStreak] =
    useState(0)

  const [readingDates, setReadingDates] =
    useState<string[]>([])

  const [friendCount, setFriendCount] =
    useState(0)

  const [showStreakInfo, setShowStreakInfo] =
    useState(false)

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
        {
          data: goalData,
          error: goalError,
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
          .eq('reading_date', today),

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

        supabase
          .from('goals')
          .select('goal_type, target')
          .eq('member_id', memberData.id)
          .eq('active', true)
          .limit(1)
          .maybeSingle(),
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

      if (goalError) {
        throw goalError
      }

      const todayList =
        (todayData ?? []) as ReadingEntry[]

      setCurrentBook(bookData?.[0] || null)
      setTodayEntry(todayList[0] || null)
      setGoal(goalData ?? null)

      setTodayMinutes(
        todayList.reduce(
          (total, entry) =>
            total + Number(entry.minutes || 0),
          0
        )
      )

      setTodayPages(
        todayList.reduce(
          (total, entry) =>
            total +
            Number(entry.pages_read || 0),
          0
        )
      )

      setFriendCount(
        Math.max((membersCount || 1) - 1, 0)
      )

      setCurrentStreak(
        calculateCurrentStreak(readingData || [])
      )

      setReadingDates(
        Array.from(
          new Set(
            (readingData || []).map(
              (entry) => entry.reading_date
            )
          )
        )
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

  function getGreeting(): string {
    const hour = new Date().getHours()

    if (hour >= 5 && hour < 12) {
      return 'Good morning'
    }

    if (hour >= 12 && hour < 17) {
      return 'Good afternoon'
    }

    return 'Good evening'
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

  const goalCurrent = goal
    ? goal.goal_type === 'minutes'
      ? todayMinutes
      : todayPages
    : 0

  const goalProgress =
    goal && goal.target > 0
      ? Math.min(
          Math.round(
            (goalCurrent / goal.target) * 100
          ),
          100
        )
      : 0

  const goalMet = goal
    ? goalCurrent >= goal.target
    : false

  const trackingStart = getTrackingStartDate()
  const readingDateSet = new Set(readingDates)
  const todayStr = getTodayDate()

  const weekDays: string[] = []
  let cursor = todayStr

  for (let index = 0; index < 7; index++) {
    weekDays.push(cursor)
    cursor = getPreviousDate(cursor)
  }

  weekDays.reverse()

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {getGreeting()},{' '}
            {member?.name || 'Reader'} 👋
          </h1>

          <p className="mt-2 text-gray-600">
            Small pages. Daily steps. Lasting
            growth.
          </p>
        </div>

        {/* Mobile-only theme toggle (desktop uses the sidebar). */}
        <ThemeToggle compact className="lg:hidden" />
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

      {goal && (
        <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                Today's Goal
              </p>

              <h2 className="mt-2 text-2xl font-bold text-gray-900">
                {goalCurrent} / {goal.target}{' '}
                {goal.goal_type === 'minutes'
                  ? 'minutes'
                  : 'pages'}
              </h2>
            </div>

            <span className="text-3xl">
              {goalMet ? '✅' : '🎯'}
            </span>
          </div>

          <div className="mt-5 h-3 overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full rounded-full bg-gray-900 transition-all"
              style={{
                width: `${goalProgress}%`,
              }}
            />
          </div>

          <p className="mt-3 text-sm text-gray-500">
            {goalMet
              ? "You've reached today's goal. 🌱"
              : 'A gentle guide, not a target — every page still counts.'}
          </p>
        </section>
      )}

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            This Week
          </p>

          <p className="text-xs text-gray-400">
            Don't break the chain 🔗
          </p>
        </div>

        <div className="mt-5 flex items-center justify-between gap-1 sm:gap-2">
          {weekDays.map((date) => {
            const hasRead =
              readingDateSet.has(date)

            const isToday = date === todayStr

            const beforeTracking =
              date < trackingStart

            const weekdayLabel = new Date(
              `${date}T00:00:00`
            ).toLocaleDateString('en-IN', {
              weekday: 'narrow',
            })

            const dayNumber = Number(
              date.slice(-2)
            )

            let cellClasses: string
            let icon: string

            if (hasRead) {
              cellClasses =
                'border-green-200 bg-green-50 text-green-600'
              icon = '✓'
            } else if (isToday) {
              cellClasses =
                'border-amber-300 bg-amber-50 text-amber-600'
              icon = '⏳'
            } else if (beforeTracking) {
              cellClasses =
                'border-gray-100 bg-gray-50 text-gray-300'
              icon = '·'
            } else {
              cellClasses =
                'border-red-200 bg-red-50 text-red-500'
              icon = '✕'
            }

            return (
              <div
                key={date}
                className="flex flex-1 flex-col items-center gap-1.5"
              >
                <span className="text-[11px] font-medium uppercase text-gray-400">
                  {weekdayLabel}
                </span>

                <div
                  className={`flex aspect-square w-full max-w-[44px] items-center justify-center rounded-xl border text-sm font-semibold ${cellClasses}`}
                >
                  {icon}
                </div>

                <span
                  className={`text-[11px] ${
                    isToday
                      ? 'font-bold text-gray-900'
                      : 'text-gray-400'
                  }`}
                >
                  {dayNumber}
                </span>
              </div>
            )
          })}
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="relative flex items-center gap-1.5">
            <p className="text-sm text-gray-500">
              Current Streak
            </p>

            <button
              type="button"
              onClick={() =>
                setShowStreakInfo(
                  (open) => !open
                )
              }
              aria-expanded={showStreakInfo}
              aria-label="How streaks work"
              className="flex h-4 w-4 items-center justify-center rounded-full bg-gray-200 text-[10px] font-semibold text-gray-600 transition hover:bg-gray-300"
            >
              i
            </button>

            {showStreakInfo && (
              <>
                <button
                  type="button"
                  tabIndex={-1}
                  aria-hidden="true"
                  onClick={() =>
                    setShowStreakInfo(false)
                  }
                  className="fixed inset-0 z-10 cursor-default"
                />

                <div
                  role="dialog"
                  className="absolute left-0 top-7 z-20 w-64 rounded-xl border border-gray-200 bg-white p-4 text-left shadow-lg"
                >
                  <p className="text-sm font-semibold text-gray-900">
                    How streaks work 🔥
                  </p>

                  <p className="mt-1 text-xs leading-5 text-gray-600">
                    Your streak counts consecutive
                    days you've read. Read today or
                    yesterday to keep it going — miss
                    a full day and it resets to 0.
                    Reading more than once in a day
                    still counts as one day.
                  </p>
                </div>
              </>
            )}
          </div>

          <p className="mt-2 text-2xl font-bold text-gray-900">
            🔥 {currentStreak}{' '}
            {currentStreak === 1
              ? 'day'
              : 'days'}
          </p>

          <p className="mt-1 text-sm text-gray-500">
            {currentStreak > 0
              ? 'Keep showing up.'
              : 'Read today to start a new streak.'}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">
            Your Reading Circle
          </p>

          <p className="mt-2 text-2xl font-bold text-gray-900">
            🌏 {friendCount}{' '}
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