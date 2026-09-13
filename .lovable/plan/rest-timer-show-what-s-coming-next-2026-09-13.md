# Rest timer: show what's coming next

During the full-screen rest timer, display a short text preview of the upcoming set so the user knows what to prepare for while resting.

## What changes

### `src/components/kb/RestTimer.tsx`
- Add an optional `nextPreview?: string` prop.
- Render the preview below the circular timer and above the action buttons.
- Keep the existing layout and auto-dismiss behaviour untouched.

### `src/routes/index.tsx`
- Compute the upcoming set/exercise before the `RestTimer` is mounted.
- Logic:
  - If the current exercise still has sets remaining, preview the same exercise (e.g. "Up next: 2-Handed Swings — Set 2 of 3 · 14 kg").
  - If the current exercise is finished and another exercise follows, preview the next exercise (e.g. "Up next: Single-Arm Overhead Press — 6-8 reps / side · 10 kg").
  - For timed exercises, show duration instead of reps (e.g. "Up next: Step-Back Toe-to-Heel Taps — 2 min").
  - If nothing remains, show "Last set — finish strong" or similar.
- Pass the computed string into `<RestTimer nextPreview={...} />`.

## Notes
- No persistence or state changes: this is a read-only UI addition.
- Uses existing `setsFor`, `progress`, and `active.exercises` data already available in the workout page.
