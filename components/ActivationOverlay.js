import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Zap,
  Key,
  CheckCircle2,
  Smartphone,
  Phone,
  ShieldCheck,
  Settings,
  Lock,
  ArrowRight,
  X,
  ChevronLeft
} from 'lucide-react';

import {
  activateSubscription,
  getDeviceId
} from '../services/authService.js';

export function ActivationOverlay(props) {
  const onActivated = props.onActivated;
  const onOpenGenerator = props.onOpenGenerator;
  const onClose = props.onClose;

  const [code, setCode] = useState('');
  const [errorStatus, setErrorStatus] = useState(null);
  const [success, setSuccess] = useState(false);
  const [deviceId, setDeviceId] = useState('');

  const [showAdminGate, setShowAdminGate] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [adminError, setAdminError] = useState(false);

  useEffect(() => {
    getDeviceId().then(setDeviceId);
  }, []);

  async function handleActivate() {
    const result = await activateSubscription(code);
    if (result === 'SUCCESS') {
      setSuccess(true);
      setErrorStatus(null);
      setTimeout(() => onActivated && onActivated(), 1500);
    } else {
      setErrorStatus(result);
      setSuccess(false);
    }
  }

  function handleAdminAuth(e) {
    e.preventDefault();
    if (adminPassword === '07141994') {
      setAdminError(false);
      setShowAdminGate(false);
      setAdminPassword('');
      onOpenGenerator && onOpenGenerator();
    } else {
      setAdminError(true);
      setTimeout(() => setAdminError(false), 2000);
    }
  }

  return React.createElement(
    'div',
    {
      className:
        'fixed inset-0 z-[9000] bg-slate-900/80 backdrop-blur-xl overflow-y-auto'
    },

    React.createElement(
      'div',
      {
        className:
          'min-h-full flex flex-col items-center p-4 sm:p-8 space-y-16 pb-32'
      },

      /* CARD */
      React.createElement(
        'div',
        {
          className:
            'w-full max-w-md bg-white rounded-[40px] shadow-2xl overflow-hidden relative'
        },

        /* CLOSE */
        onClose
          ? React.createElement(
              'button',
              {
                onClick: onClose,
                className:
                  'absolute top-6 right-6 z-10 p-3 bg-slate-100 rounded-full'
              },
              React.createElement(X, { className: 'w-5 h-5' })
            )
          : null,

        /* ADMIN GATE */
        showAdminGate
          ? React.createElement(
              'div',
              {
                className:
                  'absolute inset-0 z-50 bg-slate-900 flex flex-col items-center justify-center p-8'
              },

              React.createElement(
                'button',
                {
                  onClick: () => setShowAdminGate(false),
                  className: 'absolute top-6 right-6 text-white'
                },
                React.createElement(X, { className: 'w-6 h-6' })
              ),

              React.createElement(
                'div',
                {
                  className:
                    'w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mb-6'
                },
                React.createElement(Lock, {
                  className: 'w-8 h-8 text-indigo-400'
                })
              ),

              React.createElement(
                'form',
                { onSubmit: handleAdminAuth, className: 'w-full space-y-4' },

                React.createElement('input', {
                  type: 'password',
                  value: adminPassword,
                  onChange: e => setAdminPassword(e.target.value),
                  placeholder: 'ENTER ACCESS KEY',
                  className:
                    'w-full p-4 rounded-2xl text-center bg-white/10 text-white'
                }),

                React.createElement(
                  'button',
                  {
                    type: 'submit',
                    className:
                      'w-full bg-indigo-600 text-white p-4 rounded-2xl font-black flex items-center justify-center gap-2'
                  },
                  'Authenticate ',
                  React.createElement(ArrowRight, { className: 'w-4 h-4' })
                )
              )
            )
          : null,

        /* HEADER */
        React.createElement(
          'div',
          {
            className: 'bg-slate-900 p-10 text-center border-b'
          },
          React.createElement(
            'div',
            {
              className:
                'w-20 h-20 bg-indigo-600 rounded-[30px] mx-auto flex items-center justify-center mb-6'
            },
            success
              ? React.createElement(CheckCircle2, {
                  className: 'w-10 h-10 text-white'
                })
              : React.createElement(ShieldAlert, {
                  className: 'w-10 h-10 text-white'
                })
          ),
          React.createElement(
            'h2',
            { className: 'text-2xl font-black text-white uppercase' },
            'Sync Activation'
          )
        ),

        /* BODY */
        React.createElement(
          'div',
          { className: 'p-10 space-y-8' },

          React.createElement('input', {
            type: 'text',
            maxLength: 6,
            value: code,
            onChange: e => {
              setCode(
                e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '')
              );
              setErrorStatus(null);
            },
            placeholder: 'XXXXXX',
            className:
              'w-full p-6 text-center text-3xl font-black tracking-widest rounded-3xl border'
          }),

          React.createElement(
            'div',
            {
              className:
                'bg-indigo-50 p-5 rounded-2xl flex items-center justify-between'
            },
            React.createElement(
              'span',
              { className: 'text-xs font-black' },
              'Device ID'
            ),
            React.createElement(
              'span',
              { className: 'text-xs font-mono' },
              deviceId
            )
          ),

          React.createElement(
            'button',
            {
              onClick: handleActivate,
              disabled: code.length !== 6 || success,
              className:
                'w-full p-6 rounded-3xl bg-slate-900 text-white font-black'
            },
            success ? 'Verified' : 'Unlock Project Sync',
            !success
              ? React.createElement(Zap, {
                  className: 'w-4 h-4 inline ml-2'
                })
              : null
          )
        ),

        /* FOOTER */
        React.createElement(
          'div',
          {
            className:
              'bg-slate-50 p-6 border-t flex items-center justify-between'
          },
          React.createElement(
            'div',
            { className: 'flex items-center gap-2' },
            React.createElement(ShieldCheck, {
              className: 'w-3 h-3 text-emerald-500'
            }),
            React.createElement(
              'span',
              { className: 'text-[8px] font-black uppercase' },
              'Secured Enterprise App'
            )
          ),
          React.createElement(
            'button',
            {
              onClick: () => setShowAdminGate(true),
              className: 'flex items-center gap-2 text-slate-400'
            },
            React.createElement(Settings, {
              className: 'w-3 h-3'
            }),
            React.createElement(
              'span',
              { className: 'text-[8px] font-black uppercase' },
              'Admin'
            )
          )
        )
      )
    )
  );
}
