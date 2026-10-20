import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './db/connect.js';
import {
  ensureTicket, addMessage, getTicketHistory, saveRun,
  getLatestRun, getAllRuns, createEscalation, getEscalations,
  getOpenEscalationForTicket, resolveEscalation, getHumanAgents,
  recordFeedback, getAllFeedback, updatePresence, getPresenceList,
  addTeamActivity, getRecentActivity, addCaseNote, getCaseNotes
} from './db/queries.js';
import { runAgentSync, forwardAgentStream } from './agentClient.js';
import { addSubscriber, broadcastCollabEvent } from './collab.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4100;
const AGENT_URL = process.env.AGENT_URL || 'http://localhost:5000';

app.use(cors());
app.use(express.json());

// Initialize MongoDB Connection
connectDB();

// --- Auth Routes ---
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  let role = 'user';
  if (email.includes('admin')) role = 'admin';
  else if (email.includes('agent')) role = 'agent';

  return res.json({
    token: `token_${role}_${Date.now()}`,
    user: { id: `usr_${role}`, name: email.split('@')[0], email, role }
  });
});

app.get('/api/auth/me', (req, res) => {
  res.json({ id: 'usr_admin', name: 'Admin User', email: 'admin@company.com', role: 'admin' });
});

// --- Customer Ticket Submission & SSE Pipeline Stream ---
app.post('/api/tickets/stream', async (req, res) => {
  const { message, customer_id = 'cust_001', ticket_id } = req.body;
  if (!message || !message.trim()) {
    return res.status(400).json({ error: 'Message cannot be empty' });
  }

  const tktId = ticket_id || `TKT-${Math.floor(1000 + Math.random() * 9000)}`;
  await ensureTicket(tktId, customer_id);
  await addMessage(tktId, 'customer', message);

  const history = await getTicketHistory(tktId);
  const priorRun = await getLatestRun(tktId);

  const payload = {
    run_id: `run_${Date.now()}`,
    ticket_id: tktId,
    customer_id,
    message,
    message_count: history.length,
    history: history.slice(-6),
    prior_context: priorRun ? {
      summary: priorRun.resolution?.summary,
      domain: priorRun.classification?.primary_intent,
      resolved: !priorRun.escalation?.escalate
    } : null
  };

  const finalState = await forwardAgentStream(payload, res);

  if (finalState) {
    await saveRun(tktId, finalState);
    if (finalState.resolution?.summary) {
      await addMessage(tktId, 'agent', finalState.resolution.summary);
    }
    // Check if escalated
    if (finalState.escalation?.escalate) {
      const openEsc = await getOpenEscalationForTicket(tktId);
      if (!openEsc) {
        const esc = await createEscalation(tktId, finalState.escalation.recommended_team, finalState.escalation.reason);
        const act = await addTeamActivity('escalation_created', `Escalation created for Ticket #${tktId} -> ${esc.department}`, tktId, esc.escalation_id);
        broadcastCollabEvent({ type: 'escalation_created', activity: act });
      }
    }
  }
});

app.get('/api/tickets/:id', async (req, res) => {
  const tktId = req.params.id;
  const history = await getTicketHistory(tktId);
  const latestRun = await getLatestRun(tktId);
  res.json({ ticket_id: tktId, history, latest_run: latestRun });
});

// --- Escalation Management (HITL) ---
app.get('/api/escalations', async (req, res) => {
  const list = await getEscalations();
  res.json(list);
});

app.post('/api/escalations/:id/resolve', async (req, res) => {
  const escId = req.params.id;
  await resolveEscalation(escId);
  const act = await addTeamActivity('escalation_resolved', `Escalation ${escId} resolved by human agent`, '', escId);
  broadcastCollabEvent({ type: 'escalation_resolved', activity: act });
  res.json({ status: 'resolved' });
});

app.post('/api/escalations/:id/reply', async (req, res) => {
  const escId = req.params.id;
  const { ticket_id, text } = req.body;
  if (ticket_id && text) {
    await addMessage(ticket_id, 'agent', `[Human Agent]: ${text}`);
    const act = await addTeamActivity('agent_reply', `Human agent replied on Ticket #${ticket_id}`, ticket_id, escId);
    broadcastCollabEvent({ type: 'agent_reply', activity: act });
  }
  res.json({ status: 'sent' });
});

