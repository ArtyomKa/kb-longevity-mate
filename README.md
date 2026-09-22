# Kettlebell Flow (82)

Build a clean, mobile-first Progressive Web App (PWA) called "Kettlebell Longevity Tracker" designed for single/dual-kettlebell training on a 2-mat footprint.



### Core Visual Design & UI:

- Dark mode by default (slate/zinc background) with high-contrast, large touch targets suitable for sweaty hands during workouts.

- Minimal navigation: 3 tabs -> [Workout], [History / Logs], [Settings / Templates].



### Workout Engine & Templates:

Pre-configure 3 default workout routines (editable by the user):

1. **Day A: Hinge & Push**

   - Step-Back Toe-to-Heel Taps: 2 mins

   - KB Halos: 2 sets × 5 reps/dir (10 kg)

   - Bodyweight Air Squats: 1 set × 10 reps

   - 2-Handed Swings: 3 sets × 12–15 reps (14 kg, Rest: 90s)

   - Single-Arm Overhead Press: 3 sets × 6–8 reps/side (10 kg, Rest: 90s)

   - Suitcase March: 3 sets × 10 marches/leg (14 kg, Rest: 60s)

2. **Day B: Squat & Pull**

   - Step-Back Toe-to-Heel Taps: 2 mins

   - KB Halos: 2 sets × 5 reps/dir (10 kg)

   - Goblet Squats: 3 sets × 8 reps (10 kg, 3-1-3 tempo, Rest: 90s)

   - Supported Single-Arm Row: 3 sets × 8–10 reps/side (14 kg, Rest: 60s)

   - Two-Handed Horn Curls: 3 sets × 10 reps (10 kg/14 kg, Rest: 60s)

3. **Day C: Full-Body Recovery Flow**

   - 10 kg Swings, 10 kg Squats, 10 kg Rows, 10 kg Suitcase March (2–3 sets each).



### Interactive Workout Mode:

- **Big One-Tap Buttons:** "Complete Set", "Skip Set", "Quick Weight Switch" (toggle between 10 kg and 14 kg instantly).

- **Auto Rest Timer:** Full-screen circular countdown with sound/haptic feedback when rest is finished (configurable 60s, 75s, 90s).

- **Tempo Metronome (Optional Toggle):** Visual/audio 3-1-3 tempo pacer (3s down, 1s pause, 3s up).

- **Quick Biofeedback Prompt at end of workout:**

  - Energy level (1–10 slider)

  - Left vs. Right leg compensation check (toggle/notes)

  - Joint/Back notes field.



### AI Export Integration (Crucial Feature):

- Include an **"Export Weekly Summary for AI"** button in the History tab.

- Clicking this copies a perfectly formatted Markdown summary of completed workouts for the week (Exercises, Weights, Sets, Reps, RPE, and Biofeedback notes) to the clipboard so it can be paste

d directly into an AI chat session.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://kb-longevity-mate.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/7ca52c47-597f-4eca-9891-d2090c63ef43).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
