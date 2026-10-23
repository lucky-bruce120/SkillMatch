import Notification from '../models/Notification.js';
import { emitToUser } from './eventBus.js';

/**
 * Create a notification and push it to the user immediately.
 *
 * Every notification used to be written to the database and only discovered
 * on the next poll. Going through this helper means the recipient sees it
 * straight away, and gets a system notification on a phone that is not in the
 * foreground.
 *
 * @param {object} options
 * @param {string} options.user_id  Who receives it.
 * @param {string} options.type     One of the Notification type enum values.
 * @param {string} options.title
 * @param {string} options.message
 * @param {string} [options.related_id]
 */
export const createNotification = async ({
  user_id: userId,
  type,
  title,
  message,
  related_id: relatedId,
}) => {
  const notification = await Notification.create({
    user_id: userId,
    type,
    title,
    message,
    related_id: relatedId,
    isRead: false,
  });

  emitToUser(userId, 'notification:new', {
    id: String(notification._id),
    type: notification.type,
    title: notification.title,
    message: notification.message,
    relatedId: relatedId ? String(relatedId) : null,
    created: notification.created,
  });

  return notification;
};

export default createNotification;
