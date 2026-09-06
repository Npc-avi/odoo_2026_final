import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * useThrottle hook
 * Throttles a value, ensuring it only updates at most once every `interval` milliseconds.
 */
export function useThrottle<T>(value: T, interval: number = 500): T {
  const [throttledValue, setThrottledValue] = useState<T>(value);
  const lastExecuted = useRef<number>(Date.now());

  useEffect(() => {
    if (Date.now() >= lastExecuted.current + interval) {
      lastExecuted.current = Date.now();
      setThrottledValue(value);
    } else {
      const timerId = setTimeout(() => {
        lastExecuted.current = Date.now();
        setThrottledValue(value);
      }, interval);

      return () => clearTimeout(timerId);
    }
  }, [value, interval]);

  return throttledValue;
}

/**
 * useThrottledCallback hook
 * Returns a throttled function that only invokes `callback` at most once per every `interval` ms.
 * Perfect for button clicks like "Pay Now", "Confirm Quotation", and "Submit" to prevent duplicate actions.
 */
export function useThrottledCallback<T extends (...args: any[]) => any>(
  callback: T,
  interval: number = 800
): (...args: Parameters<T>) => void {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;
  const lastRun = useRef<number>(0);

  return useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now();
      if (now - lastRun.current >= interval) {
        lastRun.current = now;
        callbackRef.current(...args);
      }
    },
    [interval]
  );
}

export default useThrottle;
