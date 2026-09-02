# Timed exercises: Start button with live countdown

Timed exercises (e.g. "Step-Back Toe-to-Heel Taps — 2 min") currently log like rep sets: you tap "Complete Set" manually and there's no way to know when the time is up. This adds an inline drill timer: press Start, watch the countdown, and at 0:00 the set is marked complete and the rest timer kicks in automatically.

## What changes

### New `src/components/kb/DrillTimer.tsx`
An inline countdown for timed exercises:
- **Idle state:** big "Start 2:00" button (uses the exercise's `durationSec`).
- **Running state:** large `mm:ss` countdown display, a thin progress bar, and "Stop early" / "Reset" buttons.
- **Stop early:** marks the set complete immediately (for when you finish a drill ahead of time) and starts the rest timer — same as hitting 0:00.
- **Reset:** returns to idle without logging anything.
- On reaching 0:00: chime + haptic buzz (respecting Settings toggles), then the set is logged as completed and the existing `RestTimer` overlay opens for `restSec` seconds (skipped when `restSec` is 0).

### `src/routes/index.tsx`
- For `kind === "timed"` exercises, replace the manual Complete/Skip flow with the `DrillTimer` panel. The "Skip Set" button stays available.
- When the drill timer completes (naturally or via Stop early), it calls the same `bump("completed")` path, so set counting, auto-advance to the next exercise, extra sets, and rest all behave exactly like rep exercises.
- No changes to logging/export: timed sets already record "2 min" as the target.

## Notes / edge cases
- Timer state is intentionally not persisted to the session snapshot — if you leave mid-drill, that drill restarts from idle (logged sets are still preserved).
- Audio is unlocked on the Start tap, so the completion chime plays reliably on mobile.
- Countdown uses a wall-clock timestamp (end time) rather than naive interval ticks, so it stays accurate when the screen is briefly backgrounded.

## Technical details
- New component: `src/components/kb/DrillTimer.tsx` (props: `seconds`, `sound`, `haptics`, `onComplete`).
- Edits: `src/routes/index.tsx` — conditional render for timed exercises; reuse existing `bump("completed")`.
- Reuses `chime`/`buzz` from `src/lib/kb-feedback.ts` and the existing `RestTimer` component. No new dependencies.
