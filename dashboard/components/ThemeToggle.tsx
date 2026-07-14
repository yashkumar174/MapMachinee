'use client';

import { useTheme } from './ThemeProvider';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="relative w-9 h-9 flex items-center justify-center rounded-lg
        border border-b-divider hover:border-t-on-dark-muted
        bg-transparent hover:bg-surface-card-hover/20
        transition-all duration-300 ease-in-out
        active:scale-90 cursor-pointer group"
    >
      {/* Sun icon */}
      <svg
        className={`w-4 h-4 absolute transition-all duration-300 ease-in-out ${
          isDark
            ? 'opacity-0 rotate-90 scale-0'
            : 'opacity-100 rotate-0 scale-100'
        }`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <circle cx="12" cy="12" r="5" className="text-amber-400" stroke="currentColor" />
        <path
          className="text-amber-400"
          stroke="currentColor"
          strokeLinecap="round"
          d="M12 1v2m0 18v2m11-11h-2M3 12H1m16.36-7.36l-1.41 1.41M7.05 16.95l-1.41 1.41m12.72 0l-1.41-1.41M7.05 7.05L5.64 5.64"
        />
      </svg>

      {/* Moon icon */}
      <svg
        className={`w-4 h-4 absolute transition-all duration-300 ease-in-out ${
          isDark
            ? 'opacity-100 rotate-0 scale-100'
            : 'opacity-0 -rotate-90 scale-0'
        }`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          className="text-blue-300"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"
        />
      </svg>
    </button>
  );
}
