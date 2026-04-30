import React, { useState, useEffect } from 'react';
import { useUIStore } from '../store/useUIStore';
import VolleyBreakdown from './combat/VolleyBreakdown';
import SkillProcResolution from './combat/SkillProcResolution';

export default function ModalOverlay() {
  const activeModal = useUIStore(s => s.activeModal);
  const modalData = useUIStore(s => s.modalData);
  const hideModal = useUIStore(s => s.hideModal);

  const [visibleModal, setVisibleModal] = useState<typeof activeModal>(null);
  const [visibleData, setVisibleData] = useState<typeof modalData>(null);
  const [isDelaying, setIsDelaying] = useState(false);

  useEffect(() => {
    // Only delay combat modals so animations have time to play
    if (activeModal === 'volley' || activeModal === 'critical' || activeModal === 'skill-proc') {
      setIsDelaying(true);
      const timer = setTimeout(() => {
        setIsDelaying(false);
        setVisibleModal(activeModal);
        setVisibleData(modalData);
      }, 750); // 750ms cinematic delay
      return () => clearTimeout(timer);
    } else {
      setIsDelaying(false);
      setVisibleModal(activeModal);
      setVisibleData(modalData);
    }
  }, [activeModal, modalData]);

  const handleSkipDelay = () => {
    if (isDelaying) {
      setIsDelaying(false);
      setVisibleModal(activeModal);
      setVisibleData(modalData);
      // Cancel active animations instantly if they chose to skip the delay
      useUIStore.getState().cancelAllFireAnimations();
    }
  };

  if (isDelaying) {
    // Invisible overlay that catches clicks to skip the delay
    return (
      <div 
        style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, cursor: 'pointer' }}
        onClick={handleSkipDelay}
      />
    );
  }

  if (!visibleModal) return null;

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
      {visibleModal === 'volley' && visibleData && visibleData.results && (
        <VolleyBreakdown 
          results={visibleData.results as any}
          weaponName={visibleData.weaponName as string}
          attackerId={visibleData.attackerId as string}
          onClose={hideModal} 
        />
      )}

      {visibleModal === 'skill-proc' && visibleData && visibleData.data && (
        <SkillProcResolution
          data={visibleData.data as any}
          onClose={hideModal}
        />
      )}
      
      {/* Fumble Modal */}
      {visibleModal === 'fumble' && visibleData && visibleData.card && (
        <div className="panel panel--danger" style={{ width: '400px', maxWidth: '90vw', padding: 'var(--space-md)', textAlign: 'center' }}>
          <div className="label" style={{ color: 'var(--color-hostile-red)', marginBottom: 'var(--space-md)' }}>OFFICER FUMBLE</div>
          <h2 style={{ color: 'var(--color-text-bright)', marginBottom: 'var(--space-sm)' }}>{(visibleData.card as any).name}</h2>
          <div style={{ fontStyle: 'italic', fontSize: '0.85rem', marginBottom: 'var(--space-md)', color: 'var(--color-text-dim)' }}>
            "{(visibleData.card as any).flavorText}"
          </div>
          <div style={{ padding: '8px', background: 'rgba(255,50,50,0.1)', border: '1px solid var(--color-hostile-red)', marginBottom: 'var(--space-md)' }}>
            {(visibleData.card as any).effect}
          </div>
          <button className="btn btn--execute" style={{ width: '100%' }} onClick={hideModal}>ACKNOWLEDGE</button>
        </div>
      )}
      
      {/* If there is a close button needed outside of the modal components, add it here.
          But for now, VolleyBreakdown closes itself or we provide a backdrop click to close. */}
      {visibleModal === 'volley' && (
        <div style={{ position: 'absolute', top: 20, right: 20 }}>
          <button className="btn" onClick={hideModal}>CLOSE SYSTEM LOG</button>
        </div>
      )}
    </div>
  );
}
