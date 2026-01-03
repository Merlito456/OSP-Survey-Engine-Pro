import React, { useState, useEffect, useRef } from 'react';

// TEMP STUBS (to be converted later)
function Stub({ name }) {
  return React.createElement(
    'div',
    {
      style: {
        padding: 12,
        margin: 8,
        background: '#f1f5f9',
        borderRadius: 8,
        color: '#0f172a',
        fontSize: 12
      }
    },
    name + ' (stub)'
  );
}

export default function App() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [survey, setSurvey] = useState({
    id: crypto.randomUUID(),
    siteName: 'ACTIVE OSP PROJECT',
    companyName: 'FIELD OPERATIONS',
    poles: []
  });

  const surveyRef = useRef(null);

  useEffect(() => {
    surveyRef.current = survey;
  }, [survey]);

  useEffect(() => {
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  return React.createElement(
    'div',
    {
      style: {
        height: '100vh',
        padding: 16,
        background: '#0f172a',
        color: 'white',
        fontFamily: 'sans-serif'
      }
    },
    React.createElement(
      'h1',
      { style: { fontSize: 18, marginBottom: 8 } },
      'OSP Survey Tool Pro'
    ),
    React.createElement(
      'div',
      { style: { fontSize: 12, opacity: 0.8 } },
      isOnline ? 'ONLINE' : 'OFFLINE'
    ),
    React.createElement(Stub, { name: 'MapOverlay' }),
    React.createElement(Stub, { name: 'PoleEditor' })
  );
}
