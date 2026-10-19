import { useCallback, useEffect, useRef, useState } from "react";

export type TimerStatus = "idle" | "running" | "paused";

interface Persisted {
  status: TimerStatus;
  /** seconds accumulated before the current running stretch */
  accumulated: number;
  /** epoch ms when the current running stretch began */
  since: number | null;
  sessionId: string | null;
}

const KEY = "koi:timer";

function load(): Persisted {
  try {
    const raw = localStorage.getItem(KEY) || localStorage.getItem("zero:timer");
    if (raw) return JSON.parse(raw) as Persisted;
  } catch {
    /* ignore */
  }
  return { status: "idle", accumulated: 0, since: null, sessionId: null };
}

export function useStopwatch() {
  const [state, setState] = useState<Persisted>(load);
  const [, force] = useState(0);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    if (state.status !== "running") return;
    let last = 0;
    const tick = (t: number) => {
      if (t - last > 250) {
        last = t;
        force((n) => n + 1);
      }
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [state.status]);

  const elapsedSec =
    state.accumulated +
    (state.status === "running" && state.since ? Math.max(0, (Date.now() - state.since) / 1000) : 0);

  const start = useCallback((sessionId: string) => {
    setState({ status: "running", accumulated: 0, since: Date.now(), sessionId });
  }, []);

  const pause = useCallback(() => {
    setState((s) =>
      s.status === "running" && s.since
        ? { ...s, status: "paused", accumulated: s.accumulated + (Date.now() - s.since) / 1000, since: null }
        : s,
    );
  }, []);

  const resume = useCallback(() => {
    setState((s) => (s.status === "paused" ? { ...s, status: "running", since: Date.now() } : s));
  }, []);

  const reset = useCallback(() => {
    setState({ status: "idle", accumulated: 0, since: null, sessionId: null });
  }, []);

  return {
    status: state.status,
    elapsedSec: Math.floor(elapsedSec),
    sessionId: state.sessionId,
    start,
    pause,
    resume,
    reset,
  };
}
