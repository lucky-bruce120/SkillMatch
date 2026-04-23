import express from 'express';
import Notification from '../models/Notification.js';
import authMiddleware from '../middleware/auth.js';
import logger from '../utils/logger.js';

const router = express.Router();

// GET /notifications/unread-count
router.get('/unread-count', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;

    const count = await Notification.countDocuments({ user_id: userId, isRead: false });

    res.json({ count });
  } catch (error) {
    logger.error('Get unread count error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /notifications
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;

    const notifications = await Notification.find({ user_id: userId }).sort({ created: -1 });

    res.json(notifications);
  } catch (error) {
    logger.error('Get notifications error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /notifications/:notificationId/read
router.put('/:notificationId/read', authMiddleware, async (req, res) => {
  try {
    const { notificationId } = req.params;

    const notification = await Notification.findById(notificationId);

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    if (notification.user_id.toString() !== req.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    notification.isRead = true;
    await notification.save();

    res.json({ success: true });
  } catch (error) {
    logger.error('Mark notification read error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /notifications/:notificationId
router.delete('/:notificationId', authMiddleware, async (req, res) => {
  try {
    const { notificationId } = req.params;

    const notification = await Notification.findById(notificationId);

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    if (notification.user_id.toString() !== req.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    await Notification.findByIdAndDelete(notificationId);

    res.json({ success: true });
  } catch (error) {
    logger.error('Delete notification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;