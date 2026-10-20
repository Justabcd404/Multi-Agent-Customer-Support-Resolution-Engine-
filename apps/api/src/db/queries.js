import {
  TicketModel, MessageModel, RunModel, EscalationModel,
  HumanAgentModel, FeedbackModel, NotificationModel,
  AgentPresenceModel, TeamActivityModel, CaseNoteModel
} from './schema.js';

// In-memory fallbacks if Mongo server is offline during initial local dev
const memoryStore = {
  tickets: [],
  messages: [],
  runs: [],
  escalations: [],
  humanAgents: [
    { agent_id: 'ag_01', name: 'Alice Smith', title: 'Senior Tech Specialist', department: 'Engineering On-call', level: 'agent', email: 'alice@company.com' },
    { agent_id: 'ag_02', name: 'Bob Jones', title: 'Billing Lead', department: 'Billing Lead', level: 'agent', email: 'bob@company.com' },
    { agent_id: 'ag_03', name: 'Carol Danvers', title: 'Operations Manager', department: 'Order Operations', level: 'manager', email: 'carol@company.com' }
  ],
  feedback: [],
  notifications: [],
  presence: [],
  activity: [],
  caseNotes: []
};

let seqCounter = 100;

export async function ensureTicket(ticketId, customerId = 'cust_001') {
  try {
    let ticket = await TicketModel.findOne({ ticket_id: ticketId });
    if (!ticket) {
      seqCounter += 1;
      ticket = await TicketModel.create({
        ticket_id: ticketId,
        seq: seqCounter,
        customer_id: customerId
      });
    }
    return ticket;
  } catch (e) {
    let t = memoryStore.tickets.find(x => x.ticket_id === ticketId);
    if (!t) {
      seqCounter += 1;
      t = { ticket_id: ticketId, seq: seqCounter, customer_id: customerId, created_at: new Date() };
      memoryStore.tickets.push(t);
    }
    return t;
  }
}

export async function addMessage(ticketId, role, text) {
  try {
    const msg = await MessageModel.create({ ticket_id: ticketId, role, text });
    return msg;
  } catch (e) {
    const msg = { ticket_id: ticketId, role, text, created_at: new Date() };
    memoryStore.messages.push(msg);
    return msg;
  }
}

export async function getTicketHistory(ticketId) {
  try {
    const msgs = await MessageModel.find({ ticket_id: ticketId }).sort({ created_at: 1 });
    return msgs.map(m => ({ role: m.role, text: m.text }));
  } catch (e) {
    return memoryStore.messages
      .filter(m => m.ticket_id === ticketId)
      .map(m => ({ role: m.role, text: m.text }));
  }
}

export async function saveRun(ticketId, stateJson) {
  const runId = stateJson.run_id || `run_${Date.now()}`;
  try {
    await RunModel.create({ run_id: runId, ticket_id: ticketId, state_json: stateJson });
  } catch (e) {
    memoryStore.runs.push({ run_id: runId, ticket_id: ticketId, state_json: stateJson, created_at: new Date() });
  }
}

export async function getLatestRun(ticketId) {
  try {
    const run = await RunModel.findOne({ ticket_id: ticketId }).sort({ created_at: -1 });
    return run ? run.state_json : null;
  } catch (e) {
    const run = memoryStore.runs.filter(r => r.ticket_id === ticketId).pop();
    return run ? run.state_json : null;
  }
}

export async function getAllRuns() {
  try {
    const runs = await RunModel.find().sort({ created_at: -1 });
    return runs.map(r => r.state_json);
  } catch (e) {
    return memoryStore.runs.map(r => r.state_json);
  }
}

export async function createEscalation(ticketId, department, handoffNote = '') {
  const escId = `esc_${Date.now()}`;
  try {
    const esc = await EscalationModel.create({
      escalation_id: escId,
      ticket_id: ticketId,
      department,
      handoff_note: handoffNote,
      status: 'open'
    });
    return esc;
  } catch (e) {
    const esc = { escalation_id: escId, ticket_id: ticketId, department, handoff_note: handoffNote, status: 'open', created_at: new Date() };
    memoryStore.escalations.push(esc);
    return esc;
  }
}

