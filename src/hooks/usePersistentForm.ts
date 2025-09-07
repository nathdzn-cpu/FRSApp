import { useEffect, useState } from "react";

export function usePersistentForm<T>(key: string, initial: T) {
  const [state, setState] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initial; // Return initial state if not in browser environment
    }
    const saved = localStorage.getItem(key);
    try {
      return saved ? JSON.parse(saved) : initial;
    } catch (e) {
      console.error(`Error parsing persisted form state for key "${key}":`, e);
      localStorage.removeItem(key); // Clear corrupted data
      return initial;
    }
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(key, JSON.stringify(state));
    }
  }, [key, state]);

  return [state, setState] as const;
}