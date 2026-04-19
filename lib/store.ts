import { DEFAULT_SETTINGS } from './defaults';
import type { Settings } from './types';

const SETTINGS_KEY = 'twinmind_settings';

export function loadSettings(): Settings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<Settings>;
    // Merge with defaults so new fields are always present
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: Settings): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function clearSettings(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(SETTINGS_KEY);
}

// ── External store for useSyncExternalStore ────────────────────────────────
// Keeps a module-level cache so every subscriber sees the same reference.
let _cached: Settings | null = null;
const _listeners = new Set<() => void>();

export function subscribeSettings(listener: () => void): () => void {
  _listeners.add(listener);
  return () => _listeners.delete(listener);
}

/** Client snapshot — reads from localStorage exactly once, then caches. */
export function getSettingsSnapshot(): Settings {
  return (_cached ??= loadSettings());
}

/** Server snapshot — always the safe default (no localStorage on server). */
export function getSettingsServerSnapshot(): Settings {
  return DEFAULT_SETTINGS;
}

/** Update settings in the cache, persist to localStorage, and notify subscribers. */
export function commitSettings(next: Settings): void {
  _cached = next;
  saveSettings(next);
  _listeners.forEach((l) => l());
}
