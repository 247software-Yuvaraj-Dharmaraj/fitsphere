import { useCallback, useEffect, useId, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { useFocusTrap } from '../../lib/useFocusTrap';
import { ConfirmDialog } from './confirm-dialog';

interface DrawerProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  // When true, closing (X / overlay / Escape) asks to confirm discarding edits.
  dirty?: boolean;
}

/** Right-side slide-over panel for add/edit forms (keeps the list behind it). */
export function Drawer({ open, title, onClose, children, footer, dirty }: DrawerProps) {
  const { t } = useTranslation();
  const titleId = useId();
  const trapRef = useFocusTrap<HTMLElement>(open);
  const [confirmClose, setConfirmClose] = useState(false);

  const attemptClose = useCallback(() => {
    if (dirty) setConfirmClose(true);
    else onClose();
  }, [dirty, onClose]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') attemptClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, attemptClose]);

  if (!open) return null;

  return (
    <div className="fs-overlay fixed inset-0 z-50 flex justify-end bg-black/40" onClick={attemptClose}>
      <aside
        ref={trapRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
        className="fs-drawer flex h-full w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900"
      >
        <header className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <h2 id={titleId} className="text-base font-semibold text-slate-800 dark:text-slate-100">
            {title}
          </h2>
          <button
            onClick={attemptClose}
            aria-label="Close"
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:outline-none dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X size={18} />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
        {footer && (
          <footer className="flex justify-end gap-3 border-t border-slate-200 px-5 py-4 dark:border-slate-800">
            {footer}
          </footer>
        )}
      </aside>

      <ConfirmDialog
        open={confirmClose}
        destructive
        title={t('common.discardTitle')}
        message={t('common.discardMessage')}
        confirmLabel={t('common.discard')}
        onCancel={() => setConfirmClose(false)}
        onConfirm={() => {
          setConfirmClose(false);
          onClose();
        }}
      />
    </div>
  );
}
