const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const logger = require('./logger');

let io;

function initSocket(server) {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) return next(new Error('Authentication required'));
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = payload.id || payload.sub;
      socket.userRole = payload.role;
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    logger.info({ msg: 'Socket connected', userId: socket.userId, role: socket.userRole });

    // Join personal room
    socket.join(socket.userId);

    // Join role-based rooms
    if (socket.userRole === 'admin') {
      socket.join('admin_room');
    }

    socket.on('disconnect', () => {
      logger.info({ msg: 'Socket disconnected', userId: socket.userId });
    });

    socket.on('ping', () => socket.emit('pong', { userId: socket.userId, ts: Date.now() }));
  });

  global.io = io;
  logger.info({ msg: 'Socket.io initialized' });
  return io;
}

function getIo() {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
}

module.exports = { initSocket, getIo };
