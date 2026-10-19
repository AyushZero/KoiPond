import { useEffect, useMemo, useRef, useState } from "react";
import { trpc } from "@/providers/trpc";
import { useStopwatch } from "@/hooks/useStopwatch";
import { TimerRing } from "@/components/TimerRing";
import { Feed, type FeedSession } from "@/components/Feed";
import { Leaderboard } from "@/components/Leaderboard";
import { SettingsPanel } from "@/components/SettingsPanel";
import { EndlessCanvas } from "@/components/EndlessCanvas";
import { Onboarding } from "@/pages/Onboarding";
import { fmtClock, fmtDur } from "@/lib/format";
import {
  applyTheme,
  loadTheme,
  saveTheme,
  type StoredThemeShape,
} from "@/lib/theme";

const UID_KEY = "koi:uid";
const GOAL_KEY = "koi:goal";
const ENDLESS_KEY = "koi:endless";
const ROOM_KEY = "koi:room";
const GOALS = [25, 45, 90, 120];
const MIN_SESSION_SEC = 10 * 60; // 10 minutes minimum

const QUOTES = [
  "the work is the reward",
  "quietly, then all at once",
  "no one is coming to save the syllabus",
  "small hours add up",
  "show up, then show up again",
  "still waters run deep",
  "the fish swims against the stream",
];

