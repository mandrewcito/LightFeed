import { useEffect } from 'react'

interface Action {
  label: string
  value: string
  variant?: 'primary' | 'danger' | 'default'
}

interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  actions: Action[]
  onAction: (value: string) => void
  onClose: () => void
}

export function ConfirmDialog({ open, title, message, actions, onAction, onClose }: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50">
      <div className="w-full max-w-sm bg-white dark:bg-zinc-900 rounded-lg shadow-xl border border-zinc-200 dark:border-zinc-700">
        <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-700">
          <h2 className="text-sm font-semibold">{title}</h2>
        </div>
        <div className="px-4 py-3">
          <p className="text-sm text-zinc-600 dark:text-zinc-300 whitespace-pre-wrap">{message}</p>
        </div>
        <div className="flex justify-end gap-2 px-4 py-3 border-t border-zinc-200 dark:border-zinc-700">
          {actions.map((action) => (
            <button
              key={action.value}
              onClick={() => {
                onAction(action.value)
                onClose()
              }}
              className={
                action.variant === 'primary'
                  ? 'px-3 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-700'
                  : action.variant === 'danger'
                    ? 'px-3 py-1.5 text-sm rounded bg-red-600 text-white hover:bg-red-700'
                    : 'px-3 py-1.5 text-sm rounded border border-zinc-300 dark:border-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }
            >
              {action.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
