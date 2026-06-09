import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

type Density = 'comfortable' | 'compact';

interface DensityContextValue {
  density: Density;
  toggleDensity: () => void;
}

const DensityContext = createContext<DensityContextValue | undefined>(undefined);

function getInitial(): Density {
  return localStorage.getItem('density') === 'compact' ? 'compact' : 'comfortable';
}

export function DensityProvider({ children }: { children: ReactNode }) {
  const [density, setDensity] = useState<Density>(getInitial);

  useEffect(() => {
    localStorage.setItem('density', density);
  }, [density]);

  const toggleDensity = useCallback(() => {
    setDensity((prev) => (prev === 'compact' ? 'comfortable' : 'compact'));
  }, []);

  return (
    <DensityContext.Provider value={{ density, toggleDensity }}>{children}</DensityContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useDensity(): DensityContextValue {
  const ctx = useContext(DensityContext);
  if (!ctx) throw new Error('useDensity must be used within a DensityProvider');
  return ctx;
}
