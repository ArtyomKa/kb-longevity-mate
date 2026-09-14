import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Calendar } from "@/components/ui/calendar";
import { useLogs } from "@/lib/kb-store";
import type { WorkoutLog } from "@/lib/kb-types";
import {
  dayKey,
  energySeries,
  exerciseOptions,
  exerciseSeries,
  logsByDay,
  pctChange,
  pointFourWeeksBack,
  sessionsInMonth,
  totalReps,
  weekStreak,
  weeklyCounts,
} from "@/lib/kb-stats";

export const Route = createFileRoute("/progress")({
  head: () => ({
    meta: [
      { title: "Progress & Stats — Kettlebell Longevity Tracker" },
      {
        name: "description",
        content:
          "See your training calendar, week streak and per-exercise charts of volume, weight and reps across logged kettlebell sessions.",
      },
      { property: "og:title", content: "Progress & Stats — Kettlebell Longevity Tracker" },
      {
        property: "og:description",
        content: "Training calendar, streaks and per-exercise volume, weight and rep trends.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProgressPage,
});

const ROUTINE_DOT = ["bg-chart-1", "bg-chart-2", "bg-chart-3", "bg-chart-4", "bg-chart-5"];

type Metric = "volume" | "topWeight" | "reps";

function ProgressPage() {
  const [logs] = useLogs();
  const [month, setMonth] = useState(new Date());
  const [selected, setSelected] = useState<Date | undefined>(undefined);
  const [metric, setMetric] = useState<Metric>("volume");
  const [exercise, setExercise] = useState<string | null>(null);

  const byDay = useMemo(() => logsByDay(logs), [logs]);
  const options = useMemo(() => exerciseOptions(logs), [logs]);
  const activeName = exercise && options.some((o) => o.name === exercise) ? exercise : options[0]?.name ?? null;
  const series = useMemo(
    () => (activeName ? exerciseSeries(logs, activeName) : []),
    [logs, activeName],
  );
  const hasWeight = options.find((o) => o.name === activeName)?.hasWeight ?? false;
  const effectiveMetric: Metric = !hasWeight && metric !== "reps" ? "reps" : metric;

  const routines = useMemo(() => {
    const names: string[] = [];
    for (const l of logs) if (!names.includes(l.templateName)) names.push(l.templateName);
    return names.sort();
  }, [logs]);
  const dotClass = (name: string) => ROUTINE_DOT[routines.indexOf(name) % ROUTINE_DOT.length]!;

  const selectedLogs: WorkoutLog[] = selected ? (byDay.get(dayKey(selected)) ?? []) : [];
  const energy = useMemo(() => energySeries(logs), [logs]);
  const weeks = useMemo(() => weeklyCounts(logs), [logs]);

  const last = series[series.length - 1];
  const prev = series[series.length - 2];
  const older = pointFourWeeksBack(series);
  const value = (p: (typeof series)[number]) =>
    effectiveMetric === "volume" ? p.volume : effectiveMetric === "topWeight" ? p.topWeight : p.totalReps;
  const unit = effectiveMetric === "volume" ? " kg·reps" : effectiveMetric === "topWeight" ? " kg" : " reps";
  const metricLabel =
    effectiveMetric === "volume" ? "Volume" : effectiveMetric === "topWeight" ? "Top weight" : "Reps";
  const best = series.length ? Math.max(...series.map(value)) : 0;

  const change = (from?: (typeof series)[number] | null) => {
    if (!from || !last) return null;
    const pct = pctChange(value(from), value(last));
    if (pct === null) return null;
    if (pct === 0) return "unchanged";
    return `${pct > 0 ? "up" : "down"} ${Math.abs(pct)}%`;
  };

  return (
    <div className="px-4 pt-8">
      <h1 className="font-display text-4xl font-bold uppercase">Progress</h1>
      <p className="mt-1 text-sm text-muted-foreground">Everything below comes from your logged sessions.</p>

      <div className="mt-5 grid grid-cols-3 gap-2">
        {[
          { label: "This month", value: sessionsInMonth(logs, month) },
          { label: "Week streak", value: weekStreak(logs) },
          { label: "All time", value: logs.length },
        ].map((s) => (
          <div key={s.label} className="surface rounded-2xl p-3 text-center">
            <p className="tabular font-display text-3xl font-bold text-primary">{s.value}</p>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      <section className="surface mt-4 rounded-2xl p-2">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={setSelected}
          month={month}
          onMonthChange={setMonth}
          showOutsideDays={false}
          className="w-full [--cell-size:2.4rem]"
          modifiers={{ trained: [...byDay.keys()].map((k) => new Date(`${k}T12:00:00`)) }}
          modifiersClassNames={{ trained: "font-bold text-primary" }}
          components={{
            DayButton: ({ day, modifiers, className, children, ...props }) => {
              const dayLogs = byDay.get(dayKey(day.date)) ?? [];
              return (
                <button {...props} className={className} data-selected-single={modifiers["selected"] || undefined}>
                  {children}
                  <span className="mt-0.5 flex h-1.5 items-center justify-center gap-0.5">
                    {dayLogs.slice(0, 3).map((l, i) => (
                      <span key={i} className={`size-1.5 rounded-full ${dotClass(l.templateName)}`} />
                    ))}
                  </span>
                </button>
              );
            },
          }}
        />
        {routines.length > 0 && (
          <div className="flex flex-wrap gap-3 px-3 pb-2 text-xs text-muted-foreground">
            {routines.map((name) => (
              <span key={name} className="flex items-center gap-1.5">
                <span className={`size-2 rounded-full ${dotClass(name)}`} /> {name}
              </span>
            ))}
          </div>
        )}
        <div className="border-t border-border px-3 py-3 text-sm">
          {selected ? (
            selectedLogs.length ? (
              selectedLogs.map((l) => (
                <p key={l.id} className="text-muted-foreground">
                  <span className="font-semibold text-foreground">{l.templateName}</span> ·{" "}
                  {Math.round(l.durationSec / 60)} min · energy {l.biofeedback.energy}/10 · {totalReps(l)} reps
                </p>
              ))
            ) : (
              <p className="text-muted-foreground">No session on this day.</p>
            )
          ) : (
            <p className="text-muted-foreground">Tap a day to see that session.</p>
          )}
        </div>
      </section>

      <h2 className="mt-8 font-display text-2xl font-bold uppercase">Per exercise</h2>
      {options.length === 0 ? (
        <p className="mt-3 rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Log the same exercise in at least two sessions to see a trend here.
        </p>
      ) : (
        <>
          <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1">
            {options.map((o) => (
              <button
                key={o.name}
                onClick={() => setExercise(o.name)}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold ${
                  o.name === activeName
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground"
                }`}
              >
                {o.name}
              </button>
            ))}
          </div>

          <div className="mt-3 flex gap-2">
            {([
              ["volume", "Volume"],
              ["topWeight", "Weight"],
              ["reps", "Reps"],
            ] as const)
              .filter(([m]) => hasWeight || m === "reps")
              .map(([m, label]) => (
                <button
                  key={m}
                  onClick={() => setMetric(m)}
                  className={`h-10 flex-1 rounded-xl text-sm font-semibold ${
                    effectiveMetric === m
                      ? "bg-secondary text-secondary-foreground ring-2 ring-primary"
                      : "bg-secondary/60 text-muted-foreground"
                  }`}
                >
                  {label}
                </button>
              ))}
          </div>

          <div className="surface mt-3 rounded-2xl p-3">
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={series} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    tickLine={false}
                    axisLine={false}
                    width={44}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: 12,
                      color: "var(--popover-foreground)",
                      fontSize: 12,
                    }}
                  />
                  {effectiveMetric === "volume" && (
                    <Line type="monotone" dataKey="volume" name="Volume" stroke="var(--primary)" strokeWidth={3} dot />
                  )}
                  {effectiveMetric === "topWeight" && (
                    <Line type="stepAfter" dataKey="topWeight" name="Weight (kg)" stroke="var(--primary)" strokeWidth={3} dot />
                  )}
                  {effectiveMetric === "reps" && (
                    <>
                      <Line type="monotone" dataKey="totalReps" name="Total reps" stroke="var(--primary)" strokeWidth={3} dot />
                      <Line
                        type="monotone"
                        dataKey="avgReps"
                        name="Avg reps / set"
                        stroke="var(--muted-foreground)"
                        strokeWidth={2}
                        strokeDasharray="4 4"
                        dot={false}
                      />
                    </>
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              <li>
                Best session: <span className="text-foreground">{best}{unit}</span>
              </li>
              {change(prev) && (
                <li>
                  {metricLabel} {change(prev)} vs last session
                </li>
              )}
              {change(older) && (
                <li>
                  {metricLabel} {change(older)} vs four weeks ago
                </li>
              )}
            </ul>
          </div>
        </>
      )}

      <h2 className="mt-8 font-display text-2xl font-bold uppercase">Overall</h2>
      <div className="surface mt-3 rounded-2xl p-3">
        <p className="text-sm font-semibold">Energy, last {energy.length} sessions</p>
        <div className="mt-2 h-32 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={energy} margin={{ top: 6, right: 12, bottom: 0, left: -24 }}>
              <XAxis dataKey="label" hide />
              <YAxis domain={[0, 10]} ticks={[0, 5, 10]} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} width={40} />
              <Tooltip
                contentStyle={{
                  background: "var(--popover)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  color: "var(--popover-foreground)",
                  fontSize: 12,
                }}
              />
              <Line type="monotone" dataKey="energy" name="Energy" stroke="var(--chart-2)" strokeWidth={3} dot />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="surface mt-3 rounded-2xl p-3">
        <p className="text-sm font-semibold">Sessions per week, last 8 weeks</p>
        <div className="mt-2 h-28 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeks} margin={{ top: 4, right: 8, bottom: 0, left: -24 }}>
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} width={40} />
              <Tooltip
                cursor={{ fill: "var(--secondary)" }}
                contentStyle={{
                  background: "var(--popover)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  color: "var(--popover-foreground)",
                  fontSize: 12,
                }}
              />
              <Bar dataKey="sessions" name="Sessions" fill="var(--primary)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
