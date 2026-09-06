import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

type Book = {
  status: 'reading' | 'completed' | 'paused'
}

type ReadingEntry = {
  reading_date: string
  pages_read: number
  minutes: number
}

type Milestone = {
  title: string
  description: string
  icon: string
  current: number
  target: number
  unit: string
}

function formatMinutes(minutes: number): string {
  if (minutes < 60) {
    return minutes + ' min'
  }

  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60

  if (remainingMinutes === 0) {
    return hours + ' hr'
  }

  return hours + ' hr ' + remainingMinutes + ' min'
}

export default function Milestones() {
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    loadMilestones()
  }, [])

  async function loadMilestones() {
    setLoading(true)
    setErrorMessage('')

    try {
      const { data: userData, error: userError } =
        await supabase.auth.getUser()

      if (userError) {
        throw userError
      }

      const user = userData.user

      if (!user) {
        throw new Error('User is not logged in.')
      }

      const { data: memberData, error: memberError } = await supabase
        .from('members')
        .select('id')
        .eq('auth_user_id', user.id)
        .single()

      if (memberError) {
        throw memberError
      }

      const memberId = memberData.id

      const [
        { data: entriesData, error: entriesError },
        { data: booksData, error: booksError },
      ] = await Promise.all([
        supabase
          .from('reading_entries')
          .select('reading_date, pages_read, minutes')
          .eq('member_id', memberId),

        supabase
          .from('books')
          .select('status')
          .eq('member_id', memberId),
      ])

      if (entriesError) {
        throw entriesError
      }

      if (booksError) {
        throw booksError
      }

      const entries = (entriesData ?? []) as ReadingEntry[]
      const books = (booksData ?? []) as Book[]

      const readingDays = new Set(
        entries.map((entry) => entry.reading_date)
      ).size

      const totalPages = entries.reduce(
        (total, entry) => total + Number(entry.pages_read || 0),
        0
      )

      const totalMinutes = entries.reduce(
        (total, entry) => total + Number(entry.minutes || 0),
        0
      )

      const completedBooks = books.filter(
        (book) => book.status === 'completed'
      ).length

      const calculatedMilestones: Milestone[] = [
        {
          title: 'First Step',
          description: 'Complete your first reading day.',
          icon: '🌱',
          current: readingDays,
          target: 1,
          unit: 'reading day',
        },
        {
          title: 'Getting Started',
          description: 'Read on 7 different days.',
          icon: '🌿',
          current: readingDays,
          target: 7,
          unit: 'reading days',
        },
        {
          title: 'Building the Habit',
          description: 'Read on 30 different days.',
          icon: '🌳',
          current: readingDays,
          target: 30,
          unit: 'reading days',
        },
        {
          title: 'Habit Builder',
          description: 'Read on 60 different days.',
          icon: '🔥',
          current: readingDays,
          target: 60,
          unit: 'reading days',
        },
        {
          title: '100 Days Strong',
          description: 'Complete 100 reading days.',
          icon: '🏆',
          current: readingDays,
          target: 100,
          unit: 'reading days',
        },
        {
          title: '100 Pages',
          description: 'Read your first 100 pages.',
          icon: '📖',
          current: totalPages,
          target: 100,
          unit: 'pages',
        },
        {
          title: '500 Pages',
          description: 'Read 500 pages in total.',
          icon: '📖',
          current: totalPages,
          target: 500,
          unit: 'pages',
        },
        {
          title: '1,000 Pages',
          description: 'Read 1,000 pages in total.',
          icon: '📚',
          current: totalPages,
          target: 1000,
          unit: 'pages',
        },
        {
          title: '5,000 Pages',
          description: 'Read 5,000 pages in total.',
          icon: '📚',
          current: totalPages,
          target: 5000,
          unit: 'pages',
        },
        {
          title: '5 Hours',
          description: 'Spend 5 hours reading.',
          icon: '⏱️',
          current: totalMinutes,
          target: 300,
          unit: 'minutes',
        },
        {
          title: '10 Hours',
          description: 'Spend 10 hours reading.',
          icon: '⏱️',
          current: totalMinutes,
          target: 600,
          unit: 'minutes',
        },
        {
          title: '25 Hours',
          description: 'Spend 25 hours reading.',
          icon: '⏱️',
          current: totalMinutes,
          target: 1500,
          unit: 'minutes',
        },
        {
          title: '50 Hours',
          description: 'Spend 50 hours reading.',
          icon: '⏱️',
          current: totalMinutes,
          target: 3000,
          unit: 'minutes',
        },
        {
          title: 'First Book',
          description: 'Complete your first book.',
          icon: '📚',
          current: completedBooks,
          target: 1,
          unit: 'book',
        },
        {
          title: '3 Books',
          description: 'Complete 3 books.',
          icon: '📚',
          current: completedBooks,
          target: 3,
          unit: 'books',
        },
        {
          title: '5 Books',
          description: 'Complete 5 books.',
          icon: '📚',
          current: completedBooks,
          target: 5,
          unit: 'books',
        },
        {
          title: '10 Books',
          description: 'Complete 10 books.',
          icon: '🏆',
          current: completedBooks,
          target: 10,
          unit: 'books',
        },
      ]

      setMilestones(calculatedMilestones)
    } catch (error) {
      console.error('Error loading milestones:', error)
      setErrorMessage(
        'Unable to load your milestones. Please try again.'
      )
    } finally {
      setLoading(false)
    }
  }

  function getProgress(milestone: Milestone): number {
    if (milestone.target === 0) {
      return 0
    }

    return Math.min(
      Math.round((milestone.current / milestone.target) * 100),
      100
    )
  }

  function isAchieved(milestone: Milestone): boolean {
    return milestone.current >= milestone.target
  }

  function formatCurrentValue(milestone: Milestone): string {
    if (milestone.unit === 'minutes') {
      return formatMinutes(milestone.current)
    }

    return milestone.current.toLocaleString('en-IN') + ' ' + milestone.unit
  }

  function formatTargetValue(milestone: Milestone): string {
    if (milestone.unit === 'minutes') {
      return formatMinutes(milestone.target)
    }

    return milestone.target.toLocaleString('en-IN') + ' ' + milestone.unit
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Milestones
          </h1>
          <p className="mt-1 text-gray-600">
            Celebrate the small steps that become lasting progress.
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
          <p className="text-gray-500">
            Loading your milestones...
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
            Milestones
          </h1>
          <p className="mt-1 text-gray-600">
            Celebrate the small steps that become lasting progress.
          </p>
        </div>

        <div className="rounded-xl border border-red-200 bg-red-50 p-6">
          <p className="text-red-700">{errorMessage}</p>

          <button
            onClick={loadMilestones}
            className="mt-4 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  const achievedMilestones = milestones.filter(isAchieved)
  const upcomingMilestones = milestones.filter(
    (milestone) => !isAchieved(milestone)
  )

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Milestones
        </h1>
        <p className="mt-1 text-gray-600">
          Celebrate the small steps that become lasting progress.
        </p>
      </div>

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <p className="text-sm text-gray-500">
            Milestones Achieved
          </p>

          <p className="mt-2 text-3xl font-bold text-gray-900">
            {achievedMilestones.length}
          </p>

          <p className="mt-1 text-sm text-gray-500">
            Keep building one small step at a time.
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <p className="text-sm text-gray-500">
            Next Milestone
          </p>

          {upcomingMilestones.length > 0 ? (
            <>
              <p className="mt-2 text-xl font-bold text-gray-900">
                {upcomingMilestones[0].icon}{' '}
                {upcomingMilestones[0].title}
              </p>

              <p className="mt-1 text-sm text-gray-500">
                {upcomingMilestones[0].current} /{' '}
                {upcomingMilestones[0].target}{' '}
                {upcomingMilestones[0].unit}
              </p>
            </>
          ) : (
            <p className="mt-2 text-xl font-bold text-gray-900">
              All milestones achieved! 🎉
            </p>
          )}
        </div>
      </div>

      {/* Achieved */}
      {achievedMilestones.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold text-gray-900">
            Achieved 🎉
          </h2>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {achievedMilestones.map((milestone) => (
              <div
                key={milestone.title}
                className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <span className="text-3xl">
                    {milestone.icon}
                  </span>

                  <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                    Achieved
                  </span>
                </div>

                <h3 className="mt-4 text-lg font-semibold text-gray-900">
                  {milestone.title}
                </h3>

                <p className="mt-1 text-sm text-gray-500">
                  {milestone.description}
                </p>

                <p className="mt-4 text-sm font-medium text-gray-900">
                  {formatCurrentValue(milestone)}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Upcoming */}
      <section>
        <h2 className="text-xl font-semibold text-gray-900">
          Keep Going 🌱
        </h2>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {upcomingMilestones.map((milestone) => {
            const progress = getProgress(milestone)

            return (
              <div
                key={milestone.title}
                className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <span className="text-3xl">
                    {milestone.icon}
                  </span>

                  <span className="text-sm font-semibold text-gray-500">
                    {progress}%
                  </span>
                </div>

                <h3 className="mt-4 text-lg font-semibold text-gray-900">
                  {milestone.title}
                </h3>

                <p className="mt-1 text-sm text-gray-500">
                  {milestone.description}
                </p>

                <div className="mt-5 h-2 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full bg-gray-900"
                    style={{ width: `${progress}%` }}
                  />
                </div>

                <div className="mt-2 flex justify-between text-xs text-gray-500">
                  <span>
                    {formatCurrentValue(milestone)}
                  </span>

                  <span>
                    {formatTargetValue(milestone)}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Philosophy */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900">
          Small steps matter 🌱
        </h2>

        <p className="mt-2 text-sm leading-6 text-gray-600">
          Milestones aren't about racing to the finish line.
          They're reminders that every reading day, every page,
          and every minute adds up over time.
        </p>
      </div>
    </div>
  )
}

