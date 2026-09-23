# Backup & restore all your data

A full backup you can save off your phone and bring back later (or onto another device).

## What you get

In **Templates** (settings), a new **Backup & restore** card below the plan import:

1. **Export backup** — downloads a single `.json` file containing everything: your whole training history, your templates, and your settings. Filename includes the date, e.g. `kettlebell-backup-2026-09-23.json`. A second small button copies the same content to the clipboard if you'd rather paste it somewhere.

2. **Restore backup** — pick a file (or paste the text). Before anything changes you see a preview:
   - "142 sessions in file — 118 already here, 24 new"
   - "3 templates — 2 match existing, 1 new"
   - "Settings will be updated"
   Then **Restore** applies it.

## How merging works

- **History:** sessions are matched by their id; a session already in the app is skipped, so restoring the same file twice changes nothing. New sessions are added and the list stays sorted by date.
- **Templates:** a template with a matching id overwrites that one, others are added. Nothing is deleted.
- **Settings:** values from the file replace your current ones (they're a single small set, not a list).
- An in-progress workout is left alone; you're warned if its routine is about to be overwritten.

## Errors

A file that isn't a valid backup shows a plain-language list of what's wrong and changes nothing.

## Technical notes

- New `src/lib/kb-backup.ts`: zod schema `{ version: 1, exportedAt, templates, logs, settings }`, `parseBackup(raw)` returning `{ ok, data } | { ok: false, errors }`, `mergeBackup(current, incoming)` returning merged values plus counts for the preview, and `serializeBackup()`. Reuses the existing template schema/normalisation from `kb-template-import.ts`; logs validated against `WorkoutLog` (tolerant of missing optional fields like `repsDone`).
- New `src/components/kb/BackupCard.tsx`: export (Blob + object URL download), file/paste input, preview counts, confirm — writes via `useTemplates()`, `useLogs()`, `useSettings()` setters. Rendered in `src/routes/settings.tsx`.
- Pure functions in `kb-backup.ts` so merge logic stays testable. No backend; everything stays on the device.
