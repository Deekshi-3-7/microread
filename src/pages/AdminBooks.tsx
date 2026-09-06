import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

type Member = {
  id: string
  name: string
}

type BookStatus = 'reading' | 'completed' | 'paused'

type Book = {
  id: string
  member_id: string
  title: string
  author: string
  total_pages: number
  starting_page: number
  current_page: number
  start_date: string
  completion_date: string | null
  status: BookStatus
  member?: Member
}

export default function AdminBooks() {
  const [books, setBooks] = useState<Book[]>([])
  const [members, setMembers] = useState<Member[]>([])

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [showForm, setShowForm] = useState(false)
  const [editingBook, setEditingBook] = useState<Book | null>(null)

  const [memberId, setMemberId] = useState('')
  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')
  const [totalPages, setTotalPages] = useState('')
  const [startingPage, setStartingPage] = useState('1')
  const [currentPage, setCurrentPage] = useState('1')
  const [startDate, setStartDate] = useState(getTodayDate())
  const [status, setStatus] = useState<BookStatus>('reading')

  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    setError('')

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        throw new Error('You are not logged in.')
      }

      const { data: currentMember, error: currentMemberError } =
        await supabase
          .from('members')
          .select('id, role, active')
          .eq('auth_user_id', user.id)
          .single()

      if (currentMemberError) {
        throw currentMemberError
      }

      if (currentMember.role !== 'admin' || !currentMember.active) {
        throw new Error('You do not have permission to access this page.')
      }

      const [{ data: memberData, error: memberError }, { data: bookData, error: bookError }] =
        await Promise.all([
          supabase
            .from('members')
            .select('id, name')
            .order('name', { ascending: true }),

          supabase
            .from('books')
            .select(
              'id, member_id, title, author, total_pages, starting_page, current_page, start_date, completion_date, status'
            )
            .order('created_at', { ascending: false }),
        ])

      if (memberError) {
        throw memberError
      }

      if (bookError) {
        throw bookError
      }

      const memberList = memberData || []
      const bookList = bookData || []

      setMembers(memberList)

      const booksWithMembers = bookList.map((book) => ({
        ...book,
        member: memberList.find((member) => member.id === book.member_id),
      }))

      setBooks(booksWithMembers)
    } catch (err) {
      console.error('Admin books loading error:', err)

      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Unable to load books.')
      }
    } finally {
      setLoading(false)
    }
  }

  function openAddForm() {
    setEditingBook(null)

    setMemberId(members[0]?.id || '')
    setTitle('')
    setAuthor('')
    setTotalPages('')
    setStartingPage('1')
    setCurrentPage('1')
    setStartDate(getTodayDate())
    setStatus('reading')

    setMessage('')
    setError('')
    setShowForm(true)
  }

  function openEditForm(book: Book) {
    setEditingBook(book)

    setMemberId(book.member_id)
    setTitle(book.title)
    setAuthor(book.author)
    setTotalPages(String(book.total_pages))
    setStartingPage(String(book.starting_page))
    setCurrentPage(String(book.current_page))
    setStartDate(book.start_date)
    setStatus(book.status)

    setMessage('')
    setError('')
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditingBook(null)
  }

  async function saveBook() {
    setMessage('')
    setError('')

    const trimmedTitle = title.trim()
    const trimmedAuthor = author.trim()

    const total = Number(totalPages)
    const starting = Number(startingPage)
    const current = Number(currentPage)

    if (!memberId) {
      setError('Please select a member.')
      return
    }

    if (!trimmedTitle) {
      setError('Please enter the book title.')
      return
    }

    if (!trimmedAuthor) {
      setError('Please enter the author name.')
      return
    }

    if (!Number.isInteger(total) || total <= 0) {
      setError('Total pages must be a valid number greater than 0.')
      return
    }

    if (!Number.isInteger(starting) || starting < 1 || starting > total) {
      setError(`Starting page must be between 1 and ${total}.`)
      return
    }

    if (!Number.isInteger(current) || current < starting || current > total) {
      setError(
        `Current page must be between ${starting} and ${total}.`
      )
      return
    }

    if (!startDate) {
      setError('Please select a start date.')
      return
    }

    setSaving(true)

    try {
      const bookData = {
        member_id: memberId,
        title: trimmedTitle,
        author: trimmedAuthor,
        total_pages: total,
        starting_page: starting,
        current_page: current,
        start_date: startDate,
        status,
        completion_date:
          status === 'completed' ? getTodayDate() : null,
        updated_at: new Date().toISOString(),
      }

      if (editingBook) {
        const { error: updateError } = await supabase
          .from('books')
          .update(bookData)
          .eq('id', editingBook.id)

        if (updateError) {
          throw updateError
        }

        setMessage('✓ Book updated successfully.')
      } else {
        const { error: insertError } = await supabase
          .from('books')
          .insert(bookData)

        if (insertError) {
          throw insertError
        }

        setMessage('✓ Book added successfully.')
      }

      closeForm()
      await loadData()
    } catch (err) {
      console.error('Admin book save error:', err)

      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Unable to save book.')
      }
    } finally {
      setSaving(false)
    }
  }

  async function deleteBook(book: Book) {
    setMessage('')
    setError('')

    const confirmed = window.confirm(
      `Permanently delete "${book.title}"?\n\nThis may also affect reading history associated with this book. This action cannot be undone.`
    )

    if (!confirmed) {
      return
    }

    try {
      const { error: deleteError } = await supabase
        .from('books')
        .delete()
        .eq('id', book.id)

      if (deleteError) {
        throw deleteError
      }

      setMessage(`✓ "${book.title}" has been deleted.`)

      await loadData()
    } catch (err) {
      console.error('Admin book delete error:', err)

      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Unable to delete book.')
      }
    }
  }

  async function changeStatus(book: Book, newStatus: BookStatus) {
    setMessage('')
    setError('')

    const statusText =
      newStatus === 'completed'
        ? 'mark as completed'
        : newStatus === 'paused'
          ? 'pause'
          : 'reopen'

    const confirmed = window.confirm(
      `Are you sure you want to ${statusText} "${book.title}"?`
    )

    if (!confirmed) {
      return
    }

    try {
      const updateData = {
        status: newStatus,
        current_page:
          newStatus === 'completed'
            ? book.total_pages
            : book.current_page,
        completion_date:
          newStatus === 'completed' ? getTodayDate() : null,
        updated_at: new Date().toISOString(),
      }

      const { error: updateError } = await supabase
        .from('books')
        .update(updateData)
        .eq('id', book.id)

      if (updateError) {
        throw updateError
      }

      setMessage(`✓ "${book.title}" updated successfully.`)

      await loadData()
    } catch (err) {
      console.error('Admin book status error:', err)

      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Unable to update book status.')
      }
    }
  }

  function getProgress(book: Book): number {
    if (book.total_pages <= 0) {
      return 0
    }

    const progress =
      (book.current_page / book.total_pages) * 100

    return Math.min(100, Math.max(0, progress))
  }

  function getStatusLabel(bookStatus: BookStatus): string {
    if (bookStatus === 'completed') {
      return 'Completed'
    }

    if (bookStatus === 'paused') {
      return 'Paused'
    }

    return 'Reading'
  }

  function getStatusClasses(bookStatus: BookStatus): string {
    if (bookStatus === 'completed') {
      return 'bg-green-100 text-green-700'
    }

    if (bookStatus === 'paused') {
      return 'bg-yellow-100 text-yellow-700'
    }

    return 'bg-blue-100 text-blue-700'
  }

  function getTodayDate(): string {
    const today = new Date()

    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, '0')
    const day = String(today.getDate()).padStart(2, '0')

    return year + '-' + month + '-' + day
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-gray-500">
          Loading book management...
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            📚 Book Management
          </h1>
          <p className="mt-1 text-gray-600">
            View and manage all books in MicroRead.
          </p>
        </div>

        <button
          type="button"
          onClick={openAddForm}
          className="rounded-xl bg-gray-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-800"
        >
          ➕ Add Book
        </button>
      </div>

      {/* Messages */}
      {message && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {message}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Total Books</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">
            {books.length}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Currently Reading</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">
            {books.filter((book) => book.status === 'reading').length}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Completed</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">
            {books.filter((book) => book.status === 'completed').length}
          </p>
        </div>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {editingBook ? '✏️ Edit Book' : '➕ Add Book'}
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Enter the book information and current progress.
              </p>
            </div>

            <button
              type="button"
              onClick={closeForm}
              className="rounded-lg px-3 py-2 text-gray-500 hover:bg-gray-100"
            >
              ✕
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Member */}
            <div>
              <label
                htmlFor="bookMember"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Member
              </label>

              <select
                id="bookMember"
                value={memberId}
                onChange={(event) => setMemberId(event.target.value)}
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-200"
              >
                <option value="">Select member</option>

                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div>
              <label
                htmlFor="bookStatus"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Status
              </label>

              <select
                id="bookStatus"
                value={status}
                onChange={(event) =>
                  setStatus(event.target.value as BookStatus)
                }
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-200"
              >
                <option value="reading">Reading</option>
                <option value="paused">Paused</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            {/* Title */}
            <div>
              <label
                htmlFor="bookTitle"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Book Title
              </label>

              <input
                id="bookTitle"
                type="text"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="e.g. Atomic Habits"
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-200"
              />
            </div>

            {/* Author */}
            <div>
              <label
                htmlFor="bookAuthor"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Author
              </label>

              <input
                id="bookAuthor"
                type="text"
                value={author}
                onChange={(event) => setAuthor(event.target.value)}
                placeholder="e.g. James Clear"
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-200"
              />
            </div>

            {/* Total Pages */}
            <div>
              <label
                htmlFor="totalPages"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Total Pages
              </label>

              <input
                id="totalPages"
                type="number"
                min="1"
                value={totalPages}
                onChange={(event) => setTotalPages(event.target.value)}
                placeholder="320"
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-200"
              />
            </div>

            {/* Start Date */}
            <div>
              <label
                htmlFor="startDate"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Start Date
              </label>

              <input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-200"
              />
            </div>

            {/* Starting Page */}
            <div>
              <label
                htmlFor="startingPage"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Starting Page
              </label>

              <input
                id="startingPage"
                type="number"
                min="1"
                value={startingPage}
                onChange={(event) => {
                  setStartingPage(event.target.value)

                  if (!editingBook) {
                    setCurrentPage(event.target.value)
                  }
                }}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-200"
              />
            </div>

            {/* Current Page */}
            <div>
              <label
                htmlFor="currentPage"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Current Page
              </label>

              <input
                id="currentPage"
                type="number"
                min="1"
                value={currentPage}
                onChange={(event) => setCurrentPage(event.target.value)}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-200"
              />
            </div>
          </div>

          <div className="mt-5 flex gap-3">
            <button
              type="button"
              onClick={saveBook}
              disabled={saving}
              className="rounded-xl bg-gray-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving
                ? 'Saving...'
                : editingBook
                  ? 'Save Changes'
                  : 'Add Book'}
            </button>

            <button
              type="button"
              onClick={closeForm}
              className="rounded-xl border border-gray-300 px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </section>
      )}

      {/* Books */}
      <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900">
            📚 All Books
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Books belonging to all MicroRead members.
          </p>
        </div>

        <div className="divide-y divide-gray-100">
          {books.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No books have been added yet.
            </div>
          ) : (
            books.map((book) => {
              const progress = getProgress(book)

              return (
                <div key={book.id} className="p-5">
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {book.title}
                        </h3>

                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClasses(
                            book.status
                          )}`}
                        >
                          {getStatusLabel(book.status)}
                        </span>
                      </div>

                      <p className="mt-1 text-sm text-gray-500">
                        {book.author}
                      </p>

                      <p className="mt-2 text-sm font-medium text-gray-700">
                        👤 {book.member?.name || 'Unknown member'}
                      </p>

                      <div className="mt-4 max-w-xl">
                        <div className="mb-2 flex justify-between text-sm">
                          <span className="text-gray-500">
                            Page {book.current_page} / {book.total_pages}
                          </span>

                          <span className="font-semibold text-gray-700">
                            {Math.round(progress)}%
                          </span>
                        </div>

                        <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                          <div
                            className="h-full rounded-full bg-gray-900 transition-all"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>

                      <p className="mt-3 text-xs text-gray-400">
                        Started {book.start_date}
                        {book.completion_date
                          ? ` · Completed ${book.completion_date}`
                          : ''}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2 lg:justify-end">
                      <button
                        type="button"
                        onClick={() => openEditForm(book)}
                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                      >
                        ✏️ Edit
                      </button>

                      {book.status !== 'completed' && (
                        <button
                          type="button"
                          onClick={() =>
                            changeStatus(book, 'completed')
                          }
                          className="rounded-lg border border-green-200 px-3 py-2 text-sm font-medium text-green-700 hover:bg-green-50"
                        >
                          ✅ Complete
                        </button>
                      )}

                      {book.status === 'completed' && (
                        <button
                          type="button"
                          onClick={() =>
                            changeStatus(book, 'reading')
                          }
                          className="rounded-lg border border-blue-200 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50"
                        >
                          🔄 Reopen
                        </button>
                      )}

                      {book.status === 'reading' && (
                        <button
                          type="button"
                          onClick={() =>
                            changeStatus(book, 'paused')
                          }
                          className="rounded-lg border border-yellow-200 px-3 py-2 text-sm font-medium text-yellow-700 hover:bg-yellow-50"
                        >
                          ⏸️ Pause
                        </button>
                      )}

                      {book.status === 'paused' && (
                        <button
                          type="button"
                          onClick={() =>
                            changeStatus(book, 'reading')
                          }
                          className="rounded-lg border border-blue-200 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50"
                        >
                          ▶️ Resume
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => deleteBook(book)}
                        className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </section>

      <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-5 text-sm text-yellow-800">
        ⚠️ <strong>Be careful when deleting books.</strong> Reading entries
        are associated with books, so deleting a book may also be restricted
        by your database relationships. Prefer editing, pausing, or completing
        a book whenever possible.
      </div>
    </div>
  )
}

