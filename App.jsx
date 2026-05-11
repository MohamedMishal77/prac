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

    try {
      const response = await fetch("https://your-api-endpoint.com/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // "Authorization": "Bearer YOUR_TOKEN",  ← add if your API needs auth
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        // Server responded with 4xx / 5xx
        const errorData = await response.json().catch(() => null);
        throw new Error(
          errorData?.message || `Server error: ${response.status}`,
        );
      }

      const data = await response.json();

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          // ← adjust "data.answer" to match your API's response shape
          content:
            data.answer ??
            data.message ??
            data.response ??
            JSON.stringify(data),
          mode: activeMode,
        },
      ]);
    } catch (err) {
      const isNetwork = err instanceof TypeError; // fetch() itself failed (offline, CORS, bad URL)

      setMessages((prev) => [
        ...prev,
        {
          role: "error",
          content: isNetwork
            ? "Unable to reach the server. Check your connection and try again."
            : err.message || "Something went wrong. Please try again.",
          mode: activeMode,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
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
