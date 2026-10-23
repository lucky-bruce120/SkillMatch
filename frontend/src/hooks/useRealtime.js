import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext.jsx';

/**
 * useRealtime
 *
 * Subscribes to the server's event stream and calls the matching handler when
 * something changes, so pages update without the user refreshing.
 *
 * The stream is a Server-Sent Events connection. It is opened once per browser
 * tab and shared by every component that uses this hook, so several pages
 * subscribing to different events still share one connection.
 *
 * On a phone the app is often backgrounded, and the browser may drop the
 * connection while it is away. The handlers are therefore also called when the
 * app comes back to the foreground, which closes any gap.
 */

const API_BASE_URL =
  import.meta.env.VITE_API_SERVER_URL || 'http://127.0.0.1:3001';

let sharedSource = null;
let sharedToken = null;

/** eventName -> Set<handler> */
const listeners = new Map();
/** event names that already have a listener on the current EventSource */
const attachedEvents = new Set();

const dispatch = (eventName, payload) => {
  const handlers = listeners.get(eventName);
  if (!handlers) return;
  for (const handler of handlers) {
    try {
      handler(payload);
    } catch (error) {
      console.error(`Realtime handler for "${eventName}" failed:`, error);
    }
  }
};

/**
 * Put a listener for `eventName` on the live EventSource, once.
 * Named SSE events are not delivered to `onmessage`, so each event name needs
 * its own listener.
 */
const attach = (eventName) => {
  if (!sharedSource || attachedEvents.has(eventName)) return;

  sharedSource.addEventListener(eventName, (event) => {
    let payload = {};
    try {
      payload = event.data ? JSON.parse(event.data) : {};
    } catch (error) {
      payload = {};
    }
    dispatch(eventName, payload);
  });

  attachedEvents.add(eventName);
};

const closeStream = () => {
  if (sharedSource) {
    try {
      sharedSource.close();
    } catch (error) {
      // Already closed.
    }
  }
  sharedSource = null;
  sharedToken = null;
  attachedEvents.clear();
};

const openStream = (token) => {
  if (sharedSource && sharedToken === token) return;

  closeStream();
  if (!token) return;

  try {
    const source = new EventSource(
      `${API_BASE_URL}/events?token=${encodeURIComponent(token)}`
    );

    sharedSource = source;
    sharedToken = token;

    // `connected` is a one-off acknowledgement from the server. It has no
    // subscribers, but attaching it lets us notice a healthy connection.
    source.addEventListener('connected', () => {});

    // The browser reconnects automatically on error; nothing to do here.
    source.onerror = () => {};

    // Attach listeners for every event that is already subscribed.
    Array.from(listeners.keys()).forEach(attach);
  } catch (error) {
    console.error('Could not open the realtime stream:', error);
    sharedSource = null;
    sharedToken = null;
  }
};

const subscribeTo = (eventName, handler) => {
  if (!listeners.has(eventName)) {
    listeners.set(eventName, new Set());
  }
  listeners.get(eventName).add(handler);

  // If the stream is already open, attach this event to it now. Previously
  // this re-opened the stream only when the token changed, so a page that
  // mounted after the header never received its events.
  if (sharedSource) attach(eventName);

  return () => {
    const handlers = listeners.get(eventName);
    if (!handlers) return;
    handlers.delete(handler);
    if (handlers.size === 0) listeners.delete(eventName);
  };
};

/**
 * @param {Record<string, (payload: object) => void>} handlers
 *   Map of event name to callback.
 */
export const useRealtime = (handlers) => {
  const { currentUser } = useAuth();
  const token = currentUser?.token;
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  // Event names are stable strings; join them so the effect does not re-run
  // just because the handler object was recreated on render.
  const eventNames = Object.keys(handlers || {}).sort().join('|');

  useEffect(() => {
    if (!token) {
      closeStream();
      return undefined;
    }

    openStream(token);

    const names = eventNames ? eventNames.split('|') : [];

    const unsubscribes = names.map((eventName) =>
      subscribeTo(eventName, (payload) => {
        handlersRef.current?.[eventName]?.(payload);
      })
    );

    // A backgrounded mobile browser can drop the event stream, and the user
    // may have missed a change while they were away. Re-run the handlers when
    // the app comes back so the page catches up.
    const handleResume = () => {
      if (document.visibilityState !== 'visible') return;

      // Reopen the stream if the browser closed it while backgrounded.
      if (!sharedSource || sharedSource.readyState === EventSource.CLOSED) {
        openStream(sharedToken || token);
      }

      const current = handlersRef.current || {};
      Object.keys(current).forEach((eventName) => {
        try {
          current[eventName]?.({ resumed: true });
        } catch (error) {
          console.error(`Realtime handler for "${eventName}" failed:`, error);
        }
      });
    };

    document.addEventListener('visibilitychange', handleResume);
    window.addEventListener('focus', handleResume);

    return () => {
      unsubscribes.forEach((unsubscribe) => unsubscribe());
      document.removeEventListener('visibilitychange', handleResume);
      window.removeEventListener('focus', handleResume);
    };
    // `token` and the event-name set are the only things that should rebuild
    // the subscription.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, eventNames]);
};

/**
 * Ask the browser to show system notifications. Used on small screens where
 * the user is not looking at the page.
 */
export const requestNotificationPermission = async () => {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  try {
    return await Notification.requestPermission();
  } catch (error) {
    return 'denied';
  }
};

/**
 * Show a system notification when the page is in the background. Returns true
 * when the caller should NOT also show an in-app toast.
 */
export const notifyUser = ({ title, body, tag }) => {
  if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
    return false;
  }

  if (typeof window === 'undefined' || !('Notification' in window)) return false;
  if (Notification.permission !== 'granted') return false;

  const options = { body, tag, icon: '/favicon.ico' };
  const showDirectly = () => {
    try {
      // eslint-disable-next-line no-new
      new Notification(title, options);
    } catch (error) {
      // Some browsers (notably Android Chrome) forbid constructing a
      // Notification directly; the service worker path below covers them.
    }
  };

  // Android Chrome only allows notifications through a service worker.
  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    navigator.serviceWorker
      .getRegistration()
      .then((registration) => {
        if (registration?.showNotification) {
          return registration.showNotification(title, options);
        }
        return showDirectly();
      })
      .catch(() => showDirectly());
    return true;
  }

  showDirectly();
  return true;
};

export default useRealtime;
