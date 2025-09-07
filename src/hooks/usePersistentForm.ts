import { useEffect, useState } from "react";

export function usePersistentForm<T>(key: string, initial: T) {
  const [state, setState] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initial; // Return initial state if not in browser environment
    }
    const saved = sessionStorage.getItem(key); // Changed to sessionStorage
    try {
      return saved ? JSON.parse(saved) : initial;
    } catch (e) {
      console.error(`Error parsing persisted form state for key "${key}":`, e);
      sessionStorage.removeItem(key); // Clear corrupted data
      return initial;
    }
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(key, JSON.stringify(state)); // Changed to sessionStorage
    }
  }, [key, state]);

  return [state, setState] as const;
}