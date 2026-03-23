import { useState, useEffect } from 'react';
import { logger } from '../services/logger';

export function useLocalStorage<T>(key: string, initialValue: T) {
  const isGuest = sessionStorage.getItem('ai-medica-guest-mode') === 'true';
  const finalKey = isGuest && key !== 'ai-medica-guest-logs' ? `guest-${key}` : key;

  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(finalKey);
      if (item) {
        return JSON.parse(item);
      }
      return initialValue;
    } catch (error) {
      logger.error(`Error reading localStorage key "${finalKey}":`, error);
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(finalKey, JSON.stringify(storedValue));
    } catch (error) {
      logger.error(`Error writing to localStorage key "${finalKey}":`, error);
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        logger.warn('LocalStorage quota exceeded. Some data might not be saved.');
      }
    }
  }, [finalKey, storedValue]);

  return [storedValue, setStoredValue] as const;
}