app.post('/api/escalations/:id/note', async (req, res) => {
  const escId = req.params.id;
  const { body, author_name = 'Support Agent' } = req.body;
  const note = await addCaseNote(escId, 'ag_01', author_name, body);
  const act = await addTeamActivity('case_note', `Internal case note added on escalation ${escId}`, '', escId);
  broadcastCollabEvent({ type: 'case_note', note, activity: act });
  res.json(note);
});

app.get('/api/escalations/:id/notes', async (req, res) => {
  const notes = await getCaseNotes(req.params.id);
  res.json(notes);
});

// --- Observability & Dashboards ---
app.get('/api/dashboard/tickets', async (req, res) => {
  const runs = await getAllRuns();
  res.json(runs);
});

app.get('/api/observability/runs', async (req, res) => {
  const runs = await getAllRuns();
  res.json(runs);
});

app.get('/api/observability/runs/:id', async (req, res) => {
  const runs = await getAllRuns();
  const run = runs.find(r => r.run_id === req.params.id || r.ticket_id === req.params.id);
  res.json(run || {});
});

// --- Feedback Endpoints ---
app.post('/api/feedback', async (req, res) => {
  const fb = await recordFeedback(req.body);
  res.json(fb);
});

app.get('/api/admin/feedback', async (req, res) => {
  const list = await getAllFeedback();
  res.json(list);
});

// --- Real-time Collaboration SSE Feed ---
app.post('/api/collab/heartbeat', async (req, res) => {
  const { agent_id = 'ag_01', name = 'Support Agent' } = req.body;
  await updatePresence(agent_id, name);
  res.json({ status: 'pong' });
});

app.get('/api/collab/overview', async (req, res) => {
  const roster = await getPresenceList();
  const humanAgents = await getHumanAgents();
  const recentActivity = await getRecentActivity();
  res.json({ roster, humanAgents, recentActivity });
});

app.get('/api/collab/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  addSubscriber(res);
  res.write(`data: ${JSON.stringify({ type: 'ping', ts: new Date().toISOString() })}\n\n`);
});

// --- Platform Config Proxy to Python Agent API ---
app.get('/api/platform/policies', async (req, res) => {
  const response = await fetch(`${AGENT_URL}/admin/policies`);
  res.json(await response.json());
});

app.put('/api/platform/policies', async (req, res) => {
  const response = await fetch(`${AGENT_URL}/admin/policies`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req.body)
  });
  res.json(await response.json());
});

app.get('/api/platform/specialists', async (req, res) => {
  const response = await fetch(`${AGENT_URL}/admin/agents`);
  res.json(await response.json());
});

app.put('/api/platform/specialists', async (req, res) => {
  const response = await fetch(`${AGENT_URL}/admin/agents`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req.body)
  });
  res.json(await response.json());
});

app.get('/api/platform/faq', async (req, res) => {
  const response = await fetch(`${AGENT_URL}/admin/faq`);
  res.json(await response.json());
});

app.post('/api/platform/faq', async (req, res) => {
  const response = await fetch(`${AGENT_URL}/admin/faq`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req.body)
  });
  res.json(await response.json());
});

app.get('/api/platform/kb/:file', async (req, res) => {
  const response = await fetch(`${AGENT_URL}/admin/kb/${req.params.file}`);
  res.json(await response.json());
});

app.put('/api/platform/kb/:file', async (req, res) => {
  const response = await fetch(`${AGENT_URL}/admin/kb/${req.params.file}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req.body)
  });
  res.json(await response.json());
});

app.post('/api/platform/kb/suggest', async (req, res) => {
  const response = await fetch(`${AGENT_URL}/admin/kb/suggest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req.body)
  });
  res.json(await response.json());
});

app.listen(PORT, () => {
  console.log(`[Express API] Server running on http://localhost:${PORT}`);
});
