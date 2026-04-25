import React from 'react';

export default function EventResolutionModal() {
  return (
    <div className="panel panel--glow" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '600px', maxWidth: '90vw', padding: 'var(--space-lg)', zIndex: 100 }}>
      <h2 style={{ color: 'var(--color-alert-amber)', marginTop: 0 }}>NARRATIVE EVENT</h2>
      <p style={{ color: 'var(--color-text-secondary)' }}>Event resolution logic will go here.</p>
    </div>
  );
}
