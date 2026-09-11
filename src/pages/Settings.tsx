import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

type Member = {
  id: string
  name: string
  email: string
  role: 'admin' | 'member'
  active: boolean
}

type Goal = {
  id: string
  goal_type: string
  target: number
  active: boolean
}

export default function Settings() {
  const [member, setMember] = useState<Member | null>(null)
  const [goal, setGoal] = useState<Goal | null>(null)

  const [goalType, setGoalType] = useState<'minutes' | 'pages'>('minutes')
  const [goalTarget, setGoalTarget] = useState('15')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    loadSettings()
  }, [])

  async function loadSettings() {
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
        .select('id, name, email, role, active')
        .eq('auth_user_id', user.id)
        .single()

      if (memberError) {
        throw memberError
      }

      setMember(memberData)

      const { data: goalData, error: goalError } = await supabase
        .from('goals')
        .select('id, goal_type, target, active')
        .eq('member_id', memberData.id)
        .eq('active', true)
        .limit(1)
        .maybeSingle()

      if (goalError) {
        throw goalError
      }

      if (goalData) {
        setGoal(goalData)

        if (goalData.goal_type === 'pages') {
          setGoalType('pages')
        } else {
          setGoalType('minutes')
        }

        setGoalTarget(String(goalData.target))
      }
    } catch (err) {
      console.error('Settings loading error:', err)

      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Unable to load settings.')
      }
    } finally {
      setLoading(false)
    }
  }

  async function saveGoal() {
    if (!member) return

    setMessage('')
    setError('')

    const target = Number(goalTarget)

    if (!Number.isFinite(target) || target <= 0) {
      setError('Please enter a valid goal greater than 0.')
      return
    }

    setSaving(true)

    try {
      if (goal) {
        const { error: updateError } = await supabase
          .from('goals')
          .update({
            goal_type: goalType,
            target,
            active: true,
            updated_at: new Date().toISOString(),
          })
          .eq('id', goal.id)

        if (updateError) {
          throw updateError
        }
      } else {
        const { data, error: insertError } = await supabase
          .from('goals')
          .insert({
            member_id: member.id,
            goal_type: goalType,
            target,
            active: true,
          })
          .select('id, goal_type, target, active')
          .single()

        if (insertError) {
          throw insertError
        }

        setGoal(data)
      }

      setMessage('✓ Reading goal saved successfully.')
    } catch (err) {
      console.error('Goal save error:', err)

      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Unable to save your reading goal.')
      }
    } finally {
      setSaving(false)
    }
  }

  async function logout() {
    setError('')
    setMessage('')

    const { error: logoutError } = await supabase.auth.signOut()

    if (logoutError) {
      setError(logoutError.message)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-gray-500">Loading settings...</div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="mt-1 text-gray-600">
          Manage your profile and reading preferences.
        </p>
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

      {/* Profile */}
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-5">
          <h2 className="text-xl font-semibold text-gray-900">
            👤 My Profile
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Your MicroRead account information.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-sm text-gray-500">Name</p>
            <p className="mt-1 font-medium text-gray-900">
              {member?.name || '—'}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">Email</p>
            <p className="mt-1 font-medium text-gray-900">
              {member?.email || '—'}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">Role</p>
            <div className="mt-2">
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  member?.role === 'admin'
                    ? 'bg-purple-100 text-purple-700'
                    : 'bg-blue-100 text-blue-700'
                }`}
              >
                {member?.role === 'admin' ? 'Admin' : 'Member'}
              </span>
            </div>
          </div>

          <div>
            <p className="text-sm text-gray-500">Account Status</p>
            <div className="mt-2">
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  member?.active
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {member?.active ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Reading Preferences */}
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-5">
          <h2 className="text-xl font-semibold text-gray-900">
            📖 Reading Preferences
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Set an optional daily reading goal. This is a guide, not a pass/fail
            target.
          </p>
        </div>

        <div className="space-y-5">
          {/* Goal type */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Daily goal
            </label>

            <div className="grid grid-cols-2 gap-3 sm:max-w-md">
              <button
                type="button"
                onClick={() => setGoalType('minutes')}
                className={`rounded-xl border px-4 py-3 text-sm font-medium transition ${
                  goalType === 'minutes'
                    ? 'border-gray-900 bg-gray-900 text-white'
                    : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                ⏱️ Minutes
              </button>

              <button
                type="button"
                onClick={() => setGoalType('pages')}
                className={`rounded-xl border px-4 py-3 text-sm font-medium transition ${
                  goalType === 'pages'
                    ? 'border-gray-900 bg-gray-900 text-white'
                    : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                📄 Pages
              </button>
            </div>
          </div>

          {/* Goal value */}
          <div className="sm:max-w-md">
            <label
              htmlFor="goalTarget"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              {goalType === 'minutes'
                ? 'Minutes per day'
                : 'Pages per day'}
            </label>

            <input
              id="goalTarget"
              type="number"
              min="1"
              value={goalTarget}
              onChange={(event) => setGoalTarget(event.target.value)}
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 outline-none transition focus:border-gray-900 focus:ring-2 focus:ring-gray-200"
              placeholder={goalType === 'minutes' ? '15' : '10'}
            />
          </div>

          <div className="rounded-xl bg-gray-50 p-4 text-sm text-gray-600">
            🌱 <strong>Remember:</strong> your goal is here to support your
            habit, not to create pressure. Even a few pages still count.
          </div>

          <button
            type="button"
            onClick={saveGoal}
            disabled={saving}
            className="rounded-xl bg-gray-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Reading Goal'}
          </button>
        </div>
      </section>

      {/* Admin */}
      {member?.role === 'admin' && (
        <section className="rounded-2xl border border-purple-200 bg-purple-50 p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                🛠️ Admin
              </h2>
              <p className="mt-1 text-sm text-gray-600">
                Manage members, books, reading data and application settings.
              </p>
            </div>

            <Link
              to="/admin"
              className="inline-flex items-center justify-center rounded-xl bg-purple-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-purple-800"
            >
              Open Admin
            </Link>
          </div>
        </section>
      )}

      {/* Account */}
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-5">
          <h2 className="text-xl font-semibold text-gray-900">
            🔐 Account
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Sign out of your MicroRead account.
          </p>
        </div>

        <button
          type="button"
          onClick={logout}
          className="rounded-xl border border-red-200 bg-white px-5 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-50"
        >
          Log Out
        </button>
      </section>

      {/* Footer */}
      <div className="pb-8 text-center">
        <p className="text-sm text-gray-500">
          🌱 Small pages. Daily steps. Lasting growth.
        </p>
      </div>
    </div>
  )
}