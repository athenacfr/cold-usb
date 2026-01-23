import { useEffect, useRef, useCallback } from 'react';
import { useWalletStore } from '../store/walletStore';

const AUTO_LOCK_TIMEOUT = 5 * 60 * 1000; // 5 minutes in milliseconds

export const useAutoLock = () => {
  const { isLocked, lockWallet } = useWalletStore();
  const timeoutRef = useRef<number | null>(null);

  const resetTimer = useCallback(() => {
    // Clear existing timeout
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
    }

    // Only set new timeout if wallet is unlocked
    if (!isLocked) {
      timeoutRef.current = window.setTimeout(async () => {
        try {
          await lockWallet();
        } catch (err) {
          console.error('Auto-lock failed:', err);
        }
      }, AUTO_LOCK_TIMEOUT);
    }
  }, [isLocked, lockWallet]);

  useEffect(() => {
    // Don't set up listeners if wallet is locked
    if (isLocked) {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      return;
    }

    // Activity events to track
    const events = ['mousedown', 'keydown', 'touchstart', 'mousemove', 'scroll'];

    // Throttle the reset to avoid excessive calls
    let lastReset = 0;
    const throttledReset = () => {
      const now = Date.now();
      if (now - lastReset > 1000) { // Only reset once per second max
        lastReset = now;
        resetTimer();
      }
    };

    // Add event listeners
    events.forEach(event => {
      window.addEventListener(event, throttledReset, { passive: true });
    });

    // Initial timer
    resetTimer();

    // Cleanup
    return () => {
      events.forEach(event => {
        window.removeEventListener(event, throttledReset);
      });
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, [isLocked, resetTimer]);

  return { resetTimer };
};
