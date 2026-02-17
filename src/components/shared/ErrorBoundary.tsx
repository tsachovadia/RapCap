import { Component, type ErrorInfo, type ReactNode } from 'react'
import { RefreshCw } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  handleReload = () => {
    window.location.reload()
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div className="flex flex-col items-center justify-center h-full bg-spotify-dark text-white p-6 text-center" dir="rtl">
          <div className="w-16 h-16 rounded-full bg-spotify-gray-800 flex items-center justify-center mb-4">
            <span className="text-3xl">!</span>
          </div>
          <h2 className="text-xl font-bold mb-2">משהו השתבש</h2>
          <p className="text-spotify-gray-400 text-sm mb-6 max-w-xs">
            אירעה שגיאה לא צפויה. נסה לרענן את הדף.
          </p>
          <div className="flex gap-3">
            <button onClick={this.handleRetry} className="btn-secondary text-sm px-6 py-2">
              נסה שוב
            </button>
            <button onClick={this.handleReload} className="btn-spotify text-sm px-6 py-2 flex items-center gap-2">
              <RefreshCw size={16} />
              רענן
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
