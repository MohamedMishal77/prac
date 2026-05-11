import { useEffect, useRef } from "react";
import { User, Bot } from "lucide-react";
import "./ChatWindow.css";

function renderContent(text) {
  // Very simple markdown-lite: bold, inline code, code blocks
  const lines = text.split("\n");
  const elements = [];
  let inCode = false;
  let codeLines = [];
  let key = 0;

  lines.forEach((line) => {
    if (line.startsWith("```")) {
      if (inCode) {
        elements.push(
          <pre key={key++} className="msg-code">
            <code>{codeLines.join("\n")}</code>
          </pre>,
        );
        codeLines = [];
        inCode = false;
      } else {
        inCode = true;
      }
      return;
    }
    if (inCode) {
      codeLines.push(line);
      return;
    }
    // inline formatting
    const parts = line.split(/(`[^`]+`|\*\*[^*]+\*\*)/g).map((p, i) => {
      if (p.startsWith("`") && p.endsWith("`"))
        return (
          <code key={i} className="msg-inline-code">
            {p.slice(1, -1)}
          </code>
        );
      if (p.startsWith("**") && p.endsWith("**"))
        return <strong key={i}>{p.slice(2, -2)}</strong>;
      return p;
    });
    elements.push(
      <p key={key++} className="msg-para">
        {parts}
      </p>,
    );
  });

  return elements;
}

function Message({ msg }) {
  const isUser = msg.role === "user";
  return (
    <div className={`msg-row ${isUser ? "user" : "assistant"}`}>
      {!isUser && (
        <div className="msg-avatar bot-avatar" aria-label="MarineChat">
          <Bot />
        </div>
      )}
      <div className="msg-bubble">
        {!isUser && (
          <div className="msg-meta">
            <span className="msg-mode-tag">
              {msg.mode?.icon} {msg.mode?.label}
            </span>
          </div>
        )}
        <div className="msg-body">{renderContent(msg.content)}</div>
      </div>
      {isUser && (
        <div className="msg-avatar user-avatar" aria-label="You">
          <User />
        </div>
      )}
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="msg-row assistant">
      <div className="msg-avatar bot-avatar">
        <Bot />
      </div>
      <div className="msg-bubble typing-bubble">
        <span className="dot" />
        <span className="dot" />
        <span className="dot" />
      </div>
    </div>
  );
}

export default function ChatWindow({ messages, isLoading }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  return (
    <div className="chat-window">
      <div className="chat-scroll">
        {messages.map((msg, i) => (
          <Message key={i} msg={msg} />
        ))}
        {isLoading && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
