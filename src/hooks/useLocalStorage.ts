import { useState, useEffect } from 'react';
import { logger } from '../services/logger';

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      if (item) {
        return JSON.parse(item);
      }
      return initialValue;
    } catch (error) {
      logger.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(storedValue));
    } catch (error) {
      logger.error(`Error writing to localStorage key "${key}":`, error);
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        logger.warn('LocalStorage quota exceeded. Some data might not be saved.');
      }
    }
  }, [key, storedValue]);

  return [storedValue, setStoredValue] as const;
}
