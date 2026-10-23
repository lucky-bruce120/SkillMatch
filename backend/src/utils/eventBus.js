/**
 * A tiny in-process event bus used to push changes to connected clients.
 *
 * The app has no socket layer and adding one would mean a new dependency plus
 * a proxy that supports it. Server-Sent Events give us the same "the server
 * tells the browser something changed" behaviour over plain HTTP, which works
 * on every device and through every proxy.
 *
 * Events are addressed to a single user id, so a subscriber only ever receives
 * the events meant for them.
 */

const subscribers = new Map(); // userId -> Set<res>

/**
 * Subscribe a response stream to a user's event channel.
 * @param {string} userId
 * @param {import('express').Response} res
 */
export const subscribe = (userId, res) => {
  if (!subscribers.has(userId)) {
    subscribers.set(userId, new Set());
  }
  subscribers.get(userId).add(res);

  return () => {
    const set = subscribers.get(userId);
    if (!set) return;
    set.delete(res);
    if (set.size === 0) subscribers.delete(userId);
  };
};

/**
 * Send an event to every live connection belonging to a user.
 * @param {string} userId
 * @param {string} event
 * @param {object} data
 */
export const emitToUser = (userId, event, data = {}) => {
  if (!userId) return;

  const set = subscribers.get(String(userId));
  if (!set || set.size === 0) return;

  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;

  for (const res of set) {
    try {
      res.write(payload);
    } catch (error) {
      // A dead connection should never break the request that triggered it.
      set.delete(res);
    }
  }
};

/**
 * Send an event to several users at once.
 * @param {string[]} userIds
 * @param {string} event
 * @param {object} data
 */
export const emitToUsers = (userIds = [], event, data = {}) => {
  for (const userId of userIds) {
    emitToUser(userId, event, data);
  }
};