export async function getEscalations() {
  try {
    return await EscalationModel.find().sort({ created_at: -1 });
  } catch (e) {
    return memoryStore.escalations;
  }
}

export async function getOpenEscalationForTicket(ticketId) {
  try {
    return await EscalationModel.findOne({ ticket_id: ticketId, status: 'open' });
  } catch (e) {
    return memoryStore.escalations.find(e => e.ticket_id === ticketId && e.status === 'open');
  }
}

export async function resolveEscalation(escalationId) {
  try {
    await EscalationModel.updateOne({ escalation_id: escalationId }, { status: 'resolved' });
  } catch (e) {
    const esc = memoryStore.escalations.find(x => x.escalation_id === escalationId);
    if (esc) esc.status = 'resolved';
  }
}

export async function getHumanAgents() {
  try {
    const agents = await HumanAgentModel.find();
    if (agents.length > 0) return agents;
    return memoryStore.humanAgents;
  } catch (e) {
    return memoryStore.humanAgents;
  }
}

export async function recordFeedback(feedbackData) {
  const fid = `fb_${Date.now()}`;
  try {
    return await FeedbackModel.create({ feedback_id: fid, ...feedbackData });
  } catch (e) {
    const fb = { feedback_id: fid, ...feedbackData, created_at: new Date() };
    memoryStore.feedback.push(fb);
    return fb;
  }
}

export async function getAllFeedback() {
  try {
    return await FeedbackModel.find().sort({ created_at: -1 });
  } catch (e) {
    return memoryStore.feedback;
  }
}

export async function updatePresence(agentId, name) {
  const now = Date.now();
  try {
    await AgentPresenceModel.findOneAndUpdate(
      { agent_id: agentId },
      { name, last_seen: now },
      { upsert: true }
    );
  } catch (e) {
    const existing = memoryStore.presence.find(p => p.agent_id === agentId);
    if (existing) {
      existing.last_seen = now;
    } else {
      memoryStore.presence.push({ agent_id: agentId, name, last_seen: now });
    }
  }
}

export async function getPresenceList() {
  const now = Date.now();
  const threshold = now - 35000; // 35s online cutoff
  try {
    const list = await AgentPresenceModel.find();
    return list.map(p => ({
      agent_id: p.agent_id,
      name: p.name,
      online: p.last_seen > threshold
    }));
  } catch (e) {
    return memoryStore.presence.map(p => ({
      agent_id: p.agent_id,
      name: p.name,
      online: p.last_seen > threshold
    }));
  }
}

export async function addTeamActivity(kind, summary, ticketId = '', escalationId = '') {
  const actId = `act_${Date.now()}`;
  const act = { activity_id: actId, kind, summary, ticket_id: ticketId, escalation_id: escalationId, created_at: new Date() };
  try {
    await TeamActivityModel.create(act);
  } catch (e) {
    memoryStore.activity.push(act);
  }
  return act;
}

export async function getRecentActivity() {
  try {
    return await TeamActivityModel.find().sort({ created_at: -1 }).limit(20);
  } catch (e) {
    return memoryStore.activity.slice(-20).reverse();
  }
}

export async function addCaseNote(escalationId, authorId, authorName, body) {
  const noteId = `note_${Date.now()}`;
  const note = { note_id: noteId, escalation_id: escalationId, author_id: authorId, author_name: authorName, body, created_at: new Date() };
  try {
    await CaseNoteModel.create(note);
  } catch (e) {
    memoryStore.caseNotes.push(note);
  }
  return note;
}

export async function getCaseNotes(escalationId) {
  try {
    return await CaseNoteModel.find({ escalation_id: escalationId }).sort({ created_at: 1 });
  } catch (e) {
    return memoryStore.caseNotes.filter(n => n.escalation_id === escalationId);
  }
}
