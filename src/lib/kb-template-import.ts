import { z } from "zod";
import type { Exercise, Template } from "./kb-types";

export const SCHEMA_PATH = "/kb-template-schema.json";

const exerciseSchema = z.object({
  id: z.string().min(1).optional(),
  name: z.string().min(1),
  kind: z.enum(["reps", "timed"]).optional(),
  durationSec: z.number().int().positive().optional(),
  sets: z.number().int().positive().optional(),
  reps: z.union([z.string(), z.number()]).optional(),
  perSide: z.boolean().optional(),
  weightKg: z.number().nullable().optional(),
  tempo: z.string().nullable().optional(),
  restSec: z.number().int().min(0).optional(),
  note: z.string().optional(),
});

const templateSchema = z.object({
  id: z.string().min(1).optional(),
  name: z.string().min(1),
  subtitle: z.string().optional(),
  exercises: z.array(exerciseSchema).min(1),
});

const planSchema = z.object({
  version: z.number().optional(),
  templates: z.array(templateSchema).min(1),
});

export type ParseResult =
  | { ok: true; templates: Template[] }
  | { ok: false; errors: string[] };

function slug(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function friendly(issue: z.ZodIssue): string {
  const path = issue.path;
  const where: string[] = [];
  if (path[0] === "templates" && typeof path[1] === "number") {
    where.push(`template ${path[1] + 1}`);
    if (path[2] === "exercises" && typeof path[3] === "number") {
      where.push(`exercise ${path[3] + 1}`);
    }
  }
  const field = path[path.length - 1];
  const fieldLabel = typeof field === "string" ? `\`${field}\`` : "value";
  const prefix = where.length ? `${where.join(", ")}: ` : "";
  return `${prefix}${fieldLabel} — ${issue.message.toLowerCase()}`;
}

export function parsePlan(raw: string, defaults: { restSec: number }): ParseResult {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch (e) {
    return { ok: false, errors: [`Not valid JSON — ${(e as Error).message}`] };
  }

  const parsed = planSchema.safeParse(json);
  if (!parsed.success) {
    return { ok: false, errors: parsed.error.issues.map(friendly).slice(0, 12) };
  }

  const errors: string[] = [];
  const usedTemplateIds = new Set<string>();

  const templates: Template[] = parsed.data.templates.map((t, ti) => {
    let tid = t.id ?? slug(t.name) ?? `plan-${ti + 1}`;
    if (!tid) tid = `plan-${ti + 1}`;
    while (usedTemplateIds.has(tid)) tid = `${tid}-${ti + 1}`;
    usedTemplateIds.add(tid);

    const usedExIds = new Set<string>();
    const exercises: Exercise[] = t.exercises.map((e, ei) => {
      const kind = e.kind ?? "reps";
      if (kind === "timed" && !e.durationSec) {
        errors.push(
          `template ${ti + 1}, exercise ${ei + 1}: \`durationSec\` is required for timed exercises`,
        );
      }
      let eid = e.id ?? `${tid}-${ei + 1}`;
      while (usedExIds.has(eid)) eid = `${eid}-${ei + 1}`;
      usedExIds.add(eid);

      return {
        id: eid,
        name: e.name,
        kind,
        ...(kind === "timed" ? { durationSec: e.durationSec ?? 60 } : {}),
        sets: e.sets ?? 1,
        ...(kind === "reps" ? { reps: String(e.reps ?? "10") } : {}),
        perSide: e.perSide ?? false,
        weightKg: e.weightKg ?? null,
        tempo: e.tempo ?? null,
        restSec: e.restSec ?? defaults.restSec,
        ...(e.note ? { note: e.note } : {}),
      };
    });

    return { id: tid, name: t.name, subtitle: t.subtitle ?? "", exercises };
  });

  if (errors.length) return { ok: false, errors };
  return { ok: true, templates };
}

export function serializePlan(templates: Template[]): string {
  return JSON.stringify(
    {
      version: 1,
      templates: templates.map((t) => ({
        id: t.id,
        name: t.name,
        subtitle: t.subtitle,
        exercises: t.exercises.map((e) => ({
          id: e.id,
          name: e.name,
          kind: e.kind,
          ...(e.kind === "timed" ? { durationSec: e.durationSec ?? 60 } : {}),
          sets: e.sets,
          ...(e.kind === "reps" ? { reps: e.reps ?? "10" } : {}),
          perSide: !!e.perSide,
          weightKg: e.weightKg ?? null,
          tempo: e.tempo ?? null,
          restSec: e.restSec,
          ...(e.note ? { note: e.note } : {}),
        })),
      })),
    },
    null,
    2,
  );
}

export function mergeTemplates(current: Template[], incoming: Template[]): Template[] {
  const next = [...current];
  for (const t of incoming) {
    const idx = next.findIndex(
      (c) => c.id === t.id || c.name.trim().toLowerCase() === t.name.trim().toLowerCase(),
    );
    if (idx >= 0) next[idx] = { ...t, id: next[idx]!.id };
    else next.push(t);
  }
  return next;
}
