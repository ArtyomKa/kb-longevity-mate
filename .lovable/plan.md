# Record RPE for timed exercises

Timed drills currently jump straight from the countdown to the rest timer at 0:00, so the RPE row on the exercise card is never reachable for timed exercises (the drill auto-completes and the session advances). Rep exercises don't have this problem because the user taps "Complete Set" manually and can rate RPE first.

## What changes

### `src/components/kb/DrillTimer.tsx` — add a "rate it" step after the drill ends
- When the countdown hits 0:00 (or "Finish early" is tapped), the timer no longer completes immediately. It switches to a **done state** inside the same panel:
  - "Nice work — how hard was that?" with the familiar 1–10 RPE button row (same look as the rep-exercise RPE row).
  - A "Skip rating" text button for users who don't want to rate.
- Picking a number (or skipping) then fires `onComplete`, which runs the existing `bump("completed")` path — set logged, rest timer starts, auto-advance — exactly as today.
- The chime/haptic still fires at 0:00, so the user knows the drill is over even before rating.

### `src/routes/index.tsx` — wire the rating through
- Pass a new `onRate(rpe: number | null)`-style callback (or extend `onComplete` to carry the rating) so the chosen RPE is written into the exercise's session progress via `patchProgress(exercise.id, { rpe })` right before `bump("completed")` runs.
- No changes to logging, export, history, or the rest timer — `rpe` already flows into the workout log from session progress.

## Notes / edge cases
- Rating is per exercise (not per set), matching how rep exercises store RPE — for multi-set timed drills the last rating wins, same as today.
- If the user navigates away mid-rating, the set simply isn't logged yet — same behavior as pausing before tapping "Complete Set" on a rep exercise.
- "Finish early" also lands on the rating step, so early finishes can be rated too.

## Technical details
- Edits: `src/components/kb/DrillTimer.tsx` (new done/rating state, RPE row UI), `src/routes/index.tsx` (pass rating callback, persist RPE before completing).
- No new dependencies, no schema or storage changes — `SessionProgress.rpe` and the log's `rpe` field already exist.
