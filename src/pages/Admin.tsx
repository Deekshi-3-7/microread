import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

type Member = {
  id: string
  name: string
  email: string
  role: 'admin' | 'member'
  joined_date: string
  active: boolean
}

export default function Admin() {
  const [currentUser, setCurrentUser] = useState<Member | null>(null)
  const [members, setMembers] = useState<Member[]>([])

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [showForm, setShowForm] = useState(false)
  const [editingMember, setEditingMember] = useState<Member | null>(null)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'admin' | 'member'>('member')

  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    loadAdminData()
  }, [])

  async function loadAdminData() {
    setLoading(true)
    setError('')

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        throw new Error('You are not logged in.')
      }

      const { data: memberData, error: memberError } = await supabase
        .from('members')
        .select('id, name, email, role, joined_date, active')
        .eq('auth_user_id', user.id)
        .single()

      if (memberError) {
        throw memberError
      }

      if (memberData.role !== 'admin' || !memberData.active) {
        setCurrentUser(memberData)
        return
      }

      setCurrentUser(memberData)

      await loadMembers()
    } catch (err) {
      console.error('Admin loading error:', err)

      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Unable to load admin dashboard.')
      }
    } finally {
      setLoading(false)
    }
  }

  async function loadMembers() {
    const { data, error: membersError } = await supabase
      .from('members')
      .select('id, name, email, role, joined_date, active')
      .order('joined_date', { ascending: true })

    if (membersError) {
      throw membersError
    }

    setMembers(data || [])
  }

  function openAddForm() {
    setEditingMember(null)
    setName('')
    setEmail('')
    setRole('member')
    setMessage('')
    setError('')
    setShowForm(true)
  }

  function openEditForm(member: Member) {
    setEditingMember(member)
    setName(member.name)
    setEmail(member.email)
    setRole(member.role)
    setMessage('')
    setError('')
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditingMember(null)
    setName('')
    setEmail('')
    setRole('member')
  }

  async function saveMember() {
    setMessage('')
    setError('')

    const trimmedName = name.trim()
    const trimmedEmail = email.trim().toLowerCase()

    if (!trimmedName) {
      setError('Please enter the member name.')
      return
    }

    if (!trimmedEmail) {
      setError('Please enter the member email.')
      return
    }

    setSaving(true)

    try {
      if (editingMember) {
        const { error: updateError } = await supabase
          .from('members')
          .update({
            name: trimmedName,
            email: trimmedEmail,
            role,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingMember.id)

        if (updateError) {
          throw updateError
        }

        setMessage('✓ Member updated successfully.')
      } else {
        const { error: insertError } = await supabase
          .from('members')
          .insert({
            name: trimmedName,
            email: trimmedEmail,
            role,
            joined_date: getTodayDate(),
            active: true,
          })

        if (insertError) {
          throw insertError
        }

        setMessage('✓ Member added successfully.')
      }

      closeForm()
      await loadMembers()
    } catch (err) {
      console.error('Member save error:', err)

      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Unable to save member.')
      }
    } finally {
      setSaving(false)
    }
  }

  async function toggleMemberStatus(member: Member) {
    setMessage('')
    setError('')

    const action = member.active ? 'deactivate' : 'reactivate'

    const confirmed = window.confirm(
      `Are you sure you want to ${action} ${member.name}?`
    )

    if (!confirmed) {
      return
    }

    try {
      const { error: updateError } = await supabase
        .from('members')
        .update({
          active: !member.active,
          updated_at: new Date().toISOString(),
        })
        .eq('id', member.id)

      if (updateError) {
        throw updateError
      }

      setMessage(
        member.active
          ? `✓ ${member.name} has been deactivated.`
          : `✓ ${member.name} has been reactivated.`
      )

      await loadMembers()
    } catch (err) {
      console.error('Member status error:', err)

      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError(`Unable to ${action} member.`)
      }
    }
  }

  async function deleteMember(member: Member) {
    setMessage('')
    setError('')

    if (member.id === currentUser?.id) {
      setError('You cannot delete your own admin account.')
      return
    }

    const confirmed = window.confirm(
      `Permanently delete ${member.name}?\n\nThis will delete the member profile. This action cannot be undone.`
    )

    if (!confirmed) {
      return
    }

    try {
      const { error: deleteError } = await supabase
        .from('members')
        .delete()
        .eq('id', member.id)

      if (deleteError) {
        throw deleteError
      }

      setMessage(`✓ ${member.name} has been permanently deleted.`)

      await loadMembers()
    } catch (err) {
      console.error('Member delete error:', err)

      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Unable to delete member.')
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
        <div className="text-gray-500">Loading admin dashboard...</div>
      </div>
    )
  }

  if (!currentUser || currentUser.role !== 'admin' || !currentUser.active) {
    return (
      <div className="mx-auto max-w-2xl py-16">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
          <div className="text-4xl">🔒</div>
          <h1 className="mt-4 text-2xl font-bold text-gray-900">
            Access Restricted
          </h1>
          <p className="mt-2 text-gray-600">
            You do not have permission to access the Admin Dashboard.
          </p>
        </div>
      </div>
    )
  }

  const activeMembers = members.filter((member) => member.active)
  const inactiveMembers = members.filter((member) => !member.active)

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            🛠️ Admin Dashboard
          </h1>
          <p className="mt-1 text-gray-600">
            Manage MicroRead members and application data.
          </p>
        </div>

        <button
          type="button"
          onClick={openAddForm}
          className="rounded-xl bg-gray-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-800"
        >
          ➕ Add Member
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
          <p className="text-sm text-gray-500">Total Members</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">
            {members.length}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Active Members</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">
            {activeMembers.length}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Inactive Members</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">
            {inactiveMembers.length}
          </p>
        </div>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {editingMember ? '✏️ Edit Member' : '➕ Add Member'}
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                {editingMember
                  ? 'Update this member’s information.'
                  : 'Add a new person to your reading group.'}
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
            <div>
              <label
                htmlFor="memberName"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Name
              </label>

              <input
                id="memberName"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Friend's name"
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-200"
              />
            </div>

            <div>
              <label
                htmlFor="memberEmail"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Email
              </label>

              <input
                id="memberEmail"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="friend@example.com"
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-200"
              />
            </div>

            <div>
              <label
                htmlFor="memberRole"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Role
              </label>

              <select
                id="memberRole"
                value={role}
                onChange={(event) =>
                  setRole(event.target.value as 'admin' | 'member')
                }
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-200"
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>

          <div className="mt-5 flex gap-3">
            <button
              type="button"
              onClick={saveMember}
              disabled={saving}
              className="rounded-xl bg-gray-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving
                ? 'Saving...'
                : editingMember
                  ? 'Save Changes'
                  : 'Add Member'}
            </button>

            <button
              type="button"
              onClick={closeForm}
              className="rounded-xl border border-gray-300 px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </section>
      )}

      {/* Members */}
      <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900">
            👥 Members
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Manage everyone in your MicroRead group.
          </p>
        </div>

        <div className="divide-y divide-gray-100">
          {members.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No members found.
            </div>
          ) : (
            members.map((member) => (
              <div
                key={member.id}
                className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gray-100 font-semibold text-gray-700">
                    {member.name.charAt(0).toUpperCase()}
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-gray-900">
                        {member.name}
                      </h3>

                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          member.role === 'admin'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {member.role === 'admin' ? 'Admin' : 'Member'}
                      </span>

                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          member.active
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {member.active ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    <p className="mt-1 text-sm text-gray-500">
                      {member.email}
                    </p>

                    <p className="mt-1 text-xs text-gray-400">
                      Joined {member.joined_date}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => openEditForm(member)}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    ✏️ Edit
                  </button>

                  {member.id !== currentUser.id && (
                    <>
                      <button
                        type="button"
                        onClick={() => toggleMemberStatus(member)}
                        className={`rounded-lg border px-3 py-2 text-sm font-medium ${
                          member.active
                            ? 'border-yellow-200 text-yellow-700 hover:bg-yellow-50'
                            : 'border-green-200 text-green-700 hover:bg-green-50'
                        }`}
                      >
                        {member.active ? '⏸️ Deactivate' : '🔄 Reactivate'}
                      </button>

                      <button
                        type="button"
                        onClick={() => deleteMember(member)}
                        className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                      >
                        🗑️ Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Important note */}
      <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5 text-sm text-blue-800">
        💡 <strong>Safe deletion:</strong> Deactivate members whenever
        possible. Permanent deletion should only be used when you are certain
        the profile should be removed.
      </div>
    </div>
  )
}

