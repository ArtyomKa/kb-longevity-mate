import type { WorkoutLog } from "./kb-types";
import { startOfWeek } from "./kb-export";

export const dayKey = (d: Date | string) => {
  const date = typeof d === "string" ? new Date(d) : d;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
};

export function logsByDay(logs: WorkoutLog[]) {
  const map = new Map<string, WorkoutLog[]>();
  for (const log of logs) {
    const key = dayKey(log.dateISO);
    const list = map.get(key);
    if (list) list.push(log);
    else map.set(key, [log]);
  }
  return map;
}

export function totalReps(log: WorkoutLog) {
  return log.entries.reduce((sum, e) => sum + (e.repsDone ?? []).reduce((s, r) => s + r, 0), 0);
}

export function sessionsInMonth(logs: WorkoutLog[], month: Date) {
  return logs.filter((l) => {
    const d = new Date(l.dateISO);
    return d.getFullYear() === month.getFullYear() && d.getMonth() === month.getMonth();
  }).length;
}

/** Consecutive weeks (ending with the current or previous week) that contain a session. */
export function weekStreak(logs: WorkoutLog[], ref = new Date()) {
  if (logs.length === 0) return 0;
  const weeks = new Set(logs.map((l) => startOfWeek(new Date(l.dateISO)).getTime()));
  const cursor = startOfWeek(ref);
  if (!weeks.has(cursor.getTime())) cursor.setDate(cursor.getDate() - 7);
  let streak = 0;
  while (weeks.has(cursor.getTime())) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 7);
  }
  return streak;
}

export interface ExercisePoint {
  dateISO: string;
  label: string;
  volume: number;
  topWeight: number;
  totalReps: number;
  avgReps: number;
  sets: number;
}

const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });

/** Chronological series for one exercise name, skipping sessions with no reps recorded. */
export function exerciseSeries(logs: WorkoutLog[], name: string): ExercisePoint[] {
  return logs
    .slice()
    .sort((a, b) => a.dateISO.localeCompare(b.dateISO))
    .flatMap((log) => {
      const entries = log.entries.filter((e) => e.exerciseName === name);
      if (entries.length === 0) return [];
      const reps = entries.flatMap((e) => e.repsDone ?? []);
      if (reps.length === 0) return [];
      const total = reps.reduce((s, r) => s + r, 0);
      const weight = Math.max(0, ...entries.map((e) => e.weightKg ?? 0));
      return [
        {
          dateISO: log.dateISO,
          label: shortDate(log.dateISO),
          volume: weight > 0 ? total * weight : total,
          topWeight: weight,
          totalReps: total,
          avgReps: Math.round((total / reps.length) * 10) / 10,
          sets: reps.length,
        },
      ];
    });
}

export interface ExerciseOption {
  name: string;
  sessions: number;
  lastISO: string;
  hasWeight: boolean;
}

/** Exercises with at least two sessions of recorded reps, most recently trained first. */
export function exerciseOptions(logs: WorkoutLog[]): ExerciseOption[] {
  const map = new Map<string, ExerciseOption>();
  for (const log of logs) {
    for (const e of log.entries) {
      if (!(e.repsDone ?? []).length) continue;
      const prev = map.get(e.exerciseName);
      map.set(e.exerciseName, {
        name: e.exerciseName,
        sessions: (prev?.sessions ?? 0) + 1,
        lastISO: prev && prev.lastISO > log.dateISO ? prev.lastISO : log.dateISO,
        hasWeight: (prev?.hasWeight ?? false) || !!e.weightKg,
      });
    }
  }
  return [...map.values()]
    .filter((o) => o.sessions >= 2)
    .sort((a, b) => b.lastISO.localeCompare(a.lastISO));
}

export function pctChange(from: number, to: number) {
  if (!from) return null;
  return Math.round(((to - from) / from) * 100);
}

/** Last point of the series four or more weeks before the latest one. */
export function pointFourWeeksBack(series: ExercisePoint[]) {
  if (series.length < 2) return null;
  const latest = new Date(series[series.length - 1]!.dateISO).getTime();
  const cutoff = latest - 28 * 24 * 60 * 60 * 1000;
  const older = series.filter((p) => new Date(p.dateISO).getTime() <= cutoff);
  return older.length ? older[older.length - 1]! : null;
}

export function energySeries(logs: WorkoutLog[], count = 12) {
  return logs
    .slice()
    .sort((a, b) => a.dateISO.localeCompare(b.dateISO))
    .slice(-count)
    .map((l) => ({ label: shortDate(l.dateISO), energy: l.biofeedback.energy }));
}

export function weeklyCounts(logs: WorkoutLog[], weeks = 8, ref = new Date()) {
  const current = startOfWeek(ref);
  const out: { label: string; sessions: number }[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const start = new Date(current);
    start.setDate(start.getDate() - i * 7);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    const sessions = logs.filter((l) => {
      const t = new Date(l.dateISO).getTime();
      return t >= start.getTime() && t < end.getTime();
    }).length;
    out.push({
      label: start.toLocaleDateString(undefined, { month: "numeric", day: "numeric" }),
      sessions,
    });
  }
  return out;
}
