import { Component } from 'react'

// top-level crash net sir — React error boundaries MUST be class components (no hook
// equivalent exists yet), catches any render error thrown by anything under it in the tree
// and shows a simple fallback instead of the whole SPA going to a white screen.
class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, errorInfo) {
    // still want this in the console/error-tracking pipeline sir, just not surfaced raw to the user
    console.error("Uncaught render error", error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full bg-richblack-900 flex items-center justify-center px-4">
          <div className="max-w-md w-full text-center rounded-2xl bg-richblack-800 border border-richblack-700 p-10">
            <h1 className="font-display font-bold text-xl text-richblack-5 mb-2">Something went wrong</h1>
            <p className="text-sm text-richblack-300 mb-6">Please refresh the page. If the problem keeps happening, try logging in again.</p>
            <button
              onClick={() => window.location.reload()}
              className="px-5 py-2.5 text-sm font-semibold text-richblack-900 bg-yellow-50 rounded-full hover:brightness-110 transition-all duration-200 cursor-pointer"
            >
              Refresh the page
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
