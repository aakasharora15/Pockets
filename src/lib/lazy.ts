import { lazy, type ComponentType } from 'react';

/**
 * A screen loaded on first use rather than at start-up. Returns the component and a preload
 * function, so likely next screens (the tabs) can be fetched while the phone is idle.
 */
export function lazyScreen<M, K extends keyof M>(load: () => Promise<M>, name: K) {
  let pending: Promise<M> | null = null;
  const fetch = () => (pending ??= load());
  const Component = lazy(() => fetch().then((m) => ({ default: m[name] as ComponentType<any> })));
  return Object.assign(Component, { preload: fetch });
}
