import { z } from "zod";
import { DEFAULT_SETTINGS, type Settings, type Template, type WorkoutLog } from "./kb-types";
import { mergeTemplates, parsePlan, serializePlan } from "./kb-template-import";

const loggedSetSchema = z.object({
  exerciseName: z.string().min(1),
  weightKg: z.number().nullable().optional(),
  reps: z.union([z.string(), z.number()]).optional(),
  repsDone: z.array(z.number()).optional(),
  setsPlanned: z.number().optional(),
  setsCompleted: z.number().optional(),
  setsSkipped: z.number().optional(),
  rpe: z.number().nullable().optional(),
});

const biofeedbackSchema = z.object({
  energy: z.number().optional(),
  legCompensation: z.enum(["none", "left", "right"]).optional(),
  legNotes: z.string().optional(),
  jointNotes: z.string().optional(),
});

const logSchema = z.object({
  id: z.string().min(1).optional(),
  dateISO: z.string().min(1),
  templateId: z.string().optional(),
  templateName: z.string().optional(),
  durationSec: z.number().optional(),
  entries: z.array(loggedSetSchema).optional(),
  biofeedback: biofeedbackSchema.optional(),
});

const settingsSchema = z.object({
  defaultRestSec: z.number().optional(),
  soundEnabled: z.boolean().optional(),
  hapticsEnabled: z.boolean().optional(),
  metronomeEnabled: z.boolean().optional(),
  lightWeight: z.number().optional(),
  heavyWeight: z.number().optional(),
});

const backupSchema = z.object({
  version: z.number().optional(),
  exportedAt: z.string().optional(),
  templates: z.array(z.unknown()).optional(),
  logs: z.array(logSchema).optional(),
  settings: settingsSchema.optional(),
});

export interface BackupData {
  templates: Template[];
  logs: WorkoutLog[];
  settings: Settings | null;
}

export type BackupParseResult =
  | { ok: true; data: BackupData }
  | { ok: false; errors: string[] };

export function serializeBackup(
  templates: Template[],
  logs: WorkoutLog[],
  settings: Settings,
): string {
  return JSON.stringify(
    {
      version: 1,
      exportedAt: new Date().toISOString(),
      templates: JSON.parse(serializePlan(templates)).templates,
      logs,
      settings,
    },
    null,
    2,
  );
}

export function backupFileName(ref = new Date()) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `kettlebell-backup-${ref.getFullYear()}-${pad(ref.getMonth() + 1)}-${pad(ref.getDate())}.json`;
}

function normaliseLog(l: z.infer<typeof logSchema>, index: number): WorkoutLog {
  const bf = l.biofeedback ?? {};
  return {
    id: l.id ?? `${l.dateISO}-${index}`,
    dateISO: l.dateISO,
    templateId: l.templateId ?? "",
    templateName: l.templateName ?? "Session",
    durationSec: l.durationSec ?? 0,
    entries: (l.entries ?? []).map((e) => ({
      exerciseName: e.exerciseName,
      weightKg: e.weightKg ?? null,
      reps: String(e.reps ?? ""),
      ...(e.repsDone ? { repsDone: e.repsDone } : {}),
      setsPlanned: e.setsPlanned ?? 0,
      setsCompleted: e.setsCompleted ?? 0,
      setsSkipped: e.setsSkipped ?? 0,
      rpe: e.rpe ?? null,
    })),
    biofeedback: {
      energy: bf.energy ?? 5,
      legCompensation: bf.legCompensation ?? "none",
      legNotes: bf.legNotes ?? "",
      jointNotes: bf.jointNotes ?? "",
    },
  };
}

export function parseBackup(raw: string, defaults: { restSec: number }): BackupParseResult {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch (e) {
    return { ok: false, errors: [`Not valid JSON — ${(e as Error).message}`] };
  }

  const parsed = backupSchema.safeParse(json);
  if (!parsed.success) {
    return {
      ok: false,
      errors: parsed.error.issues
        .map((i) => `${i.path.join(".") || "file"} — ${i.message.toLowerCase()}`)
        .slice(0, 12),
    };
  }

  const { templates: rawTemplates, logs: rawLogs, settings } = parsed.data;
  if (!rawTemplates?.length && !rawLogs?.length && !settings) {
    return { ok: false, errors: ["This file has no training history, templates or settings in it."] };
  }

  let templates: Template[] = [];
  if (rawTemplates?.length) {
    const planResult = parsePlan(JSON.stringify({ version: 1, templates: rawTemplates }), defaults);
    if (!planResult.ok) return { ok: false, errors: planResult.errors };
    templates = planResult.templates;
  }

  const logs = (rawLogs ?? []).map(normaliseLog);

  return {
    ok: true,
    data: {
      templates,
      logs,
      settings: settings
        ? {
            ...DEFAULT_SETTINGS,
            ...(Object.fromEntries(
              Object.entries(settings).filter(([, v]) => v !== undefined),
            ) as Partial<Settings>),
          }
        : null,

    },
  };
}

export interface MergeSummary {
  templates: Template[];
  logs: WorkoutLog[];
  counts: {
    logsInFile: number;
    logsNew: number;
    logsDuplicate: number;
    templatesInFile: number;
    templatesNew: number;
    templatesReplaced: number;
  };
  hasSettings: boolean;
}

export function mergeBackup(
  current: { templates: Template[]; logs: WorkoutLog[] },
  incoming: BackupData,
): MergeSummary {
  const existingIds = new Set(current.logs.map((l) => l.id));
  const newLogs = incoming.logs.filter((l) => !existingIds.has(l.id));
  const logs = [...current.logs, ...newLogs].sort((a, b) => b.dateISO.localeCompare(a.dateISO));

  const matches = (c: Template, t: Template) =>
    c.id === t.id || c.name.trim().toLowerCase() === t.name.trim().toLowerCase();
  const templatesReplaced = incoming.templates.filter((t) =>
    current.templates.some((c) => matches(c, t)),
  ).length;

  return {
    templates: mergeTemplates(current.templates, incoming.templates),
    logs,
    counts: {
      logsInFile: incoming.logs.length,
      logsNew: newLogs.length,
      logsDuplicate: incoming.logs.length - newLogs.length,
      templatesInFile: incoming.templates.length,
      templatesNew: incoming.templates.length - templatesReplaced,
      templatesReplaced,
    },
    hasSettings: !!incoming.settings,
  };
}
