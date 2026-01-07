
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Register Service Worker with WebView-specific update logic
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Check if we are in a protocol that supports Service Workers (http/https)
    // Environments like sandboxed previews might use blob: protocols which are unsupported.
    const protocol = window.location.protocol;
    if (protocol !== 'http:' && protocol !== 'https:') {
      console.warn(`Service Worker registration skipped: Protocol "${protocol}" is not supported for workers.`);
      return;
    }

    // We resolve the SW URL using string manipulation to avoid "Invalid URL" 
    // construction errors in sandboxed or non-standard origins.
    const href = window.location.href;
    const swUrl = href.substring(0, href.lastIndexOf('/') + 1) + 'sw.js';
    
    navigator.serviceWorker.register(swUrl)
      .then(registration => {
        console.log('SW Registered successfully:', swUrl);
        
        // Check for updates every time the app comes to foreground (common in mobile)
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('New content available; system will sync on next launch.');
              }
            });
          }
        });
      })
      .catch(err => {
        // In sandboxed environments like scf.usercontent.goog, Service Workers may be blocked 
        // by browser security policies. We log a warning instead of a hard error to keep the app functional.
        const isSandbox = window.location.hostname.includes('usercontent.goog') || 
                          window.location.hostname.includes('ai.studio');
                          
        if (isSandbox) {
          console.warn('Service Worker registration skipped: Browsers restrict SW on sandboxed preview domains. Offline features will be active when deployed to your production origin.');
        } else {
          console.error('SW Registration Failed:', err);
        }
      });
  });
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
