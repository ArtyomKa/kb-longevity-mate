# Import training templates from JSON

## What you get

1. **A public JSON schema** at `/kb-template-schema.json` — a stable URL you can hand to an LLM agent ("generate a plan matching this schema"). It describes a workout plan: a list of templates, each with a name, subtitle, and exercises (timed or rep-based, with sets, reps, per-side, weight, tempo, rest, note).

2. **Import in Settings** — a new "Import plan" card at the top of the Templates page with:
   - a large paste area for the JSON (plus a "Choose file" button for `.json` files),
   - a **Copy schema link** button so you can grab the URL to give your agent,
   - a **Preview** step: after pasting, the app validates the JSON and shows what will happen — e.g. "Day A — Hinge & Push (6 exercises) — replaces existing", "Day D — Conditioning (4 exercises) — new".
   - a choice of **Merge** (templates with a matching id/name overwrite those, others are added) or **Replace all** (your template list becomes exactly what's in the file).
   - Confirm applies it; a toast confirms how many templates were imported.

3. **Clear errors** — invalid JSON or a mismatched shape shows a plain-language list of problems ("exercise 2 in Day A: `sets` must be a number") instead of failing silently. Nothing is changed until validation passes and you confirm.

4. **Export current plan** (small companion button) — copies your current templates as schema-valid JSON, so you can give your agent your existing plan as a starting point.

## Behaviour details

- Missing optional fields get sensible defaults (sets 3, reps "10", rest from your default rest setting, weight = bodyweight).
- Exercise ids are generated when the file omits them, so an agent doesn't need to invent them.
- Import only touches templates. Logs, settings and any in-progress session are untouched. If a session is active for a template that gets replaced, you're warned before applying.
- Everything stays local; no backend.

## Technical notes

- `public/kb-template-schema.json`: JSON Schema (draft 2020-12) describing `{ version, templates: Template[] }`, mirroring `Exercise`/`Template` in `src/lib/kb-types.ts`, with descriptions and examples so an LLM produces good output.
- New `src/lib/kb-template-import.ts`: zod schema mirroring the JSON Schema + `parsePlan(raw): { ok: true, templates } | { ok: false, errors: string[] }`, normalisation/defaults, id generation, and `serializePlan(templates)` for export. Pure functions, unit-testable.
- New `src/components/kb/ImportPlanCard.tsx`: paste/file input, validation preview, merge vs replace radio, confirm — writes through the existing `useTemplates()` setter. Rendered at the top of `src/routes/settings.tsx`.
- Schema URL built from `window.location.origin` so it works in preview and published.
- No schema/backend changes.
