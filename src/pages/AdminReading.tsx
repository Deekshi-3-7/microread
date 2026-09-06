import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

type Member = {
  id: string
  name: string
}

type Book = {
  id: string
  member_id: string
  title: string
  total_pages: number
  current_page: number
}

type ReadingEntry = {
  id: string
  member_id: string
  book_id: string
  reading_date: string
  start_page: number
  end_page: number
  pages_read: number
  minutes: number
  takeaway: string | null
  member?: Member
  book?: Book
}

export default function AdminReading() {
  const [entries, setEntries] = useState<ReadingEntry[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [books, setBooks] = useState<Book[]>([])

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [showForm, setShowForm] = useState(false)
  const [editingEntry, setEditingEntry] = useState<ReadingEntry | null>(null)

  const [memberId, setMemberId] = useState('')
  const [bookId, setBookId] = useState('')
  const [readingDate, setReadingDate] = useState(getTodayDate())
  const [startPage, setStartPage] = useState('')
  const [endPage, setEndPage] = useState('')
  const [minutes, setMinutes] = useState('')
  const [takeaway, setTakeaway] = useState('')

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

      const [
        { data: memberData, error: memberError },
        { data: bookData, error: bookError },
        { data: entryData, error: entryError },
      ] = await Promise.all([
        supabase
          .from('members')
          .select('id, name')
          .order('name', { ascending: true }),

        supabase
          .from('books')
          .select('id, member_id, title, total_pages, current_page')
          .order('title', { ascending: true }),

        supabase
          .from('reading_entries')
          .select(
            'id, member_id, book_id, reading_date, start_page, end_page, pages_read, minutes, takeaway'
          )
          .order('reading_date', { ascending: false }),
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

      const memberList = memberData || []
      const bookList = bookData || []
      const entryList = entryData || []

      setMembers(memberList)
      setBooks(bookList)

      const enrichedEntries = entryList.map((entry) => ({
        ...entry,
        member: memberList.find(
          (member) => member.id === entry.member_id
        ),
        book: bookList.find(
          (book) => book.id === entry.book_id
        ),
      }))

      setEntries(enrichedEntries)
    } catch (err) {
      console.error('Admin reading loading error:', err)

      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Unable to load reading data.')
      }
    } finally {
      setLoading(false)
    }
  }

  function openAddForm() {
    setEditingEntry(null)

    setMemberId(members[0]?.id || '')
    setBookId('')
    setReadingDate(getTodayDate())
    setStartPage('')
    setEndPage('')
    setMinutes('')
    setTakeaway('')

    setMessage('')
    setError('')
    setShowForm(true)
  }

  function openEditForm(entry: ReadingEntry) {
    setEditingEntry(entry)

    setMemberId(entry.member_id)
    setBookId(entry.book_id)
    setReadingDate(entry.reading_date)
    setStartPage(String(entry.start_page))
    setEndPage(String(entry.end_page))
    setMinutes(String(entry.minutes))
    setTakeaway(entry.takeaway || '')

    setMessage('')
    setError('')
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditingEntry(null)
  }

  function getMemberBooks(memberIdValue: string): Book[] {
    return books.filter((book) => book.member_id === memberIdValue)
  }

  function handleMemberChange(newMemberId: string) {
    setMemberId(newMemberId)

    const memberBooks = getMemberBooks(newMemberId)

    if (!memberBooks.some((book) => book.id === bookId)) {
      setBookId(memberBooks[0]?.id || '')
    }
  }

  async function saveEntry() {
    setMessage('')
    setError('')

    const start = Number(startPage)
    const end = Number(endPage)
    const readingMinutes = Number(minutes)

    const selectedBook = books.find((book) => book.id === bookId)

    if (!memberId) {
      setError('Please select a member.')
      return
    }

    if (!selectedBook) {
      setError('Please select a book.')
      return
    }

    if (!readingDate) {
      setError('Please select a reading date.')
      return
    }

    if (!Number.isInteger(start) || start < 1) {
      setError('Starting page must be a valid page number.')
      return
    }

    if (!Number.isInteger(end) || end < start) {
      setError(
        'Ending page must be greater than or equal to starting page.'
      )
      return
    }

    if (end > selectedBook.total_pages) {
      setError(
        `Ending page cannot exceed ${selectedBook.total_pages}.`
      )
      return
    }

    if (!Number.isInteger(readingMinutes) || readingMinutes <= 0) {
      setError('Reading time must be greater than 0 minutes.')
      return
    }

    setSaving(true)

    try {
      /*
       * IMPORTANT:
       * pages_read is a generated database column.
       * PostgreSQL calculates it automatically as:
       *
       * end_page - start_page
       *
       * Therefore we must NOT include pages_read
       * in INSERT or UPDATE operations.
       */
      const entryData = {
        member_id: memberId,
        book_id: bookId,
        reading_date: readingDate,
        start_page: start,
        end_page: end,
        minutes: readingMinutes,
        takeaway: takeaway.trim() || null,
        updated_at: new Date().toISOString(),
      }

      if (editingEntry) {
        const { error: updateError } = await supabase
          .from('reading_entries')
          .update(entryData)
          .eq('id', editingEntry.id)

        if (updateError) {
          throw updateError
        }

        /*
         * If the book was changed while editing,
         * also synchronize the old book.
         */
        if (editingEntry.book_id !== bookId) {
          await syncBookCurrentPage(editingEntry.book_id)
        }

        await syncBookCurrentPage(bookId)

        setMessage('✓ Reading entry updated successfully.')
      } else {
        const { error: insertError } = await supabase
          .from('reading_entries')
          .insert(entryData)

        if (insertError) {
          throw insertError
        }

        await syncBookCurrentPage(bookId)

        setMessage('✓ Reading entry added successfully.')
      }

      closeForm()
      await loadData()
    } catch (err) {
      console.error('Admin reading save error:', err)

      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Unable to save reading entry.')
      }
    } finally {
      setSaving(false)
    }
  }

  async function syncBookCurrentPage(targetBookId: string) {
    const { data: targetBook, error: bookError } =
      await supabase
        .from('books')
        .select('id, current_page, starting_page, total_pages, status')
        .eq('id', targetBookId)
        .single()

    if (bookError) {
      throw bookError
    }

    /*
     * A completed book should remain at its final page.
     */
    if (targetBook.status === 'completed') {
      return
    }

    const { data: bookEntries, error: entriesError } =
      await supabase
        .from('reading_entries')
        .select('end_page, reading_date, created_at')
        .eq('book_id', targetBookId)
        .order('reading_date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(1)

    if (entriesError) {
      throw entriesError
    }

    const latestPage =
      bookEntries && bookEntries.length > 0
        ? bookEntries[0].end_page
        : targetBook.starting_page

    const { error: bookUpdateError } = await supabase
      .from('books')
      .update({
        current_page: latestPage,
        updated_at: new Date().toISOString(),
      })
      .eq('id', targetBookId)

    if (bookUpdateError) {
      throw bookUpdateError
    }
  }

  async function deleteEntry(entry: ReadingEntry) {
    setMessage('')
    setError('')

    const confirmed = window.confirm(
      `Delete the reading entry for ${
        entry.member?.name || 'this member'
      } on ${entry.reading_date}?\n\nThis action cannot be undone.`
    )

    if (!confirmed) {
      return
    }

    try {
      const { error: deleteError } = await supabase
        .from('reading_entries')
        .delete()
        .eq('id', entry.id)

      if (deleteError) {
        throw deleteError
      }

      await syncBookCurrentPage(entry.book_id)

      setMessage('✓ Reading entry deleted successfully.')

      await loadData()
    } catch (err) {
      console.error('Admin reading delete error:', err)

      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Unable to delete reading entry.')
      }
    }
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
          Loading reading data...
        </div>
      </div>
    )
  }

  const selectedMemberBooks = getMemberBooks(memberId)

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            📊 Reading Data
          </h1>

          <p className="mt-1 text-gray-600">
            View and correct reading entries for all members.
          </p>
        </div>

        <button
          type="button"
          onClick={openAddForm}
          className="rounded-xl bg-gray-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-800"
        >
          ➕ Add Reading
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
          <p className="text-sm text-gray-500">
            Total Entries
          </p>

          <p className="mt-2 text-3xl font-bold text-gray-900">
            {entries.length}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">
            Total Pages
          </p>

          <p className="mt-2 text-3xl font-bold text-gray-900">
            {entries.reduce(
              (total, entry) => total + entry.pages_read,
              0
            )}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">
            Reading Time
          </p>

          <p className="mt-2 text-3xl font-bold text-gray-900">
            {entries.reduce(
              (total, entry) => total + entry.minutes,
              0
            )}{' '}
            min
          </p>
        </div>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {editingEntry
                  ? '✏️ Edit Reading Entry'
                  : '➕ Add Reading Entry'}
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Admin can add or correct reading history for any member.
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
                htmlFor="readingMember"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Member
              </label>

              <select
                id="readingMember"
                value={memberId}
                onChange={(event) =>
                  handleMemberChange(event.target.value)
                }
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-200"
              >
                <option value="">
                  Select member
                </option>

                {members.map((member) => (
                  <option
                    key={member.id}
                    value={member.id}
                  >
                    {member.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Book */}
            <div>
              <label
                htmlFor="readingBook"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Book
              </label>

              <select
                id="readingBook"
                value={bookId}
                onChange={(event) =>
                  setBookId(event.target.value)
                }
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-200"
              >
                <option value="">
                  Select book
                </option>

                {selectedMemberBooks.map((book) => (
                  <option
                    key={book.id}
                    value={book.id}
                  >
                    {book.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Date */}
            <div>
              <label
                htmlFor="readingDate"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Reading Date
              </label>

              <input
                id="readingDate"
                type="date"
                value={readingDate}
                onChange={(event) =>
                  setReadingDate(event.target.value)
                }
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-200"
              />
            </div>

            {/* Minutes */}
            <div>
              <label
                htmlFor="readingMinutes"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Reading Time (minutes)
              </label>

              <input
                id="readingMinutes"
                type="number"
                min="1"
                value={minutes}
                onChange={(event) =>
                  setMinutes(event.target.value)
                }
                placeholder="20"
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-200"
              />
            </div>

            {/* Start Page */}
            <div>
              <label
                htmlFor="readingStartPage"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                From Page
              </label>

              <input
                id="readingStartPage"
                type="number"
                min="1"
                value={startPage}
                onChange={(event) =>
                  setStartPage(event.target.value)
                }
                placeholder="63"
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-200"
              />
            </div>

            {/* End Page */}
            <div>
              <label
                htmlFor="readingEndPage"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                To Page
              </label>

              <input
                id="readingEndPage"
                type="number"
                min="1"
                value={endPage}
                onChange={(event) =>
                  setEndPage(event.target.value)
                }
                placeholder="66"
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-200"
              />
            </div>

            {/* Takeaway */}
            <div className="sm:col-span-2">
              <label
                htmlFor="readingTakeaway"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Takeaway (optional)
              </label>

              <textarea
                id="readingTakeaway"
                value={takeaway}
                onChange={(event) =>
                  setTakeaway(event.target.value)
                }
                rows={3}
                placeholder="What was the key takeaway?"
                className="w-full resize-none rounded-xl border border-gray-300 px-4 py-3 text-gray-900 outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-200"
              />
            </div>
          </div>

          {startPage &&
            endPage &&
            Number(endPage) >= Number(startPage) && (
              <div className="mt-4 rounded-xl bg-gray-50 p-4 text-sm text-gray-600">
                📖 Pages read:{' '}
                <strong>
                  {Number(endPage) - Number(startPage)}
                </strong>
              </div>
            )}

          <div className="mt-5 flex gap-3">
            <button
              type="button"
              onClick={saveEntry}
              disabled={saving}
              className="rounded-xl bg-gray-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving
                ? 'Saving...'
                : editingEntry
                  ? 'Save Changes'
                  : 'Add Reading'}
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

      {/* Reading Entries */}
      <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900">
            📖 All Reading Entries
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Reading history from every MicroRead member.
          </p>
        </div>

        <div className="divide-y divide-gray-100">
          {entries.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No reading entries yet.
            </div>
          ) : (
            entries.map((entry) => (
              <div
                key={entry.id}
                className="p-5"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-gray-900">
                        {entry.member?.name ||
                          'Unknown member'}
                      </h3>

                      <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                        {entry.reading_date}
                      </span>
                    </div>

                    <p className="mt-1 text-sm font-medium text-gray-700">
                      📖{' '}
                      {entry.book?.title ||
                        'Unknown book'}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-gray-600">
                      <span>
                        📄 {entry.start_page} →{' '}
                        {entry.end_page}
                      </span>

                      <span>
                        <strong>
                          {entry.pages_read}
                        </strong>{' '}
                        pages
                      </span>

                      <span>
                        ⏱️ {entry.minutes} min
                      </span>
                    </div>

                    {entry.takeaway && (
                      <div className="mt-3 rounded-xl bg-gray-50 p-3 text-sm text-gray-600">
                        💡 {entry.takeaway}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        openEditForm(entry)
                      }
                      className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      ✏️ Edit
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        deleteEntry(entry)
                      }
                      className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5 text-sm text-blue-800">
        💡 <strong>Admin correction:</strong> Editing or
        deleting an entry automatically attempts to keep
        the related book's current page in sync with the
        latest reading entry.
      </div>
    </div>
  )
}