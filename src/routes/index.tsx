import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Check, ChevronRight, Minus, Plus, Repeat, SkipForward, Timer, Undo2, X } from "lucide-react";
import { useLogs, useSession, useSettings, useTemplates } from "@/lib/kb-store";
import type { Biofeedback, Exercise, LoggedSet, Template, WorkoutLog } from "@/lib/kb-types";
import { applyTemplateChanges, buildTemplateChanges } from "@/lib/kb-template-diff";
import { RestTimer } from "@/components/kb/RestTimer";
import { Metronome } from "@/components/kb/Metronome";
import { buzz, unlockAudio } from "@/lib/kb-feedback";
import { Slider } from "@/components/ui/slider";


export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Kettlebell Longevity Tracker — Two-Mat Training" },
      {
        name: "description",
        content:
          "Run Day A, B or C kettlebell sessions with one-tap set logging, auto rest timers, tempo pacing and end-of-session biofeedback.",
      },
      { property: "og:title", content: "Kettlebell Longevity Tracker" },
      {
        property: "og:description",
        content: "Single and dual kettlebell longevity training on a 2-mat footprint.",
      },
    ],
  }),
  component: WorkoutPage,
});

interface Progress {
  completed: number;
  skipped: number;
  rpe: number | null;
  weightKg: number | null;
  /** reps recorded per completed set */
  repsDone: number[];
  /** current rep counter value for the set in progress */
  repInput: number;
  /** sets added on top of the template today */
  extraSets?: number;
}

/** pull a sensible starting rep count out of a template string like "12-15" or "10 marches" */
function targetReps(reps?: string) {
  const m = reps?.match(/\d+/);
  return m ? Number(m[0]) : 10;
}

const emptyProgress = (): Progress => ({
  completed: 0,
  skipped: 0,
  rpe: null,
  weightKg: null,
  repsDone: [],
  repInput: 10,
  extraSets: 0,
});


