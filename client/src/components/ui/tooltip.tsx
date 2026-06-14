import { type ReactNode } from 'react';

// Lightweight CSS tooltip for icon-only controls. The trigger should still carry
// an aria-label for screen readers; this is purely visual. `side` controls
// placement — default 'top'; use 'bottom' for controls in the top header bar.
export function Tooltip({ label, children, side = 'top' }: { label: string; children: ReactNode; side?: 'top' | 'bottom' }) {
  const position = side === 'bottom' ? 'top-full mt-1.5' : 'bottom-full mb-1.5';
  return (
    <span className="group/tt relative inline-flex">
      {children}
      <span
        role="tooltip"
        className={`pointer-events-none absolute ${position} left-1/2 z-50 -translate-x-1/2 scale-95 whitespace-nowrap rounded-md bg-slate-800 px-2 py-1 text-xs font-medium text-white opacity-0 transition duration-150 group-hover/tt:scale-100 group-hover/tt:opacity-100 dark:bg-slate-700`}
      >
        {label}
      </span>
    </span>
  );
}
