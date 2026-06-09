import { type ReactNode } from 'react';
import { Inbox } from 'lucide-react';

interface EmptyProps {
  text: string;
  icon?: ReactNode;
  className?: string;
}

// Consistent empty-state placeholder.
export function Empty({ text, icon, className = 'h-40' }: EmptyProps) {
  return (
    <div
      className={`flex ${className} flex-col items-center justify-center gap-2 text-slate-400 dark:text-slate-500`}
    >
      {icon ?? <Inbox size={28} className="opacity-60" />}
      <span className="text-sm">{text}</span>
    </div>
  );
}
