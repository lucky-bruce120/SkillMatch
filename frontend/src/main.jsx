import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Register the notification service worker. Android Chrome only allows
// notifications to be shown through a service worker, so without this the
// "Enable notifications" option would do nothing on a phone.
if ('serviceWorker' in navigator) {
	window.addEventListener('load', () => {
		navigator.serviceWorker.register('/sw.js').catch((error) => {
			console.warn('Service worker registration failed:', error);
		});
	});
}

ReactDOM.createRoot(document.getElementById('root')).render(
	<App />
);
