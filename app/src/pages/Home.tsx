import { useEffect, useMemo, useState } from "react";
import { trpc } from "@/providers/trpc";
import { useStopwatch } from "@/hooks/useStopwatch";
import { TimerRing } from "@/components/TimerRing";
import { Feed, type FeedSession } from "@/components/Feed";
import { RoomStats, type RoomStat } from "@/components/RoomStats";
import { SettingsPanel } from "@/components/SettingsPanel";
import { Onboarding } from "@/pages/Onboarding";
import { fmtClock, fmtDur } from "@/lib/format";
import {
  applyTheme,
  loadTheme,
  saveTheme,
  type StoredThemeShape,
} from "@/lib/theme";

const UID_KEY = "zero:uid";
const GOAL_KEY = "zero:goal";
const ROOM_KEY = "zero:active-room";
const GOALS = [10, 45, 90, 120, 180];

const QUOTES = [
  "the work is the reward",
  "quietly, then all at once",
  "no one is coming to save the syllabus",
  "small hours add up",
  "show up, then show up again",
];

export default function Home() {
  const [uid, setUid] = useState<string | null>(() => localStorage.getItem(UID_KEY));
  const [activeRoomId, setActiveRoomId] = useState<string | null>(() => localStorage.getItem(ROOM_KEY));
  const [theme, setThemeState] = useState<StoredThemeShape>(loadTheme);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [goalMin, setGoalMin] = useState<number>(() => Number(localStorage.getItem(GOAL_KEY)) || 120);
  const [stopOpen, setStopOpen] = useState(false);
  const [wastedMin, setWastedMin] = useState("0");
  const [note, setNote] = useState("");
  const [nowTick, setNowTick] = useState(0);
  const [endless, setEndless] = useState(false);
  const [view, setView] = useState<"feed" | "stats">("feed");

  const timer = useStopwatch();
  const utils = trpc.useUtils();

  const state = trpc.zero.state.useQuery(
    { userId: uid ?? "", roomId: activeRoomId ?? undefined },
    { enabled: !!uid, refetchInterval: 8000 },
  );
  const stats = trpc.zero.stats.useQuery({ roomId: state.data?.room?.id ?? "" }, { enabled: !!state.data?.room, refetchInterval: 8000 });

  const startSession = trpc.zero.startSession.useMutation();
  const stopSession = trpc.zero.stopSession.useMutation();
  const discardSession = trpc.zero.discardSession.useMutation();
  const rename = trpc.zero.rename.useMutation();
  const leaveRoom = trpc.zero.leaveRoom.useMutation();

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
        onRoomReady={(roomId) => { localStorage.setItem(ROOM_KEY, roomId); setActiveRoomId(roomId); utils.zero.state.invalidate(); }}
      />
    );
  }

  const room = state.data?.room ?? null;
  const me = state.data?.members.find((m) => m.id === uid);
  const feed = (state.data?.feed ?? []) as FeedSession[];
  const live = ((state.data?.live ?? []) as FeedSession[]).filter((s) => s.userId !== uid);

  const goalSec = goalMin * 60;
  const progress = endless ? 1 : timer.elapsedSec / goalSec;

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
    setEndless(false);
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
    setEndless(false);
    setStopOpen(false);
    utils.zero.state.invalidate();
  };

  const netPreview = Math.max(
    0,
    timer.elapsedSec - Math.max(0, Math.round(Number(wastedMin) * 60) || 0),
  );

  return (
    <main className={`min-h-dvh ${endless && timer.status !== "idle" ? "abyss-mode" : ""}`} style={{ background: "var(--z-bg)" }}>
      {endless && timer.status !== "idle" && <div className="abyss-sky" aria-hidden><i /><i /><i /><span className="abyss-koi">◌</span><span className="abyss-koi koi-two">◌</span></div>}
      <div className="mx-auto max-w-xl px-6 pb-24">
        {/* header */}
        <header className="flex items-baseline justify-between pt-8 pb-6">
          <div>
            <div className="text-2xl leading-none">Koi</div>
            {room && (
              <div className="text-sm italic mt-1" style={{ color: "var(--z-textMuted)" }}>
                {room.name}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="text-sm underline underline-offset-4 hover:opacity-70 transition-opacity"
            style={{ color: "var(--z-textMuted)" }}
          >
            settings
          </button>
        </header>

        {/* timer */}
        <section className="flex flex-col items-center pt-6 pb-10">
          <div className="relative">
            <TimerRing progress={progress} running={timer.status === "running"} />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div
                className="text-6xl tabular-nums leading-none"
                style={{ color: "var(--z-text)", fontVariantNumeric: "tabular-nums" }}
                aria-live="off"
              >
                {fmtClock(timer.elapsedSec)}
              </div>
              <div className="text-sm italic mt-3 px-8 text-center" style={{ color: "var(--z-textMuted)" }}>
                {timer.status === "idle" ? quote : endless ? "into the abyss" : `of ${fmtDur(goalSec)}`}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 mt-10">
            {timer.status === "idle" && (
              <>
                <button
                  type="button"
                  onClick={handleStart}
                  disabled={startSession.isPending}
                  className="px-10 py-3.5 rounded-full text-lg transition-opacity disabled:opacity-40 hover:opacity-85"
                  style={{ background: "var(--z-accent)", color: "var(--z-bg)" }}
                >
                  begin
                </button>
                <button type="button" onClick={() => { setEndless(true); handleStart(); }} disabled={startSession.isPending} className="w-12 h-12 rounded-full text-xl transition-transform hover:scale-110" style={{ background: "var(--z-surface)", color: "var(--z-accent)", border: "1px solid color-mix(in srgb, var(--z-accent) 35%, transparent)" }} aria-label="Begin endless focus mode" title="Endless focus mode">∞</button>
              </>
            )}
            {timer.status === "running" && (
              <>
                <button
                  type="button"
                  onClick={timer.pause}
                  className="px-8 py-3.5 rounded-full text-lg transition-opacity hover:opacity-80"
                  style={{
                    background: "transparent",
                    color: "var(--z-text)",
                    border: "1px solid color-mix(in srgb, var(--z-text) 30%, transparent)",
                  }}
                >
                  pause
                </button>
                <button
                  type="button"
                  onClick={openStop}
                  className="px-8 py-3.5 rounded-full text-lg transition-opacity hover:opacity-85"
                  style={{ background: "var(--z-accent)", color: "var(--z-bg)" }}
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
                  className="px-8 py-3.5 rounded-full text-lg transition-opacity hover:opacity-85"
                  style={{ background: "var(--z-accent)", color: "var(--z-bg)" }}
                >
                  resume
                </button>
                <button
                  type="button"
                  onClick={openStop}
                  className="px-8 py-3.5 rounded-full text-lg transition-opacity hover:opacity-80"
                  style={{
                    background: "transparent",
                    color: "var(--z-text)",
                    border: "1px solid color-mix(in srgb, var(--z-text) 30%, transparent)",
                  }}
                >
                  done
                </button>
              </>
            )}
          </div>

          {timer.status === "idle" && (
            <div className="flex flex-wrap justify-center items-center gap-2 mt-8" role="group" aria-label="Session goal">
              {GOALS.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => {
                    setGoalMin(g);
                    localStorage.setItem(GOAL_KEY, String(g));
                  }}
                  className="px-3 py-1.5 rounded-full text-sm transition-colors"
                  style={{
                    background: goalMin === g ? "var(--z-surface)" : "transparent",
                    color: goalMin === g ? "var(--z-accent)" : "var(--z-textMuted)",
                  }}
                  aria-pressed={goalMin === g}
                >
                  {fmtDur(g * 60)}
                </button>
              ))}
              <button type="button" onClick={() => { const value = window.prompt("Custom session length in minutes", String(goalMin)); const minutes = Number(value); if (Number.isFinite(minutes) && minutes >= 10 && minutes <= 1440) { setGoalMin(Math.round(minutes)); localStorage.setItem(GOAL_KEY, String(Math.round(minutes))); } }} className="px-3 py-1.5 rounded-full text-sm" style={{ color: "var(--z-textMuted)", border: "1px solid color-mix(in srgb, var(--z-text) 16%, transparent)" }}>custom</button>
            </div>
          )}
        </section>

        {/* feed */}
        <section aria-label="Room feed">
          <div className="flex items-center justify-between pb-2">
            <h2 className="text-xs uppercase tracking-[0.18em]" style={{ color: "var(--z-textMuted)" }}>{view === "feed" ? "The feed" : "Room standings"}</h2>
            <button type="button" onClick={() => setView(v => v === "feed" ? "stats" : "feed")} className="text-sm underline underline-offset-4" style={{ color: "var(--z-textMuted)" }}>{view === "feed" ? "statistics" : "feed"}</button>
          </div>
          {view === "feed" ? <Feed
            live={live}
            feed={feed}
            meId={uid}
            liveElapsed={(s) => {
              void nowTick;
              return Math.max(0, Math.floor((Date.now() - new Date(s.startedAt).getTime()) / 1000));
            }}
          /> : <RoomStats rows={(stats.data ?? []) as RoomStat[]} meId={uid} />}
        </section>
      </div>

      {/* stop dialog */}
      {stopOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-label="End session">
          <button type="button" aria-label="Cancel" className="absolute inset-0 bg-black/50" onClick={() => setStopOpen(false)} />
          <div
            className="relative z-10 w-full max-w-md m-0 sm:m-6 p-6 rounded-t-2xl sm:rounded-2xl"
            style={{ background: "var(--z-surface)" }}
          >
            <h2 className="text-2xl mb-1">Session over</h2>
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
                    color: "var(--z-text)",
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
                  color: "var(--z-text)",
                  borderBottom: "1px solid color-mix(in srgb, var(--z-text) 25%, transparent)",
                }}
              />
            </label>

            <p className="mb-6 text-base" style={{ color: "var(--z-textMuted)" }}>
              Net: <span className="text-xl" style={{ color: netPreview >= 1500 ? "var(--z-accent)" : "var(--z-danger)" }}>{fmtDur(netPreview)}</span>
              {netPreview < 600 && <span className="text-sm"> — under 10m, won't count</span>}
            </p>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={confirmStop}
                className="flex-1 py-3 rounded-lg text-lg transition-opacity hover:opacity-85"
                style={{ background: "var(--z-accent)", color: "var(--z-bg)" }}
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
            localStorage.removeItem(ROOM_KEY);
            setActiveRoomId(null);
            setSettingsOpen(false);
            utils.zero.state.invalidate();
          }}
        />
      )}
    </main>
  );
}
