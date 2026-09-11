import { Component, type ErrorInfo, type ReactNode } from 'react'

type ErrorBoundaryProps = {
  children: ReactNode
}

type ErrorBoundaryState = {
  hasError: boolean
}

/**
 * Catches render-time errors anywhere in the tree so a single thrown
 * component shows a recoverable message instead of a blank white screen.
 */
class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('MicroRead crashed:', error, info)
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children
    }

    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md rounded-3xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <div className="text-4xl">🌱</div>

          <h1 className="mt-4 text-2xl font-bold text-gray-900">
            Something went wrong
          </h1>

          <p className="mt-3 text-sm text-gray-500">
            MicroRead hit an unexpected error. Reloading usually fixes it.
          </p>

          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-6 rounded-xl bg-gray-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-800"
          >
            Reload
          </button>
        </div>
      </div>
    )
  }
}

export default ErrorBoundary
