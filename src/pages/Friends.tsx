import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Link } from 'react-router-dom'
import {
  calculateCurrentStreak,
  calculateLongestStreak,
  getTodayDate,
  formatLogTime,
  formatDuration,
  timeOfDayEmoji,
} from '../lib/readingStats'
import { formatCompletionDate } from '../lib/celebration'

type Member = {
  id: string
  name: string
  email: string
  active: boolean
}

type Book = {
  id: string
  member_id: string
  title: string
  author: string
  total_pages: number
  current_page: number
  status: 'reading' | 'completed' | 'paused'
  completion_date: string | null
}

type ReadingEntry = {
  member_id: string
  reading_date: string
  pages_read: number
  minutes: number
  created_at: string
}

type FriendProgress = {
  member: Member
  currentBooks: Book[]
  readingDays: number
  totalPages: number
  totalMinutes: number
  currentStreak: number
  longestStreak: number
  booksCompleted: number
  completedBooksList: Book[]
  readToday: boolean
  lastLogAt: string | null
}

export default function Friends() {
  const [friends, setFriends] = useState<FriendProgress[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    loadFriends()
  }, [])

  async function loadFriends() {
    setLoading(true)
    setErrorMessage('')

    try {
      const [
        { data: membersData, error: membersError },
        { data: booksData, error: booksError },
        { data: entriesData, error: entriesError },
      ] = await Promise.all([
        supabase
          .from('members')
          .select('id, name, email, active')
          .eq('active', true)
          .order('name'),

        supabase
          .from('books')
          .select(
            'id, member_id, title, author, total_pages, current_page, status, completion_date'
          )
          // Newest first so the current-book pick matches Home / My Reading.
          .order('created_at', {
            ascending: false,
          }),

        supabase
          .from('reading_entries')
          .select(
            'member_id, reading_date, pages_read, minutes, created_at'
          )
          .order('reading_date', {
            ascending: false,
          }),
      ])

      if (membersError) {
        throw membersError
      }

      if (booksError) {
        throw booksError
      }

      if (entriesError) {
        throw entriesError
      }

      const members = (membersData ?? []) as Member[]
      const books = (booksData ?? []) as Book[]
      const entries = (entriesData ?? []) as ReadingEntry[]

      const progressData: FriendProgress[] =
        members.map((member) => {
          const memberBooks = books.filter(
            (book) =>
              book.member_id === member.id
          )

          const currentBooks =
            memberBooks.filter(
              (book) =>
                book.status === 'reading'
            )

          const memberEntries =
            entries.filter(
              (entry) =>
                entry.member_id === member.id
            )

          const readingDays =
            new Set(
              memberEntries.map(
                (entry) =>
                  entry.reading_date
              )
            ).size

          const totalPages =
            memberEntries.reduce(
              (total, entry) =>
                total +
                Number(
                  entry.pages_read || 0
                ),
              0
            )

          const totalMinutes =
            memberEntries.reduce(
              (total, entry) =>
                total +
                Number(
                  entry.minutes || 0
                ),
              0
            )

          const completedBooksList =
            memberBooks
              .filter(
                (book) =>
                  book.status === 'completed'
              )
              .sort((a, b) =>
                (
                  b.completion_date ?? ''
                ).localeCompare(
                  a.completion_date ?? ''
                )
              )

          const booksCompleted =
            completedBooksList.length

          const todaysEntries =
            memberEntries.filter(
              (entry) =>
                entry.reading_date ===
                getTodayDate()
            )

          const readToday =
            todaysEntries.length > 0

          const lastLogAt =
            todaysEntries.reduce<
              string | null
            >((latest, entry) => {
              if (
                !latest ||
                entry.created_at > latest
              ) {
                return entry.created_at
              }

              return latest
            }, null)

          return {
            member,
            currentBooks,
            readingDays,
            totalPages,
            totalMinutes,
            currentStreak:
              calculateCurrentStreak(
                memberEntries
              ),
            longestStreak:
              calculateLongestStreak(
                memberEntries
              ),
            booksCompleted,
            completedBooksList,
            readToday,
            lastLogAt,
          }
        })

      // Streak leaderboard: longest active streaks first, so friends can see
      // who's leading and set a target to beat. Ties fall back to best streak,
      // then days read, then name — keeping the order stable and fair.
      progressData.sort((a, b) => {
        if (
          b.currentStreak !== a.currentStreak
        ) {
          return (
            b.currentStreak - a.currentStreak
          )
        }

        if (
          b.longestStreak !== a.longestStreak
        ) {
          return (
            b.longestStreak - a.longestStreak
          )
        }

        if (b.readingDays !== a.readingDays) {
          return b.readingDays - a.readingDays
        }

        return a.member.name.localeCompare(
          b.member.name
        )
      })

      setFriends(progressData)
    } catch (error) {
      console.error(
        'Error loading friends:',
        error
      )

      setErrorMessage(
        'Unable to load reading progress. Please try again.'
      )
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Friends
          </h1>

          <p className="mt-1 text-gray-600">
            See how everyone is progressing
            together.
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
          <p className="text-gray-500">
            Loading reading progress...
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
            Friends
          </h1>

          <p className="mt-1 text-gray-600">
            See how everyone is progressing
            together.
          </p>
        </div>

        <div className="rounded-xl border border-red-200 bg-red-50 p-6">
          <p className="text-red-700">
            {errorMessage}
          </p>

          <button
            onClick={loadFriends}
            className="mt-4 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  const totalGroupCompleted = friends.reduce(
    (total, friend) =>
      total + friend.booksCompleted,
    0
  )

  const friendsWithCompletions = friends.filter(
    (friend) => friend.booksCompleted > 0
  ).length

  // friends is sorted by current streak, so the first with a live streak leads.
  const streakLeader =
    friends.find(
      (friend) => friend.currentStreak > 0
    ) ?? null

  const topStreak =
    streakLeader?.currentStreak ?? 0

  const leaderName = streakLeader
    ? streakLeader.member.name.split(' ')[0] ||
      streakLeader.member.name
    : ''

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Friends
        </h1>

        <p className="mt-1 text-gray-600">
          Ordered by reading streak — keep yours
          alive and cheer each other on. 🔥
        </p>
      </div>

      {topStreak > 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center gap-4">
            <span className="brand-badge flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-2xl">
              🔥
            </span>

            <div>
              <p className="text-base font-semibold text-gray-900">
                {leaderName} leads with a{' '}
                {topStreak}-day streak
              </p>

              <p className="mt-0.5 text-sm text-gray-600">
                Let it inspire your own streak —
                every reader lifts the group. 🌱
              </p>
            </div>
          </div>
        </div>
      )}

      {totalGroupCompleted > 0 && (
        <div className="brand-soft rounded-2xl p-5 sm:p-6">
          <div className="flex items-center gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/70 text-2xl dark:bg-black/20">
              🎉
            </span>

            <div>
              <p className="text-base font-semibold text-gray-900">
                {friendsWithCompletions}{' '}
                {friendsWithCompletions === 1
                  ? 'friend'
                  : 'friends'}
                {' · '}
                {totalGroupCompleted}{' '}
                {totalGroupCompleted === 1
                  ? 'book'
                  : 'books'}{' '}
                completed
              </p>

              <p className="mt-0.5 text-sm text-gray-600">
                Countless pages of progress —
                open a profile to celebrate their
                journey. 🌱
              </p>
            </div>
          </div>
        </div>
      )}

      {friends.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-10 text-center">
          <div className="text-4xl">
            👥
          </div>

          <h2 className="mt-4 text-xl font-semibold text-gray-900">
            No friends yet
          </h2>

          <p className="mt-2 text-gray-500">
            Add members to start building
            your reading group.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {friends.map((friend, index) => {
            const isLeader =
              friend.currentStreak > 0 &&
              friend.currentStreak === topStreak

            const rankMedal =
              friend.currentStreak > 0
                ? index === 0
                  ? '🥇'
                  : index === 1
                    ? '🥈'
                    : index === 2
                      ? '🥉'
                      : `#${index + 1}`
                : ''

            const gap =
              topStreak - friend.currentStreak

            let streakTarget = ''

            if (topStreak > 0) {
              if (isLeader) {
                streakTarget =
                  '🔥 Leading the way — keep it up!'
              } else if (
                friend.currentStreak === 0
              ) {
                streakTarget =
                  'Read today to begin your streak 🌱'
              } else {
                streakTarget = `🌱 ${gap} more day${
                  gap === 1 ? '' : 's'
                } to match ${leaderName}`
              }
            }

            return (
            <Link
              key={friend.member.id}
              to={`/friends/${friend.member.id}`}
              className={`block rounded-xl border bg-white p-6 shadow-sm transition hover:shadow-md ${
                isLeader
                  ? 'streak-leader border-transparent'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-4">
                  <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gray-100 text-lg font-semibold text-gray-700 dark:bg-[#cdd3dc] dark:text-[#16181d]">
                    {friend.member.name
                      .charAt(0)
                      .toUpperCase()}

                    {rankMedal && (
                      <span className="absolute -right-1.5 -top-1.5 flex h-6 min-w-6 items-center justify-center rounded-full border border-gray-200 bg-white px-1 text-xs font-bold text-gray-700 shadow-sm">
                        {rankMedal}
                      </span>
                    )}
                  </div>

                  <div className="min-w-0">
                    <h2 className="truncate text-lg font-semibold text-gray-900">
                      {friend.member.name}
                    </h2>

                    <p className="truncate text-sm text-gray-500">
                      {friend.member.email}
                    </p>
                  </div>
                </div>

                <span
                  className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold ${
                    friend.readToday
                      ? 'border-green-200 bg-green-50 text-green-700'
                      : 'border-gray-200 bg-gray-50 text-gray-500'
                  }`}
                >
                  {friend.readToday &&
                  friend.lastLogAt
                    ? `${timeOfDayEmoji(
                        friend.lastLogAt
                      )} Read at ${formatLogTime(
                        friend.lastLogAt
                      )}`
                    : 'Not yet today'}
                </span>
              </div>

              <div className="mt-6">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  Currently Reading
                </p>

                {friend.currentBooks.length >
                0 ? (
                  <div className="mt-2 space-y-4">
                    {friend.currentBooks.map(
                      (currentBook) => {
                        const progress =
                          currentBook.total_pages >
                          0
                            ? Math.round(
                                (currentBook.current_page /
                                  currentBook.total_pages) *
                                  100
                              )
                            : 0

                        return (
                          <div
                            key={currentBook.id}
                          >
                            <h3 className="font-semibold text-gray-900">
                              {currentBook.title}
                            </h3>

                            <p className="mt-1 text-sm text-gray-500">
                              {currentBook.author}
                            </p>

                            <div className="mt-3">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-600">
                                  Page{' '}
                                  {
                                    currentBook.current_page
                                  }{' '}
                                  /{' '}
                                  {
                                    currentBook.total_pages
                                  }
                                </span>

                                <span className="font-semibold text-gray-900">
                                  {progress}%
                                </span>
                              </div>

                              <div className="mt-2 progress-track h-2 overflow-hidden rounded-full">
                                <div
                                  className="progress-fill h-full rounded-full"
                                  style={{
                                    width: `${Math.min(
                                      progress,
                                      100
                                    )}%`,
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        )
                      }
                    )}
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-gray-500">
                    No book currently being
                    read.
                  </p>
                )}
              </div>

              <div className="mt-6 grid grid-cols-3 gap-3 border-t border-gray-100 pt-5">
                <div>
                  <p className="text-xs text-gray-500">
                    Reading Days
                  </p>

                  <p className="mt-1 text-lg font-semibold text-gray-900">
                    {friend.readingDays}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-500">
                    Pages
                  </p>

                  <p className="mt-1 text-lg font-semibold text-gray-900">
                    {friend.totalPages}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-500">
                    Streak
                  </p>

                  <p className="mt-1 text-lg font-semibold text-gray-900">
                    {friend.currentStreak} 🔥
                  </p>
                </div>
              </div>

              {streakTarget && (
                <p
                  className={`mt-3 text-sm font-semibold ${
                    isLeader
                      ? 'text-[color:var(--brand)]'
                      : 'text-gray-600'
                  }`}
                >
                  {streakTarget}
                </p>
              )}

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-gray-50 px-4 py-3">
                  <p className="text-xs text-gray-500">
                    Best Streak
                  </p>

                  <p className="mt-1 text-sm font-semibold text-gray-900">
                    🏅 {friend.longestStreak}{' '}
                    {friend.longestStreak === 1
                      ? 'day'
                      : 'days'}
                  </p>
                </div>

                <div className="rounded-lg bg-gray-50 px-4 py-3">
                  <p className="text-xs text-gray-500">
                    Books Finished
                  </p>

                  <p className="mt-1 text-sm font-semibold text-gray-900">
                    🏆 {friend.booksCompleted}
                  </p>
                </div>
              </div>

              <div className="mt-3 rounded-lg bg-gray-50 px-4 py-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    Reading Time
                  </span>

                  <span className="text-sm font-semibold text-gray-900">
                    {formatDuration(
                      friend.totalMinutes
                    )}
                  </span>
                </div>
              </div>

              {friend.completedBooksList.length >
                0 && (
                <div className="brand-soft mt-3 rounded-lg px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="text-base">
                      🏆
                    </span>

                    <span className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                      Latest achievement
                    </span>
                  </div>

                  <p className="mt-1.5 truncate text-sm font-semibold text-gray-900">
                    {
                      friend
                        .completedBooksList[0]
                        .title
                    }
                  </p>

                  <p className="truncate text-xs text-gray-500">
                    {friend.completedBooksList[0]
                      .completion_date
                      ? `Finished ${formatCompletionDate(
                          friend
                            .completedBooksList[0]
                            .completion_date
                        )}`
                      : 'Completed'}
                    {friend.booksCompleted > 1
                      ? ` · +${
                          friend.booksCompleted -
                          1
                        } more`
                      : ''}
                  </p>
                </div>
              )}
            </Link>
            )
          })}
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900">
          Keep growing together 🌱
        </h2>

        <p className="mt-2 text-sm leading-6 text-gray-600">
          Let a friend's streak inspire your next
          one, and cheer each other on. There's no
          race here — the real win is simply showing
          up every day. 🌱
        </p>
      </div>
    </div>
  )
}