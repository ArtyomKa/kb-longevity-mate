import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, RotateCcw, Trash2 } from "lucide-react";
import { useSettings, useTemplates } from "@/lib/kb-store";
import { DEFAULT_TEMPLATES, type Exercise } from "@/lib/kb-types";
import { Switch } from "@/components/ui/switch";
import { ImportPlanCard } from "@/components/kb/ImportPlanCard";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Templates & Settings — Kettlebell Longevity Tracker" },
      {
        name: "description",
        content: "Edit kettlebell routines, sets, reps, loads and rest, and tune timer sound, haptics and tempo pacing.",
      },
      { property: "og:title", content: "Templates & Settings — Kettlebell Longevity Tracker" },
      { property: "og:description", content: "Customise routines, loads, rest windows and feedback cues." },
    ],
  }),
  component: SettingsPage,
});

const numField =
  "h-11 w-full rounded-lg border border-input bg-background px-3 text-base text-foreground outline-none focus:border-primary";

function SettingsPage() {
  const [templates, setTemplates] = useTemplates();
  const [settings, setSettings] = useSettings();
  const [openId, setOpenId] = useState<string | null>(null);

  const patchExercise = (tid: string, eid: string, patch: Partial<Exercise>) =>
    setTemplates((prev) =>
      prev.map((t) =>
        t.id === tid
          ? { ...t, exercises: t.exercises.map((e) => (e.id === eid ? { ...e, ...patch } : e)) }
          : t,
      ),
    );

  return (
    <div className="px-4 pt-8">
      <h1 className="font-display text-4xl font-bold uppercase">Templates</h1>
      <p className="mt-1 text-sm text-muted-foreground">Tune your routines and session preferences.</p>

      <div className="mt-5 space-y-3">
        {templates.map((t) => (
          <div key={t.id} className="surface overflow-hidden rounded-2xl">
            <button
              onClick={() => setOpenId(openId === t.id ? null : t.id)}
              className="flex w-full items-center justify-between p-4 text-left"
            >
              <div>
                <p className="font-display text-xl font-semibold">{t.name}</p>
                <p className="text-xs text-muted-foreground">{t.subtitle}</p>
              </div>
              <span className="text-xs text-muted-foreground">{t.exercises.length} exercises</span>
            </button>
            {openId === t.id && (
              <div className="space-y-4 border-t border-border p-4">
                {t.exercises.map((e) => (
                  <div key={e.id} className="rounded-xl bg-background/50 p-3">
                    <input
                      value={e.name}
                      onChange={(ev) => patchExercise(t.id, e.id, { name: ev.target.value })}
                      className="mb-3 w-full bg-transparent font-display text-lg font-semibold text-foreground outline-none"
                    />
                    <div className="grid grid-cols-2 gap-3">
                      {e.kind === "timed" ? (
                        <label className="text-xs text-muted-foreground">
                          Duration (s)
                          <input
                            type="number"
                            inputMode="numeric"
                            className={numField}
                            value={e.durationSec ?? 0}
                            onChange={(ev) =>
                              patchExercise(t.id, e.id, { durationSec: Number(ev.target.value) })
                            }
                          />
                        </label>
                      ) : (
                        <>
                          <label className="text-xs text-muted-foreground">
                            Sets
                            <input
                              type="number"
                              inputMode="numeric"
                              className={numField}
                              value={e.sets}
                              onChange={(ev) =>
                                patchExercise(t.id, e.id, { sets: Math.max(1, Number(ev.target.value)) })
                              }
                            />
                          </label>
                          <label className="text-xs text-muted-foreground">
                            Reps
                            <input
                              className={numField}
                              value={e.reps ?? ""}
                              onChange={(ev) => patchExercise(t.id, e.id, { reps: ev.target.value })}
                            />
                          </label>
                        </>
                      )}
                      <label className="text-xs text-muted-foreground">
                        Weight (kg, blank = BW)
                        <input
                          type="number"
                          inputMode="decimal"
                          className={numField}
                          value={e.weightKg ?? ""}
                          onChange={(ev) =>
                            patchExercise(t.id, e.id, {
                              weightKg: ev.target.value === "" ? null : Number(ev.target.value),
                            })
                          }
                        />
                      </label>
                      <label className="text-xs text-muted-foreground">
                        Rest (s)
                        <input
                          type="number"
                          inputMode="numeric"
                          className={numField}
                          value={e.restSec}
                          onChange={(ev) => patchExercise(t.id, e.id, { restSec: Number(ev.target.value) })}
                        />
                      </label>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <label className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Switch
                          checked={!!e.perSide}
                          onCheckedChange={(v) => patchExercise(t.id, e.id, { perSide: v })}
                        />
                        Per side
                      </label>
                      <label className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Switch
                          checked={e.tempo === "3-1-3"}
                          onCheckedChange={(v) => patchExercise(t.id, e.id, { tempo: v ? "3-1-3" : null })}
                        />
                        3-1-3 tempo
                      </label>
                      <button
                        onClick={() =>
                          setTemplates((prev) =>
                            prev.map((tt) =>
                              tt.id === t.id
                                ? { ...tt, exercises: tt.exercises.filter((x) => x.id !== e.id) }
                                : tt,
                            ),
                          )
                        }
                        className="flex size-10 items-center justify-center rounded-lg bg-destructive/15 text-destructive"
                        aria-label="Remove exercise"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </div>
                ))}
                <button
                  onClick={() =>
                    setTemplates((prev) =>
                      prev.map((tt) =>
                        tt.id === t.id
                          ? {
                              ...tt,
                              exercises: [
                                ...tt.exercises,
                                {
                                  id: `${t.id}-${Date.now()}`,
                                  name: "New exercise",
                                  kind: "reps",
                                  sets: 3,
                                  reps: "10",
                                  perSide: false,
                                  weightKg: settings.lightWeight,
                                  tempo: null,
                                  restSec: settings.defaultRestSec,
                                },
                              ],
                            }
                          : tt,
                      ),
                    )
                  }
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-secondary font-semibold text-secondary-foreground"
                >
                  <Plus className="size-4" /> Add exercise
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      <h2 className="mt-8 font-display text-2xl font-bold uppercase">Session settings</h2>
      <div className="surface mt-3 space-y-5 rounded-2xl p-4">
        <div>
          <p className="text-sm font-semibold">Default rest</p>
          <div className="mt-2 flex gap-2">
            {[60, 75, 90].map((s) => (
              <button
                key={s}
                onClick={() => setSettings({ ...settings, defaultRestSec: s })}
                className={`h-12 flex-1 rounded-xl font-bold ${
                  settings.defaultRestSec === s
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground"
                }`}
              >
                {s}s
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-xs text-muted-foreground">
            Light bell (kg)
            <input
              type="number"
              inputMode="decimal"
              className={numField}
              value={settings.lightWeight}
              onChange={(e) => setSettings({ ...settings, lightWeight: Number(e.target.value) })}
            />
          </label>
          <label className="text-xs text-muted-foreground">
            Heavy bell (kg)
            <input
              type="number"
              inputMode="decimal"
              className={numField}
              value={settings.heavyWeight}
              onChange={(e) => setSettings({ ...settings, heavyWeight: Number(e.target.value) })}
            />
          </label>
        </div>
        {(
          [
            ["soundEnabled", "Timer sound"],
            ["hapticsEnabled", "Haptic feedback"],
            ["metronomeEnabled", "Tempo metronome by default"],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="flex items-center justify-between">
            <span className="text-sm font-semibold">{label}</span>
            <Switch
              checked={settings[key]}
              onCheckedChange={(v) => setSettings({ ...settings, [key]: v })}
            />
          </label>
        ))}
      </div>

      <button
        onClick={() => {
          setTemplates(DEFAULT_TEMPLATES);
          toast.success("Templates reset to defaults");
        }}
        className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-border text-sm font-semibold text-muted-foreground"
      >
        <RotateCcw className="size-4" /> Reset templates to defaults
      </button>
    </div>
  );
}
