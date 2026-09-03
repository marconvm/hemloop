'use client';

import { useCallback, useSyncExternalStore } from 'react';

const TAB_EVENT = 'hemloop-surface-tab';

function subscribe(onStoreChange: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const onPop = () => onStoreChange();
  window.addEventListener('popstate', onPop);
  window.addEventListener(TAB_EVENT, onPop);
  return () => {
    window.removeEventListener('popstate', onPop);
    window.removeEventListener(TAB_EVENT, onPop);
  };
}

function readTab<T extends string>(tabs: readonly T[], fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  const value = new URLSearchParams(window.location.search).get('tab');
  return value && (tabs as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
}

/** URL-backed tab state for a surface. Tools register once per page; call
 * `setTab` from a tool handler to reveal the panel that changed. */
export function useSurfaceTab<T extends string>(
  tabs: readonly T[],
  fallback: T,
): [T, (next: T) => void] {
  const tab = useSyncExternalStore(
    subscribe,
    () => readTab(tabs, fallback),
    () => fallback,
  );

  const setTab = useCallback(
    (next: T) => {
      if (typeof window === 'undefined') return;
      const url = new URL(window.location.href);
      if (next === fallback) url.searchParams.delete('tab');
      else url.searchParams.set('tab', next);
      const nextUrl = `${url.pathname}${url.search}${url.hash}`;
      if (`${window.location.pathname}${window.location.search}${window.location.hash}` === nextUrl) {
        return;
      }
      window.history.replaceState({}, '', nextUrl);
      window.dispatchEvent(new Event(TAB_EVENT));
    },
    [fallback],
  );

  return [tab, setTab];
}
