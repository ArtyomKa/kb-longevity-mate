import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Copy, ClipboardPaste, GripVertical, Plus, RotateCcw, Trash2, X } from "lucide-react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { restrictToParentElement, restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
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

function SortableExerciseRow({
  exercise: e,
  onPatch,
  onRemove,
  onCopy,
}: {
  exercise: Exercise;
  onPatch: (patch: Partial<Exercise>) => void;
  onRemove: () => void;
  onCopy: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: e.id,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`rounded-xl bg-background/50 p-3 ${
        isDragging ? "z-10 shadow-xl shadow-black/40 ring-1 ring-primary/40" : ""
      }`}
    >
      <div className="mb-3 flex items-center gap-2">
        <button
          {...attributes}
          {...listeners}
          className="flex size-10 shrink-0 touch-none items-center justify-center rounded-lg text-muted-foreground active:bg-secondary"
          aria-label={`Reorder ${e.name}`}
        >
          <GripVertical className="size-5" />
        </button>
        <input
          value={e.name}
          onChange={(ev) => onPatch({ name: ev.target.value })}
          className="w-full bg-transparent font-display text-lg font-semibold text-foreground outline-none"
        />
      </div>
      <div className="mb-3 flex gap-2">
        {(["reps", "timed"] as const).map((k) => (
          <button
            key={k}
            onClick={() =>
              onPatch(
                k === "timed"
                  ? { kind: "timed", durationSec: e.durationSec ?? 120, sets: 1 }
                  : { kind: "reps", sets: e.sets || 3, reps: e.reps || "10" },
              )
            }
            className={`h-9 flex-1 rounded-lg text-sm font-semibold ${
              e.kind === k
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground"
            }`}
          >
            {k === "reps" ? "Reps" : "Timed"}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">

        {e.kind === "timed" ? (
          <label className="text-xs text-muted-foreground">
            Duration (s)
            <input
              type="number"
              inputMode="numeric"
              className={numField}
              value={e.durationSec ?? 0}
              onChange={(ev) => onPatch({ durationSec: Number(ev.target.value) })}
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
                onChange={(ev) => onPatch({ sets: Math.max(1, Number(ev.target.value)) })}
              />
            </label>
            <label className="text-xs text-muted-foreground">
              Reps
              <input
                className={numField}
                value={e.reps ?? ""}
                onChange={(ev) => onPatch({ reps: ev.target.value })}
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
              onPatch({ weightKg: ev.target.value === "" ? null : Number(ev.target.value) })
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
            onChange={(ev) => onPatch({ restSec: Number(ev.target.value) })}
          />
        </label>
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <Switch checked={!!e.perSide} onCheckedChange={(v) => onPatch({ perSide: v })} />
          Per side
        </label>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <Switch
            checked={e.tempo === "3-1-3"}
            onCheckedChange={(v) => onPatch({ tempo: v ? "3-1-3" : null })}
          />
          3-1-3 tempo
        </label>
        <div className="flex gap-2">
          <button
            onClick={onCopy}
            className="flex size-10 items-center justify-center rounded-lg bg-secondary text-secondary-foreground"
            aria-label={`Copy ${e.name}`}
          >
            <Copy className="size-4" />
          </button>
          <button
            onClick={onRemove}
            className="flex size-10 items-center justify-center rounded-lg bg-destructive/15 text-destructive"
            aria-label="Remove exercise"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function SettingsPage() {
  const [templates, setTemplates] = useTemplates();
  const [settings, setSettings] = useSettings();
  const [openId, setOpenId] = useState<string | null>(null);
  const [clipboard, setClipboard] = useState<Exercise | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const patchExercise = (tid: string, eid: string, patch: Partial<Exercise>) =>
    setTemplates((prev) =>
      prev.map((t) =>
        t.id === tid
          ? { ...t, exercises: t.exercises.map((e) => (e.id === eid ? { ...e, ...patch } : e)) }
          : t,
      ),
    );

  const handleDragEnd = (tid: string) => (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setTemplates((prev) =>
      prev.map((t) => {
        if (t.id !== tid) return t;
        const from = t.exercises.findIndex((e) => e.id === active.id);
        const to = t.exercises.findIndex((e) => e.id === over.id);
        if (from < 0 || to < 0) return t;
        return { ...t, exercises: arrayMove(t.exercises, from, to) };
      }),
    );
  };

  const pasteInto = (tid: string) => {
    if (!clipboard) return;
    setTemplates((prev) =>
      prev.map((t) =>
        t.id === tid
          ? { ...t, exercises: [...t.exercises, { ...clipboard, id: `${tid}-${Date.now()}` }] }
          : t,
      ),
    );
    toast.success(`${clipboard.name} pasted`);
  };

  return (
    <div className="px-4 pt-8">
      <h1 className="font-display text-4xl font-bold uppercase">Templates</h1>
      <p className="mt-1 text-sm text-muted-foreground">Tune your routines and session preferences.</p>

      <div className="mt-5">
        <ImportPlanCard />
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
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  modifiers={[restrictToVerticalAxis, restrictToParentElement]}
                  onDragEnd={handleDragEnd(t.id)}
                >
                  <SortableContext
                    items={t.exercises.map((e) => e.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-4">
                      {t.exercises.map((e) => (
                        <SortableExerciseRow
                          key={e.id}
                          exercise={e}
                          onPatch={(patch) => patchExercise(t.id, e.id, patch)}
                          onCopy={() => {
                            setClipboard({ ...e });
                            toast.success(`${e.name} copied`);
                          }}
                          onRemove={() =>
                            setTemplates((prev) =>
                              prev.map((tt) =>
                                tt.id === t.id
                                  ? { ...tt, exercises: tt.exercises.filter((x) => x.id !== e.id) }
                                  : tt,
                              ),
                            )
                          }
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>

                {clipboard && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => pasteInto(t.id)}
                      className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-primary/40 bg-primary/10 px-3 text-sm font-semibold text-primary"
                    >
                      <ClipboardPaste className="size-4" />
                      <span className="truncate">Paste “{clipboard.name}”</span>
                    </button>
                    <button
                      onClick={() => setClipboard(null)}
                      className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-border text-muted-foreground"
                      aria-label="Clear copied exercise"
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
