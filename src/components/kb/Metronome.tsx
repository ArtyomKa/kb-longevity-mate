import { useEffect, useState } from "react";
import { beep } from "@/lib/kb-feedback";

const PHASES = [
  { label: "Down", secs: 3 },
  { label: "Pause", secs: 1 },
  { label: "Up", secs: 3 },
] as const;

export function Metronome({ sound }: { sound: boolean }) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  const cycle = tick % 7;
  const phaseIndex = cycle < 3 ? 0 : cycle < 4 ? 1 : 2;
  const phase = PHASES[phaseIndex];
  const inPhase = cycle < 3 ? cycle : cycle < 4 ? 0 : cycle - 4;

  useEffect(() => {
    if (!sound) return;
    const c = tick % 7;
    beep(c === 0 ? 980 : c === 4 ? 780 : 520, 70, 0.08);
  }, [tick, sound]);

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="font-display text-lg uppercase tracking-widest text-muted-foreground">
          Tempo 3-1-3
        </span>
        <span className="font-display text-2xl font-bold text-primary">{phase.label}</span>
      </div>
      <div className="flex gap-1">
        {PHASES.flatMap((p, pi) =>
          Array.from({ length: p.secs }).map((_, i) => (
            <div
              key={`${pi}-${i}`}
              className={`h-3 flex-1 rounded-full transition-colors ${
                pi === phaseIndex && i === inPhase
                  ? "bg-primary"
                  : pi === phaseIndex
                    ? "bg-primary/40"
                    : "bg-muted"
              }`}
            />
          )),
        )}
      </div>
    </div>
  );
}
