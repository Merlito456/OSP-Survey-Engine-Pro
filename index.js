import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.js';

// ===============================
// Service Worker (offline support)
// ===============================
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('./sw.js', {
        scope: './'
      });
      console.log('Service Worker registered:', reg.scope);
    } catch (err) {
      console.warn('Service Worker registration failed:', err);
    }
  });
}

// ===============================
// Persistent storage (IMPORTANT)
// Prevents browser from evicting
// IndexedDB data (pins, photos)
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

const root = ReactDOM.createRoot(rootElement);

try {
  root.render(
    React.createElement(
      React.StrictMode,
      null,
      React.createElement(App)
    )
  );
} catch (err) {
  console.error('Fatal render error:', err);
  rootElement.innerHTML =
    '<div style="padding:16px;color:red">Application failed to start.</div>';
}
