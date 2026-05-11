import { useState } from "react";
import Header from "./components/Header";
import HeroSection from "./components/HeroSection";
import ChatWindow from "./components/ChatWindow";
import InputDock from "./components/InputDock";
import "./App.css";

export const MODES = [
  { id: "ais", label: "AIS", icon: "⊹" },
  { id: "port", label: "Port", icon: "⚓" },
  { id: "terminal", label: "Terminal", icon: "◎" },
  { id: "berth", label: "Berth", icon: "▣" },
];

export const SUGGESTIONS = [
  "Track MSC Gülsün",
  "Port of Rotterdam",
  "Available berths",
  "Yangshan terminal",
];

export default function App() {
  const [theme, setTheme] = useState("light");
  const [activeMode, setActiveMode] = useState(MODES[1]);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  const toggleTheme = () => setTheme((t) => (t === "light" ? "dark" : "light"));

  // Add this function inside App(), alongside the other handlers
  const handleClear = () => {
    setMessages([]);
    setHasStarted(false);
  };

  const handleSend = async (question) => {
    const trimmed = question.trim();
    if (!trimmed || isLoading) return;

    const payload = { type: activeMode.id, question: trimmed };

    setMessages((prev) => [
      ...prev,
      { role: "user", content: trimmed, mode: activeMode, payload },
    ]);
    setIsLoading(true);
    if (!hasStarted) setHasStarted(true);

    // ── Replace this block with your real API call ──
    try {
      await new Promise((r) => setTimeout(r, 1500));
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Here's what I found for your **${activeMode.label}** query.\n\nPayload dispatched:\n\`\`\`json\n${JSON.stringify(payload, null, 2)}\n\`\`\``,
          mode: activeMode,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
    // ───────────────────────────────────────────────
  };

  return (
    <div className={`app ${theme}`} data-theme={theme}>
      <div className="ocean-bg" aria-hidden="true">
        <span className="ripple r1" />
        <span className="ripple r2" />
        <span className="ripple r3" />
        <span className="ripple r4" />
      </div>

      <Header
        theme={theme}
        onToggleTheme={toggleTheme}
        activeMode={activeMode}
        onModeChange={setActiveMode}
        onClearChat={handleClear}
        hasStarted={hasStarted}
      />

      <main className="app-main">
        {!hasStarted ? (
          <HeroSection
            onSend={handleSend}
            isLoading={isLoading}
            activeMode={activeMode}
          />
        ) : (
          <>
            <ChatWindow messages={messages} isLoading={isLoading} />
            <InputDock
              onSend={handleSend}
              isLoading={isLoading}
              activeMode={activeMode}
              onModeChange={setActiveMode}
            />
          </>
        )}
      </main>
    </div>
  );
}
