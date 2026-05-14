const prisma = require('../utils/prisma');
const logger = require('../utils/logger');

async function createInApp(userId, type, title, body, data = null) {
  try {
    const notif = await prisma.notification.create({
      data: { userId, type, channel: 'in_app', title, body, data, status: 'SENT', sentAt: new Date() },
    });

    // Emit real-time socket event if io is available
    const io = global.io;
    if (io) {
      io.to(userId).emit('notification:new', {
        id: notif.id, type, title, body, data, createdAt: notif.createdAt,
      });
    }
    return notif;
  } catch (err) {
    logger.error({ msg: 'Failed to create in-app notification', userId, error: err.message });
    return null;
  }
}

async function markRead(userId, notificationId) {
  return prisma.notification.updateMany({
    where: { id: notificationId, userId },
    data: { isRead: true, readAt: new Date() },
  });
}

async function markAllRead(userId) {
  return prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true, readAt: new Date() },
  });
}

async function list(userId, page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  const [notifications, total] = await Promise.all([
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.notification.count({ where: { userId } }),
  ]);
  return { notifications, total, page, totalPages: Math.ceil(total / limit) };
}

async function getUnreadCount(userId) {
  return prisma.notification.count({ where: { userId, isRead: false } });
}

module.exports = { createInApp, markRead, markAllRead, list, getUnreadCount };
