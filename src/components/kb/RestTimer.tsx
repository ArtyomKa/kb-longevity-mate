import { useEffect, useRef, useState } from "react";
import { Plus, X } from "lucide-react";
import { buzz, chime } from "@/lib/kb-feedback";

interface Props {
  seconds: number;
  sound: boolean;
  haptics: boolean;
  onDone: () => void;
  onDismiss: () => void;
}

export function RestTimer({ seconds, sound, haptics, onDone, onDismiss }: Props) {
  const [total, setTotal] = useState(seconds);
  const [left, setLeft] = useState(seconds);
  const fired = useRef(false);

  useEffect(() => {
    const id = window.setInterval(() => setLeft((l) => Math.max(0, l - 1)), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (left === 0 && !fired.current) {
      fired.current = true;
      if (sound) chime();
      if (haptics) buzz([120, 80, 120, 80, 240]);
      onDone();
      const id = window.setTimeout(() => onDismiss(), 1200);
      return () => window.clearTimeout(id);
    }
    return undefined;
  }, [left, sound, haptics, onDone, onDismiss]);


  const pct = total === 0 ? 0 : left / total;
  const r = 130;
  const circumference = 2 * Math.PI * r;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-8 bg-background/98 px-6 backdrop-blur">
      <p className="font-display text-2xl uppercase tracking-[0.3em] text-muted-foreground">
        {left === 0 ? "Go" : "Rest"}
      </p>
      <div className="relative">
        <svg width="300" height="300" viewBox="0 0 300 300" className="-rotate-90">
          <circle cx="150" cy="150" r={r} fill="none" stroke="var(--muted)" strokeWidth="14" />
          <circle
            cx="150"
            cy="150"
            r={r}
            fill="none"
            stroke={left === 0 ? "var(--success)" : "var(--primary)"}
            strokeWidth="14"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - pct)}
            style={{ transition: "stroke-dashoffset 1s linear" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="tabular font-display text-7xl font-bold text-foreground">{left}</span>
          <span className="text-sm uppercase tracking-widest text-muted-foreground">seconds</span>
        </div>
      </div>
      <div className="flex w-full max-w-sm gap-3">
        <button
          onClick={() => {
            setTotal((t) => t + 30);
            setLeft((l) => l + 30);
            fired.current = false;
          }}
          className="flex h-16 flex-1 items-center justify-center gap-2 rounded-2xl bg-secondary text-lg font-bold text-secondary-foreground active:scale-[0.98]"
        >
          <Plus className="size-5" /> 30s
        </button>
        <button
          onClick={onDismiss}
          className="flex h-16 flex-[2] items-center justify-center gap-2 rounded-2xl bg-primary text-lg font-bold text-primary-foreground active:scale-[0.98]"
        >
          <X className="size-5" /> Skip rest
        </button>
      </div>
    </div>
  );
}
