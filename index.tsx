import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// ===============================
// Service Worker (PWA / Offline)
// ===============================
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js') // ✅ absolute path (IMPORTANT)
      .then(reg => {
        console.log('Service Worker Registered:', reg.scope);
      })
      .catch(err => {
        console.warn('Service Worker Registration Failed:', err);
      });
  });
}

// ===============================
// Prevent storage eviction
// (IndexedDB / photos / surveys)
// ===============================
if (navigator.storage?.persist) {
  navigator.storage.persist().then(granted => {
    console.log('Persistent storage granted:', granted);
  });
}

// ===============================
// React mount
// ===============================
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Could not find root element to mount to');
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
