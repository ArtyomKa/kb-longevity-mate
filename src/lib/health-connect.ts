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

/** Get Capacitor platform from global bridge (always available in Capacitor apps) */
function getPlatform(): string {
  try {
    // @ts-ignore
    const cap = window.Capacitor;
    if (cap && cap.getPlatform) {
      return cap.getPlatform();
    }
  } catch {
    // ignore
  }
  return "web";
}

/** Check if running on Android */
export function isAndroid(): boolean {
  const platform = getPlatform();
  console.log("[HealthConnect] Platform detected:", platform);
  return platform === "android";
}

/** Access HealthConnect plugin via Capacitor bridge (avoids dynamic import bundling issues) */
function getHealthConnectPlugin(): any {
  // @ts-ignore
  const cap = window.Capacitor;
  if (!cap || !cap.Plugins || !cap.Plugins.HealthConnect) {
    throw new Error("HealthConnect plugin not registered in Capacitor bridge");
  }
  return cap.Plugins.HealthConnect;
}

export async function isHealthConnectAvailable(): Promise<{ available: boolean; status?: string }> {
  try {
    if (getPlatform() !== "android") return { available: false };
    const HealthConnect = getHealthConnectPlugin();
    const result = await HealthConnect.isAvailable();
    console.log("[HealthConnect] isAvailable result:", result);
    return { available: true, status: result.status || "SDK_BYPASSED" };
  } catch (e) {
    console.error("[HealthConnect] isAvailable failed:", e);
    return { available: true, status: "SDK_BYPASSED" };
  }
}

export async function requestHealthConnectPermissions(): Promise<boolean> {
  try {
    const HealthConnect = getHealthConnectPlugin();
    console.log("[HealthConnect] Requesting permissions...");
    const result = await HealthConnect.requestHealthPermissions();
    console.log("[HealthConnect] Permission result:", result);
    return result.granted;
  } catch (e) {
    console.error("[HealthConnect] requestPermissions failed:", e);
    return true; // Bypass and let write() handle it
  }
}

export async function openHealthConnectSettings(): Promise<void> {
  try {
    const HealthConnect = getHealthConnectPlugin();
    await HealthConnect.openHealthConnectSettings();
  } catch (e: any) {
    console.error("[HealthConnect] openSettings failed:", e);
    // Re-throw so caller can show a toast
    throw e;
  }
}

export async function exportWorkoutToHealthConnect(
  log: WorkoutLog
): Promise<boolean> {
  console.log("[HealthConnect] Starting export...");

  // First, try to request permissions (this registers app in Health Connect)
  console.log("[HealthConnect] Requesting permissions first...");
  const granted = await requestHealthConnectPermissions();
  if (!granted) {
    const err = new Error(
      "Health Connect permission needed. Tap Open Settings to grant access, then retry."
    ) as any;
    err.isPermissionDenied = true;
    throw err;
  }

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

  console.log("[HealthConnect] Export payload:", JSON.stringify(payload, null, 2));

  const HealthConnect = getHealthConnectPlugin();
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
      message.includes("PERMISSION") ||
      message.includes("PERMISSION_DENIED")
    ) {
      const securityErr = new Error(
        "Health Connect permission needed. Tap Open Settings, then enable Exercise permissions for this app."
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
