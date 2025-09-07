import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

export function useScrollKeeper(scrollRef: React.RefObject<HTMLElement>) {
  const { pathname } = useLocation();

  // Effect to save scroll position
  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;

    const saveScroll = () => {
      sessionStorage.setItem(`scroll-${pathname}`, String(element.scrollTop));
    };

    // Save on unmount or before pathname changes
    return () => {
      saveScroll();
    };
  }, [pathname, scrollRef]); // Re-run when pathname or ref changes

  // Effect to restore scroll position
  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;

    const restoreScroll = () => {
      const saved = sessionStorage.getItem(`scroll-${pathname}`);
      if (saved) {
        element.scrollTo(0, parseInt(saved, 10));
      } else {
        // For new paths, scroll to top
        element.scrollTo(0, 0);
      }
    };

    restoreScroll(); // Restore on mount/pathname change

    // Add event listener for when the window/tab gains focus
    const handleFocus = () => {
      // Only restore if the current pathname is still the same
      if (pathname === window.location.pathname) {
        restoreScroll();
      }
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [pathname, scrollRef]); // Re-run when pathname or ref changes
}