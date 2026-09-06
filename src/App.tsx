import { useEffect, useState } from 'react'
import {
  BrowserRouter,
  Link,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from 'react-router-dom'

import { supabase } from './lib/supabase'

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
  auth_user_id: string | null
}

type NavItem = {
  label: string
  path: string
  icon: string
}

const navItems: NavItem[] = [
  {
    label: 'Home',
    path: '/',
    icon: '🏠',
  },
  {
    label: 'My Reading',
    path: '/reading',
    icon: '📖',
  },
  {
    label: 'Books',
    path: '/books',
    icon: '📚',
  },
  {
    label: 'Friends',
    path: '/friends',
    icon: '👥',
  },
  {
    label: 'Insights',
    path: '/insights',
    icon: '📊',
  },
  {
    label: 'Milestones',
    path: '/milestones',
    icon: '🏆',
  },
  {
    label: 'Settings',
    path: '/settings',
    icon: '⚙️',
  },
]

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  )
}

function AppContent() {
  const [member, setMember] = useState<Member | null>(null)
  const [loading, setLoading] = useState(true)

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
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setMember(null)
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('members')
        .select(
          'id, name, email, role, active, auth_user_id'
        )
        .eq('auth_user_id', user.id)
        .single()

      if (error) {
        console.error('Unable to load member:', error)
        setMember(null)
      } else {
        setMember(data)
        console.log('Logged-in member:', data)
      }
    } catch (error) {
      console.error('Authentication error:', error)
      setMember(null)
    } finally {
      setLoading(false)
    }
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
    return <LoginPage />
  }

  if (!member.active) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-sm">
          <div className="text-4xl">🌱</div>

          <h1 className="mt-4 text-2xl font-bold text-gray-900">
            Account inactive
          </h1>

          <p className="mt-2 text-gray-500">
            Your MicroRead account is currently inactive.
          </p>

          <button
            onClick={async () => {
              await supabase.auth.signOut()
            }}
            className="mt-6 rounded-xl bg-gray-900 px-5 py-3 font-semibold text-white hover:bg-gray-800"
          >
            Log Out
          </button>
        </div>
      </div>
    )
  }

  return (
    <AppLayout
      member={member}
      onMemberRefresh={loadMember}
    />
  )
}

