# Add extra sets mid-workout + optional template update

## What you get

1. **Add set** — on the active exercise card, a button that adds one more set to today's exercise, cloned from the template set (same weight, same rep target). Works even after all planned sets are done, so you can keep going. A small "remove added set" control appears if you add one by mistake.

2. **Update template on finish** — when a session's actual work differs from the template (weight changed, set count changed, or logged reps consistently differ from the target), the biofeedback screen shows a "Save changes to Day X template?" card listing each change in plain language (e.g. "Goblet Squats: 10 kg → 14 kg", "2-Handed Swings: 3 → 4 sets", "Single-Arm Row: 8-10 → 10 reps"). Each row has a checkbox; you pick which ones to keep. Unchecked changes are ignored and the template stays as-is. Saving the session applies the checked changes to the template.

## Behaviour details

- Extra sets count toward the progress bar and the exercise list counters.
- The log/history and AI export record the actual number of sets performed, as they already do.
- Rep change is only proposed when at least half the logged sets for that exercise land on the same number and it differs from the template target; that number becomes the new target.
- Weight change is proposed when the weight used differs from the template weight for that exercise.
- If nothing changed, no card is shown — finishing works exactly as today.

## Technical notes

- `SessionProgress` in `src/lib/kb-store.ts` gains `extraSets: number`; effective set count for an exercise becomes `exercise.sets + extraSets`. All places in `src/routes/index.tsx` that read `exercise.sets` (setsLeft, totalSets, per-exercise list, done check, save entries `setsPlanned`) switch to that helper.
- New `src/lib/kb-template-diff.ts` builds a list of `{ exerciseId, field, from, to, label }` from the active template plus session progress; pure function, no UI.
- The biofeedback screen in `src/routes/index.tsx` renders the diff list with checkboxes; `saveWorkout` applies the selected patches through `setTemplates` before clearing the session.
- No backend or schema changes; everything stays in local storage.
