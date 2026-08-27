import { useCallback, useEffect, useState } from "react";
import {
  DEFAULT_SETTINGS,
  DEFAULT_TEMPLATES,
  type Settings,
  type Template,
  type WorkoutLog,
} from "./kb-types";

const KEYS = {
  templates: "kbl.templates.v1",
  logs: "kbl.logs.v1",
  settings: "kbl.settings.v1",
  session: "kbl.session.v1",
};

export interface SessionProgress {
  completed: number;
  skipped: number;
  rpe: number | null;
  weightKg: number | null;
  repsDone: number[];
  repInput: number;
  /** extra sets added on top of the template during this session */
  extraSets?: number;
}


export interface ActiveSession {
  templateId: string;
  startedAt: number;
  index: number;
  progress: Record<string, SessionProgress>;
}


function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function usePersisted<T>(key: string, fallback: T) {
  const [value, setValue] = useState<T>(fallback);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setValue(read<T>(key, fallback));
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const update = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const resolved = typeof next === "function" ? (next as (p: T) => T)(prev) : next;
        try {
          window.localStorage.setItem(key, JSON.stringify(resolved));
        } catch {
          /* ignore quota errors */
        }
        return resolved;
      });
    },
    [key],
  );

  return [value, update, hydrated] as const;
}

export const useTemplates = () => usePersisted<Template[]>(KEYS.templates, DEFAULT_TEMPLATES);
export const useLogs = () => usePersisted<WorkoutLog[]>(KEYS.logs, []);
export const useSettings = () => usePersisted<Settings>(KEYS.settings, DEFAULT_SETTINGS);
export const useSession = () => usePersisted<ActiveSession | null>(KEYS.session, null);

