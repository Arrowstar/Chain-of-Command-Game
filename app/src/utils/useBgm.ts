import { useEffect, useRef } from 'react';
import { useSettingsStore } from '../store/useSettingsStore';

/**
 * Plays a looping background music track while the component is mounted.
 *
 * Handles the browser autoplay policy by listening for the first user
 * interaction (click or keydown) and retrying playback at that point.
 *
 * @param src - Public URL of the audio file (e.g. '/assets/music/foo.mp3')
 * @param _volume - Legacy parameter (ignored, volume is now controlled by useSettingsStore)
 */
export function useBgm(src: string, _volume = 0.15): void {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playedRef = useRef(false);
  const musicVolume = useSettingsStore(s => s.musicVolume);

  // Initialize and handle playback logic
  useEffect(() => {
    const audio = new Audio(src);
    audio.loop = true;
    audio.volume = musicVolume; // Use store volume immediately
    audioRef.current = audio;
    playedRef.current = false;

    const attemptPlay = () => {
      if (!audioRef.current) return;
      const promise = audioRef.current.play();
      if (promise !== undefined) {
        promise.then(() => {
          playedRef.current = true;
        }).catch(() => {
          // Still blocked — will be retried on next interaction
        });
      }
    };

    // Try immediately (succeeds if the user has already interacted)
    attemptPlay();

    // Retry on the first interaction if autoplay was blocked
    const onInteraction = () => {
      if (!playedRef.current) {
        attemptPlay();
      }
    };

    document.addEventListener('click',   onInteraction, { once: true });
    document.addEventListener('keydown', onInteraction, { once: true });

    return () => {
      document.removeEventListener('click',   onInteraction);
      document.removeEventListener('keydown', onInteraction);
      audio.pause();
      audio.src = '';
      audioRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  // Reactively update volume when it changes in the store
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = musicVolume;
    }
  }, [musicVolume]);
}
