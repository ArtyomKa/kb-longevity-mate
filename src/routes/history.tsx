import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ClipboardCheck, Copy, Heart, Loader2, Trash2 } from "lucide-react";
import { useLogs } from "@/lib/kb-store";
import { buildWeeklyMarkdown, copyText, logsThisWeek } from "@/lib/kb-export";
import { isAndroid, exportWorkoutToHealthConnect, openHealthConnectSettings } from "@/lib/health-connect";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "Training History — Kettlebell Longevity Tracker" },
      {
        name: "description",
        content:
          "Review logged kettlebell sessions, biofeedback and RPE, and export a weekly Markdown summary for AI coaching.",
      },
      { property: "og:title", content: "Training History — Kettlebell Longevity Tracker" },
      { property: "og:description", content: "Session logs, biofeedback and one-tap AI weekly export." },
    ],
  }),
  component: HistoryPage,
});

function HistoryPage() {
  const [logs, setLogs] = useLogs();
  const [open, setOpen] = useState<string | null>(null);
  const isAndroidDevice = isAndroid();
  const [exportingId, setExportingId] = useState<string | null>(null);
  const week = useMemo(() => logsThisWeek(logs), [logs]);

  const sorted = [...logs].sort((a, b) => b.dateISO.localeCompare(a.dateISO));

  const onExport = async () => {
    const md = buildWeeklyMarkdown(logs);
    const ok = await copyText(md);
    toast[ok ? "success" : "error"](
      ok ? "Weekly summary copied — paste it into your AI chat." : "Could not access the clipboard.",
    );
  };

  return (
    <div className="px-4 pt-8">
      <h1 className="font-display text-4xl font-bold uppercase">History</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {week.length} session{week.length === 1 ? "" : "s"} this week · {logs.length} total
      </p>

      <button
        onClick={onExport}
        className="mt-5 flex h-16 w-full items-center justify-center gap-3 rounded-2xl bg-primary text-lg font-bold text-primary-foreground active:scale-[0.99]"
      >
        <Copy className="size-5" /> Export Weekly Summary for AI
      </button>

      <div className="mt-6 space-y-3">
        {sorted.length === 0 && (
          <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            No sessions logged yet. Finish a workout and it will show up here.
          </p>
        )}
        {sorted.map((log) => {
          const isOpen = open === log.id;
          return (
            <div key={log.id} className="surface overflow-hidden rounded-2xl">
              <button
                onClick={() => setOpen(isOpen ? null : log.id)}
                className="flex w-full items-center justify-between gap-3 p-4 text-left"
              >
                <div>
                  <p className="font-display text-xl font-semibold">{log.templateName}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(log.dateISO).toLocaleString(undefined, {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}{" "}
                    · {Math.round(log.durationSec / 60)} min
                  </p>
                </div>
                <span className="rounded-full bg-secondary px-3 py-1 text-xs font-bold text-secondary-foreground">
                  Energy {log.biofeedback.energy}/10
                </span>
              </button>
              {isOpen && (
                <div className="border-t border-border p-4 text-sm">
                  <ul className="space-y-2">
                    {log.entries.map((e, i) => (
                      <li key={i} className="flex items-center justify-between gap-2">
                        <span className="text-foreground">{e.exerciseName}</span>
                        <span className="tabular shrink-0 text-muted-foreground">
                          {e.setsCompleted}/{e.setsPlanned} ×{" "}
                          {e.repsDone?.length ? e.repsDone.join("/") : e.reps || "-"}
                          {e.weightKg ? ` @ ${e.weightKg}kg` : ""}
                          {e.rpe ? ` · RPE ${e.rpe}` : ""}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-4 space-y-1 text-muted-foreground">
                    <p>
                      Leg compensation:{" "}
                      {log.biofeedback.legCompensation === "none"
                        ? "balanced"
                        : `${log.biofeedback.legCompensation} favored`}
                      {log.biofeedback.legNotes ? ` — ${log.biofeedback.legNotes}` : ""}
                    </p>
                    <p>Joint/back: {log.biofeedback.jointNotes || "none"}</p>
                  </div>
                  {isAndroidDevice && (
                    <button
                      disabled={exportingId === log.id}
                      onClick={async () => {
                        setExportingId(log.id);
                        try {
                          const ok = await exportWorkoutToHealthConnect(log);
                          toast[ok ? "success" : "error"](
                            ok ? "Exported to Google Health Connect" : "Export failed"
                          );
                        } catch (err: any) {
                          if (err?.isSecurityException || err?.isPermissionDenied) {
                            toast.error(err.message, {
                              action: {
                                label: "Open Settings",
                                onClick: () => openHealthConnectSettings(),
                              },
                            });
                          } else {
                            toast.error(err.message || "Health Connect export failed");
                          }
                        } finally {
                          setExportingId(null);
                        }
                      }}
                      className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-green-600 font-semibold text-white active:scale-[0.99] disabled:opacity-60"
                    >
                      {exportingId === log.id ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Heart className="size-4" />
                      )}
                      Export to Google Health
                    </button>
                  )}
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={async () => {
                        const ok = await copyText(buildWeeklyMarkdown([log], new Date(log.dateISO)));
                        toast[ok ? "success" : "error"](ok ? "Session copied" : "Clipboard blocked");
                      }}
                      className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-secondary font-semibold text-secondary-foreground"
                    >
                      <ClipboardCheck className="size-4" /> Copy session
                    </button>
                    <button
                      onClick={() => setLogs((prev) => prev.filter((l) => l.id !== log.id))}
                      className="flex h-12 w-14 items-center justify-center rounded-xl bg-destructive/15 text-destructive"
                      aria-label="Delete session"
                    >
                      <Trash2 className="size-5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
