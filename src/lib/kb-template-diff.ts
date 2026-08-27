import type { Template } from "./kb-types";
import type { SessionProgress } from "./kb-store";

export interface TemplateChange {
  key: string;
  exerciseId: string;
  field: "weightKg" | "sets" | "reps";
  from: string;
  to: string;
  label: string;
  /** new value to apply */
  value: number | string;
}

function modeOf(nums: number[]): { value: number; count: number } | null {
  if (!nums.length) return null;
  const counts = new Map<number, number>();
  for (const n of nums) counts.set(n, (counts.get(n) ?? 0) + 1);
  let best: { value: number; count: number } | null = null;
  for (const [value, count] of counts) {
    if (!best || count > best.count) best = { value, count };
  }
  return best;
}

export function buildTemplateChanges(
  template: Template,
  progress: Record<string, SessionProgress>,
): TemplateChange[] {
  const changes: TemplateChange[] = [];

  for (const e of template.exercises) {
    const p = progress[e.id];
    if (!p) continue;

    // weight
    const usedWeight = p.weightKg;
    if (usedWeight != null && (e.weightKg ?? null) !== usedWeight) {
      changes.push({
        key: `${e.id}:weightKg`,
        exerciseId: e.id,
        field: "weightKg",
        from: e.weightKg != null ? `${e.weightKg} kg` : "bodyweight",
        to: `${usedWeight} kg`,
        label: e.name,
        value: usedWeight,
      });
    }

    // sets
    const performed = e.sets + (p.extraSets ?? 0);
    if (performed !== e.sets) {
      changes.push({
        key: `${e.id}:sets`,
        exerciseId: e.id,
        field: "sets",
        from: `${e.sets} sets`,
        to: `${performed} sets`,
        label: e.name,
        value: performed,
      });
    }

    // reps
    if (e.kind === "reps") {
      const done = p.repsDone ?? [];
      const m = modeOf(done);
      if (m && done.length > 0 && m.count / done.length >= 0.5) {
        const target = String(m.value);
        if ((e.reps ?? "") !== target) {
          changes.push({
            key: `${e.id}:reps`,
            exerciseId: e.id,
            field: "reps",
            from: `${e.reps ?? "—"} reps`,
            to: `${target} reps`,
            label: e.name,
            value: target,
          });
        }
      }
    }
  }

  return changes;
}

export function applyTemplateChanges(template: Template, changes: TemplateChange[]): Template {
  if (!changes.length) return template;
  return {
    ...template,
    exercises: template.exercises.map((e) => {
      const mine = changes.filter((c) => c.exerciseId === e.id);
      if (!mine.length) return e;
      const next = { ...e };
      for (const c of mine) {
        if (c.field === "weightKg") next.weightKg = c.value as number;
        if (c.field === "sets") next.sets = c.value as number;
        if (c.field === "reps") next.reps = c.value as string;
      }
      return next;
    }),
  };
}
