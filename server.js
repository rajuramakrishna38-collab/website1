const path = require('path');
const http = require('http');
const express = require('express');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 3000;
const turnUrls = (process.env.TURN_URLS || '').split(',').map(url => url.trim()).filter(Boolean);

app.use(express.static(path.join(__dirname, 'public')));
app.get('/health', (req, res) => res.json({ ok: true }));
app.get('/config.json', (req, res) => {
  const iceServers = [{ urls: 'stun:stun.l.google.com:19302' }];
  if (turnUrls.length && process.env.TURN_USERNAME && process.env.TURN_CREDENTIAL) {
    iceServers.push({
      urls: turnUrls,
      username: process.env.TURN_USERNAME,
      credential: process.env.TURN_CREDENTIAL
    });
  }
  res.set('Cache-Control', 'no-store').json({ iceServers });
});

const waiting = new Map();
const partner = new Map();

function removeFromQueue(id) {
  for (const queue of waiting.values()) {
    const index = queue.indexOf(id);
    if (index !== -1) queue.splice(index, 1);
  }
}

function findPartner(socket, requestedMode) {
  const mode = ['chat', 'audio', 'video'].includes(requestedMode) ? requestedMode : 'chat';
  removeFromQueue(socket.id);
  const queue = waiting.get(mode) || [];
  waiting.set(mode, queue);

  while (queue.length) {
    const otherId = queue.shift();
    const other = io.sockets.sockets.get(otherId);

    if (!other || other.id === socket.id) continue;
    if (partner.has(other.id)) continue;

    partner.set(socket.id, other.id);
    partner.set(other.id, socket.id);

    socket.emit('matched', { initiator: true, mode });
    other.emit('matched', { initiator: false, mode });
    return;
  }

  queue.push(socket.id);
  socket.emit('waiting');
}

function disconnectPartner(id) {
  const otherId = partner.get(id);
  partner.delete(id);
  if (otherId) {
    partner.delete(otherId);
    const other = io.sockets.sockets.get(otherId);
    if (other) other.emit('stranger-left');
  }
}

io.on('connection', socket => {
  socket.on('find-stranger', options => {
    disconnectPartner(socket.id);
    findPartner(socket, options?.mode);
  });

  socket.on('next', options => {
    disconnectPartner(socket.id);
    findPartner(socket, options?.mode);
  });

  socket.on('leave', () => {
    removeFromQueue(socket.id);
    disconnectPartner(socket.id);
  });

  socket.on('signal', payload => {
    const otherId = partner.get(socket.id);
    if (!otherId) return;
    const other = io.sockets.sockets.get(otherId);
    if (other) other.emit('signal', payload);
  });

  socket.on('chat-message', message => {
    const otherId = partner.get(socket.id);
    if (!otherId) return;
    const other = io.sockets.sockets.get(otherId);
    if (other) other.emit('chat-message', String(message).slice(0, 5000));
  });

  socket.on('typing', value => {
    const otherId = partner.get(socket.id);
    if (!otherId) return;
    const other = io.sockets.sockets.get(otherId);
    if (other) other.emit('typing', !!value);
  });

  socket.on('disconnect', () => {
    removeFromQueue(socket.id);
    disconnectPartner(socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`Pulse Omegle-style server running on port ${PORT}`);
  console.log(`Open http://localhost:${PORT}`);
});
