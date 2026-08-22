export type ExerciseKind = "timed" | "reps";

export interface Exercise {
  id: string;
  name: string;
  kind: ExerciseKind;
  /** for timed exercises */
  durationSec?: number;
  /** for rep exercises */
  sets: number;
  reps?: string;
  perSide?: boolean;
  weightKg?: number | null;
  tempo?: string | null;
  restSec: number;
  note?: string;
}

export interface Template {
  id: string;
  name: string;
  subtitle: string;
  exercises: Exercise[];
}

export interface LoggedSet {
  exerciseName: string;
  weightKg: number | null;
  reps: string;
  setsPlanned: number;
  setsCompleted: number;
  setsSkipped: number;
  rpe: number | null;
}

export interface Biofeedback {
  energy: number;
  legCompensation: "none" | "left" | "right";
  legNotes: string;
  jointNotes: string;
}

export interface WorkoutLog {
  id: string;
  dateISO: string;
  templateId: string;
  templateName: string;
  durationSec: number;
  entries: LoggedSet[];
  biofeedback: Biofeedback;
}

export interface Settings {
  defaultRestSec: number;
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  metronomeEnabled: boolean;
  lightWeight: number;
  heavyWeight: number;
}

export const DEFAULT_SETTINGS: Settings = {
  defaultRestSec: 90,
  soundEnabled: true,
  hapticsEnabled: true,
  metronomeEnabled: false,
  lightWeight: 10,
  heavyWeight: 14,
};

const ex = (e: Partial<Exercise> & { name: string; id: string }): Exercise => ({
  kind: "reps",
  sets: 3,
  reps: "10",
  perSide: false,
  weightKg: null,
  tempo: null,
  restSec: 60,
  ...e,
});

export const DEFAULT_TEMPLATES: Template[] = [
  {
    id: "day-a",
    name: "Day A",
    subtitle: "Hinge & Push",
    exercises: [
      ex({ id: "a1", name: "Step-Back Toe-to-Heel Taps", kind: "timed", durationSec: 120, sets: 1, restSec: 0 }),
      ex({ id: "a2", name: "KB Halos", sets: 2, reps: "5", perSide: true, weightKg: 10, restSec: 45 }),
      ex({ id: "a3", name: "Bodyweight Air Squats", sets: 1, reps: "10", restSec: 45 }),
      ex({ id: "a4", name: "2-Handed Swings", sets: 3, reps: "12-15", weightKg: 14, restSec: 90 }),
      ex({ id: "a5", name: "Single-Arm Overhead Press", sets: 3, reps: "6-8", perSide: true, weightKg: 10, restSec: 90 }),
      ex({ id: "a6", name: "Suitcase March", sets: 3, reps: "10 marches", perSide: true, weightKg: 14, restSec: 60 }),
    ],
  },
  {
    id: "day-b",
    name: "Day B",
    subtitle: "Squat & Pull",
    exercises: [
      ex({ id: "b1", name: "Step-Back Toe-to-Heel Taps", kind: "timed", durationSec: 120, sets: 1, restSec: 0 }),
      ex({ id: "b2", name: "KB Halos", sets: 2, reps: "5", perSide: true, weightKg: 10, restSec: 45 }),
      ex({ id: "b3", name: "Goblet Squats", sets: 3, reps: "8", weightKg: 10, tempo: "3-1-3", restSec: 90 }),
      ex({ id: "b4", name: "Supported Single-Arm Row", sets: 3, reps: "8-10", perSide: true, weightKg: 14, restSec: 60 }),
      ex({ id: "b5", name: "Two-Handed Horn Curls", sets: 3, reps: "10", weightKg: 10, restSec: 60, note: "10 kg or 14 kg" }),
    ],
  },
  {
    id: "day-c",
    name: "Day C",
    subtitle: "Full-Body Recovery Flow",
    exercises: [
      ex({ id: "c1", name: "Step-Back Toe-to-Heel Taps", kind: "timed", durationSec: 120, sets: 1, restSec: 0 }),
      ex({ id: "c2", name: "Swings", sets: 3, reps: "10", weightKg: 10, restSec: 60 }),
      ex({ id: "c3", name: "Goblet Squats", sets: 2, reps: "10", weightKg: 10, restSec: 60 }),
      ex({ id: "c4", name: "Single-Arm Row", sets: 2, reps: "10", perSide: true, weightKg: 10, restSec: 60 }),
      ex({ id: "c5", name: "Suitcase March", sets: 2, reps: "10 marches", perSide: true, weightKg: 10, restSec: 60 }),
    ],
  },
];
