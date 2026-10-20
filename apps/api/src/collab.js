const subscribers = new Set();

export function addSubscriber(res) {
  subscribers.add(res);
  res.on('close', () => {
    subscribers.delete(res);
  });
}

export function broadcastCollabEvent(event) {
  const dataStr = `data: ${JSON.stringify(event)}\n\n`;
  for (const client of subscribers) {
    client.write(dataStr);
  }
}
