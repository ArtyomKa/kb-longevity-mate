import type { WorkoutLog } from "./kb-types";

export function startOfWeek(d: Date) {
  const date = new Date(d);
  const day = (date.getDay() + 6) % 7; // Monday start
  date.setDate(date.getDate() - day);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function logsThisWeek(logs: WorkoutLog[], ref = new Date()) {
  const start = startOfWeek(ref);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return logs
    .filter((l) => {
      const t = new Date(l.dateISO).getTime();
      return t >= start.getTime() && t < end.getTime();
    })
    .sort((a, b) => a.dateISO.localeCompare(b.dateISO));
}

const fmt = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

export function buildWeeklyMarkdown(logs: WorkoutLog[], ref = new Date()) {
  const week = logsThisWeek(logs, ref);
  const start = startOfWeek(ref);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);

  const lines: string[] = [];
  lines.push(`# Kettlebell Weekly Summary (${fmt(start.toISOString())} – ${fmt(end.toISOString())})`);
  lines.push("");
  lines.push(`Sessions completed: **${week.length}**`);
  lines.push("");

  if (week.length === 0) {
    lines.push("_No workouts logged this week._");
    return lines.join("\n");
  }

  for (const log of week) {
    lines.push(`## ${fmt(log.dateISO)} — ${log.templateName}`);
    lines.push(`Duration: ${Math.round(log.durationSec / 60)} min`);
    lines.push("");
    lines.push("| Exercise | Weight | Sets done | Reps | RPE |");
    lines.push("| --- | --- | --- | --- | --- |");
    for (const e of log.entries) {
      lines.push(
        `| ${e.exerciseName} | ${e.weightKg ? `${e.weightKg} kg` : "BW"} | ${e.setsCompleted}/${e.setsPlanned}${
          e.setsSkipped ? ` (${e.setsSkipped} skipped)` : ""
        } | ${e.reps || "-"} | ${e.rpe ?? "-"} |`,
      );
    }
    const bf = log.biofeedback;
    lines.push("");
    lines.push(`**Biofeedback** — Energy: ${bf.energy}/10`);
    lines.push(
      `- Leg compensation: ${bf.legCompensation === "none" ? "balanced" : `${bf.legCompensation} side favored`}${
        bf.legNotes ? ` — ${bf.legNotes}` : ""
      }`,
    );
    lines.push(`- Joint/back notes: ${bf.jointNotes || "none"}`);
    lines.push("");
  }

  lines.push("---");
  lines.push(
    "Please review this week's kettlebell training for longevity: flag imbalance risks, suggest load progression, and note recovery concerns.",
  );
  return lines.join("\n");
}

export async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      return true;
    } catch {
      return false;
    }
  }
}
