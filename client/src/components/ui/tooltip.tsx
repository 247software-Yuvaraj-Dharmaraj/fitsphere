import { type ReactNode } from 'react';

// Lightweight CSS tooltip for icon-only controls. The trigger should still carry
// an aria-label for screen readers; this is purely visual.
export function Tooltip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <span className="group/tt relative inline-flex">
      {children}
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1.5 -translate-x-1/2 scale-95 whitespace-nowrap rounded-md bg-slate-800 px-2 py-1 text-xs font-medium text-white opacity-0 transition duration-150 group-hover/tt:scale-100 group-hover/tt:opacity-100 dark:bg-slate-700"
      >
        {label}
      </span>
    </span>
  );
}
