import React, { useState, useEffect } from 'react';
import { useUIStore } from '../store/useUIStore';
import VolleyBreakdown from './combat/VolleyBreakdown';
import SkillProcResolution from './combat/SkillProcResolution';
import CriticalCardReveal from './combat/CriticalCardReveal';
import FumbleCardReveal from './combat/FumbleCardReveal';

export default function ModalOverlay() {
  const activeModal = useUIStore(s => s.activeModal);
  const modalData = useUIStore(s => s.modalData);
  const hideModal = useUIStore(s => s.hideModal);

  const [visibleModal, setVisibleModal] = useState<typeof activeModal>(null);
  const [visibleData, setVisibleData] = useState<typeof modalData>(null);
  const [isDelaying, setIsDelaying] = useState(false);

  useEffect(() => {
    // Only delay combat modals so animations have time to play
    if (activeModal === 'volley' || activeModal === 'critical' || activeModal === 'skill-proc' || activeModal === 'fumble') {
      setIsDelaying(true);
      
      if (activeModal === 'volley' && modalData?.fireAnimation) {
        useUIStore.getState().queueFireAnimation(modalData.fireAnimation as import('../types/game').WeaponFireEvent);
      }

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
      {visibleModal === 'volley' && visibleData && (visibleData as any).results && (
        <VolleyBreakdown 
          results={(visibleData as any).results as any}
          weaponName={(visibleData as any).weaponName as string}
          attackerId={(visibleData as any).attackerId as string}
          onClose={hideModal} 
        />
      )}

      {visibleModal === 'skill-proc' && visibleData && (visibleData as any).data && (
        <SkillProcResolution
          data={(visibleData as any).data as any}
          onClose={hideModal}
        />
      )}
      
      {/* Critical Modal */}
      {visibleModal === 'critical' && visibleData && (visibleData as any).card && (
        <CriticalCardReveal
          card={(visibleData as any).card}
          onAcknowledge={hideModal}
        />
      )}
      
      {/* Fumble Modal */}
      {visibleModal === 'fumble' && visibleData && (visibleData as any).card && (
        <FumbleCardReveal
          card={(visibleData as any).card}
          onAcknowledge={hideModal}
        />
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
