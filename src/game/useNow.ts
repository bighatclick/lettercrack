import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { type LocalDate, toLocalDate } from '@/engine/daily';

/**
 * Re-renders when the app returns to the foreground and at the start of every hour, so screens
 * that read the clock (greeting, today's daily, goals, free hints) never show a stale day or hour.
 * Returns the current time in ms.
 */
export function useNow(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') setNow(Date.now());
    });
    return () => sub.remove();
  }, []);
  useEffect(() => {
    const d = new Date(now);
    const nextHour = new Date(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours() + 1, 0, 1).getTime();
    const id = setTimeout(() => setNow(Date.now()), Math.max(1000, nextHour - Date.now()));
    return () => clearTimeout(id);
  }, [now]);
  return now;
}

/**
 * Today's local date, kept current like `useNow`. Use this rather than `today()` during render:
 * the React Compiler memoizes a call with no inputs, so `today()` alone can stay on yesterday.
 */
export function useToday(): LocalDate {
  return toLocalDate(new Date(useNow()));
}
