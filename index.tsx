import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Detect Android WebView
const isAndroidWebView =
  /Android/i.test(navigator.userAgent) &&
  /wv|Version\/\d+\.\d+/i.test(navigator.userAgent);

// Register Service Worker ONLY for real browsers (not WebView)
if (
  'serviceWorker' in navigator &&
  import.meta.env.PROD &&
  !isAndroidWebView
) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('./sw.js', { scope: './' })
      .then(reg => console.log('✅ SW registered:', reg.scope))
      .catch(err => console.error('❌ SW failed:', err));
  });
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Could not find root element to mount to');
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
