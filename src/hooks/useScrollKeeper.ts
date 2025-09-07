import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export function useScrollKeeper() {
  const { pathname } = useLocation();

  useEffect(() => {
    // Save scroll on unmount (or when pathname changes)
    const y = window.scrollY;
    return () => {
      sessionStorage.setItem(`scroll-${pathname}`, String(y));
    };
  }, [pathname]);

  useEffect(() => {
    // Restore scroll on mount (or when pathname changes)
    const saved = sessionStorage.getItem(`scroll-${pathname}`);
    if (saved) {
      window.scrollTo(0, parseInt(saved, 10));
    }
  }, [pathname]);
}