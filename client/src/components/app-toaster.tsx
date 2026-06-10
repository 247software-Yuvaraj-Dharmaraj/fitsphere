import { Toaster } from 'sonner';
import { useTheme } from '../context/theme-context';

// Top-center toasts (like ui-service's antd messages), following the app's
// light/dark theme. Brand-green success styling is applied in index.css.
export function AppToaster() {
  const { theme } = useTheme();
  return (
    <Toaster
      position="top-center"
      theme={theme}
      richColors
      closeButton
      toastOptions={{ duration: 3000 }}
    />
  );
}
