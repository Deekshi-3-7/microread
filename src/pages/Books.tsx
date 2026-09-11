import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { computeCurrentPageFromHistory } from '../lib/books'

type BookStatus = 'reading' | 'completed' | 'paused'

type Book = {
id: string
title: string
author: string
total_pages: number
starting_page: number
current_page: number
start_date: string
completion_date: string | null
status: BookStatus
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

function calculateProgress(
currentPage: number,
totalPages: number
): number {
if (totalPages <= 0) {
return 0
}

return Math.min(
Math.round((currentPage / totalPages) * 100),
100
)
}

function Books() {
const [books, setBooks] = useState<Book[]>([])
const [loading, setLoading] = useState<boolean>(true)

const [showAddBook, setShowAddBook] =
useState<boolean>(false)

const [title, setTitle] = useState<string>('')
const [author, setAuthor] = useState<string>('')
const [totalPages, setTotalPages] =
useState<string>('')
const [currentPage, setCurrentPage] =
useState<string>('')
const [startDate, setStartDate] =
useState<string>(getTodayDate())

const [saving, setSaving] = useState<boolean>(false)
const [errorMessage, setErrorMessage] =
useState<string>('')
const [successMessage, setSuccessMessage] =
useState<string>('')

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

const loadBooks = async (): Promise<void> => {
setLoading(true)
setErrorMessage('')


try {
  const member = await getMember()

  if (!member) {
    setErrorMessage(
      'Unable to find your member account.'
    )
    return
  }

  const { data, error } = await supabase
    .from('books')
    .select(
      'id, title, author, total_pages, starting_page, current_page, start_date, completion_date, status'
    )
    .eq('member_id', member.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Failed to load books:', error)

    setErrorMessage(
      'Unable to load your books. Please try again.'
    )

    return
  }

  setBooks((data ?? []) as Book[])
} catch (error: unknown) {
  console.error(
    'Unexpected error while loading books:',
    error
  )

  setErrorMessage(
    'Something went wrong while loading your books.'
  )
} finally {
  setLoading(false)
}


}

useEffect(() => {
void loadBooks()
}, [])

const resetAddBookForm = (): void => {
setTitle('')
setAuthor('')
setTotalPages('')
setCurrentPage('')
setStartDate(getTodayDate())
setErrorMessage('')
}

const handleAddBook = async (
event: React.FormEvent<HTMLFormElement>
): Promise<void> => {
event.preventDefault()


setErrorMessage('')
setSuccessMessage('')

const trimmedTitle = title.trim()
const trimmedAuthor = author.trim()
const pages = Number(totalPages)
const startingPage = Number(currentPage)

if (!trimmedTitle) {
  setErrorMessage('Please enter the book title.')
  return
}

if (!trimmedAuthor) {
  setErrorMessage('Please enter the author name.')
  return
}

if (
  !Number.isInteger(pages) ||
  pages <= 0
) {
  setErrorMessage(
    'Total Pages must be greater than 0.'
  )
  return
}

if (
  !Number.isInteger(startingPage) ||
  startingPage < 1 ||
  startingPage > pages
) {
  setErrorMessage(
    `Current Page must be between 1 and ${pages}.`
  )
  return
}

if (!startDate) {
  setErrorMessage('Please select a start date.')
  return
}

setSaving(true)

try {
  const member = await getMember()

  if (!member) {
    setErrorMessage(
      'Unable to find your member account.'
    )
    return
  }

  const { error } = await supabase
    .from('books')
    .insert({
      member_id: member.id,
      title: trimmedTitle,
      author: trimmedAuthor,
      total_pages: pages,
      starting_page: startingPage,
      current_page: startingPage,
      start_date: startDate,
      status: 'reading',
    })

  if (error) {
    console.error('Failed to add book:', error)

    setErrorMessage(
      'Unable to add the book. Please try again.'
    )

    return
  }

  setShowAddBook(false)
  resetAddBookForm()

  setSuccessMessage(
    `"${trimmedTitle}" was added successfully.`
  )

  await loadBooks()
} catch (error: unknown) {
  console.error(
    'Unexpected error while adding book:',
    error
  )

  setErrorMessage(
    'Something went wrong while adding the book.'
  )
} finally {
  setSaving(false)
}


}

const handleFinishBook = async (
book: Book
): Promise<void> => {
const confirmed = window.confirm(
`Have you finished "${book.title}"?`
)


if (!confirmed) {
  return
}

setErrorMessage('')
setSuccessMessage('')

try {
  const { error } = await supabase
    .from('books')
    .update({
      status: 'completed',
      current_page: book.total_pages,
      completion_date: getTodayDate(),
    })
    .eq('id', book.id)

  if (error) {
    console.error(
      'Failed to complete book:',
      error
    )

    setErrorMessage(
      'Unable to mark the book as completed.'
    )

    return
  }

  setSuccessMessage(
    `"${book.title}" has been completed! 🎉`
  )

  await loadBooks()
} catch (error: unknown) {
  console.error(
    'Unexpected error while completing book:',
    error
  )

  setErrorMessage(
    'Something went wrong while completing the book.'
  )
}


}

const handleReopenBook = async (
book: Book
): Promise<void> => {
setErrorMessage('')
setSuccessMessage('')

try {
  /*
   * Finishing a book overwrites current_page with total_pages.
   * When reopening, restore the true page from reading history
   * so accidental "finishes" don't leave the book stuck at 100%.
   * Reading entries are never modified.
   */
  const restoredPage = await computeCurrentPageFromHistory(
    book.id,
    book.starting_page
  )

  const confirmed = window.confirm(
    `Reopen "${book.title}" and continue reading from page ${restoredPage}?`
  )

  if (!confirmed) {
    return
  }

  const { error } = await supabase
    .from('books')
    .update({
      status: 'reading',
      completion_date: null,
      current_page: restoredPage,
    })
    .eq('id', book.id)

  if (error) {
    console.error(
      'Failed to reopen book:',
      error
    )

    setErrorMessage(
      'Unable to reopen the book.'
    )

    return
  }

  setSuccessMessage(
    `"${book.title}" has been reopened at page ${restoredPage}.`
  )

  await loadBooks()
} catch (error: unknown) {
  console.error(
    'Unexpected error while reopening book:',
    error
  )

  setErrorMessage(
    'Something went wrong while reopening the book.'
  )
}


}

const currentBooks = books.filter(
(book: Book) => book.status === 'reading'
)

const completedBooks = books.filter(
(book: Book) => book.status === 'completed'
)

if (loading) {
return ( <div> <h1 className="text-3xl font-bold text-gray-900">
Books </h1>


    <p className="mt-2 text-gray-600">
      Loading your books...
    </p>
  </div>
)


}

return ( <div> <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"> <div> <h1 className="text-3xl font-bold text-gray-900">
Books </h1>


      <p className="mt-2 text-gray-600">
        Manage your reading journey.
      </p>
    </div>

    <button
      type="button"
      onClick={() => {
        setShowAddBook(true)
        setErrorMessage('')
        setSuccessMessage('')
      }}
      className="rounded-lg bg-black px-5 py-3 font-medium text-white hover:bg-gray-800"
    >
      + Add Book
    </button>
  </div>

  {successMessage && (
    <div className="mt-6 rounded-lg bg-green-50 p-4 text-sm text-green-700">
      ✓ {successMessage}
    </div>
  )}

  {errorMessage && (
    <div className="mt-6 rounded-lg bg-red-50 p-4 text-sm text-red-700">
      {errorMessage}
    </div>
  )}

  {showAddBook && (
    <div className="mt-8 rounded-2xl bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            Add Book
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Already started the book? Enter the
            page you're currently on.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setShowAddBook(false)
            resetAddBookForm()
          }}
          className="text-sm text-gray-500 hover:text-gray-900"
        >
          Cancel
        </button>
      </div>

      <form
        onSubmit={handleAddBook}
        className="mt-6"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label
              htmlFor="bookTitle"
              className="block text-sm font-medium text-gray-700"
            >
              Book Title
            </label>

            <input
              id="bookTitle"
              type="text"
              value={title}
              onChange={(event) =>
                setTitle(event.target.value)
              }
              placeholder="e.g. IKIGAI"
              className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-black"
              required
            />
          </div>

          <div className="sm:col-span-2">
            <label
              htmlFor="bookAuthor"
              className="block text-sm font-medium text-gray-700"
            >
              Author
            </label>

            <input
              id="bookAuthor"
              type="text"
              value={author}
              onChange={(event) =>
                setAuthor(event.target.value)
              }
              placeholder="e.g. Hector Garcia and Francesc Miralles"
              className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-black"
              required
            />
          </div>

          <div>
            <label
              htmlFor="totalPages"
              className="block text-sm font-medium text-gray-700"
            >
              Total Pages
            </label>

            <input
              id="totalPages"
              type="number"
              min="1"
              value={totalPages}
              onChange={(event) =>
                setTotalPages(event.target.value)
              }
              placeholder="194"
              className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-black"
              required
            />
          </div>

          <div>
            <label
              htmlFor="currentPage"
              className="block text-sm font-medium text-gray-700"
            >
              Current Page
            </label>

            <input
              id="currentPage"
              type="number"
              min="1"
              value={currentPage}
              onChange={(event) =>
                setCurrentPage(event.target.value)
              }
              placeholder="1"
              className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-black"
              required
            />
          </div>

          <div>
            <label
              htmlFor="startDate"
              className="block text-sm font-medium text-gray-700"
            >
              Start Date
            </label>

            <input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(event) =>
                setStartDate(event.target.value)
              }
              className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-black"
              required
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="mt-6 w-full rounded-lg bg-black px-5 py-3 font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? 'Adding Book...' : 'Add Book'}
        </button>
      </form>
    </div>
  )}

  <section className="mt-8">
    <h2 className="text-2xl font-semibold text-gray-900">
      Currently Reading
    </h2>

    {currentBooks.length === 0 ? (
      <div className="mt-4 rounded-2xl border border-dashed border-gray-300 p-6">
        <p className="text-gray-500">
          You don't have any books currently
          marked as reading.
        </p>
      </div>
    ) : (
      <div className="mt-4 space-y-4">
        {currentBooks.map((book: Book) => {
          const progress = calculateProgress(
            book.current_page,
            book.total_pages
          )

          return (
            <div
              key={book.id}
              className="rounded-2xl bg-white p-6 shadow-sm"
            >
              <div className="flex flex-col justify-between gap-4 sm:flex-row">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">
                    {book.title}
                  </h3>

                  <p className="mt-1 text-sm text-gray-500">
                    {book.author}
                  </p>
                </div>

                <div className="text-left sm:text-right">
                  <p className="text-3xl font-bold text-gray-900">
                    {progress}%
                  </p>

                  <p className="text-sm text-gray-500">
                    completed
                  </p>
                </div>
              </div>

              <div className="mt-5">
                <div className="h-3 w-full overflow-hidden rounded-full bg-gray-200">
                  <div
                    className="h-full rounded-full bg-black transition-all"
                    style={{
                      width: `${progress}%`,
                    }}
                  />
                </div>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-3">
                <div className="rounded-lg bg-gray-50 p-4">
                  <p className="text-sm text-gray-500">
                    Current Page
                  </p>

                  <p className="mt-1 font-semibold text-gray-900">
                    {book.current_page}
                  </p>
                </div>

                <div className="rounded-lg bg-gray-50 p-4">
                  <p className="text-sm text-gray-500">
                    Total Pages
                  </p>

                  <p className="mt-1 font-semibold text-gray-900">
                    {book.total_pages}
                  </p>
                </div>

                <div className="rounded-lg bg-gray-50 p-4">
                  <p className="text-sm text-gray-500">
                    Started
                  </p>

                  <p className="mt-1 font-semibold text-gray-900">
                    {new Date(
                      book.start_date
                    ).toLocaleDateString('en-IN')}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  void handleFinishBook(book)
                }
                className="mt-6 w-full rounded-lg border border-gray-300 px-5 py-3 font-medium text-gray-900 hover:bg-gray-50"
              >
                ✓ I Finished This Book
              </button>
            </div>
          )
        })}
      </div>
    )}
  </section>

  <section className="mt-10">
    <h2 className="text-2xl font-semibold text-gray-900">
      Completed Books
    </h2>

    {completedBooks.length === 0 ? (
      <div className="mt-4 rounded-2xl border border-dashed border-gray-300 p-6">
        <p className="text-gray-500">
          No completed books yet.
        </p>

        <p className="mt-1 text-sm text-gray-400">
          Finish your first book and it will appear
          here.
        </p>
      </div>
    ) : (
      <div className="mt-4 space-y-4">
        {completedBooks.map((book: Book) => (
          <div
            key={book.id}
            className="rounded-2xl bg-white p-6 shadow-sm"
          >
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">
                  {book.title}
                </h3>

                <p className="mt-1 text-sm text-gray-500">
                  {book.author}
                </p>

                <p className="mt-3 text-sm text-gray-600">
                  ✓ Completed on{' '}
                  {book.completion_date
                    ? new Date(
                        book.completion_date
                      ).toLocaleDateString(
                        'en-IN'
                      )
                    : 'Unknown date'}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  void handleReopenBook(book)
                }
                className="rounded-lg border border-gray-300 px-5 py-3 text-sm font-medium text-gray-900 hover:bg-gray-50"
              >
                Reopen Book
              </button>
            </div>
          </div>
        ))}
      </div>
    )}
  </section>
</div>


)
}

export default Books
