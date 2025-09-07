import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

export function useEphemeralForm<T>(key: string, initial: T) {
  const location = useLocation();
  const [state, setState] = useState<T>(() => {
    // Check if window is defined to prevent SSR issues
    if (typeof window === 'undefined') {
      return initial;
    }
    const saved = sessionStorage.getItem(key);
    try {
      return saved ? JSON.parse(saved) : initial;
    } catch (e) {
      console.error(`Error parsing ephemeral form state for key "${key}":`, e);
      sessionStorage.removeItem(key); // Clear corrupted data
      return initial;
    }
  });

  useEffect(() => {
    // Only persist if in a browser environment
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(key, JSON.stringify(state));
    }
  }, [key, state]);

  // Clear form state when leaving the page (pathname changes)
  useEffect(() => {
    return () => {
      sessionStorage.removeItem(key);
    };
  }, [location.pathname, key]);

  return [state, setState] as const;
}