import { useState, useEffect } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';

export const useWindowFocus = () => {
  const [isFocused, setIsFocused] = useState(true);

  useEffect(() => {
    const appWindow = getCurrentWindow();
    let unlisten: (() => void) | null = null;

    const setupListeners = async () => {
      // Listen for focus events
      const unlistenFocus = await appWindow.onFocusChanged(({ payload: focused }) => {
        setIsFocused(focused);
      });

      unlisten = unlistenFocus;
    };

    setupListeners();

    // Also listen to browser visibility API as fallback
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setIsFocused(false);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (unlisten) {
        unlisten();
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return isFocused;
};
