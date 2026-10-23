/* oxlint-disable react/only-export-components -- Navigation context and its hooks share this module. */
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode, type SetStateAction } from 'react';

type Values = Record<string, unknown>;
type Entry = { route: Values; scroll: number };
interface Navigation {
  route: Values;
  cache: Values;
  set: (key: string, value: SetStateAction<unknown>, initial: unknown, track: boolean) => void;
  back: () => void;
  canBack: boolean;
}
const Context = createContext<Navigation | null>(null);
const same = (a: Values, b: Values) => Object.keys(a).length === Object.keys(b).length &&
  Object.keys(a).every(key => JSON.stringify(a[key]) === JSON.stringify(b[key]));

// One navigation transaction per event. Data and drafts stay in memory when a view unmounts.
export function NavigationProvider({ children }: { children: ReactNode }) {
  const [session] = useState(() => crypto.randomUUID());
  const entries = useRef<Entry[]>([{ route: {}, scroll: 0 }]);
  const cursor = useRef(0);
  const latest = useRef({ route: {} as Values, cache: {} as Values });
  const queued = useRef(false);
  const [snapshot, setSnapshot] = useState({ route: {} as Values, cache: {} as Values });
  const [canBack, setCanBack] = useState(false);

  useEffect(() => {
    window.history.replaceState({ ...window.history.state, teamNote: session, index: 0 }, '');
    const restore = (event: PopStateEvent) => {
      if (event.state?.teamNote !== session) return;
      const entry = entries.current[event.state.index];
      if (!entry) return;
      cursor.current = event.state.index;
      latest.current = { ...latest.current, route: entry.route };
      setSnapshot(latest.current);
      setCanBack(cursor.current > 0);
      requestAnimationFrame(() => window.scrollTo({ top: entry.scroll, behavior: 'instant' }));
    };
    const oldRestoration = window.history.scrollRestoration;
    window.history.scrollRestoration = 'manual';
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && cursor.current > 0 && document.querySelector('[role=dialog]')) {
        event.preventDefault();
        window.history.back();
      }
    };
    window.addEventListener('popstate', restore);
    window.addEventListener('keydown', escape);
    return () => {
      window.removeEventListener('popstate', restore);
      window.removeEventListener('keydown', escape);
      window.history.scrollRestoration = oldRestoration;
    };
  }, [session]);

  const set = useCallback((key: string, action: SetStateAction<unknown>, initial: unknown, track: boolean) => {
    const bucket = track ? 'route' : 'cache';
    const before = latest.current[bucket][key] ?? initial;
    const value = typeof action === 'function' ? action(before) : action;
    const updated = { ...latest.current[bucket] };
    if (track && JSON.stringify(value) === JSON.stringify(initial)) delete updated[key];
    else updated[key] = value;
    latest.current = { ...latest.current, [bucket]: updated };
    if (queued.current) return;
    queued.current = true;
    queueMicrotask(() => {
      queued.current = false;
      const route = latest.current.route;
      const current = entries.current[cursor.current];
      if (!same(route, current.route)) {
        current.scroll = window.scrollY;
        const previous = entries.current[cursor.current - 1];
        if (previous && same(route, previous.route)) {
          window.history.back();
          return;
        }
        entries.current = entries.current.slice(0, cursor.current + 1);
        entries.current.push({ route, scroll: 0 });
        cursor.current += 1;
        window.history.pushState({ teamNote: session, index: cursor.current }, '');
        window.scrollTo({ top: 0, behavior: 'instant' });
      }
      setSnapshot(latest.current);
      setCanBack(cursor.current > 0);
    });
  }, [session]);

  const back = useCallback(() => { if (cursor.current > 0) window.history.back(); }, []);
  return <Context.Provider value={{ ...snapshot, set, back, canBack }}>{children}</Context.Provider>;
}

export function useNavigation() {
  const value = useContext(Context);
  if (!value) throw new Error('NavigationProvider is required');
  return value;
}

export function useScreenState<T,>(key: string, initial: T | (() => T), track = true): [T, (value: SetStateAction<T>) => void] {
  const nav = useNavigation();
  const [fallback] = useState(initial);
  const value = ((track ? nav.route : nav.cache)[key] ?? fallback) as T;
  return [value, (action) => nav.set(key, action as SetStateAction<unknown>, fallback, track)];
}
