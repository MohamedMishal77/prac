import { useState, useRef } from "react";
import { MODES } from "../App";
import "./InputDock.css";

export default function InputDock({ onSend, isLoading, activeMode, onModeChange }) {
  const [value, setValue] = useState("");
  const inputRef = useRef(null);

  const canSend = value.trim().length > 0 && !isLoading;

  const handleSubmit = () => {
    if (!canSend) return;
    onSend(value);
    setValue("");
    inputRef.current?.focus();
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="input-dock">
      {/* Mode switcher strip */}
      <div className="dock-modes">
        {MODES.map((mode) => (
          <button
            key={mode.id}
            className={`dock-mode-btn ${activeMode.id === mode.id ? "active" : ""}`}
            onClick={() => onModeChange(mode)}
            aria-pressed={activeMode.id === mode.id}
          >
            <span>{mode.icon}</span>
            {mode.label}
          </button>
        ))}
      </div>

      {/* Input row */}
      <div className={`dock-input-wrap ${isLoading ? "loading" : ""} ${value.trim() ? "has-value" : ""}`}>
        <span className="dock-anchor">⚓</span>
        <input
          ref={inputRef}
          className="dock-input"
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKey}
          placeholder={`Ask about ${activeMode.label.toLowerCase()}s, UN/LOCODEs, facilities…`}
          disabled={isLoading}
          aria-label="Ask a question"
          autoFocus
        />
        {isLoading && (
          <div className="dock-loading" aria-label="Loading">
            <span className="spin-dot" /><span className="spin-dot" /><span className="spin-dot" />
          </div>
        )}
        <button
          className={`dock-send ${canSend ? "enabled" : ""}`}
          onClick={handleSubmit}
          disabled={!canSend}
          aria-label="Send question"
          title={!value.trim() ? "Type a question first" : isLoading ? "Waiting for response…" : "Send"}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12"/>
            <polyline points="12 5 19 12 12 19"/>
          </svg>
        </button>
      </div>

      <p className="dock-hint">
        Press <kbd>Enter</kbd> to send · Mode: <strong>{activeMode.label}</strong>
        {isLoading && " · Waiting for response…"}
      </p>
    </div>
  );
}
