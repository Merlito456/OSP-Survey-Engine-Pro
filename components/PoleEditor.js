import React from 'react';

export function PoleEditor({ pole, onClose, onDelete }) {
  return React.createElement(
    'div',
    {
      style: {
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: '#ffffff',
        padding: 16,
        fontFamily: 'sans-serif'
      }
    },

    // Header
    React.createElement(
      'div',
      {
        style: {
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12
        }
      },
      React.createElement(
        'strong',
        null,
        'Pole Editor (stub)'
      ),
      React.createElement(
        'button',
        { onClick: onClose },
        'Close'
      )
    ),

    // Content
    React.createElement(
      'div',
      {
        style: {
          flex: 1,
          background: '#f1f5f9',
          borderRadius: 8,
          padding: 12,
          fontSize: 12,
          color: '#334155'
        }
      },
      pole
        ? `Editing pole: ${pole.name || pole.id}`
        : 'No pole selected'
    ),

    // Footer
    React.createElement(
      'button',
      {
        onClick: onDelete,
        style: {
          marginTop: 12,
          padding: 10,
          background: '#dc2626',
          color: 'white',
          border: 'none',
          borderRadius: 6,
          fontWeight: 700
        }
      },
      'Delete Pole (stub)'
    )
  );
}
