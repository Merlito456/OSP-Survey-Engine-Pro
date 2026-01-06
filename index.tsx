// index.tsx - Updated
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
    // Try multiple paths - Cloudflare Pages might need different path
    const swPaths = [
      '/sw.js',
      './sw.js',
      'sw.js',
      '/assets/sw.js'
    ];
    
    let registered = false;
    
    swPaths.forEach(path => {
      if (!registered) {
        navigator.serviceWorker
          .register(path, { scope: './' })
          .then(reg => {
            console.log(`✅ SW registered at ${path}:`, reg.scope);
            registered = true;
            
            // Check for updates
            reg.addEventListener('updatefound', () => {
              const newWorker = reg.installing;
              if (newWorker) {
                newWorker.addEventListener('statechange', () => {
                  if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    console.log('New content is available; please refresh.');
                  }
                });
              }
            });
          })
          .catch(err => {
            console.log(`❌ SW failed at ${path}:`, err.message);
          });
      }
    });
    
    // If none work, log error
    setTimeout(() => {
      if (!registered) {
        console.error('⚠️ Service Worker could not be registered with any path');
      }
    }, 3000);
  });
}

// Periodic SW update check
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  setInterval(() => {
    navigator.serviceWorker.getRegistrations().then(registrations => {
      registrations.forEach(registration => {
        registration.update();
      });
    });
  }, 60 * 60 * 1000); // Check every hour
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
