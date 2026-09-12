import { useEffect, useState } from 'react'
import {
  BrowserRouter,
  Link,
  Navigate,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom'
import { supabase } from './lib/supabase'
import ThemeToggle from './components/ThemeToggle'

import Home from './pages/Home'
import Reading from './pages/Reading'
import Books from './pages/Books'
import Friends from './pages/Friends'
import Insights from './pages/Insights'
import Milestones from './pages/Milestones'
import Settings from './pages/Settings'
import Admin from './pages/Admin'
import AdminBooks from './pages/AdminBooks'
import AdminReading from './pages/AdminReading'

type Member = {
  id: string
  name: string
  email: string
  role: 'admin' | 'member'
  active: boolean
}

type SidebarItem = {
  path: string
  label: string
  icon: string
}

const sidebarItems: SidebarItem[] = [
  {
    path: '/',
    label: 'Home',
    icon: '🏠',
  },
  {
    path: '/reading',
    label: 'My Reading',
    icon: '📖',
  },
  {
    path: '/books',
    label: 'Books',
    icon: '📚',
  },
  {
    path: '/friends',
    label: 'Friends',
    icon: '🌏',
  },
  {
    path: '/insights',
    label: 'Insights',
    icon: '📊',
  },
  {
    path: '/milestones',
    label: 'Milestones',
    icon: '🏆',
  },
  {
    path: '/settings',
    label: 'Settings',
    icon: '⚙️',
  },
]

function SidebarLink({
  item,
}: {
  item: SidebarItem
}) {
  const location = useLocation()

  const isActive =
    item.path === '/'
      ? location.pathname === '/'
      : location.pathname === item.path ||
        location.pathname.startsWith(`${item.path}/`)

  return (
    <Link
      to={item.path}
      className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
        isActive
          ? 'bg-gray-900 text-white'
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
      }`}
    >
      <span>{item.icon}</span>
      <span>{item.label}</span>
    </Link>
  )
}

function MobileNavLink({
  item,
}: {
  item: SidebarItem
}) {
  const location = useLocation()

  const isActive =
    item.path === '/'
      ? location.pathname === '/'
      : location.pathname === item.path ||
        location.pathname.startsWith(`${item.path}/`)

  return (
    <Link
      to={item.path}
      className={`flex min-w-[72px] flex-shrink-0 flex-col items-center gap-1 rounded-xl px-2 py-2 text-xs font-medium ${
        isActive
          ? 'bg-gray-900 text-white'
          : 'text-gray-500'
      }`}
    >
      <span className="text-lg">
        {item.icon}
      </span>

      <span className="text-center leading-tight">
        {item.label === 'My Reading' ? (
          <>
            My
            <br />
            Reading
          </>
        ) : (
          item.label
        )}
      </span>
    </Link>
  )
}

function AppContent({
  member,
  onLogout,
}: {
  member: Member
  onLogout: () => Promise<void>
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-gray-200 bg-white lg:block">
        <div className="flex h-full flex-col">
          <div className="border-b border-gray-200 px-6 py-6">
            <Link to="/" className="block">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🌱</span>

                <div>
                  <h1 className="text-xl font-bold text-gray-900">
                    MicroRead
                  </h1>

                  <p className="text-xs text-gray-500">
                    Small pages. Daily steps.
                  </p>
                </div>
              </div>
            </Link>
          </div>

          <nav className="flex-1 space-y-1 overflow-y-auto p-4">
            {sidebarItems.map((item) => (
              <SidebarLink
                key={item.path}
                item={item}
              />
            ))}

            {member.role === 'admin' && (
              <>
                <div className="px-4 pb-2 pt-6">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Administration
                  </p>
                </div>

                <SidebarLink
                  item={{
                    path: '/admin',
                    label: 'Admin',
                    icon: '🛠️',
                  }}
                />
              </>
            )}
          </nav>

          <div className="border-t border-gray-200 p-4">
            <div className="mb-3 rounded-xl bg-gray-50 p-3">
              <p className="text-sm font-semibold text-gray-900">
                {member.name}
              </p>

              <p className="mt-1 truncate text-xs text-gray-500">
                {member.email}
              </p>

              <p className="mt-2 text-xs font-medium text-gray-500">
                {member.role === 'admin'
                  ? 'Administrator'
                  : 'Member'}
              </p>
            </div>

            <ThemeToggle className="mb-3" />

            <button
              onClick={onLogout}
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
            >
              Log Out
            </button>
          </div>
        </div>
      </aside>

      <main className="pb-24 lg:ml-64 lg:pb-0">
        <div className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/reading" element={<Reading />} />
            <Route path="/books" element={<Books />} />
            <Route path="/friends" element={<Friends />} />
            <Route path="/insights" element={<Insights />} />
            <Route path="/milestones" element={<Milestones />} />
            <Route path="/settings" element={<Settings />} />

            {member.role === 'admin' ? (
              <>
                <Route
                  path="/admin"
                  element={<Admin />}
                />

                <Route
                  path="/admin/books"
                  element={<AdminBooks />}
                />

                <Route
                  path="/admin/reading"
                  element={<AdminReading />}
                />
              </>
            ) : (
              <Route
                path="/admin/*"
                element={<Navigate to="/" replace />}
              />
            )}

            <Route
              path="*"
              element={<Navigate to="/" replace />}
            />
          </Routes>
        </div>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white lg:hidden">
        <div className="flex items-center justify-around overflow-x-auto px-2 py-2">
          {sidebarItems.slice(0, 5).map((item) => (
            <MobileNavLink
              key={item.path}
              item={item}
            />
          ))}

          <MobileNavLink
            item={{
              path: '/settings',
              label: 'Settings',
              icon: '⚙️',
            }}
          />
        </div>
      </nav>
    </div>
  )
}

function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault()

    setLoading(true)
    setError('')

    const { error: loginError } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      })

    if (loginError) {
      setError(loginError.message)
    }

    setLoading(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
          <div className="text-center">
            <div className="text-4xl">🌱</div>

            <h1 className="mt-3 text-3xl font-bold text-gray-900">
              MicroRead
            </h1>

            <p className="mt-2 text-sm text-gray-500">
              Small pages. Daily steps. Lasting growth.
            </p>
          </div>

          <form
            onSubmit={handleLogin}
            className="mt-8 space-y-5"
          >
            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Email
              </label>

              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) =>
                  setEmail(event.target.value)
                }
                required
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none transition focus:border-gray-900 focus:ring-2 focus:ring-gray-200"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Password
              </label>

              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
                required
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none transition focus:border-gray-900 focus:ring-2 focus:ring-gray-200"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-gray-900 px-4 py-3 font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Logging in...' : 'Log In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

function App() {
  const [member, setMember] = useState<Member | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadMember()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      loadMember()
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  async function loadMember() {
    setLoading(true)
    setError('')

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setMember(null)
        setLoading(false)
        return
      }

      const { data, error: memberError } =
        await supabase
          .from('members')
          .select(
            'id, name, email, role, active'
          )
          .eq('auth_user_id', user.id)
          .single()

      if (memberError) {
        throw memberError
      }

      setMember(data)
    } catch (err) {
      console.error('Unable to load member:', err)

      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Unable to load member.')
      }

      setMember(null)
    } finally {
      setLoading(false)
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    setMember(null)
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-gray-500">
          Loading MicroRead...
        </p>
      </div>
    )
  }

  if (!member) {
    return (
      <BrowserRouter basename="/microread">
        {error ? (
          <div className="min-h-screen bg-gray-50 px-4 py-6">
            <div className="mx-auto max-w-md rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700">
              <p className="font-semibold">
                Unable to load member
              </p>

              <p className="mt-2 text-sm">
                {error}
              </p>

              <div className="mt-4">
                <LoginPage />
              </div>
            </div>
          </div>
        ) : (
          <LoginPage />
        )}
      </BrowserRouter>
    )
  }

  if (!member.active) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md rounded-3xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <div className="text-4xl">🌱</div>

          <h1 className="mt-4 text-2xl font-bold text-gray-900">
            Account inactive
          </h1>

          <p className="mt-3 text-sm text-gray-500">
            Your MicroRead account is currently inactive.
            Please contact the administrator.
          </p>

          <button
            onClick={handleLogout}
            className="mt-6 rounded-xl bg-gray-900 px-5 py-3 text-sm font-semibold text-white"
          >
            Log Out
          </button>
        </div>
      </div>
    )
  }

  return (
    <BrowserRouter basename="/microread">
      <AppContent
        member={member}
        onLogout={handleLogout}
      />
    </BrowserRouter>
  )
}

export default App