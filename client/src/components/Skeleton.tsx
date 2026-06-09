// Lightweight skeleton placeholders for loading states.
export function Skeleton({
  className = '',
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={`animate-pulse rounded-md bg-slate-200/70 dark:bg-slate-800 ${className}`}
      style={style}
    />
  );
}

// A stat-card-shaped skeleton.
export function SkeletonCard() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <Skeleton className="h-3 w-20" />
      <Skeleton className="mt-2 h-7 w-12" />
    </div>
  );
}

// A panel skeleton (for charts / tables).
export function SkeletonPanel({ height = 200 }: { height?: number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <Skeleton className="mb-3 h-4 w-32" />
      <Skeleton className="w-full" style={{ height }} />
    </div>
  );
}
