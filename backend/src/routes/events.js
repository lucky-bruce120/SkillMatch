import 'dotenv/config';
import express from 'express';
import jwt from 'jsonwebtoken';
import { subscribe } from '../utils/eventBus.js';
import logger from '../utils/logger.js';

const router = express.Router();

/**
 * GET /events?token=...
 *
 * A Server-Sent Events stream. The browser keeps the connection open and the
 * server pushes a message whenever something relevant changes (a new
 * application, a status change, an interview invitation), so the UI can update
 * without the user refreshing.
 *
 * EventSource cannot send an Authorization header, so the token arrives as a
 * query parameter and is verified here with the same secret as authMiddleware.
 */
router.get('/', (req, res) => {
  const token = req.query.token;

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  let userId;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    userId = decoded.userId;
  } catch (error) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }

  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders?.();

  // Tell the client the stream is live, then keep it warm.
  res.write(`event: connected\ndata: ${JSON.stringify({ userId })}\n\n`);

  const unsubscribe = subscribe(userId, res);

  // Comment frames keep proxies and mobile browsers from closing an idle
  // connection.
  const heartbeat = setInterval(() => {
    try {
      res.write(': ping\n\n');
    } catch (error) {
      logger.error('Event stream heartbeat failed:', error);
    }
  }, 25000);

  req.on('close', () => {
    clearInterval(heartbeat);
    unsubscribe();
    try {
      res.end();
    } catch (error) {
      // Already closed.
    }
  });
});

export default router;
