import React, { useState, useEffect } from 'react';
import {
  X,
  Key,
  Copy,
  RefreshCw,
  Smartphone,
  Zap,
  ShieldCheck,
  Cpu,
  Database,
  Terminal
} from 'lucide-react';

import { getDeviceId } from '../services/authService.js';

const CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const WEIGHTS = [3, 7, 13, 17, 19, 23];

export function CodeGeneratorPage(props) {
  const onClose = props.onClose;

  const [targetDeviceId, setTargetDeviceId] = useState('');
  const [generatedCodes, setGeneratedCodes] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    getDeviceId().then(setTargetDeviceId);
  }, []);

  function calculateWeightedSum(str) {
    let sum = 0;
    for (let i = 0; i < str.length; i++) {
      const val = CHARS.indexOf(str[i]);
      sum += (val !== -1 ? val : str.charCodeAt(i)) * WEIGHTS[i % WEIGHTS.length];
    }
    return sum;
  }

  function generateValidCode(deviceId) {
    const upper = deviceId.toUpperCase();
    const deviceSum = calculateWeightedSum(upper);

    let codePart = '';
    let partialSum = 0;

    for (let i = 0; i < 5; i++) {
      const idx = Math.floor(Math.random() * CHARS.length);
      codePart += CHARS[idx];
      partialSum += idx * WEIGHTS[i];
    }

    const targetMod = 7;
    const currentMod = (partialSum + deviceSum) % 19;
    const requiredMod = (targetMod - currentMod + 19) % 19;

    const solutions = [];
    for (let i = 0; i < CHARS.length; i++) {
      if ((i * WEIGHTS[5]) % 19 === requiredMod) {
        solutions.push(i);
      }
    }

    if (solutions.length === 0) return null;
    const finalIdx = solutions[Math.floor(Math.random() * solutions.length)];
    return codePart + CHARS[finalIdx];
  }

  function handleGenerateBatch() {
    if (!targetDeviceId || targetDeviceId.length < 4) return;

    setIsGenerating(true);
    setTimeout(() => {
      const batch = [];
      while (batch.length < 3) {
        const code = generateValidCode(targetDeviceId);
        if (code && !batch.includes(code)) batch.push(code);
      }
      setGeneratedCodes(batch);
      setIsGenerating(false);
    }, 600);
  }

  return React.createElement(
    'div',
    { className: 'fixed inset-0 z-[11000] bg-slate-900 flex items-center justify-center p-4' },

    React.createElement(
      'div',
      { className: 'w-full max-w-2xl bg-white rounded-[40px] shadow-2xl overflow-hidden' },

      /* HEADER */
      React.createElement(
        'div',
        { className: 'bg-slate-900 p-8 flex items-center justify-between' },

        React.createElement(
          'div',
          { className: 'flex items-center gap-4' },
          React.createElement(
            'div',
            {
              className:
                'w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center'
            },
            React.createElement(Key, { className: 'w-6 h-6 text-white' })
          ),
          React.createElement(
            'div',
            null,
            React.createElement(
              'div',
              { className: 'text-white font-black uppercase' },
              'Key Management Console'
            ),
            React.createElement(
              'div',
              { className: 'text-[10px] text-slate-400 uppercase' },
              'Authorized Personnel Only'
            )
          )
        ),

        React.createElement(
          'button',
          { onClick: onClose, className: 'text-slate-400 hover:text-white' },
          React.createElement(X, { className: 'w-6 h-6' })
        )
      ),

      /* BODY */
      React.createElement(
        'div',
        { className: 'p-10 space-y-10' },

        React.createElement(
          'div',
          { className: 'grid md:grid-cols-2 gap-8' },

          /* LEFT */
          React.createElement(
            'div',
            { className: 'space-y-6' },

            React.createElement(
              'div',
              null,
              React.createElement(
                'label',
                { className: 'text-[10px] uppercase text-slate-400' },
                'Target Device ID'
              ),
              React.createElement(
                'div',
                { className: 'relative' },
                React.createElement(Smartphone, {
                  className:
                    'absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400'
                }),
                React.createElement('input', {
                  value: targetDeviceId,
                  onChange: e =>
                    setTargetDeviceId(e.target.value.toUpperCase()),
                  className:
                    'w-full bg-slate-100 rounded-2xl py-4 pl-12 pr-4 font-black tracking-widest',
                  placeholder: 'DEVICE-ID'
                })
              )
            ),

            React.createElement(
              'button',
              {
                onClick: handleGenerateBatch,
                disabled: isGenerating || !targetDeviceId,
                className:
                  'w-full px-8 py-5 bg-slate-900 text-white rounded-2xl uppercase font-black flex items-center justify-center gap-3 disabled:opacity-30'
              },
              isGenerating
                ? React.createElement(RefreshCw, {
                    className: 'w-4 h-4 animate-spin'
                  })
                : React.createElement(Zap, {
                    className: 'w-4 h-4 text-amber-300'
                  }),
              'Generate 30-Day Key'
            )
          ),

          /* RIGHT */
          React.createElement(
            'div',
            { className: 'space-y-3' },

            generatedCodes.length === 0
              ? React.createElement(
                  'div',
                  {
                    className:
                      'min-h-[160px] border-2 border-dashed rounded-[32px] flex flex-col items-center justify-center text-slate-300'
                  },
                  React.createElement(Terminal, {
                    className: 'w-8 h-8 mb-2 opacity-50'
                  }),
                  React.createElement(
                    'span',
                    { className: 'text-[9px] uppercase' },
                    'Idle System'
                  )
                )
              : React.createElement(
                  'div',
                  { className: 'space-y-3' },
                  generatedCodes.map((code, i) =>
                    React.createElement(
                      'div',
                      {
                        key: i,
                        className:
                          'flex items-center justify-between p-4 bg-slate-50 rounded-2xl'
                      },
                      React.createElement(
                        'span',
                        { className: 'font-black tracking-widest text-indigo-600' },
                        code
                      ),
                      React.createElement(
                        'button',
                        {
                          onClick: () =>
                            navigator.clipboard.writeText(code)
                        },
                        React.createElement(Copy, { className: 'w-4 h-4' })
                      )
                    )
                  )
                )
          )
        ),

        /* STATS */
        React.createElement(
          'div',
          { className: 'grid grid-cols-3 gap-4' },
          stat(ShieldCheck, 'Secured'),
          stat(Cpu, 'Device-Lock'),
          stat(Database, 'Single-Use')
        )
      )
    )
  );
}

function stat(Icon, label) {
  return React.createElement(
    'div',
    {
      className:
        'bg-slate-50 p-4 rounded-2xl flex flex-col items-center gap-2'
    },
    React.createElement(Icon, { className: 'w-5 h-5 text-slate-400' }),
    React.createElement(
      'span',
      { className: 'text-[8px] uppercase text-slate-500' },
      label
    )
  );
}
