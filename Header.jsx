import { MODES } from "../App";
import "./Header.css";

// Change the function signature
// Update the function signature
export default function Header({
  theme,
  onToggleTheme,
  activeMode,
  onModeChange,
  onClearChat,
  hasStarted,
}) {
  return (
    <header className="header">
      <div className="header-logo">
        <span className="logo-icon">≋</span>
        <span className="logo-name">MarineChat</span>
      </div>

      <nav className="header-modes" aria-label="Query modes">
        {MODES.map((mode) => (
          <button
            key={mode.id}
            className={`mode-pill ${activeMode.id === mode.id ? "active" : ""}`}
            onClick={() => onModeChange(mode)}
            aria-pressed={activeMode.id === mode.id}
          >
            <span className="mode-icon">{mode.icon}</span>
            {mode.label}
          </button>
        ))}
      </nav>
      <div className="header-controls">
        <button
          className="theme-toggle"
          onClick={onToggleTheme}
          aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
          title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
        >
          {theme === "light" ? (
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          ) : (
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="5" />
              <line x1="12" y1="1" x2="12" y2="3" />
              <line x1="12" y1="21" x2="12" y2="23" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
              <line x1="1" y1="12" x2="3" y2="12" />
              <line x1="21" y1="12" x2="23" y2="12" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
          )}
        </button>

        {hasStarted && (
          <button
            className="clear-btn"
            onClick={onClearChat}
            aria-label="Clear chat"
            title="Clear chat"
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14H6L5 6" />
              <path d="M10 11v6M14 11v6" />
              <path d="M9 6V4h6v2" />
            </svg>
          </button>
        )}
      </div>
    </header>
  );
}