function WorkoutPage() {
  const [templates, setTemplates] = useTemplates();
  const [settings] = useSettings();
  const [, setLogs] = useLogs();
  const [session, setSession] = useSession();

  const [restFor, setRestFor] = useState<number | null>(null);
  const [metronome, setMetronome] = useState(settings.metronomeEnabled);
  const [finishing, setFinishing] = useState(false);
  const [acceptedChanges, setAcceptedChanges] = useState<Record<string, boolean>>({});
  const [bio, setBio] = useState<Biofeedback>({
    energy: 7,
    legCompensation: "none",
    legNotes: "",
    jointNotes: "",
  });

  const active = useMemo(
    () => templates.find((t) => t.id === session?.templateId) ?? null,
    [templates, session?.templateId],
  );
  const index = session?.index ?? 0;
  const progress = session?.progress ?? {};
  const startedAt = session?.startedAt ?? 0;

  const setIndex = (i: number) => setSession((s) => (s ? { ...s, index: i } : s));

  const exercise = active?.exercises[index];
  const prog = exercise ? progress[exercise.id] : undefined;

  /** planned sets for an exercise including sets added today */
  const setsFor = (e: Exercise) => e.sets + (progress[e.id]?.extraSets ?? 0);

  const templateChanges = useMemo(
    () => (active ? buildTemplateChanges(active, progress) : []),
    [active, progress],
  );

  const totalSets = useMemo(
    () => active?.exercises.reduce((sum, e) => sum + e.sets + (progress[e.id]?.extraSets ?? 0), 0) ?? 0,
    [active, progress],
  );

  const doneSets = useMemo(
    () => Object.values(progress).reduce((s, p) => s + p.completed + p.skipped, 0),
    [progress],
  );

  const begin = (t: Template) => {
    unlockAudio();
    setMetronome(settings.metronomeEnabled);
    setSession({
      templateId: t.id,
      startedAt: Date.now(),
      index: 0,
      progress: Object.fromEntries(
        t.exercises.map((e) => [
          e.id,
          {
            ...emptyProgress(),
            weightKg: e.weightKg ?? null,
            repInput: targetReps(e.reps),
          },
        ]),
      ),
    });
  };

  const patchProgress = (id: string, patch: Partial<Progress>) =>
    setSession((s) =>
      s
        ? {
            ...s,
            progress: { ...s.progress, [id]: { ...(s.progress[id] ?? emptyProgress()), ...patch } },
          }
        : s,
    );

  const bump = (kind: "completed" | "skipped") => {
    if (!exercise) return;
    const current: Progress = progress[exercise.id] ?? emptyProgress();
    const next: Progress = {
      ...current,
      [kind]: current[kind] + 1,
      repsDone:
        kind === "completed" && exercise.kind === "reps"
          ? [...current.repsDone, current.repInput]
          : current.repsDone,
    };
    const finishedAll = next.completed + next.skipped >= setsFor(exercise);
    const advance = finishedAll && index < active!.exercises.length - 1;
    setSession((s) =>
      s
        ? {
            ...s,
            index: advance ? index + 1 : s.index,
            progress: { ...s.progress, [exercise.id]: next },
          }
        : s,
    );
    if (settings.hapticsEnabled) buzz(kind === "completed" ? 45 : 20);

    if (kind === "completed" && exercise.restSec > 0) {
      setRestFor(exercise.restSec);
    }
  };


  const addSet = () => {
    if (!exercise) return;
    patchProgress(exercise.id, { extraSets: (prog?.extraSets ?? 0) + 1 });
    if (settings.hapticsEnabled) buzz(25);
    toast.success("Extra set added");
  };

  const removeExtraSet = () => {
    if (!exercise) return;
    const extra = prog?.extraSets ?? 0;
    if (extra <= 0) return;
    // don't drop below sets already logged
    const logged = (prog?.completed ?? 0) + (prog?.skipped ?? 0);
    if (exercise.sets + extra - 1 < logged) return;
    patchProgress(exercise.id, { extraSets: extra - 1 });
  };

  const saveWorkout = () => {
    if (!active) return;
    const entries: LoggedSet[] = active.exercises.map((e) => {
      const p = progress[e.id];
      return {
        exerciseName: e.name + (e.perSide ? " (per side)" : ""),
        weightKg: p?.weightKg ?? null,
        reps: e.kind === "timed" ? `${Math.round((e.durationSec ?? 0) / 60)} min` : (e.reps ?? ""),
        repsDone: p?.repsDone ?? [],
        setsPlanned: e.sets + (p?.extraSets ?? 0),
        setsCompleted: p?.completed ?? 0,
        setsSkipped: p?.skipped ?? 0,
        rpe: p?.rpe ?? null,
      };
    });
    const log: WorkoutLog = {
      id: `${Date.now()}`,
      dateISO: new Date().toISOString(),
      templateId: active.id,
      templateName: `${active.name}: ${active.subtitle}`,
      durationSec: Math.round((Date.now() - startedAt) / 1000),
      entries,
      biofeedback: bio,
    };
    setLogs((prev) => [log, ...prev]);

    const selected = templateChanges.filter((c) => acceptedChanges[c.key]);
    if (selected.length) {
      setTemplates((prev) =>
        prev.map((t) => (t.id === active.id ? applyTemplateChanges(t, selected) : t)),
      );
    }

    setSession(null);
    setFinishing(false);
    setAcceptedChanges({});
    setBio({ energy: 7, legCompensation: "none", legNotes: "", jointNotes: "" });
    toast.success(
      selected.length
        ? `Session saved · ${selected.length} template change${selected.length === 1 ? "" : "s"} applied`
        : "Session saved to History",
    );
  };


  /* ---------- template picker ---------- */
  if (!active) {
    return (
      <div className="px-4 pt-8">
        <p className="font-display text-sm uppercase tracking-[0.3em] text-primary">2-mat footprint</p>
        <h1 className="mt-1 font-display text-4xl font-bold uppercase leading-none">
          Kettlebell
          <br />
          Longevity
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">Pick today's session and start moving.</p>

        <div className="mt-6 space-y-3">
          {templates.map((t) => (
            <button
              key={t.id}
              onClick={() => begin(t)}
              className="surface flex w-full items-center justify-between rounded-2xl p-5 text-left active:scale-[0.99]"
            >
              <div>
                <p className="font-display text-2xl font-bold uppercase">{t.name}</p>
                <p className="text-sm text-primary">{t.subtitle}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t.exercises.length} exercises ·{" "}
                  {t.exercises.reduce((s, e) => s + e.sets, 0)} sets
                </p>
              </div>
              <ChevronRight className="size-7 text-muted-foreground" />
            </button>
          ))}
        </div>
      </div>
    );
  }

  /* ---------- biofeedback ---------- */
  if (finishing) {
    return (
      <div className="px-4 pt-8">
        <h1 className="font-display text-3xl font-bold uppercase">How did that feel?</h1>
        <div className="surface mt-5 space-y-6 rounded-2xl p-5">
          <div>
            <div className="flex items-baseline justify-between">
              <p className="text-sm font-semibold">Energy level</p>
              <p className="tabular font-display text-3xl font-bold text-primary">{bio.energy}/10</p>
            </div>
            <Slider
              className="mt-4"
              min={1}
              max={10}
              step={1}
              value={[bio.energy]}
              onValueChange={([v]) => setBio({ ...bio, energy: v ?? bio.energy })}
            />
          </div>

          <div>
            <p className="text-sm font-semibold">Left vs. right compensation</p>
            <div className="mt-2 flex gap-2">
              {(["left", "none", "right"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setBio({ ...bio, legCompensation: v })}
                  className={`h-14 flex-1 rounded-xl font-bold capitalize ${
                    bio.legCompensation === v
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground"
                  }`}
                >
                  {v === "none" ? "Balanced" : v}
                </button>
              ))}
            </div>
            <textarea
              value={bio.legNotes}
              onChange={(e) => setBio({ ...bio, legNotes: e.target.value })}
              placeholder="Side notes (e.g. left knee drifts in on marches)"
              className="mt-3 min-h-20 w-full rounded-xl border border-input bg-background p-3 text-base outline-none focus:border-primary"
            />
          </div>

          <div>
            <p className="text-sm font-semibold">Joint / back notes</p>
            <textarea
              value={bio.jointNotes}
              onChange={(e) => setBio({ ...bio, jointNotes: e.target.value })}
              placeholder="Anything sore, stiff or improving?"
              className="mt-2 min-h-24 w-full rounded-xl border border-input bg-background p-3 text-base outline-none focus:border-primary"
            />
          </div>
        </div>

        {templateChanges.length > 0 && (
          <div className="surface mt-4 rounded-2xl p-5">
            <p className="font-display text-lg font-bold uppercase">
              Save changes to {active.name}?
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Today's session differed from the template. Pick what to keep.
            </p>
            <div className="mt-3 space-y-2">
              {templateChanges.map((c) => (
                <label
                  key={c.key}
                  className="flex items-center justify-between gap-3 rounded-xl bg-muted/60 p-3"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{c.label}</span>
                    <span className="tabular block text-xs text-muted-foreground">
                      {c.from} → {c.to}
                    </span>
                  </span>
                  <input
                    type="checkbox"
                    checked={!!acceptedChanges[c.key]}
                    onChange={(e) =>
                      setAcceptedChanges((prev) => ({ ...prev, [c.key]: e.target.checked }))
                    }
                    className="size-6 shrink-0 accent-[var(--primary)]"
                  />
                </label>
              ))}
            </div>
          </div>
        )}



        <button
          onClick={saveWorkout}
          className="mt-5 h-16 w-full rounded-2xl bg-primary text-lg font-bold text-primary-foreground active:scale-[0.99]"
        >
          Save session
        </button>
        <button
          onClick={() => setFinishing(false)}
          className="mt-2 h-12 w-full rounded-xl text-sm font-semibold text-muted-foreground"
        >
          Back to workout
        </button>
      </div>
    );
  }

  /* ---------- active workout ---------- */
  const setsLeft = exercise ? setsFor(exercise) - (prog?.completed ?? 0) - (prog?.skipped ?? 0) : 0;

  return (
    <div className="px-4 pt-6">
      {restFor !== null && (
        <RestTimer
          key={restFor + "-" + doneSets}
          seconds={restFor}
          sound={settings.soundEnabled}
          haptics={settings.hapticsEnabled}
          onDone={() => undefined}
          onDismiss={() => setRestFor(null)}
        />
      )}

      <div className="flex items-start justify-between">
        <div>
          <p className="font-display text-sm uppercase tracking-[0.25em] text-primary">
            {active.name} · {active.subtitle}
          </p>
          <h1 className="mt-1 font-display text-3xl font-bold uppercase leading-tight">
            {exercise?.name}
          </h1>
        </div>
        <button
          onClick={() => {
            if (window.confirm("Discard this session and its logged sets?")) setSession(null);
          }}
          className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-secondary text-secondary-foreground"
          aria-label="Quit workout"
        >
          <X className="size-5" />
        </button>
      </div>

      <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${totalSets ? (doneSets / totalSets) * 100 : 0}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Exercise {index + 1}/{active.exercises.length} · {doneSets}/{totalSets} sets logged
      </p>

      {exercise && (
        <>
          <div className="surface mt-5 rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="tabular font-display text-5xl font-bold">
                  {exercise.kind === "timed"
                    ? `${Math.round((exercise.durationSec ?? 0) / 60)} min`
                    : `${exercise.reps} ${exercise.perSide ? "/ side" : "reps"}`}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {setsLeft} of {exercise.sets} set{exercise.sets === 1 ? "" : "s"} remaining
                  {exercise.tempo ? ` · ${exercise.tempo} tempo` : ""}
                  {exercise.restSec ? ` · rest ${exercise.restSec}s` : ""}
                </p>
              </div>
              <div className="text-right">
                <p className="tabular font-display text-4xl font-bold text-primary">
                  {prog?.weightKg ? `${prog.weightKg}` : "BW"}
                </p>
                <p className="text-xs uppercase tracking-widest text-muted-foreground">
                  {prog?.weightKg ? "kg" : "bodyweight"}
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                const cur = prog?.weightKg;
                const next = cur === settings.lightWeight ? settings.heavyWeight : settings.lightWeight;
                patchProgress(exercise.id, { weightKg: next });
                if (settings.hapticsEnabled) buzz(25);
              }}
              className="mt-4 flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-secondary text-base font-bold text-secondary-foreground active:scale-[0.99]"
            >
              <Repeat className="size-5" /> Switch to{" "}
              {prog?.weightKg === settings.lightWeight ? settings.heavyWeight : settings.lightWeight} kg
            </button>

            {exercise.kind === "reps" && (
              <div className="mt-5">
                <div className="flex items-baseline justify-between">
                  <p className="text-xs uppercase tracking-widest text-muted-foreground">
                    Reps this set{exercise.perSide ? " (per side)" : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">target {exercise.reps}</p>
                </div>
                <div className="mt-2 flex items-center gap-3">
                  <button
                    onClick={() => {
                      patchProgress(exercise.id, {
                        repInput: Math.max(0, (prog?.repInput ?? targetReps(exercise.reps)) - 1),
                      });
                      if (settings.hapticsEnabled) buzz(15);
                    }}
                    className="flex h-16 w-16 items-center justify-center rounded-xl bg-secondary text-secondary-foreground active:scale-95"
                    aria-label="Decrease reps"
                  >
                    <Minus className="size-7" />
                  </button>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={prog?.repInput ?? targetReps(exercise.reps)}
                    onChange={(e) =>
                      patchProgress(exercise.id, {
                        repInput: Math.max(0, Number(e.target.value) || 0),
                      })
                    }
                    className="tabular h-16 min-w-0 flex-1 rounded-xl bg-muted text-center font-display text-4xl font-bold outline-none focus:ring-2 focus:ring-primary"
                  />
                  <button
                    onClick={() => {
                      patchProgress(exercise.id, {
                        repInput: (prog?.repInput ?? targetReps(exercise.reps)) + 1,
                      });
                      if (settings.hapticsEnabled) buzz(15);
                    }}
                    className="flex h-16 w-16 items-center justify-center rounded-xl bg-secondary text-secondary-foreground active:scale-95"
                    aria-label="Increase reps"
                  >
                    <Plus className="size-7" />
                  </button>
                </div>
                {prog?.repsDone.length ? (
                  <p className="tabular mt-2 text-xs text-muted-foreground">
                    Logged sets: {prog.repsDone.join(" · ")}
                  </p>
                ) : null}
              </div>
            )}

            <div className="mt-4">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">RPE (how hard it felt, 1–10)</p>
              <div className="mt-2 flex gap-1">
                {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    onClick={() =>
                      patchProgress(exercise.id, { rpe: n })
                    }
                    className={`h-11 flex-1 rounded-lg text-sm font-bold ${
                      prog?.rpe === n
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4 flex gap-3">
            <button
              onClick={() => bump("completed")}
              disabled={setsLeft === 0}
              className="flex h-20 flex-[2] items-center justify-center gap-2 rounded-2xl bg-primary text-xl font-bold text-primary-foreground disabled:opacity-40 active:scale-[0.99]"
            >
              <Check className="size-7" /> Complete Set
            </button>
            <button
              onClick={() => bump("skipped")}
              disabled={setsLeft === 0}
              className="flex h-20 flex-1 flex-col items-center justify-center gap-1 rounded-2xl bg-secondary text-sm font-bold text-secondary-foreground disabled:opacity-40 active:scale-[0.99]"
            >
              <SkipForward className="size-6" /> Skip Set
            </button>
          </div>

          <div className="mt-3 flex gap-3">
            <button
              onClick={addSet}
              className="flex h-14 flex-1 items-center justify-center gap-2 rounded-xl bg-secondary text-sm font-bold text-secondary-foreground active:scale-[0.99]"
            >
              <Plus className="size-5" /> Add set
            </button>
            {(prog?.extraSets ?? 0) > 0 && (
              <button
                onClick={removeExtraSet}
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-border text-muted-foreground active:scale-95"
                aria-label="Remove added set"
              >
                <Undo2 className="size-5" />
              </button>
            )}
          </div>
          {(prog?.extraSets ?? 0) > 0 && (
            <p className="mt-2 text-xs text-muted-foreground">
              +{prog?.extraSets} set{(prog?.extraSets ?? 0) === 1 ? "" : "s"} added today
            </p>
          )}



          <button
            onClick={() => setRestFor(exercise.restSec || settings.defaultRestSec)}
            className="mt-3 flex h-14 w-full items-center justify-center gap-2 rounded-xl border border-border text-sm font-semibold text-muted-foreground"
          >
            <Timer className="size-5" /> Start {exercise.restSec || settings.defaultRestSec}s timer
          </button>

          <label className="mt-5 flex items-center justify-between rounded-xl bg-card p-4">
            <span className="text-sm font-semibold">Tempo metronome (3-1-3)</span>
            <input
              type="checkbox"
              checked={metronome}
              onChange={(e) => {
                unlockAudio();
                setMetronome(e.target.checked);
              }}
              className="size-6 accent-[var(--primary)]"
            />
          </label>
          {metronome && (
            <div className="mt-3">
              <Metronome sound={settings.soundEnabled} />
            </div>
          )}
        </>
      )}

      <div className="mt-6 space-y-2">
        {active.exercises.map((e, i) => {
          const p = progress[e.id];
          const done = (p?.completed ?? 0) + (p?.skipped ?? 0) >= e.sets;
          return (
            <button
              key={e.id}
              onClick={() => setIndex(i)}
              className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-left text-sm ${
                i === index ? "bg-secondary" : "bg-card/60"
              }`}
            >
              <span className={done ? "text-muted-foreground line-through" : "text-foreground"}>
                {e.name}
              </span>
              <span className="tabular text-xs text-muted-foreground">
                {(p?.completed ?? 0) + (p?.skipped ?? 0)}/{e.sets}
              </span>
            </button>
          );
        })}
      </div>

      <button
        onClick={() => setFinishing(true)}
        className="mt-5 h-16 w-full rounded-2xl border border-primary/40 text-lg font-bold text-primary"
      >
        Finish & log biofeedback
      </button>
    </div>
  );
}
