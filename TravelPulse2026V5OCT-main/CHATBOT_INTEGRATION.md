# Travel Pulse AI Chatbot — Integration Guide

## Files Changed / Added

| File | Status | Description |
|------|--------|-------------|
| `index.html` | **Modified** | Added `<script defer src="chatbot.js?v=20261001_v1"></script>` before the footer |
| `chatbot.js` | **New** | Self-contained frontend chatbot (FAB + panel, no external deps) |
| `api/chat.js` | **New** | Node.js/Express backend — proxies messages to the ChatGPT Agent |
| `package.json` | **New** | Backend dependencies |
| `.env.example` | **New** | Environment variable template |

---

## Quick Start

### 1. Install backend dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env and add your OpenAI API key:
# OPENAI_API_KEY=sk-...
```

### 3. Start the backend

```bash
npm start
# → Travel Pulse chat API listening on http://localhost:3001/api/chat
```

### 4. Serve the frontend

Open `index.html` via any static server (VS Code Live Server, `python -m http.server`, etc.).
The `chatbot.js` script auto-injects the FAB button and chat panel.

---

## Architecture

```
Browser (chatbot.js)
  │  POST /api/chat { message, history, conversationId }
  ▼
Node.js server (api/chat.js)
  │  POST https://api.openai.com/v1/responses  { agent: AGENT_ID, messages }
  ▼
ChatGPT Agent  (agt_6ab6506dfc708191a5750dde65dfaba9)
  └─ Returns reply text + conversation_id
```

### How conversation state is maintained
- The frontend keeps a session-scoped `chatHistory` array (last 20 messages).
- It sends the full history with every request so the backend can forward context.
- The backend maps a client-generated `conversationId` (UUID) to the agent's `conversation_id` / thread ID for multi-turn continuity.

---

## Deploying to Production

### Option A — Express server (same origin or reverse proxy)

```bash
# Add to nginx / Apache as a reverse proxy to :3001
# Or run with PM2:
npm install -g pm2
pm2 start api/chat.js --name travelpulse-chat
```

Set `ALLOWED_ORIGIN=https://yourdomain.com` in `.env`.

### Option B — Vercel / Netlify serverless

Move `api/chat.js` to `api/chat.js` (Vercel) or `netlify/functions/chat.js`.
The file already exports `module.exports = app` for compatibility.

### Option C — Next.js API route

Copy the handler logic into `pages/api/chat.js` or `app/api/chat/route.js`.

---

## ChatGPT Agent Access

The agent URL is:
`https://chatgpt.com/agents/a/agt_6ab6506dfc708191a5750dde65dfaba9`

Access is via OpenAI's **Responses API** with `OpenAI-Beta: agents=v1`.
Your `OPENAI_API_KEY` must belong to the same OpenAI organization that owns the agent,
or the agent must be set to public/shared access.

If the agent is private and your key doesn't have access, you can:
1. Use the agent's **Actions/Webhook** URL if configured.
2. Replace the agent with a standard `gpt-4o` Chat Completions call — the system prompt
   in `api/chat.js` (`SYSTEM_CONTEXT`) already encodes all Travel Pulse context.

---

## Customization

| What | Where |
|------|-------|
| Suggested questions | `SUGGESTED_QUESTIONS` array in `chatbot.js` |
| System prompt / data context | `SYSTEM_CONTEXT` string in `api/chat.js` |
| Panel width / colors | CSS in `chatbot.js` (uses dashboard CSS variables) |
| Max history length | `MAX_HISTORY` constant in `chatbot.js` |
| API endpoint path | `API_ENDPOINT` constant in `chatbot.js` |
