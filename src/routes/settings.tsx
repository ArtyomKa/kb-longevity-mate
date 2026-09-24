import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Copy, ClipboardPaste, Minus, Plus, RotateCcw, Trash2, X } from "lucide-react";
import { useSettings, useTemplates } from "@/lib/kb-store";
import { DEFAULT_TEMPLATES, type Exercise } from "@/lib/kb-types";
import { Switch } from "@/components/ui/switch";
import { ImportPlanCard } from "@/components/kb/ImportPlanCard";
import { BackupCard } from "@/components/kb/BackupCard";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
});

function Btn({ children, onClick, primary = false, small = false }: { children: React.ReactNode; onClick?: () => void; primary?: boolean; small?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`${small ? "h-9 px-3 text-xs" : "h-11 px-4 text-sm"} rounded-lg font-semibold ${
        primary ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function Segmented({ value, options, onChange }: { value: string; options: { value: string; label: string }[]; onChange: (v: string) => void }) {
  return (
    <div className="flex gap-1 rounded-lg bg-secondary p-1">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`flex-1 rounded-md py-1.5 text-xs font-semibold ${
            value === o.value ? "bg-primary text-primary-foreground" : "text-muted-foreground"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function SettingsPage() {
  const [templates, setTemplates] = useTemplates();
  const [settings, setSettings] = useSettings();
  const [openId, setOpenId] = useState<string | null>(null);
  const [clipboard, setClipboard] = useState<Exercise | null>(null);

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
        <ImportPlanCard />
        <BackupCard />
      </div>

      <div className="mt-3 space-y-3">
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
                    {/* Name (edit via prompt to avoid input freeze) */}
                    <button
                      onClick={() => {
                        if (typeof (window as any).prompt === "function") {
                          const name = (window as any).prompt("Exercise name:", e.name);
                          if (name?.trim()) patchExercise(t.id, e.id, { name: name.trim() });
                        }
                      }}
                      className="w-full text-left font-display text-lg font-semibold text-foreground active:opacity-70"
                    >
                      {e.name} <span className="text-xs font-normal text-muted-foreground">(tap to rename)</span>
                    </button>

                    {/* Kind toggle */}
                    <div className="mt-2">
                      <Segmented
                        value={e.kind}
                        options={[{ value: "reps", label: "Reps" }, { value: "timed", label: "Timed" }]}
                        onChange={(k) =>
                          patchExercise(t.id, e.id,
                            k === "timed"
                              ? { kind: "timed", durationSec: e.durationSec ?? 120, sets: 1 }
                              : { kind: "reps", sets: e.sets || 3, reps: e.reps || "10" },
                          )
                        }
                      />
                    </div>

                    {/* Sets / Reps */}
                    {e.kind === "reps" && (
                      <div className="mt-3 flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => patchExercise(t.id, e.id, { sets: Math.max(1, e.sets - 1) })} className="flex size-10 items-center justify-center rounded-lg bg-secondary text-secondary-foreground"><Minus className="size-4" /></button>
                          <span className="w-8 text-center font-bold">{e.sets}</span>
                          <button onClick={() => patchExercise(t.id, e.id, { sets: e.sets + 1 })} className="flex size-10 items-center justify-center rounded-lg bg-secondary text-secondary-foreground"><Plus className="size-4" /></button>
                        </div>
                        <span className="text-sm text-muted-foreground">sets</span>

                        <div className="ml-4 flex items-center gap-1">
                          <button onClick={() => patchExercise(t.id, e.id, { reps: String(Math.max(1, Number(e.reps || "10") - 1)) })} className="flex size-10 items-center justify-center rounded-lg bg-secondary text-secondary-foreground"><Minus className="size-4" /></button>
                          <span className="w-8 text-center font-bold">{e.reps}</span>
                          <button onClick={() => patchExercise(t.id, e.id, { reps: String((Number(e.reps || "10")) + 1) })} className="flex size-10 items-center justify-center rounded-lg bg-secondary text-secondary-foreground"><Plus className="size-4" /></button>
                        </div>
                        <span className="text-sm text-muted-foreground">reps</span>
                      </div>
                    )}

                    {/* Duration for timed */}
                    {e.kind === "timed" && (
                      <div className="mt-3 flex items-center gap-1">
                        <button onClick={() => patchExercise(t.id, e.id, { durationSec: Math.max(10, (e.durationSec ?? 120) - 10) })} className="flex size-10 items-center justify-center rounded-lg bg-secondary text-secondary-foreground"><Minus className="size-4" /></button>
                        <span className="w-12 text-center font-bold">{e.durationSec ?? 120}s</span>
                        <button onClick={() => patchExercise(t.id, e.id, { durationSec: (e.durationSec ?? 120) + 10 })} className="flex size-10 items-center justify-center rounded-lg bg-secondary text-secondary-foreground"><Plus className="size-4" /></button>
                        <span className="text-sm text-muted-foreground">duration</span>
                      </div>
                    )}

                    {/* Weight */}
                    <div className="mt-3">
                      <p className="mb-1 text-xs text-muted-foreground">Weight (kg)</p>
                      <div className="flex flex-wrap gap-1">
                        {["BW", 8, 12, 16, 20, 24, 28, 32].map((w) => (
                          <button
                            key={w}
                            onClick={() => patchExercise(t.id, e.id, { weightKg: w === "BW" ? null : (w as number) })}
                            className={`h-9 w-12 rounded-lg text-xs font-bold ${
                              (w === "BW" && e.weightKg == null) || e.weightKg === w
                                ? "bg-primary text-primary-foreground"
                                : "bg-secondary text-muted-foreground"
                            }`}
                          >
                            {w === "BW" ? "BW" : w}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Rest presets */}
                    <div className="mt-3">
                      <p className="mb-1 text-xs text-muted-foreground">Rest (s)</p>
                      <div className="flex flex-wrap gap-1">
                        {[0, 30, 45, 60, 75, 90, 120, 150, 180].map((s) => (
                          <button
                            key={s}
                            onClick={() => patchExercise(t.id, e.id, { restSec: s })}
                            className={`h-9 w-12 rounded-lg text-xs font-bold ${
                              e.restSec === s
                                ? "bg-primary text-primary-foreground"
                                : "bg-secondary text-muted-foreground"
                            }`}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Per-side toggle */}
                    <button
                      onClick={() => patchExercise(t.id, e.id, { perSide: !e.perSide })}
                      className={`mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-lg text-sm font-semibold ${
                        e.perSide ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                      }`}
                    >
                      {e.perSide ? "✓ Per side" : "Per side"}
                    </button>

                    {/* Actions */}
                    <div className="mt-3 flex justify-end gap-2">
                      <button
                        onClick={() => { setClipboard({ ...e }); toast.success(`${e.name} copied`); }}
                        className="flex size-10 items-center justify-center rounded-lg bg-secondary text-secondary-foreground"
                      >
                        <Copy className="size-4" />
                      </button>
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
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </div>
                ))}

                {clipboard && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setTemplates((prev) =>
                          prev.map((tt) =>
                            tt.id === t.id
                              ? { ...tt, exercises: [...tt.exercises, { ...clipboard, id: `${t.id}-${Date.now()}` }] }
                              : tt,
                          ),
                        );
                        toast.success(`${clipboard.name} pasted`);
                      }}
                      className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-primary/40 bg-primary/10 px-3 text-sm font-semibold text-primary"
                    >
                      <ClipboardPaste className="size-4" />
                      <span className="truncate">Paste "{clipboard.name}"</span>
                    </button>
                    <button
                      onClick={() => setClipboard(null)}
                      className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-border text-muted-foreground"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                )}

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
                                  kind: "reps" as const,
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
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-secondary text-sm font-semibold text-secondary-foreground"
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
            <div className="mt-1 flex items-center gap-1">
              <button onClick={() => setSettings((p) => ({ ...p, lightWeight: Math.max(0, p.lightWeight - 0.5) }))} className="flex size-10 items-center justify-center rounded-lg bg-secondary text-secondary-foreground"><Minus className="size-4" /></button>
              <span className="w-12 text-center font-bold">{settings.lightWeight}</span>
              <button onClick={() => setSettings((p) => ({ ...p, lightWeight: p.lightWeight + 0.5 }))} className="flex size-10 items-center justify-center rounded-lg bg-secondary text-secondary-foreground"><Plus className="size-4" /></button>
            </div>
          </label>
          <label className="text-xs text-muted-foreground">
            Heavy bell (kg)
            <div className="mt-1 flex items-center gap-1">
              <button onClick={() => setSettings((p) => ({ ...p, heavyWeight: Math.max(0, p.heavyWeight - 0.5) }))} className="flex size-10 items-center justify-center rounded-lg bg-secondary text-secondary-foreground"><Minus className="size-4" /></button>
              <span className="w-12 text-center font-bold">{settings.heavyWeight}</span>
              <button onClick={() => setSettings((p) => ({ ...p, heavyWeight: p.heavyWeight + 0.5 }))} className="flex size-10 items-center justify-center rounded-lg bg-secondary text-secondary-foreground"><Plus className="size-4" /></button>
            </div>
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