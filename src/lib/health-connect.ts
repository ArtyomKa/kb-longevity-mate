import type { WorkoutLog } from "./kb-types";

// Google Health Connect ExerciseType constants
// https://developer.android.com/reference/kotlin/androidx/health/connect/client/records/ExerciseSessionRecord.Companion
export const EXERCISE_TYPE_OTHER_WORKOUT = 0;
export const EXERCISE_TYPE_STRENGTH_TRAINING = 56;
export const EXERCISE_TYPE_HIGH_INTENSITY_INTERVAL_TRAINING = 24;

const TEMPLATE_TO_EXERCISE_TYPE: Record<string, number> = {
  "day-a": EXERCISE_TYPE_STRENGTH_TRAINING,
  "day-b": EXERCISE_TYPE_STRENGTH_TRAINING,
  "day-c": EXERCISE_TYPE_STRENGTH_TRAINING,
};

function mapTemplateToExerciseType(templateId: string): number {
  return TEMPLATE_TO_EXERCISE_TYPE[templateId] ?? EXERCISE_TYPE_OTHER_WORKOUT;
}

async function getCapacitorModules() {
  const [{ Capacitor }, { HealthConnect }] = await Promise.all([
    import(/* @vite-ignore */ "@capacitor/core"),
    import(/* @vite-ignore */ "capacitor-health-connect"),
  ]);
  return { Capacitor, HealthConnect };
}

export async function isHealthConnectAvailable(): Promise<boolean> {
  try {
    const { Capacitor, HealthConnect } = await getCapacitorModules();
    if (Capacitor.getPlatform() !== "android") return false;
    const result = await HealthConnect.isAvailable();
    return result.available;
  } catch {
    return false;
  }
}

export async function requestHealthConnectPermissions(): Promise<boolean> {
  try {
    const { HealthConnect } = await getCapacitorModules();
    const result = await HealthConnect.requestHealthPermissions();
    return result.granted;
  } catch {
    return false;
  }
}

export async function openHealthConnectSettings(): Promise<void> {
  try {
    const { HealthConnect } = await getCapacitorModules();
    await HealthConnect.openHealthConnectSettings();
  } catch {
    // Fallback: do nothing
  }
}

export async function exportWorkoutToHealthConnect(
  log: WorkoutLog
): Promise<boolean> {
  const available = await isHealthConnectAvailable();
  if (!available) throw new Error("Health Connect is not available on this device");

  const granted = await requestHealthConnectPermissions();
  if (!granted) throw new Error("Health Connect permissions were denied");

  const startTime = log.dateISO;
  const endTime = new Date(
    new Date(log.dateISO).getTime() + log.durationSec * 1000
  ).toISOString();

  const exerciseType = mapTemplateToExerciseType(log.templateId);

  const payload = {
    startTime,
    endTime,
    exerciseType,
    title: log.templateName,
    notes: buildNotes(log),
  };

  // Debug logging for bridge payload
  console.log("[HealthConnect] Export payload:", JSON.stringify(payload, null, 2));
  console.log("[HealthConnect] Mapping:", {
    templateId: log.templateId,
    mappedExerciseType: exerciseType,
    exerciseTypeLabel: getExerciseTypeLabel(exerciseType),
    durationSec: log.durationSec,
    startTimestamp: new Date(startTime).toISOString(),
    endTimestamp: endTime,
  });

  const { HealthConnect } = await getCapacitorModules();
  try {
    const result = await HealthConnect.writeExerciseSession(payload);
    console.log("[HealthConnect] Write result:", result);
    return result.success;
  } catch (err: any) {
    console.error("[HealthConnect] Write error:", err);
    const message = err?.message || "";
    if (
      message.includes("SecurityException") ||
      message.includes("permission") ||
      message.includes("PERMISSION")
    ) {
      const securityErr = new Error(
        "Health Connect permissions blocked. Please open Android Settings → Privacy → Health Connect and grant permissions for this app."
      );
      (securityErr as any).isSecurityException = true;
      throw securityErr;
    }
    throw err;
  }
}

function getExerciseTypeLabel(type: number): string {
  switch (type) {
    case EXERCISE_TYPE_STRENGTH_TRAINING:
      return "STRENGTH_TRAINING";
    case EXERCISE_TYPE_HIGH_INTENSITY_INTERVAL_TRAINING:
      return "HIGH_INTENSITY_INTERVAL_TRAINING";
    case EXERCISE_TYPE_OTHER_WORKOUT:
    default:
      return "OTHER_WORKOUT";
  }
}

function buildNotes(log: WorkoutLog): string {
  const lines: string[] = [];
  for (const e of log.entries) {
    const totalReps = e.repsDone?.reduce((s, r) => s + r, 0) ?? 0;
    lines.push(
      `${e.exerciseName}: ${e.setsCompleted}/${e.setsPlanned} sets` +
        (e.weightKg ? ` @ ${e.weightKg}kg` : "") +
        (totalReps ? `, total reps: ${totalReps}` : "") +
        (e.rpe ? `, RPE ${e.rpe}` : "")
    );
  }
  const bf = log.biofeedback;
  lines.push(`\nEnergy: ${bf.energy}/10`);
  lines.push(
    `Leg compensation: ${bf.legCompensation === "none" ? "balanced" : bf.legCompensation + " favored"}`
  );
  if (bf.legNotes) lines.push(`Leg notes: ${bf.legNotes}`);
  if (bf.jointNotes) lines.push(`Joint/back notes: ${bf.jointNotes}`);
  return lines.join("\n");
}
