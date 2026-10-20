import mongoose from 'mongoose';

const TicketSchema = new mongoose.Schema({
  ticket_id: { type: String, required: true, unique: true },
  seq: { type: Number, required: true, unique: true },
  customer_id: { type: String, default: 'cust_001' },
  parent_ticket_id: { type: String, default: null },
  created_at: { type: Date, default: Date.now }
});

const MessageSchema = new mongoose.Schema({
  ticket_id: { type: String, required: true },
  role: { type: String, enum: ['customer', 'agent', 'system'], required: true },
  text: { type: String, required: true },
  created_at: { type: Date, default: Date.now }
});

const RunSchema = new mongoose.Schema({
  run_id: { type: String, required: true, unique: true },
  ticket_id: { type: String, required: true },
  state_json: { type: Object, required: true },
  created_at: { type: Date, default: Date.now }
});

const EscalationSchema = new mongoose.Schema({
  escalation_id: { type: String, required: true, unique: true },
  ticket_id: { type: String, required: true },
  department: { type: String, default: 'Tier 1 Support' },
  assignee_id: { type: String, default: null },
  assignee_level: { type: String, enum: ['agent', 'manager'], default: 'agent' },
  status: { type: String, enum: ['open', 'resolved'], default: 'open' },
  handoff_note: { type: String, default: '' },
  created_at: { type: Date, default: Date.now }
});

const HumanAgentSchema = new mongoose.Schema({
  agent_id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  title: { type: String, default: 'Support Specialist' },
  department: { type: String, required: true },
  level: { type: String, enum: ['agent', 'manager'], default: 'agent' },
  email: { type: String, required: true }
});

const FeedbackSchema = new mongoose.Schema({
  feedback_id: { type: String, required: true, unique: true },
  ticket_id: { type: String, required: true },
  message_id: { type: String, default: '' },
  customer_id: { type: String, default: 'cust_001' },
  rating: { type: String, enum: ['up', 'down'], required: true },
  comment: { type: String, default: '' },
  question: { type: String, default: '' },
  answer: { type: String, default: '' },
  created_at: { type: Date, default: Date.now }
});

const NotificationSchema = new mongoose.Schema({
  notification_id: { type: String, required: true, unique: true },
  account_id: { type: String, required: true },
  kind: { type: String, required: true },
  title: { type: String, required: true },
  body: { type: String, default: '' },
  ticket_id: { type: String, default: '' },
  read: { type: Boolean, default: false },
  created_at: { type: Date, default: Date.now }
});

const AgentPresenceSchema = new mongoose.Schema({
  agent_id: { type: String, required: true, unique: true },
  account_id: { type: String, default: '' },
  name: { type: String, required: true },
  last_seen: { type: Number, required: true } // Unix ms timestamp
});

const TeamActivitySchema = new mongoose.Schema({
  activity_id: { type: String, required: true, unique: true },
  kind: { type: String, required: true },
  actor_id: { type: String, default: 'system' },
  ticket_id: { type: String, default: '' },
  escalation_id: { type: String, default: '' },
  summary: { type: String, required: true },
  created_at: { type: Date, default: Date.now }
});

const CaseNoteSchema = new mongoose.Schema({
  note_id: { type: String, required: true, unique: true },
  escalation_id: { type: String, required: true },
  author_id: { type: String, required: true },
  author_name: { type: String, required: true },
  body: { type: String, required: true },
  created_at: { type: Date, default: Date.now }
});

export const TicketModel = mongoose.model('Ticket', TicketSchema);
export const MessageModel = mongoose.model('Message', MessageSchema);
export const RunModel = mongoose.model('Run', RunSchema);
export const EscalationModel = mongoose.model('Escalation', EscalationSchema);
export const HumanAgentModel = mongoose.model('HumanAgent', HumanAgentSchema);
export const FeedbackModel = mongoose.model('Feedback', FeedbackSchema);
export const NotificationModel = mongoose.model('Notification', NotificationSchema);
export const AgentPresenceModel = mongoose.model('AgentPresence', AgentPresenceSchema);
export const TeamActivityModel = mongoose.model('TeamActivity', TeamActivitySchema);
export const CaseNoteModel = mongoose.model('CaseNote', CaseNoteSchema);
