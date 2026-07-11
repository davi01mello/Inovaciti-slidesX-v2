import { useEffect } from 'react';

interface HotkeyOptions {
  key: string;
  metaOrCtrl?: boolean;
  onTrigger: (event: KeyboardEvent) => void;
}

/** Registers a single global keyboard shortcut for the lifetime of the component. */
export function useHotkey({ key, metaOrCtrl = false, onTrigger }: HotkeyOptions): void {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const matchesKey = event.key.toLowerCase() === key.toLowerCase();
      const matchesModifier = !metaOrCtrl || event.metaKey || event.ctrlKey;
      if (matchesKey && matchesModifier) {
        onTrigger(event);
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [key, metaOrCtrl, onTrigger]);
}
