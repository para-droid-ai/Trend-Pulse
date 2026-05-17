import { useEffect } from "react";

const useKeyboardShortcuts = (shortcuts) => {
  useEffect(() => {
    const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;

    const handleKeyDown = (event) => {
      let combo = "";
      if (isMac && event.metaKey) combo += "cmd+";
      if (!isMac && event.ctrlKey) combo += "ctrl+"; // Use 'ctrl+' for non-Mac
      if (event.altKey) combo += "alt+";
      if (event.shiftKey) combo += "shift+";

      // Normalize key to lowercase, except for specific keys like 'ArrowUp', 'Escape'
      let eventKey = event.key.toLowerCase();
      if (event.key.length > 1 && event.key !== "spacebar") {
        // spacebar is sometimes ' '
        eventKey = event.key; // Keep casing for special keys like 'Escape', 'ArrowDown'
      }
      if (eventKey === " ") eventKey = "space"; // Normalize spacebar key

      combo += eventKey;

      // Find matching shortcut, adapting the stored shortcut key for the current OS
      const shortcut = shortcuts.find((s) => {
        let storedKey = s.key;
        if (!isMac) {
          storedKey = storedKey.replace(/cmd\+/g, "ctrl+");
        }
        // Special case for '?' which is often 'shift+/' without explicitly saying shift
        // The combo will produce 'shift+/' if shift+/ is pressed for ?
        // Or, if they define 'cmd+?', the combo will be 'cmd+?' (mac) or 'ctrl+?' (win)
        // We need to ensure comparison is consistent.
        // If combo is 'ctrl+/' and storedKey (after replace) is 'ctrl+?', they should match if event.key was '/'
        // This part can get tricky if keys are defined differently than how they are produced.
        // For now, let's assume definitions are consistent with `event.key`
        return storedKey === combo;
      });

      if (shortcut) {
        event.preventDefault();
        shortcut.action();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [shortcuts]);
};

export default useKeyboardShortcuts;
