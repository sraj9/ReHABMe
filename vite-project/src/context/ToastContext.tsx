import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import { CheckCircle, AlertCircle, X } from 'lucide-react'

type ToastType = 'success' | 'error'

interface ToastItem {
  id: number
  type: ToastType
  message: string
}

interface ToastValue {
  success: (message: string) => void
  error: (message: string) => void
}

const ToastContext = createContext<ToastValue | null>(null)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const nextId = useRef(1)

  const dismiss = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const show = useCallback((type: ToastType, message: string) => {
    const id = nextId.current++
    setToasts(prev => [...prev, { id, type, message }])
    setTimeout(() => dismiss(id), 4000)
  }, [dismiss])

  const value = useMemo<ToastValue>(() => ({
    success: (message: string) => show('success', message),
    error: (message: string) => show('error', message),
  }), [show])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2 max-w-sm">
        {toasts.map(toast => (
          <div
            key={toast.id}
            role="status"
            style={{ animation: 'toast-in 0.2s ease-out' }}
            className={`flex items-start gap-2.5 bg-white rounded-xl shadow-lg border px-4 py-3 ${
              toast.type === 'success' ? 'border-green-200' : 'border-red-200'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle size={17} className="text-green-500 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle size={17} className="text-red-500 flex-shrink-0 mt-0.5" />
            )}
            <p className="text-sm text-gray-800 flex-1">{toast.message}</p>
            <button
              onClick={() => dismiss(toast.id)}
              aria-label="Dismiss notification"
              className="text-gray-400 hover:text-gray-600 flex-shrink-0 mt-0.5"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
