import { useEffect, useState } from 'react'
import { X, AlertCircle, AlertTriangle, CheckCircle, Info } from 'lucide-react'
import type { ToastType } from '../../contexts/ToastContext'

interface ToastProps {
  id: number
  message: string
  type: ToastType
  onDismiss: (id: number) => void
}

const DURATION: Record<ToastType, number> = {
  error: 6000,
  warning: 4000,
  success: 3000,
  info: 4000,
}

const ICONS: Record<ToastType, typeof AlertCircle> = {
  error: AlertCircle,
  warning: AlertTriangle,
  success: CheckCircle,
  info: Info,
}

const COLORS: Record<ToastType, string> = {
  error: 'bg-red-900/90 border-red-700',
  warning: 'bg-yellow-900/90 border-yellow-700',
  success: 'bg-green-900/90 border-green-700',
  info: 'bg-spotify-gray-800/95 border-spotify-gray-700',
}

const ICON_COLORS: Record<ToastType, string> = {
  error: 'text-red-400',
  warning: 'text-yellow-400',
  success: 'text-green-400',
  info: 'text-spotify-gray-400',
}

export function Toast({ id, message, type, onDismiss }: ToastProps) {
  const [visible, setVisible] = useState(false)
  const [exiting, setExiting] = useState(false)

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))

    const timer = setTimeout(() => {
      setExiting(true)
      setTimeout(() => onDismiss(id), 300)
    }, DURATION[type])

    return () => clearTimeout(timer)
  }, [id, type, onDismiss])

  const Icon = ICONS[type]

  return (
    <div
      className={`
        pointer-events-auto w-full max-w-sm rounded-lg border px-4 py-3
        flex items-start gap-3 shadow-lg backdrop-blur-sm
        transition-all duration-300 ease-out
        ${COLORS[type]}
        ${visible && !exiting ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-3'}
      `}
      dir="rtl"
    >
      <Icon size={18} className={`mt-0.5 shrink-0 ${ICON_COLORS[type]}`} />
      <p className="text-sm text-white flex-1">{message}</p>
      <button
        onClick={() => {
          setExiting(true)
          setTimeout(() => onDismiss(id), 300)
        }}
        className="shrink-0 text-white/50 hover:text-white"
      >
        <X size={16} />
      </button>
    </div>
  )
}
