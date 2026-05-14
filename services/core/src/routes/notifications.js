const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const notifService = require('../services/notificationService');

router.get('/', authenticate, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const result = await notifService.list(req.user.id, page, limit);
    res.json(result);
  } catch (err) { next(err); }
});

router.get('/unread', authenticate, async (req, res, next) => {
  try {
    const count = await notifService.getUnreadCount(req.user.id);
    res.json({ count });
  } catch (err) { next(err); }
});

router.post('/:id/read', authenticate, async (req, res, next) => {
  try {
    await notifService.markRead(req.user.id, req.params.id);
    res.json({ message: 'Notification marked as read' });
  } catch (err) { next(err); }
});

router.post('/read-all', authenticate, async (req, res, next) => {
  try {
    const result = await notifService.markAllRead(req.user.id);
    res.json({ message: 'All notifications marked as read', count: result.count });
  } catch (err) { next(err); }
});

module.exports = router;
