const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4100';

export async function submitTicketStream(message, ticketId, onProgress) {
  const response = await fetch(`${API_URL}/api/tickets/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, ticket_id: ticketId })
  });

  if (!response.body) return null;

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  let done = false;
  let finalResult = null;

  while (!done) {
    const { value, done: readerDone } = await reader.read();
    done = readerDone;
    if (value) {
      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.replace('data: ', '').trim());
            onProgress(data);
            if (data.type === 'done') {
              finalResult = data.state;
            }
          } catch (e) {}
        }
      }
    }
  }
  return finalResult;
}

export async function fetchTickets() {
  const res = await fetch(`${API_URL}/api/dashboard/tickets`);
  return await res.json();
}

export async function fetchEscalations() {
  const res = await fetch(`${API_URL}/api/escalations`);
  return await res.json();
}

export async function resolveEscalation(escId) {
  const res = await fetch(`${API_URL}/api/escalations/${escId}/resolve`, { method: 'POST' });
  return await res.json();
}

export async function sendEscalationReply(escId, ticketId, text) {
  const res = await fetch(`${API_URL}/api/escalations/${escId}/reply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ticket_id: ticketId, text })
  });
  return await res.json();
}

export async function fetchObservabilityRuns() {
  const res = await fetch(`${API_URL}/api/observability/runs`);
  return await res.json();
}

export async function fetchRunTrace(ticketId) {
  const res = await fetch(`${API_URL}/api/observability/runs/${ticketId}`);
  return await res.json();
}

export async function submitFeedback(ticketId, rating, comment, question, answer) {
  const res = await fetch(`${API_URL}/api/feedback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ticket_id: ticketId, rating, comment, question, answer })
  });
  return await res.json();
}

export async function fetchFeedback() {
  const res = await fetch(`${API_URL}/api/admin/feedback`);
  return await res.json();
}

export async function fetchCollabOverview() {
  const res = await fetch(`${API_URL}/api/collab/overview`);
  return await res.json();
}

export async function sendHeartbeat(agentId = 'ag_01', name = 'Support Agent') {
  await fetch(`${API_URL}/api/collab/heartbeat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ agent_id: agentId, name })
  });
}

export async function fetchPlatformPolicies() {
  const res = await fetch(`${API_URL}/api/platform/policies`);
  return await res.json();
}

export async function updatePlatformPolicies(policies) {
  const res = await fetch(`${API_URL}/api/platform/policies`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(policies)
  });
  return await res.json();
}
