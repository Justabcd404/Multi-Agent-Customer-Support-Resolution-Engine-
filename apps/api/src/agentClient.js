import dotenv from 'dotenv';
dotenv.config();

const AGENT_URL = process.env.AGENT_URL || 'http://localhost:5000';

export async function runAgentSync(payload) {
  const res = await fetch(`${AGENT_URL}/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    throw new Error(`Agent service error: ${res.statusText}`);
  }
  return await res.json();
}

export async function forwardAgentStream(payload, res) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    const agentRes = await fetch(`${AGENT_URL}/run/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!agentRes.body) {
      res.write(`data: ${JSON.stringify({ type: 'error', message: 'No body from agent' })}\n\n`);
      res.end();
      return;
    }

    const reader = agentRes.body.getReader();
    const decoder = new TextDecoder();

    let done = false;
    let fullState = null;

    while (!done) {
      const { value, done: readerDone } = await reader.read();
      done = readerDone;
      if (value) {
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (line.trim()) {
            res.write(`data: ${line}\n\n`);
            try {
              const parsed = JSON.parse(line);
              if (parsed.type === 'done') {
                fullState = parsed.state;
              }
            } catch (e) {}
          }
        }
      }
    }
    res.end();
    return fullState;
  } catch (error) {
    res.write(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`);
    res.end();
    return null;
  }
}
