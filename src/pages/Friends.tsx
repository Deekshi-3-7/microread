import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { calculateCurrentStreak } from '../lib/readingStats'

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
}

type ReadingEntry = {
  member_id: string
  reading_date: string
  pages_read: number
  minutes: number
}

type FriendProgress = {
  member: Member
  currentBook: Book | null
  readingDays: number
  totalPages: number
  totalMinutes: number
  currentStreak: number
  progress: number
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
            'id, member_id, title, author, total_pages, current_page, status'
          ),

        supabase
          .from('reading_entries')
          .select(
            'member_id, reading_date, pages_read, minutes'
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

          const currentBook =
            memberBooks.find(
              (book) =>
                book.status === 'reading'
            ) ?? null

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

          let progress = 0

          if (
            currentBook &&
            currentBook.total_pages > 0
          ) {
            progress = Math.round(
              (currentBook.current_page /
                currentBook.total_pages) *
                100
            )
          }

          return {
            member,
            currentBook,
            readingDays,
            totalPages,
            totalMinutes,
            currentStreak:
              calculateCurrentStreak(
                memberEntries
              ),
            progress,
          }
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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Friends
        </h1>

        <p className="mt-1 text-gray-600">
          See how everyone is progressing
          together.
        </p>
      </div>

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
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {friends.map((friend) => (
            <div
              key={friend.member.id}
              className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-lg font-semibold text-gray-700 dark:bg-[#cdd3dc] dark:text-[#16181d]">
                  {friend.member.name
                    .charAt(0)
                    .toUpperCase()}
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

              <div className="mt-6">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  Currently Reading
                </p>

                {friend.currentBook ? (
                  <>
                    <h3 className="mt-2 font-semibold text-gray-900">
                      {friend.currentBook.title}
                    </h3>

                    <p className="mt-1 text-sm text-gray-500">
                      {friend.currentBook.author}
                    </p>

                    <div className="mt-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">
                          Page{' '}
                          {
                            friend.currentBook
                              .current_page
                          }{' '}
                          /{' '}
                          {
                            friend.currentBook
                              .total_pages
                          }
                        </span>

                        <span className="font-semibold text-gray-900">
                          {friend.progress}%
                        </span>
                      </div>

                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100">
                        <div
                          className="h-full rounded-full bg-gray-900"
                          style={{
                            width: `${Math.min(
                              friend.progress,
                              100
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  </>
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

              <div className="mt-4 rounded-lg bg-gray-50 px-4 py-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    Reading Time
                  </span>

                  <span className="text-sm font-semibold text-gray-900">
                    {friend.totalMinutes}{' '}
                    min
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900">
          Keep growing together 🌱
        </h2>

        <p className="mt-2 text-sm leading-6 text-gray-600">
          Everyone's journey is different.
          The goal is not to compete, but to
          stay consistent and keep taking
          small steps every day.
        </p>
      </div>
    </div>
  )
}