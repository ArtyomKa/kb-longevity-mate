let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx) ctx = new Ctor();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

export function beep(freq = 880, durationMs = 160, gain = 0.15) {
  const c = audio();
  if (!c) return;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = "sine";
  osc.frequency.value = freq;
  g.gain.setValueAtTime(gain, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + durationMs / 1000);
  osc.connect(g).connect(c.destination);
  osc.start();
  osc.stop(c.currentTime + durationMs / 1000);
}

export function chime() {
  beep(660, 180);
  setTimeout(() => beep(880, 180), 190);
  setTimeout(() => beep(1180, 300), 380);
}

export function buzz(pattern: number | number[] = 40) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(pattern);
  }
}

export function unlockAudio() {
  audio();
}
