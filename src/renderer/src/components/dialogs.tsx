import { createContext, useCallback, useContext, useRef, useState } from 'react'
import { CheckCircle2, CircleAlert, Info, XCircle } from 'lucide-react'

export interface ConfirmOptions {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  /** 파괴적 액션 — 확인 버튼을 빨간색으로 */
  danger?: boolean
}

export type ToastType = 'success' | 'error' | 'warn' | 'info'

interface Toast {
  id: number
  type: ToastType
  message: string
}

interface DialogApi {
  confirm: (opts: ConfirmOptions) => Promise<boolean>
  toast: (message: string, type?: ToastType) => void
}

const DialogContext = createContext<DialogApi | null>(null)

export function useDialog(): DialogApi {
  const ctx = useContext(DialogContext)
  if (!ctx) throw new Error('DialogProvider가 필요합니다')
  return ctx
}

const TOAST_ICON: Record<ToastType, typeof Info> = {
  success: CheckCircle2,
  error: XCircle,
  warn: CircleAlert,
  info: Info
}

interface ConfirmState {
  opts: ConfirmOptions
  resolve: (ok: boolean) => void
}

export function DialogProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null)
  const [toasts, setToasts] = useState<Toast[]>([])
  const idRef = useRef(0)

  const confirm = useCallback(
    (opts: ConfirmOptions) =>
      new Promise<boolean>((resolve) => setConfirmState({ opts, resolve })),
    []
  )

  const toast = useCallback((message: string, type: ToastType = 'success') => {
    const id = ++idRef.current
    setToasts((prev) => [...prev, { id, type, message }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3200)
  }, [])

  const close = (ok: boolean): void => {
    confirmState?.resolve(ok)
    setConfirmState(null)
  }

  return (
    <DialogContext.Provider value={{ confirm, toast }}>
      {children}

      {confirmState && (
        <div className="modal-backdrop dialog-layer" onClick={() => close(false)}>
          <div
            className="modal modal-sm"
            role="alertdialog"
            aria-modal="true"
            aria-label={confirmState.opts.title}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === 'Escape') close(false)
            }}
          >
            <h2 className="dialog-title">{confirmState.opts.title}</h2>
            <p className="dialog-message">{confirmState.opts.message}</p>
            <div className="modal-actions">
              <button className="btn" onClick={() => close(false)}>
                {confirmState.opts.cancelLabel ?? '취소'}
              </button>
              <button
                autoFocus
                className={`btn ${confirmState.opts.danger ? 'danger-solid' : 'primary'}`}
                onClick={() => close(true)}
              >
                {confirmState.opts.confirmLabel ?? '확인'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="toast-stack" aria-live="polite">
        {toasts.map((t) => {
          const Icon = TOAST_ICON[t.type]
          return (
            <div key={t.id} className={`toast toast-${t.type}`}>
              <Icon size={16} />
              <span>{t.message}</span>
            </div>
          )
        })}
      </div>
    </DialogContext.Provider>
  )
}
