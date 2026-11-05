# Session report without the AI prompt

## What changes
- **Copy session** (inside a history entry) copies only the session data: date, routine, duration, the exercise table and biofeedback. The closing "Please review this week's kettlebell training…" line and the `---` divider above it are removed.
- The heading still shows the session date. The "Sessions completed" line is dropped, since a single-session report doesn't need it.
- **Export Weekly Summary for AI** stays as it is, prompt included.

## Technical notes
- `buildWeeklyMarkdown(logs, ref, { includePrompt = true })` in `src/lib/kb-export.ts`: skip the footer when `includePrompt` is false.
- Add `buildSessionMarkdown(log)` that reuses the per-session block with no week header and no footer. Call it from the Copy session button in `src/routes/history.tsx`.
