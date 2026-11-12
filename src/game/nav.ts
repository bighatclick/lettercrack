import { type Href, router } from 'expo-router';

/** How long after one navigation a repeat of it is ignored (ms). */
export const NAV_GUARD_MS = 700;

/**
 * Runs an action, then ignores the same action (same key) for `ms`. A quick double tap on a Home
 * card would otherwise push the same screen twice, and Back would land on the copy.
 */
export function makeOnce(now: () => number = Date.now, ms = NAV_GUARD_MS) {
  let lastKey: string | null = null;
  let last = -Infinity;
  return (key: string, action: () => void) => {
    const t = now();
    if (key === lastKey && t - last < ms) return;
    lastKey = key;
    last = t;
    action();
  };
}

const once = makeOnce();

/** `router.push`, but a second tap on the same link right after the first does nothing. */
export function pushOnce(href: Href) {
  once(JSON.stringify(href), () => router.push(href));
}
