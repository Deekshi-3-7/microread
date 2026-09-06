import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

type Book = {
id: string
title: string
author: string
current_page: number
total_pages: number
}

type ReadingEntry = {
id: string
reading_date: string
start_page: number
end_page: number
minutes: number
takeaway: string | null
}

type Member = {
id: string
}

function getTodayDate(): string {
const today = new Date()

const year = today.getFullYear()
const month = String(today.getMonth() + 1).padStart(2, '0')
const day = String(today.getDate()).padStart(2, '0')

return year + '-' + month + '-' + day
}

function Reading() {
const [book, setBook] = useState<Book | null>(null)
const [loadingBook, setLoadingBook] = useState<boolean>(true)

const [todayEntries, setTodayEntries] = useState<ReadingEntry[]>([])
const [loadingHistory, setLoadingHistory] =
useState<boolean>(true)

const [fromPage, setFromPage] = useState<string>('')
const [toPage, setToPage] = useState<string>('')
const [minutes, setMinutes] = useState<string>('')
const [takeaway, setTakeaway] = useState<string>('')

const [saving, setSaving] = useState<boolean>(false)
const [validationError, setValidationError] =
useState<string>('')
const [successMessage, setSuccessMessage] =
useState<string>('')

const pagesRead =
Number(toPage) >= Number(fromPage)
? Number(toPage) - Number(fromPage)
: 0

const getMember = async (): Promise<Member | null> => {
const {
data: { user },
} = await supabase.auth.getUser()


if (!user) {
  console.error('No authenticated user found')
  return null
}

const { data: member, error } = await supabase
  .from('members')
  .select('id')
  .eq('auth_user_id', user.id)
  .single()

if (error) {
  console.error('Failed to find member:', error)
  return null
}

return member as Member


}

const loadCurrentBook = async (): Promise<void> => {
setLoadingBook(true)


try {
  const member = await getMember()

  if (!member) {
    return
  }

  const { data, error } = await supabase
    .from('books')
    .select(
      'id, title, author, current_page, total_pages'
    )
    .eq('member_id', member.id)
    .eq('status', 'reading')
    .order('created_at', { ascending: false })
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
  setFromPage(String(currentBook.current_page))
  setToPage(String(currentBook.current_page))
} catch (error: unknown) {
  console.error(
    'Unexpected error while loading book:',
    error
  )
} finally {
  setLoadingBook(false)
}


}

const loadTodayHistory = async (): Promise<void> => {
setLoadingHistory(true)


try {
  const member = await getMember()

  if (!member) {
    return
  }

  const today = getTodayDate()

  const { data, error } = await supabase
    .from('reading_entries')
    .select(
      'id, reading_date, start_page, end_page, minutes, takeaway'
    )
    .eq('member_id', member.id)
    .eq('reading_date', today)
    .order('created_at', { ascending: false })

  if (error) {
    console.error(
      "Failed to load today's reading history:",
      error
    )
    return
  }

  setTodayEntries((data ?? []) as ReadingEntry[])
} catch (error: unknown) {
  console.error(
    "Unexpected error while loading today's history:",
    error
  )
} finally {
  setLoadingHistory(false)
}


}

useEffect(() => {
const loadPage = async (): Promise<void> => {
await loadCurrentBook()
await loadTodayHistory()
}


void loadPage()


}, [])

const handleSaveReading = async (
event: React.FormEvent<HTMLFormElement>
): Promise<void> => {
event.preventDefault()


setValidationError('')
setSuccessMessage('')

if (!book) {
  setValidationError('No current book found.')
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

  const today = getTodayDate()
  const savedPages = end - start

  const { error: readingError } = await supabase
    .from('reading_entries')
    .insert({
      member_id: member.id,
      book_id: book.id,
      reading_date: today,
      start_page: start,
      end_page: end,
      minutes: readingMinutes,
      takeaway: takeaway.trim() || null,
    })

  if (readingError) {
    console.error(
      'Failed to save reading:',
      readingError
    )

    if (readingError.code === '23505') {
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

  const { error: bookUpdateError } = await supabase
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

if (loadingBook) {
return ( <div> <h1 className="text-3xl font-bold text-gray-900">
My Reading </h1>


    <p className="mt-2 text-gray-600">
      Loading your current book...
    </p>
  </div>
)


}

if (!book) {
return ( <div> <h1 className="text-3xl font-bold text-gray-900">
My Reading </h1>


    <p className="mt-2 text-gray-600">
      You don't have a book currently marked as reading.
    </p>
  </div>
)


}

return ( <div> <h1 className="text-3xl font-bold text-gray-900">
My Reading </h1>


  <p className="mt-2 text-gray-600">
    Track your daily reading progress.
  </p>

  <div className="mt-8 rounded-2xl bg-white p-6 shadow-sm">
    <div>
      <h2 className="text-xl font-semibold text-gray-900">
        Today's Reading
      </h2>

      <p className="mt-1 text-sm text-gray-500">
        {new Date().toLocaleDateString('en-IN', {
          weekday: 'long',
          day: '2-digit',
          month: 'long',
          year: 'numeric',
        })}
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
                setFromPage(event.target.value)
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
                setToPage(event.target.value)
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
              setMinutes(event.target.value)
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
              setTakeaway(event.target.value)
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
          {saving ? 'Saving...' : 'Save Reading'}
        </button>
      </form>
    </div>

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
              entry.end_page - entry.start_page

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
                  {entry.end_page} · {entryPages}{' '}
                  {entryPages === 1 ? 'page' : 'pages'}
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
</div>


)
}

export default Reading
