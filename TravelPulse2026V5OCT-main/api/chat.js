/**
 * Travel Pulse — /api/chat  (api/chat.js)
 *
 * Node.js + Express backend that proxies frontend messages to the
 * ChatGPT Agent via OpenAI Responses API.
 *
 * Exports module.exports = app for Vercel/Next.js serverless too.
 *
 * Install:  npm install
 * Run:      npm start   →  http://localhost:3001
 * Env:      copy .env.example → .env, fill OPENAI_API_KEY
 */

'use strict';

/* ── deps ──────────────────────────────────────────────────────── */
var express   = require('express');
var cors      = require('cors');
var fetch     = require('node-fetch');   /* node-fetch v2 (CJS) */
var { v4: uuid } = require('uuid');
require('dotenv').config();

/* ── config ─────────────────────────────────────────────────────── */
var PORT           = process.env.PORT           || 3001;
var OPENAI_KEY     = process.env.OPENAI_API_KEY || '';
var AGENT_ID       = process.env.AGENT_ID       || 'agt_6ab6506dfc708191a5750dde65dfaba9';
var ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '*';

/* Travel Pulse data context injected as system prompt */
var SYSTEM_CONTEXT = [
  'You are the Travel Pulse Assistant, an AI embedded in the Travel Pulse 2026 dashboard',
  'by Escalent. Help users interpret travel intelligence from the 2nd Wave 2026 survey',
  '(Jun–Jul 2026, n ≈ 1,417 across 31 source markets).',
  '',
  'Dashboard tabs:',
  '• Source Market Overview — TSI score map, word clouds, wave-over-wave trends per market.',
  '• Destination Market Overview — sentiment polarity (positive/neutral/negative) by destination',
  '  and source market, wave comparisons.',
  '• Travel Behaviour — Inspire→Plan→Book→On Trip journey: trip purpose, destinations considered,',
  '  info channels, budget change & reasons, booking channels, package type, AI tool usage (Q9b/9c).',
  '• Airline Overview — sentiment map, NPS by airline, carrier change (Q14), loyalty (Q16a/16b),',
  '  selection factors, booking strategies (Q17/18), cabin class.',
  '• Hotels Overview — sentiment map, NPS by brand, accommodation preference (Q19), brand change (Q21),',
  '  loyalty (Q22a/22b), booking strategies (Q23/24).',
  '• Segments — age and budget segment breakdowns.',
  '',
  'Be concise and data-driven. Use bullet points for lists.',
  'Keep replies under 200 words unless a detailed breakdown is specifically requested.',
  'When exact figures are unavailable, give directional guidance and refer the user to',
  'the relevant dashboard tab.'
].join('\n');

/* In-memory session store (conversationId → agent thread id)        */
/* Replace with Redis for multi-instance production deployments.      */
var sessions = {};   /* { [clientConvId]: agentConvId } */

/* ── Express app ──────────────────────────────────────────────── */
var app = express();

app.use(cors({ origin: ALLOWED_ORIGIN, methods: ['GET','POST','OPTIONS'] }));
app.use(express.json({ limit: '64kb' }));

/* health */
app.get('/api/health', function (_req, res) {
  res.json({ ok: true, agent: AGENT_ID, ts: new Date().toISOString() });
});

/**
 * POST /api/chat
 * Body    : { message: string, history: [{role,content}], conversationId?: string }
 * Returns : { reply: string, conversationId: string }
 */
app.post('/api/chat', function (req, res) {
  var body           = req.body || {};
  var message        = (body.message || '').trim();
  var history        = Array.isArray(body.history) ? body.history : [];
  var clientConvId   = body.conversationId || null;

  /* ── validate ── */
  if (!message) {
    return res.status(400).json({ error: 'message is required' });
  }
  if (!OPENAI_KEY) {
    return res.status(500).json({
      error: 'OPENAI_API_KEY is not configured on this server. ' +
             'Add it to your .env file.'
    });
  }

  /* ── session id ── */
  var sessId = (clientConvId && sessions[clientConvId])
    ? clientConvId
    : uuid();

  /* ── build messages array ── */
  var messages = [{ role: 'system', content: SYSTEM_CONTEXT }];

  /* include last 18 turns for context */
  var recent = history.slice(-18);
  recent.forEach(function (m) {
    if ((m.role === 'user' || m.role === 'assistant') && m.content) {
      messages.push({ role: m.role, content: String(m.content) });
    }
  });
  messages.push({ role: 'user', content: message });

  /* ── call agent ── */
  callAgent(messages, sessions[sessId] || null)
    .then(function (result) {
      /* persist thread id for conversation continuity */
      sessions[sessId] = result.threadId || sessId;
      return res.json({ reply: result.reply, conversationId: sessId });
    })
    .catch(function (err) {
      console.error('[/api/chat]', err.message || err);
      return res.status(502).json({
        error: err.message || 'Failed to reach the AI agent. Please try again.'
      });
    });
});

/* ── Agent caller ─────────────────────────────────────────────── */
function callAgent(messages, existingThreadId) {
  /*
   * OpenAI Responses API (Agents / Assistants)
   * POST https://api.openai.com/v1/responses
   * Headers: OpenAI-Beta: agents=v1
   */
  var body = {
    agent:    AGENT_ID,
    messages: messages,
    stream:   false
  };
  if (existingThreadId) {
    body.conversation_id = existingThreadId;
  }

  return fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + OPENAI_KEY,
      'OpenAI-Beta': 'agents=v1'
    },
    body: JSON.stringify(body),
    timeout: 30000
  })
  .then(function (resp) {
    if (!resp.ok) {
      return resp.text().then(function (txt) {
        var msg = 'OpenAI API error ' + resp.status;
        try { msg = JSON.parse(txt).error.message || msg; } catch(_) {}
        throw new Error(msg);
      });
    }
    return resp.json();
  })
  .then(function (data) {
    return {
      reply:    extractReply(data),
      threadId: data.conversation_id || data.id || null
    };
  });
}

/**
 * Extract text reply from OpenAI Responses API shape:
 *   data.output[].content[].text  (primary)
 *   data.choices[0].message.content  (Chat Completions fallback)
 */
function extractReply(data) {
  /* Responses API */
  if (Array.isArray(data && data.output)) {
    var parts = [];
    data.output.forEach(function (block) {
      if (block && block.type === 'message' && Array.isArray(block.content)) {
        block.content.forEach(function (part) {
          if (part && part.text) parts.push(part.text);
        });
      }
    });
    if (parts.length) return parts.join('\n');
  }
  /* Chat Completions fallback */
  if (data && data.choices && data.choices[0] &&
      data.choices[0].message && data.choices[0].message.content) {
    return data.choices[0].message.content;
  }
  return '(No response received from agent)';
}

/* ── Start (if run directly) ──────────────────────────────────── */
if (require.main === module) {
  app.listen(PORT, function () {
    console.log('✈  Travel Pulse chat API → http://localhost:' + PORT + '/api/chat');
    if (!OPENAI_KEY) {
      console.warn('⚠  OPENAI_API_KEY not set — set it in .env before use.');
    }
  });
}

/* Vercel / Next.js serverless export */
module.exports = app;
module.exports.handler = function (req, res) { app(req, res); };