export default function Home() {
  const [uid, setUid] = useState<string | null>(() => {
    return localStorage.getItem(UID_KEY) || localStorage.getItem("zero:uid");
  });
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(() => {
    return localStorage.getItem(ROOM_KEY);
  });
  const [theme, setThemeState] = useState<StoredThemeShape>(loadTheme);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [roomPickerOpen, setRoomPickerOpen] = useState(false);
  const [goalMin, setGoalMin] = useState<number>(() => Number(localStorage.getItem(GOAL_KEY)) || 45);
  const [isEndless, setIsEndless] = useState<boolean>(() => localStorage.getItem(ENDLESS_KEY) === "true");
  const [customGoalOpen, setCustomGoalOpen] = useState(false);
  const [customGoalInput, setCustomGoalInput] = useState("");
  const [activeTab, setActiveTab] = useState<"feed" | "leaderboard">("feed");

  // Ripple expansion animation state
  const [rippleActive, setRippleActive] = useState(false);
  const [ripplePos, setRipplePos] = useState({ x: 0, y: 0 });

  const [stopOpen, setStopOpen] = useState(false);
  const [wastedMin, setWastedMin] = useState("0");
  const [note, setNote] = useState("");
  const [nowTick, setNowTick] = useState(0);

  const timer = useStopwatch();
  const utils = trpc.useUtils();

  // URL query parameter ?room=CODE or ?join=CODE
  const joinMutation = trpc.zero.joinRoom.useMutation();

  const state = trpc.zero.state.useQuery(
    { userId: uid ?? "", roomId: currentRoomId ?? undefined },
    { enabled: !!uid, refetchInterval: 8000 },
  );

  const recentRooms = trpc.zero.recentRooms.useQuery(
    { userId: uid ?? "" },
    { enabled: !!uid && roomPickerOpen },
  );

  const startSession = trpc.zero.startSession.useMutation();
  const stopSession = trpc.zero.stopSession.useMutation();
  const discardSession = trpc.zero.discardSession.useMutation();
  const rename = trpc.zero.rename.useMutation();
  const leaveRoom = trpc.zero.leaveRoom.useMutation();

  // Keep koi:uid updated if it was in zero:uid
  useEffect(() => {
    if (uid) {
      localStorage.setItem(UID_KEY, uid);
    }
  }, [uid]);

  // Handle URL invite link query params ?room=CODE
  useEffect(() => {
    if (!uid) return;
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get("room") || params.get("join");
    if (roomParam) {
      joinMutation
        .mutateAsync({ userId: uid, code: roomParam.trim().toUpperCase() })
        .then((joined) => {
          setCurrentRoomId(joined.id);
          localStorage.setItem(ROOM_KEY, joined.id);
          // clean URL without reloading
          window.history.replaceState({}, "", window.location.pathname);
          utils.zero.state.invalidate();
        })
        .catch(() => {
          /* invalid room code */
        });
    }
  }, [uid]);

  // Sync active room ID from state if not set
  useEffect(() => {
    if (state.data?.room && (!currentRoomId || currentRoomId !== state.data.room.id)) {
      setCurrentRoomId(state.data.room.id);
      localStorage.setItem(ROOM_KEY, state.data.room.id);
    }
  }, [state.data?.room]);

  useEffect(() => applyTheme(theme), [theme]);

  // tick for live feed durations
  useEffect(() => {
    const id = setInterval(() => setNowTick((n) => n + 1), 15000);
    return () => clearInterval(id);
  }, []);

  const setTheme = (updater: (t: StoredThemeShape) => StoredThemeShape) => {
    setThemeState((t) => {
      const next = updater(t);
      saveTheme(next);
      return next;
    });
  };

  const quote = useMemo(() => QUOTES[new Date().getDate() % QUOTES.length], []);

  const toggleEndless = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setRipplePos({
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    });
    setRippleActive(true);
    setTimeout(() => setRippleActive(false), 1400);

    const next = !isEndless;
    setIsEndless(next);
    localStorage.setItem(ENDLESS_KEY, String(next));
  };

  const selectGoal = (g: number) => {
    setIsEndless(false);
    localStorage.setItem(ENDLESS_KEY, "false");
    setGoalMin(g);
    localStorage.setItem(GOAL_KEY, String(g));
    setCustomGoalOpen(false);
  };

  const applyCustomGoal = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseInt(customGoalInput, 10);
    if (!isNaN(val) && val >= 5 && val <= 720) {
      selectGoal(val);
    }
  };

  if (!uid) {
    return (
      <Onboarding
        hasIdentity={false}
        userId={null}
        onIdentified={(id) => {
          localStorage.setItem(UID_KEY, id);
          setUid(id);
        }}
      />
    );
  }

  if (state.isLoading) {
    return (
      <main className="min-h-dvh flex items-center justify-center" style={{ background: "var(--z-bg)" }}>
        <span className="italic" style={{ color: "var(--z-textMuted)" }}>
          loading…
        </span>
      </main>
    );
  }

  if (state.data && !state.data.room) {
    return (
      <Onboarding
        hasIdentity
        userId={uid}
        onIdentified={() => {}}
        onRoomReady={(roomId) => {
          if (roomId) {
            setCurrentRoomId(roomId);
            localStorage.setItem(ROOM_KEY, roomId);
          }
          utils.zero.state.invalidate();
        }}
      />
    );
  }

  const room = state.data?.room ?? null;
  const me = state.data?.members.find((m) => m.id === uid);
  const feed = (state.data?.feed ?? []) as FeedSession[];
  const live = ((state.data?.live ?? []) as FeedSession[]).filter((s) => s.userId !== uid);

  const goalSec = goalMin * 60;
  const progress = isEndless ? 0 : timer.elapsedSec / goalSec;

  const handleStart = async () => {
    if (!room) return;
    try {
      const s = await startSession.mutateAsync({ userId: uid, roomId: room.id });
      timer.start(s.id);
      utils.zero.state.invalidate();
    } catch {
      /* server unreachable — stay idle */
    }
  };

  const openStop = () => {
    setWastedMin("0");
    setNote("");
    setStopOpen(true);
  };

  const confirmStop = async () => {
    if (!timer.sessionId) return;
    const wasted = Math.max(0, Math.min(Math.floor(timer.elapsedSec), Math.round(Number(wastedMin) * 60) || 0));
    try {
      await stopSession.mutateAsync({
        sessionId: timer.sessionId,
        elapsedSec: timer.elapsedSec,
        wastedSec: wasted,
        note: note.trim() || undefined,
      });
    } catch {
      /* still reset locally */
    }
    timer.reset();
    setStopOpen(false);
    utils.zero.state.invalidate();
  };

  const discard = async () => {
    if (timer.sessionId) {
      try {
        await discardSession.mutateAsync({ sessionId: timer.sessionId });
      } catch {
        /* ignore */
      }
    }
    timer.reset();
    setStopOpen(false);
    utils.zero.state.invalidate();
  };

  const netPreview = Math.max(
    0,
    timer.elapsedSec - Math.max(0, Math.round(Number(wastedMin) * 60) || 0),
  );

  // Dynamic visual styling for Endless Abyss mode
  const isDarkAbyss = isEndless && theme.mode === "dark";
  const bgStyle = isDarkAbyss ? "#000000" : "var(--z-bg)";
  const textColor = isDarkAbyss ? "#ffffff" : "var(--z-text)";

  return (
    <main
      className="min-h-dvh relative transition-colors duration-700 overflow-x-hidden"
      style={{ background: bgStyle }}
    >
      {/* Background ambient visuals: Koi fish, stars, clouds, abyss */}
      <EndlessCanvas
        active={isEndless || theme.showKoi}
        mode={theme.mode}
        showKoi={theme.showKoi}
      />

      {/* Ripple expansion wave on clicking endless button */}
      {rippleActive && (
        <div
          className="fixed pointer-events-none rounded-full z-10 animate-expand-ripple"
          style={{
            left: ripplePos.x,
            top: ripplePos.y,
            width: 80,
            height: 80,
            marginLeft: -40,
            marginTop: -40,
            background:
              theme.mode === "dark"
                ? "radial-gradient(circle, rgba(255,255,255,0.85) 0%, rgba(18,20,30,0.9) 50%, rgba(0,0,0,0.95) 100%)"
                : "radial-gradient(circle, rgba(210,154,106,0.5) 0%, rgba(244,238,227,0.8) 60%, transparent 100%)",
            boxShadow:
              theme.mode === "dark"
                ? "0 0 60px rgba(255,255,255,0.4)"
                : "0 0 40px rgba(210,154,106,0.3)",
          }}
        />
      )}

      <div className="relative z-10 mx-auto max-w-xl px-6 pb-24">
        {/* header */}
        <header className="flex items-baseline justify-between pt-8 pb-6">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl leading-none font-serif tracking-tight" style={{ color: textColor }}>
                Koi
              </span>
              {isEndless && (
                <span
                  className="text-[11px] uppercase tracking-widest px-2 py-0.5 rounded-full"
                  style={{
                    background: isDarkAbyss ? "rgba(255,255,255,0.12)" : "var(--z-surface)",
                    color: isDarkAbyss ? "#ffffff" : "var(--z-accent)",
                    border: isDarkAbyss ? "1px solid rgba(255,255,255,0.2)" : "none",
                  }}
                >
                  {theme.mode === "dark" ? "abyss" : "endless"}
                </span>
              )}
            </div>
            {room && (
              <button
                type="button"
                onClick={() => setRoomPickerOpen(true)}
                className="text-sm italic mt-1 flex items-center gap-1.5 hover:opacity-80 transition-opacity text-left"
                style={{ color: isDarkAbyss ? "rgba(255,255,255,0.6)" : "var(--z-textMuted)" }}
                title="Switch rooms"
              >
                <span>{room.name}</span>
                <span className="text-xs">▾</span>
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="text-sm underline underline-offset-4 hover:opacity-70 transition-opacity"
            style={{ color: isDarkAbyss ? "rgba(255,255,255,0.7)" : "var(--z-textMuted)" }}
          >
            settings
          </button>
        </header>

        {/* timer section */}
        <section className="flex flex-col items-center pt-6 pb-10">
          <div className="relative">
            <TimerRing
              progress={progress}
              running={timer.status === "running"}
              isEndless={isEndless}
              mode={theme.mode}
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div
                className="text-6xl tabular-nums leading-none tracking-tight font-light"
                style={{
                  color: textColor,
                  fontVariantNumeric: "tabular-nums",
                  textShadow: isDarkAbyss ? "0 0 25px rgba(255,255,255,0.3)" : "none",
                }}
                aria-live="off"
              >
                {fmtClock(timer.elapsedSec)}
              </div>
              <div
                className="text-sm italic mt-3 px-8 text-center"
                style={{ color: isDarkAbyss ? "rgba(255,255,255,0.55)" : "var(--z-textMuted)" }}
              >
                {timer.status === "idle"
                  ? quote
                  : isEndless
                    ? "endless drift"
                    : `of ${fmtDur(goalSec)}`}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 mt-10">
            {timer.status === "idle" && (
              <button
                type="button"
                onClick={handleStart}
                disabled={startSession.isPending}
                className="px-10 py-3.5 rounded-full text-lg transition-all duration-200 disabled:opacity-40 hover:opacity-90 active:scale-95"
                style={{
                  background: isDarkAbyss ? "#ffffff" : "var(--z-accent)",
                  color: isDarkAbyss ? "#000000" : "var(--z-bg)",
                  fontWeight: isDarkAbyss ? 500 : 400,
                  boxShadow: isDarkAbyss ? "0 0 20px rgba(255,255,255,0.35)" : "none",
                }}
              >
                begin
              </button>
            )}
            {timer.status === "running" && (
              <>
                <button
                  type="button"
                  onClick={timer.pause}
                  className="px-8 py-3.5 rounded-full text-lg transition-opacity hover:opacity-80 active:scale-95"
                  style={{
                    background: "transparent",
                    color: textColor,
                    border: `1px solid ${isDarkAbyss ? "rgba(255,255,255,0.3)" : "color-mix(in srgb, var(--z-text) 30%, transparent)"}`,
                  }}
                >
                  pause
                </button>
                <button
                  type="button"
                  onClick={openStop}
                  className="px-8 py-3.5 rounded-full text-lg transition-opacity hover:opacity-90 active:scale-95"
                  style={{
                    background: isDarkAbyss ? "#ffffff" : "var(--z-accent)",
                    color: isDarkAbyss ? "#000000" : "var(--z-bg)",
                    fontWeight: isDarkAbyss ? 500 : 400,
                  }}
                >
                  done
                </button>
              </>
            )}
            {timer.status === "paused" && (
              <>
                <button
                  type="button"
                  onClick={timer.resume}
                  className="px-8 py-3.5 rounded-full text-lg transition-opacity hover:opacity-90 active:scale-95"
                  style={{
                    background: isDarkAbyss ? "#ffffff" : "var(--z-accent)",
                    color: isDarkAbyss ? "#000000" : "var(--z-bg)",
                    fontWeight: isDarkAbyss ? 500 : 400,
                  }}
                >
                  resume
                </button>
                <button
                  type="button"
                  onClick={openStop}
                  className="px-8 py-3.5 rounded-full text-lg transition-opacity hover:opacity-80 active:scale-95"
                  style={{
                    background: "transparent",
                    color: textColor,
                    border: `1px solid ${isDarkAbyss ? "rgba(255,255,255,0.3)" : "color-mix(in srgb, var(--z-text) 30%, transparent)"}`,
                  }}
                >
                  done
                </button>
              </>
            )}
          </div>

          {/* Goal & Mode selector */}
          {timer.status === "idle" && (
            <div className="flex flex-wrap items-center justify-center gap-2 mt-8" role="group" aria-label="Session duration">
              {GOALS.map((g) => {
                const active = !isEndless && goalMin === g;
                return (
                  <button
                    key={g}
                    type="button"
                    onClick={() => selectGoal(g)}
                    className="px-3 py-1.5 rounded-full text-sm transition-colors"
                    style={{
                      background: active
                        ? isDarkAbyss
                          ? "rgba(255,255,255,0.15)"
                          : "var(--z-surface)"
                        : "transparent",
                      color: active
                        ? isDarkAbyss
                          ? "#ffffff"
                          : "var(--z-accent)"
                        : isDarkAbyss
                          ? "rgba(255,255,255,0.5)"
                          : "var(--z-textMuted)",
                      border: active && isDarkAbyss ? "1px solid rgba(255,255,255,0.25)" : "none",
                    }}
                    aria-pressed={active}
                  >
                    {fmtDur(g * 60)}
                  </button>
                );
              })}

              {/* Custom duration button */}
              <button
                type="button"
                onClick={() => setCustomGoalOpen(!customGoalOpen)}
                className="px-3 py-1.5 rounded-full text-sm transition-colors"
                style={{
                  background:
                    !isEndless && !GOALS.includes(goalMin)
                      ? isDarkAbyss
                        ? "rgba(255,255,255,0.15)"
                        : "var(--z-surface)"
                      : "transparent",
                  color:
                    !isEndless && !GOALS.includes(goalMin)
                      ? isDarkAbyss
                        ? "#ffffff"
                        : "var(--z-accent)"
                      : isDarkAbyss
                        ? "rgba(255,255,255,0.5)"
                        : "var(--z-textMuted)",
                }}
                aria-pressed={!isEndless && !GOALS.includes(goalMin)}
              >
                {!isEndless && !GOALS.includes(goalMin) ? `${goalMin}m` : "custom"}
              </button>

              {/* Endless mode button (0 / z / ∞) */}
              <button
                type="button"
                onClick={toggleEndless}
                title="Endless mode — expand into the expanse"
                aria-label="Toggle endless mode"
                className="w-8 h-8 rounded-full text-sm flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95"
                style={{
                  background: isEndless
                    ? isDarkAbyss
                      ? "#ffffff"
                      : "var(--z-accent)"
                    : isDarkAbyss
                      ? "rgba(255,255,255,0.1)"
                      : "color-mix(in srgb, var(--z-text) 8%, transparent)",
                  color: isEndless
                    ? isDarkAbyss
                      ? "#000000"
                      : "var(--z-bg)"
                    : isDarkAbyss
                      ? "rgba(255,255,255,0.7)"
                      : "var(--z-textMuted)",
                  border: isEndless
                    ? "none"
                    : `1px solid ${isDarkAbyss ? "rgba(255,255,255,0.25)" : "color-mix(in srgb, var(--z-text) 15%, transparent)"}`,
                  boxShadow: isEndless
                    ? isDarkAbyss
                      ? "0 0 15px rgba(255,255,255,0.6)"
                      : "0 0 10px rgba(194, 107, 69, 0.4)"
                    : "none",
                }}
              >
                {isEndless ? "∞" : "0"}
              </button>
            </div>
          )}

          {/* Custom duration popover */}
          {customGoalOpen && timer.status === "idle" && (
            <form onSubmit={applyCustomGoal} className="flex items-center gap-2 mt-3 animate-fade-in">
              <input
                type="number"
                min="5"
                max="720"
                value={customGoalInput}
                onChange={(e) => setCustomGoalInput(e.target.value)}
                placeholder="minutes"
                autoFocus
                className="w-24 px-3 py-1 text-sm rounded-lg bg-transparent outline-none text-center"
                style={{
                  color: textColor,
                  border: `1px solid ${isDarkAbyss ? "rgba(255,255,255,0.3)" : "color-mix(in srgb, var(--z-text) 25%, transparent)"}`,
                  fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
                }}
              />
              <button
                type="submit"
                className="px-3 py-1 rounded-lg text-xs uppercase tracking-wider transition-opacity hover:opacity-85"
                style={{
                  background: isDarkAbyss ? "#ffffff" : "var(--z-accent)",
                  color: isDarkAbyss ? "#000000" : "var(--z-bg)",
                }}
              >
                set
              </button>
            </form>
          )}
        </section>

        {/* Room feed & Leaderboard tabs */}
        <section aria-label="Room activity" className="mt-4">
          <div className="flex items-center justify-between pb-3 border-b mb-4" style={{ borderColor: isDarkAbyss ? "rgba(255,255,255,0.12)" : "color-mix(in srgb, var(--z-text) 10%, transparent)" }}>
            <div className="flex items-center gap-6">
              <button
                type="button"
                onClick={() => setActiveTab("feed")}
                className="text-xs uppercase tracking-[0.18em] transition-colors pb-1 relative"
                style={{
                  color: activeTab === "feed" ? textColor : "var(--z-textMuted)",
                  fontWeight: activeTab === "feed" ? 600 : 400,
                }}
              >
                The feed
                {activeTab === "feed" && (
                  <span
                    className="absolute bottom-[-13px] left-0 right-0 h-0.5"
                    style={{ background: isDarkAbyss ? "#ffffff" : "var(--z-accent)" }}
                  />
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("leaderboard")}
                className="text-xs uppercase tracking-[0.18em] transition-colors pb-1 relative"
                style={{
                  color: activeTab === "leaderboard" ? textColor : "var(--z-textMuted)",
                  fontWeight: activeTab === "leaderboard" ? 600 : 400,
                }}
              >
                Leaderboard
                {activeTab === "leaderboard" && (
                  <span
                    className="absolute bottom-[-13px] left-0 right-0 h-0.5"
                    style={{ background: isDarkAbyss ? "#ffffff" : "var(--z-accent)" }}
                  />
                )}
              </button>
            </div>
          </div>

          {activeTab === "feed" ? (
            <Feed
              live={live}
              feed={feed}
              meId={uid}
              liveElapsed={(s) => {
                void nowTick;
                return Math.max(0, Math.floor((Date.now() - new Date(s.startedAt).getTime()) / 1000));
              }}
            />
          ) : (
            <Leaderboard roomId={room?.id ?? ""} meId={uid} />
          )}
        </section>
      </div>

      {/* Stop / Waste logging dialog */}
      {stopOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          role="dialog"
          aria-modal="true"
          aria-label="End session"
        >
          <button
            type="button"
            aria-label="Cancel"
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setStopOpen(false)}
          />
          <div
            className="relative z-10 w-full max-w-md m-0 sm:m-6 p-6 rounded-t-2xl sm:rounded-2xl"
            style={{
              background: isDarkAbyss ? "#111114" : "var(--z-surface)",
              border: isDarkAbyss ? "1px solid rgba(255,255,255,0.15)" : "none",
            }}
          >
            <h2 className="text-2xl mb-1" style={{ color: textColor }}>
              Session over
            </h2>
            <p className="italic mb-6" style={{ color: "var(--z-textMuted)" }}>
              {fmtDur(timer.elapsedSec)} on the clock. Be honest — how much of it drifted?
            </p>

            <label className="flex flex-col gap-2 mb-5">
              <span className="text-xs uppercase tracking-[0.18em]" style={{ color: "var(--z-textMuted)" }}>
                Wasted minutes
              </span>
              <div className="flex items-center gap-3">
                <input
                  value={wastedMin}
                  onChange={(e) => setWastedMin(e.target.value.replace(/[^0-9]/g, ""))}
                  inputMode="numeric"
                  autoFocus
                  aria-label="Wasted minutes"
                  className="w-24 bg-transparent text-2xl py-1 outline-none text-center"
                  style={{
                    color: textColor,
                    borderBottom: "1px solid color-mix(in srgb, var(--z-text) 25%, transparent)",
                    fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
                  }}
                />
                <div className="flex gap-1.5">
                  {[0, 5, 10, 20].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setWastedMin(String(m))}
                      className="px-2.5 py-1 rounded-full text-sm transition-colors"
                      style={{
                        background: wastedMin === String(m) ? "var(--z-bg)" : "transparent",
                        color: "var(--z-textMuted)",
                        border: wastedMin === String(m) ? "1px solid color-mix(in srgb, var(--z-text) 20%, transparent)" : "none",
                      }}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            </label>

            <label className="flex flex-col gap-2 mb-6">
              <span className="text-xs uppercase tracking-[0.18em]" style={{ color: "var(--z-textMuted)" }}>
                Note <span className="normal-case tracking-normal italic">(optional)</span>
              </span>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={140}
                placeholder="systems design, ch. 4…"
                className="bg-transparent text-base py-1.5 outline-none placeholder:italic"
                style={{
                  color: textColor,
                  borderBottom: "1px solid color-mix(in srgb, var(--z-text) 25%, transparent)",
                }}
              />
            </label>

            <p className="mb-6 text-base" style={{ color: "var(--z-textMuted)" }}>
              Net:{" "}
              <span
                className="text-xl font-mono"
                style={{ color: netPreview >= MIN_SESSION_SEC ? "var(--z-accent)" : "var(--z-danger)" }}
              >
                {fmtDur(netPreview)}
              </span>
              {netPreview < MIN_SESSION_SEC && (
                <span className="text-sm"> — under 10m, won't count</span>
              )}
            </p>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={confirmStop}
                className="flex-1 py-3 rounded-lg text-lg transition-opacity hover:opacity-85"
                style={{
                  background: isDarkAbyss ? "#ffffff" : "var(--z-accent)",
                  color: isDarkAbyss ? "#000000" : "var(--z-bg)",
                }}
              >
                log it
              </button>
              <button
                type="button"
                onClick={discard}
                className="px-4 py-3 text-sm transition-opacity hover:opacity-70"
                style={{ color: "var(--z-danger)" }}
              >
                discard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Room switcher modal */}
      {roomPickerOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/50 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Switch room"
        >
          <div
            className="w-full max-w-sm p-6 rounded-2xl relative"
            style={{ background: "var(--z-surface)" }}
          >
            <div className="flex items-baseline justify-between mb-4">
              <h3 className="text-lg font-medium" style={{ color: "var(--z-text)" }}>
                Your rooms
              </h3>
              <button
                type="button"
                onClick={() => setRoomPickerOpen(false)}
                className="text-sm"
                style={{ color: "var(--z-textMuted)" }}
              >
                close
              </button>
            </div>

            <div className="flex flex-col gap-2 mb-4 max-h-60 overflow-y-auto">
              {(recentRooms.data ?? []).map((r) => {
                const isCurrent = r.id === room?.id;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => {
                      setCurrentRoomId(r.id);
                      localStorage.setItem(ROOM_KEY, r.id);
                      setRoomPickerOpen(false);
                      utils.zero.state.invalidate();
                    }}
                    className="flex items-center justify-between p-3 rounded-lg text-left transition-colors"
                    style={{
                      background: isCurrent ? "var(--z-bg)" : "transparent",
                      border: isCurrent
                        ? "1px solid var(--z-accent)"
                        : "1px solid color-mix(in srgb, var(--z-text) 10%, transparent)",
                    }}
                  >
                    <div>
                      <div
                        className="text-base"
                        style={{ color: isCurrent ? "var(--z-accent)" : "var(--z-text)" }}
                      >
                        {r.name}
                      </div>
                      <div
                        className="text-xs font-mono"
                        style={{ color: "var(--z-textMuted)" }}
                      >
                        {r.code}
                      </div>
                    </div>
                    {isCurrent && (
                      <span className="text-xs uppercase tracking-wider" style={{ color: "var(--z-accent)" }}>
                        active
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => {
                setRoomPickerOpen(false);
                // Clear active room to trigger Onboarding room creator/joiner
                setCurrentRoomId(null);
                localStorage.removeItem(ROOM_KEY);
                // invalidate to refresh
                utils.zero.state.invalidate();
              }}
              className="w-full py-2.5 rounded-lg text-sm text-center transition-opacity hover:opacity-85"
              style={{
                background: "transparent",
                color: "var(--z-accent)",
                border: "1px dashed color-mix(in srgb, var(--z-accent) 40%, transparent)",
              }}
            >
              + create or join another room
            </button>
          </div>
        </div>
      )}

      {/* Settings Panel */}
      {room && (
        <SettingsPanel
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          theme={theme}
          setTheme={setTheme}
          roomName={room.name}
          roomCode={room.code}
          userName={me?.name ?? ""}
          onRename={async (n) => {
            await rename.mutateAsync({ userId: uid, name: n });
            utils.zero.state.invalidate();
          }}
          onLeave={async () => {
            await leaveRoom.mutateAsync({ userId: uid, roomId: room.id });
            setCurrentRoomId(null);
            localStorage.removeItem(ROOM_KEY);
            setSettingsOpen(false);
            utils.zero.state.invalidate();
          }}
        />
      )}
    </main>
  );
}
