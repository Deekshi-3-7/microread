import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

type LayoutProps = {
  children: ReactNode
  memberName: string
}

function Layout({ children, memberName }: LayoutProps) {
  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r bg-white lg:block">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-gray-900">
            MicroRead 📚
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Small steps. Lasting growth.
          </p>
        </div>
        <nav className="px-4">
            <Link
                to="/"
                className="block rounded-lg bg-gray-100 px-4 py-3 font-medium text-gray-900"
            >
                🏠 Home
            </Link>

            <Link
                to="/reading"
                className="mt-1 block rounded-lg px-4 py-3 text-gray-600 hover:bg-gray-100"
            >
                📖 My Reading
            </Link>

            <Link
                to="/books"
                className="mt-1 block rounded-lg px-4 py-3 text-gray-600 hover:bg-gray-100"
            >
                📚 Books
            </Link>

            <Link
                to="/friends"
                className="mt-1 block rounded-lg px-4 py-3 text-gray-600 hover:bg-gray-100"
            >
                👥 Friends
            </Link>

            <Link
                to="/insights"
                className="mt-1 block rounded-lg px-4 py-3 text-gray-600 hover:bg-gray-100"
            >
                📊 Insights
            </Link>

            <Link
                to="/milestones"
                className="mt-1 block rounded-lg px-4 py-3 text-gray-600 hover:bg-gray-100"
            >
                🏆 Milestones
            </Link>

            <Link
                to="/settings"
                className="mt-1 block rounded-lg px-4 py-3 text-gray-600 hover:bg-gray-100"
            >
                ⚙️ Settings
            </Link>
        </nav>
        
        <div className="absolute bottom-0 w-full border-t p-4">
          <p className="px-2 text-sm font-medium text-gray-900">
            {memberName}
          </p>

          <button
            onClick={handleLogout}
            className="mt-2 w-full rounded-lg px-3 py-2 text-left text-sm text-gray-600 hover:bg-gray-100"
          >
            Logout
          </button>
        </div>
      </aside>

      <main className="lg:ml-64">
        <div className="mx-auto max-w-7xl px-6 py-8 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  )
}

export default Layout