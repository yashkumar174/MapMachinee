'use client';

import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  toggleTheme: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light');
  const [mounted, setMounted] = useState(false);

  // Read saved theme on mount
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add('no-transition');

    const saved = localStorage.getItem('hl-theme') as Theme | null;
    const initial = saved || 'light';
    setTheme(initial);
    root.setAttribute('data-theme', initial);

    // Remove no-transition class after a tick so future changes animate
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        root.classList.remove('no-transition');
      });
    });

    setMounted(true);
  }, []);

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    localStorage.setItem('hl-theme', next);
    document.documentElement.setAttribute('data-theme', next);
  };

  // Prevent flash of wrong theme
  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
