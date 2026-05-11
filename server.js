import express from "express";
import cors from "cors";
import askLiveAIS from "./liveAIS.js";
// import askVessel from "./vessel.js";
import askPort from "./port.js";
// import askTerminal from "./terminal.js";
import askBerth from "./berth.js";

const app = express();
app.use(cors());
app.use(express.json());

// ─── Session Store ────────────────────────────────────────────────────────────
const SESSION_TTL_MS = (parseInt(process.env.SESSION_TTL_MINUTES) || 30) * 60 * 1000;
const CONTEXT_TURNS  = parseInt(process.env.CONTEXT_WINDOW_TURNS) || 5;

const conversationStore = new Map(); // sessionId → [{ role, content }, ...]
const sessionTimestamps = new Map(); // sessionId → Date.now()

function getRecentHistory(sessionId) {
  if (!conversationStore.has(sessionId)) conversationStore.set(sessionId, []);
  sessionTimestamps.set(sessionId, Date.now());
  const history = conversationStore.get(sessionId);
  return history.slice(-(CONTEXT_TURNS * 2)); // last N turns (each turn = 2 entries)
}

function appendTurn(sessionId, userQuery, assistantAnswer) {
  if (!conversationStore.has(sessionId)) conversationStore.set(sessionId, []);
  const history = conversationStore.get(sessionId);
  history.push({ role: "user",      content: userQuery });
  history.push({ role: "assistant", content: assistantAnswer });
  sessionTimestamps.set(sessionId, Date.now());
}

// Cleanup idle sessions every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [id, lastActive] of sessionTimestamps.entries()) {
    if (now - lastActive > SESSION_TTL_MS) {
      conversationStore.delete(id);
      sessionTimestamps.delete(id);
      console.log(`[Session] Evicted idle session: ${id}`);
    }
  }
}, 10 * 60 * 1000);

// ─── Type Handlers ────────────────────────────────────────────────────────────
// Each handler now receives (query, history) so the underlying file
// can pass history into its Bedrock call for context-aware responses.

async function handleLiveAIS(query, history)  { return await askLiveAIS(query, history); }
async function handleVessel(query, history)   { /* return await askVessel(query, history); */ }
async function handlePort(query, history)     { return await askPort(query, history); }
async function handleTerminal(query, history) { /* return await askTerminal(query, history); */ }
async function handleBerth(query, history)    { return await askBerth(query, history); }

const TYPE_HANDLERS = {
  live_ais: handleLiveAIS,
  vessel:   handleVessel,
  port:     handlePort,
  terminal: handleTerminal,
  berth:    handleBerth,
};

// ─── POST /api/ask ─────────────────────────────────────────────────────────────
app.post("/api/ask", async (req, res) => {
  const { query, type, sessionId } = req.body;

  if (!query || typeof query !== "string") {
    return res.status(400).json({ success: false, error: "Missing or invalid 'query' field in request body." });
  }

  if (!sessionId || typeof sessionId !== "string") {
    return res.status(400).json({ success: false, error: "Missing 'sessionId'. Generate a UUID on the frontend and send it with every request." });
  }

  const handler = TYPE_HANDLERS[type];
  if (!handler) {
    return res.status(400).json({ success: false, error: `Unknown type "${type}". Valid types: ${Object.keys(TYPE_HANDLERS).join(", ")}` });
  }

  try {
    console.log(`[WOP] type="${type}" | sessionId="${sessionId}" | query="${query}"`);

    // Load the last N turns for this session as context
    const history = getRecentHistory(sessionId);

    // Pass query + history into the handler (and down into the Bedrock call)
    const result = await handler(query, history);

    // Save this turn to session memory
    appendTurn(sessionId, query, result.answer ?? "Done.");

    return res.status(200).json({
      success: true,
      type,
      query,
      sql:    result.sql    ?? null,
      data:   result.data   ?? [],
      answer: result.answer ?? "Done.",
    });

  } catch (err) {
    console.error(`[WOP] Handler error (type=${type}):`, err);
    return res.status(500).json({ success: false, error: err.message || "Internal server error" });
  }
});

// ─── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`WOP API running on http://localhost:${PORT}`);
  console.log(`Registered types: ${Object.keys(TYPE_HANDLERS).join(", ")}`);
  console.log(`Context window: ${CONTEXT_TURNS} turns | Session TTL: ${SESSION_TTL_MS / 60000}min`);
});
