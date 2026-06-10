import { useTheme } from '../context/theme-context';

// Theme-aware styles for Recharts <Tooltip>. Recharts renders the tooltip box
// with inline styles (opaque white) which CSS can't override — so we feed it
// dark-friendly styles via props.
export function useChartTooltip() {
  const dark = useTheme().theme === 'dark';
  return {
    contentStyle: {
      background: dark ? '#1e293b' : '#ffffff', // slate-800 / white
      border: `1px solid ${dark ? '#334155' : '#e2e8f0'}`, // slate-700 / slate-200
      borderRadius: 8,
      fontSize: 12,
      boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
    },
    labelStyle: { color: dark ? '#94a3b8' : '#64748b' },
    itemStyle: { color: dark ? '#e2e8f0' : '#0f172a' },
  } as const;
}
