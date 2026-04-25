import React from 'react';
import { useUIStore } from '../store/useUIStore';
import VolleyBreakdown from './combat/VolleyBreakdown';
import SkillProcResolution from './combat/SkillProcResolution';

export default function ModalOverlay() {
  const activeModal = useUIStore(s => s.activeModal);
  const modalData = useUIStore(s => s.modalData);
  const hideModal = useUIStore(s => s.hideModal);

  if (!activeModal) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.7)',
      zIndex: 999,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center'
    }}>
      {activeModal === 'volley' && modalData && modalData.results && (
        <VolleyBreakdown 
          results={modalData.results as any}
          weaponName={modalData.weaponName as string}
          attackerId={modalData.attackerId as string}
          onClose={hideModal} 
        />
      )}

      {activeModal === 'skill-proc' && modalData && modalData.data && (
        <SkillProcResolution
          data={modalData.data as any}
          onClose={hideModal}
        />
      )}
      
      {/* Fumble Modal */}
      {activeModal === 'fumble' && modalData && modalData.card && (
        <div className="panel panel--danger" style={{ width: '400px', maxWidth: '90vw', padding: 'var(--space-md)', textAlign: 'center' }}>
          <div className="label" style={{ color: 'var(--color-hostile-red)', marginBottom: 'var(--space-md)' }}>OFFICER FUMBLE</div>
          <h2 style={{ color: 'var(--color-text-bright)', marginBottom: 'var(--space-sm)' }}>{(modalData.card as any).name}</h2>
          <div style={{ fontStyle: 'italic', fontSize: '0.85rem', marginBottom: 'var(--space-md)', color: 'var(--color-text-dim)' }}>
            "{(modalData.card as any).flavorText}"
          </div>
          <div style={{ padding: '8px', background: 'rgba(255,50,50,0.1)', border: '1px solid var(--color-hostile-red)', marginBottom: 'var(--space-md)' }}>
            {(modalData.card as any).effect}
          </div>
          <button className="btn btn--execute" style={{ width: '100%' }} onClick={hideModal}>ACKNOWLEDGE</button>
        </div>
      )}
      
      {/* Other modals (tactic, etc) would go here */}
      
      {/* If there is a close button needed outside of the modal components, add it here.
          But for now, VolleyBreakdown closes itself or we provide a backdrop click to close. */}
      {activeModal === 'volley' && (
        <div style={{ position: 'absolute', top: 20, right: 20 }}>
          <button className="btn" onClick={hideModal}>CLOSE SYSTEM LOG</button>
        </div>
      )}
    </div>
  );
}
