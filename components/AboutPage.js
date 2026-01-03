import React, { useState, useEffect } from 'react';
import {
  X,
  Activity,
  UserCheck,
  Phone,
  Fingerprint,
  ShieldCheck,
  HardDrive,
  Cpu,
  Globe,
  Camera,
  ClipboardCheck,
  WifiOff,
  Zap
} from 'lucide-react';

import { getDeviceId, getSubscriptionStatus } from '../services/authService.js';
import { getStorageHealth } from '../services/dbService.js';

export function AboutPage(props) {
  const onClose = props.onClose;
  const hideHeader = props.hideHeader === true;

  const [deviceId, setDeviceId] = useState('...');
  const [subStatus, setSubStatus] = useState(null);
  const [storage, setStorage] = useState(null);

  useEffect(() => {
    getDeviceId().then(setDeviceId);
    getSubscriptionStatus().then(setSubStatus);
    getStorageHealth().then(setStorage);
  }, []);

  const usedGB = storage
    ? (storage.usage / (1024 * 1024 * 1024)).toFixed(2)
    : '0.00';

  const quotaGB = storage
    ? (storage.quota / (1024 * 1024 * 1024)).toFixed(0)
    : '0';

  const percent = storage ? Math.min(100, storage.percent || 0) : 0;

  return React.createElement(
    'div',
    {
      className:
        'w-full bg-white flex flex-col md:flex-row relative overflow-hidden ' +
        (!hideHeader ? 'rounded-[40px] shadow-2xl' : '')
    },

    /* CLOSE BUTTON */
    !hideHeader && onClose
      ? React.createElement(
          'div',
          { className: 'absolute top-6 right-6 z-20' },
          React.createElement(
            'button',
            {
              onClick: onClose,
              className:
                'p-3 rounded-2xl bg-white border shadow-sm text-slate-500'
            },
            React.createElement(X, { className: 'w-6 h-6' })
          )
        )
      : null,

    /* LEFT PANEL */
    React.createElement(
      'div',
      {
        className:
          'w-full md:w-80 bg-slate-900 text-white p-8 flex flex-col shrink-0'
      },

      React.createElement(
        'div',
        { className: 'mb-10' },
        React.createElement(
          'div',
          {
            className:
              'w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mb-6'
          },
          React.createElement(Activity, { className: 'w-8 h-8 text-white' })
        ),
        React.createElement(
          'h1',
          {
            className:
              'text-3xl font-black uppercase leading-tight tracking-tight'
          },
          'OSP Survey ',
          React.createElement('br'),
          'Engine ',
          React.createElement('span', { className: 'text-indigo-400' }, 'Pro')
        )
      ),

      /* IDENTITY */
      React.createElement(
        'div',
        { className: 'space-y-6' },

        React.createElement(
          'div',
          { className: 'flex items-center gap-4' },
          React.createElement(UserCheck, {
            className: 'w-6 h-6 text-indigo-400'
          }),
          React.createElement(
            'div',
            null,
            React.createElement(
              'div',
              { className: 'text-xs font-black uppercase' },
              'Engr. John Carlo Rabanes'
            ),
            React.createElement(
              'div',
              { className: 'text-[10px] text-white/50' },
              'Senior Architect'
            )
          )
        ),

        React.createElement(
          'div',
          { className: 'flex items-center gap-4' },
          React.createElement(Phone, {
            className: 'w-6 h-6 text-emerald-400'
          }),
          React.createElement(
            'div',
            { className: 'text-xs font-black' },
            '09669343065'
          )
        )
      ),

      /* DEVICE + STORAGE */
      React.createElement(
        'div',
        {
          className:
            'mt-10 bg-white/5 rounded-2xl p-6 border border-white/10 space-y-4'
        },

        React.createElement(
          'div',
          { className: 'flex items-center gap-3' },
          React.createElement(Fingerprint, {
            className: 'w-5 h-5 text-indigo-400'
          }),
          React.createElement(
            'div',
            null,
            React.createElement(
              'div',
              { className: 'text-[9px] uppercase text-white/40' },
              'Device ID'
            ),
            React.createElement(
              'div',
              { className: 'text-xs font-mono text-indigo-200' },
              deviceId
            )
          )
        ),

        React.createElement(
          'div',
          { className: 'pt-4' },
          React.createElement(
            'div',
            {
              className:
                'flex items-center justify-between text-[10px] uppercase'
            },
            React.createElement(
              'span',
              null,
              'Storage'
            ),
            React.createElement(
              'span',
              { className: 'text-indigo-300' },
              usedGB,
              ' / ',
              quotaGB,
              ' GB'
            )
          ),
          React.createElement(
            'div',
            {
              className:
                'w-full h-1.5 bg-white/10 rounded-full overflow-hidden mt-2'
            },
            React.createElement('div', {
              className: 'h-full bg-indigo-500',
              style: { width: percent + '%' }
            })
          )
        )
      )
    ),

    /* RIGHT PANEL */
    React.createElement(
      'div',
      {
        className:
          'flex-1 bg-white p-8 overflow-y-auto'
      },

      React.createElement(
        'section',
        { className: 'mb-12' },
        React.createElement(
          'h2',
          {
            className:
              'text-2xl font-black text-slate-900 mb-4'
          },
          'Enterprise Storage. Offline Field Surveys.'
        ),
        React.createElement(
          'p',
          { className: 'text-slate-600 text-sm leading-relaxed' },
          'OSP Survey Pro is designed for large offline field operations with secure local storage, GPS mapping, and evidence-grade photo handling.'
        )
      ),

      React.createElement(
        'section',
        { className: 'grid md:grid-cols-2 gap-10' },

        feature(Camera, 'Optimized Capture'),
        feature(HardDrive, '5GB+ Local Vault'),
        feature(ClipboardCheck, 'QA Workflow'),
        feature(WifiOff, 'Offline First')
      )
    )
  );
}

/* SMALL HELPER */
function feature(Icon, title) {
  return React.createElement(
    'div',
    null,
    React.createElement(
      'div',
      {
        className:
          'w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mb-3'
      },
      React.createElement(Icon, { className: 'w-6 h-6 text-slate-700' })
    ),
    React.createElement(
      'div',
      {
        className:
          'text-sm font-black uppercase tracking-widest text-slate-900'
      },
      title
    )
  );
}
