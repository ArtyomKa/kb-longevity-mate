# Reorder and copy/paste exercises in templates

Two additions to the Templates screen (Settings), both touch-friendly.

## 1. Drag to reorder

- Each exercise card in an expanded template gets a grip handle on the left.
- Press-and-hold the handle to lift the card, drag up/down to reposition, release to drop. Works with touch and mouse.
- The card lifts with a subtle shadow while dragging; the rest of the list shifts to show the drop position.
- Order is saved to the template immediately on drop.
- Dragging is limited to within one template (cross-template moves are handled by copy/paste below).

## 2. Copy and paste exercises between templates

- Each exercise card gets a "Copy" action (small icon next to the delete button).
- Copying puts the exercise on an in-app clipboard; a toast confirms ("Goblet Squats copied").
- When something is on the clipboard, every open template shows a "Paste exercise" button at the bottom of its exercise list, labelled with the copied exercise name.
- Pasting appends a duplicate at the end of that template with a fresh unique id, so both copies can be edited independently. The clipboard stays filled so the same exercise can be pasted into several days.
- A small "Clear" affordance next to the paste button empties the clipboard.

## Technical notes

- Add `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/modifiers` for the sortable list (touch sensor with a short activation delay so scrolling still works, restricted to the vertical axis).
- Extract the exercise editor block in `src/routes/settings.tsx` into a `SortableExerciseRow` component so it can be wrapped by `useSortable`.
- Reorder writes back through the existing `useTemplates` persisted store — no data model change.
- Clipboard is React state in the Templates page (not persisted across reloads), holding a copy of the `Exercise` object; paste regenerates `id` as `${templateId}-${Date.now()}`.