function AppLayout({
  member,
  onMemberRefresh,
}: {
  member: Member
  onMemberRefresh: () => Promise<void>
}) {
  const navigate = useNavigate()

  async function handleLogout() {
    await supabase.auth.signOut()
    await onMemberRefresh()
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <aside className="hidden w-64 flex-col border-r border-gray-200 bg-white md:flex">
          {/* Logo */}
          <div className="border-b border-gray-200 px-6 py-6">
            <Link
              to="/"
              className="block"
            >
              <div className="flex items-center gap-2">
                <span className="text-2xl">🌱</span>

                <div>
                  <h1 className="text-xl font-bold text-gray-900">
                    MicroRead
                  </h1>

                  <p className="text-xs text-gray-500">
                    Small steps. Lasting growth.
                  </p>
                </div>
              </div>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 px-3 py-5">
            {navItems.map((item) => (
              <SidebarLink
                key={item.path}
                item={item}
              />
            ))}

            {/* Admin */}
            {member.role === 'admin' && (
              <div className="mt-6 border-t border-gray-200 pt-5">
                <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Administration
                </p>

                <SidebarLink
                  item={{
                    label: 'Admin',
                    path: '/admin',
                    icon: '🛠️',
                  }}
                />

                <SidebarLink
                  item={{
                    label: 'Admin Books',
                    path: '/admin/books',
                    icon: '📚',
                  }}
                />

                <SidebarLink
                  item={{
                    label: 'Reading Data',
                    path: '/admin/reading',
                    icon: '📊',
                  }}
                />
              </div>
            )}
          </nav>

          {/* User section */}
          <div className="border-t border-gray-200 p-4">
            <div className="rounded-xl bg-gray-50 p-3">
              <p className="truncate text-sm font-semibold text-gray-900">
                {member.name}
              </p>

              <p className="mt-1 text-xs capitalize text-gray-500">
                {member.role}
              </p>
            </div>

            <button
              onClick={handleLogout}
              className="mt-3 w-full rounded-xl px-3 py-2 text-left text-sm font-medium text-gray-600 transition hover:bg-gray-100 hover:text-gray-900"
            >
              Log Out
            </button>
          </div>
        </aside>

        {/* Mobile header */}
        <div className="fixed left-0 right-0 top-0 z-50 border-b border-gray-200 bg-white md:hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <Link
              to="/"
              className="flex items-center gap-2"
            >
              <span className="text-xl">🌱</span>

              <span className="font-bold text-gray-900">
                MicroRead
              </span>
            </Link>

            <button
              onClick={handleLogout}
              className="rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-100"
            >
              Log Out
            </button>
          </div>

          {/* Mobile navigation */}
          <div className="overflow-x-auto border-t border-gray-100">
            <nav className="flex min-w-max gap-1 px-3 py-2">
              {navItems.map((item) => (
                <MobileNavLink
                  key={item.path}
                  item={item}
                />
              ))}

              {member.role === 'admin' && (
                <>
                  <MobileNavLink
                    item={{
                      label: 'Admin',
                      path: '/admin',
                      icon: '🛠️',
                    }}
                  />

                  <MobileNavLink
                    item={{
                      label: 'Reading Data',
                      path: '/admin/reading',
                      icon: '📊',
                    }}
                  />
                </>
              )}
            </nav>
          </div>
        </div>

        {/* Main content */}
        <main className="min-w-0 flex-1 px-4 pb-8 pt-32 sm:px-6 md:px-8 md:pt-8">
          <Routes>
            <Route
              path="/"
              element={<Home />}
            />

            <Route
              path="/reading"
              element={<Reading />}
            />

            <Route
              path="/books"
              element={<Books />}
            />

            <Route
              path="/friends"
              element={<Friends />}
            />

            <Route
              path="/insights"
              element={<Insights />}
            />

            <Route
              path="/milestones"
              element={<Milestones />}
            />

            <Route
              path="/settings"
              element={<Settings />}
            />

            {member.role === 'admin' && (
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
            )}

            <Route
              path="*"
              element={<Navigate to="/" replace />}
            />
          </Routes>
        </main>
      </div>
    </div>
  )
}

/*
 * Desktop sidebar link
 *
 * IMPORTANT:
 * We use useLocation() here to determine
 * which page is currently open.
 */
function SidebarLink({
  item,
}: {
  item: NavItem
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
      className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${
        isActive
          ? 'bg-gray-100 text-gray-900'
          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
      }`}
    >
      <span className="text-lg">
        {item.icon}
      </span>

      <span>{item.label}</span>
    </Link>
  )
}

/*
 * Mobile navigation link
 */
function MobileNavLink({
  item,
}: {
  item: NavItem
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
      className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition ${
        isActive
          ? 'bg-gray-100 text-gray-900'
          : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
      }`}
    >
      <span>{item.icon}</span>

      <span>{item.label}</span>
    </Link>
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
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-md">
        <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
          <div className="text-center">
            <div className="text-4xl">🌱</div>

            <h1 className="mt-4 text-3xl font-bold text-gray-900">
              MicroRead
            </h1>

            <p className="mt-2 text-gray-500">
              Small pages. Daily steps. Lasting growth.
            </p>
          </div>

          <form
            onSubmit={handleLogin}
            className="mt-8 space-y-5"
          >
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Email
              </label>

              <input
                type="email"
                value={email}
                onChange={(event) =>
                  setEmail(event.target.value)
                }
                required
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-gray-500"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Password
              </label>

              <input
                type="password"
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
                required
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-gray-500"
                placeholder="Your password"
              />
            </div>

            {error && (
              <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-gray-900 px-5 py-3 font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Logging in...' : 'Log In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default App

