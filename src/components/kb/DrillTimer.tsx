import { useEffect, useRef, useState } from "react";
import { Check, Play, RotateCcw } from "lucide-react";
import { buzz, chime, unlockAudio } from "@/lib/kb-feedback";

interface Props {
  seconds: number;
  sound: boolean;
  haptics: boolean;
  /** called when the drill reaches 0:00 or the user stops early, after the RPE step */
  onComplete: (rpe: number | null) => void;
}

function fmt(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function DrillTimer({ seconds, sound, haptics, onComplete }: Props) {
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [left, setLeft] = useState(seconds);
  const endAt = useRef(0);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (!running) return;
    endAt.current = Date.now() + seconds * 1000;
    setLeft(seconds);
    const id = window.setInterval(() => {
      const remaining = Math.max(0, Math.ceil((endAt.current - Date.now()) / 1000));
      setLeft(remaining);
      if (remaining <= 0) {
        window.clearInterval(id);
        setRunning(false);
        setDone(true);
        if (sound) chime();
        if (haptics) buzz([120, 80, 120, 80, 240]);
      }
    }, 250);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  const stopEarly = () => {
    setRunning(false);
    setDone(true);
    if (haptics) buzz(45);
  };

  const finish = (rpe: number | null) => {
    onCompleteRef.current(rpe);
  };

  const pct = seconds === 0 ? 0 : left / seconds;

  if (done) {
    return (
      <div className="mt-4 rounded-2xl border border-primary/30 bg-card p-5">
        <p className="text-center font-display text-xl font-bold uppercase text-primary">
          Nice work
        </p>
        <p className="mt-1 text-center text-sm text-muted-foreground">
          How hard was that? (RPE 1–10)
        </p>
        <div className="mt-3 flex gap-1">
          {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              onClick={() => finish(n)}
              className="h-11 flex-1 rounded-lg bg-muted text-sm font-bold text-muted-foreground active:bg-primary active:text-primary-foreground"
            >
              {n}
            </button>
          ))}
        </div>
        <button
          onClick={() => finish(null)}
          className="mt-3 h-11 w-full rounded-xl text-sm font-semibold text-muted-foreground"
        >
          Skip rating
        </button>
      </div>
    );
  }

  if (!running) {
    return (
      <button
        onClick={() => {
          unlockAudio();
          setRunning(true);
        }}
        className="mt-4 flex h-20 w-full items-center justify-center gap-3 rounded-2xl bg-primary text-xl font-bold text-primary-foreground active:scale-[0.99]"
      >
        <Play className="size-7" /> Start {fmt(seconds)}
      </button>
    );
  }

  return (
    <div className="mt-4 rounded-2xl border border-primary/30 bg-card p-5">
      <p className="tabular text-center font-display text-6xl font-bold text-primary">{fmt(left)}</p>
      <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all duration-300"
          style={{ width: `${pct * 100}%` }}
        />
      </div>
      <div className="mt-4 flex gap-3">
        <button
          onClick={() => setRunning(false)}
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-border text-muted-foreground active:scale-95"
          aria-label="Reset drill timer"
        >
          <RotateCcw className="size-5" />
        </button>
        <button
          onClick={stopEarly}
          className="flex h-14 flex-1 items-center justify-center gap-2 rounded-xl bg-secondary text-base font-bold text-secondary-foreground active:scale-[0.99]"
        >
          <Check className="size-5" /> Finish early
        </button>
      </div>
    </div>
  );
}
