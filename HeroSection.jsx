import { useState, useRef } from "react";
import { SUGGESTIONS } from "../App";
import "./HeroSection.css";

export default function HeroSection({ onSend, isLoading, activeMode }) {
  const [value, setValue] = useState("");
  const inputRef = useRef(null);

  const canSend = value.trim().length > 0 && !isLoading;

  const handleSubmit = () => {
    if (!canSend) return;
    onSend(value);
    setValue("");
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <section className="hero">
      <div className="hero-content">
        {/* Badge */}
        <div className="hero-badge">
          <span className="badge-dot" />
          MARITIME INTELLIGENCE
        </div>

        {/* Headline */}
        <h1 className="hero-headline">
          Ask anything about
          <br />
          <span className="headline-accent">the world's oceans.</span>
        </h1>

        {/* Subtext */}
        <p className="hero-sub">
          Real-time AIS vessel tracking · Global port directories
          <br />
          Terminal specifications · Berth availability & scheduling
        </p>

        {/* Stats row */}
        <div className="hero-stats">
          <div className="stat">
            <span className="stat-value">180K+</span>
            <span className="stat-label">Vessels tracked</span>
          </div>
          <div className="stat-divider" />
          <div className="stat">
            <span className="stat-value">4,200+</span>
            <span className="stat-label">Global ports</span>
          </div>
          <div className="stat-divider" />
          <div className="stat">
            <span className="stat-value">Live</span>
            <span className="stat-label">AIS data feed</span>
          </div>
        </div>

        {/* Input */}
        <div className={`hero-input-wrap ${isLoading ? "loading" : ""}`}>
          <span className="input-anchor">⚓</span>
          <input
            ref={inputRef}
            className="hero-input"
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKey}
            placeholder={`Ask about ports, UN/LOCODEs, vessels, berths…`}
            disabled={isLoading}
            aria-label="Ask a question"
            autoFocus
          />
          <button
            className={`hero-send ${canSend ? "enabled" : ""}`}
            onClick={handleSubmit}
            disabled={!canSend}
            aria-label="Send question"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12"/>
              <polyline points="12 5 19 12 12 19"/>
            </svg>
          </button>
        </div>

        {/* Suggestion chips */}
        <div className="hero-chips">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              className="chip"
              onClick={() => onSend(s)}
              disabled={isLoading}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"/>
                <polyline points="12 5 19 12 12 19"/>
              </svg>
              {s}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
