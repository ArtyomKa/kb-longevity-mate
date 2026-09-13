# Progress tab: calendar + per-exercise charts

A new fourth tab, **Progress**, sitting between History and Templates, built entirely from
sessions already saved on the device. No new data is collected.

## 1. Training calendar

- Month view, swipe/arrow to previous or next month.
- Days with a session get a filled dot; the dot colour reflects which routine it was
  (Day A / Day B / Day C), with a small legend underneath.
- Tapping a marked day shows a one-line summary below the calendar: routine name,
  duration, energy score, and total reps.
- Above the calendar, three quick numbers: sessions this month, current streak in weeks,
  and total sessions logged.

## 2. Per-exercise progress

- A picker listing every exercise that appears in at least two logged sessions,
  most recent first.
- For the chosen exercise, three views selectable with a small toggle:
  - **Volume** — total reps x weight per session over time (the standard strength-progress
    measure). Line chart, one point per session.
  - **Weight** — heaviest weight used per session. Step-like line, shows load jumps clearly.
  - **Reps** — total reps performed per session, with the average reps per set as a
    lighter second line.
- Under the chart: best session to date, change versus the previous session, and
  change versus four weeks ago, each in plain words (e.g. "Volume up 12% vs last session").
- Sessions where the exercise was skipped entirely are left out of the chart.

## 3. Overall trends (small section at the bottom)

- Energy score over the last 12 sessions as a sparkline.
- Weekly session count for the last 8 weeks as small bars.

## Notes on data

Bodyweight exercises (no weight) fall back to reps-only charts; the volume view is hidden
for them. Timed drills (no reps recorded) are excluded from the exercise picker.
Exercises are matched by name, so renaming an exercise in a template starts a new series.

## Technical

- New route `src/routes/progress.tsx` with its own `head()` metadata; add the tab to
  `src/components/kb/TabBar.tsx` (4 items, keeps the existing layout).
- New `src/lib/kb-stats.ts`: pure functions deriving from `WorkoutLog[]` — session days by
  month, streaks, per-exercise series (volume/top weight/total reps/avg reps), energy
  series, weekly counts. Unit-testable, no UI.
- Charts use the already-installed `recharts` via `@/components/ui/chart` so colours come
  from the existing design tokens; calendar uses the existing `@/components/ui/calendar`
  with a custom day modifier for the session dots.
- Read-only: no changes to types, storage, templates, or the workout engine.
