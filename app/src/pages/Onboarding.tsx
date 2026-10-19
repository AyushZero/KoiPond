import { useState } from "react";
import { trpc } from "@/providers/trpc";

interface Props {
  /** Called with the user id once identity exists and (optionally) a room is joined. */
  onIdentified: (userId: string) => void;
  hasIdentity: boolean;
  userId: string | null;
  onRoomReady?: (roomId?: string) => void;
}

export function Onboarding({ onIdentified, hasIdentity, userId, onRoomReady }: Props) {
  const [name, setName] = useState("");
  const [roomName, setRoomName] = useState("");
  const [code, setCode] = useState("");
  const [tab, setTab] = useState<"create" | "join">("create");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const identify = trpc.zero.identify.useMutation();
  const createRoom = trpc.zero.createRoom.useMutation();
  const joinRoom = trpc.zero.joinRoom.useMutation();
  const recentRooms = trpc.zero.recentRooms.useQuery(
    { userId: userId ?? "" },
    { enabled: !!userId && hasIdentity },
  );

  const submitName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || busy) return;
    setBusy(true);
    setError("");
    try {
      const user = await identify.mutateAsync({ name: name.trim() });
      onIdentified(user.id);
    } catch {
      setError("Couldn't reach the server. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const submitRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || busy) return;
    setBusy(true);
    setError("");
    try {
      let room;
      if (tab === "create") {
        if (!roomName.trim()) return;
        room = await createRoom.mutateAsync({ userId, name: roomName.trim() });
      } else {
        if (!code.trim()) return;
        room = await joinRoom.mutateAsync({ userId, code: code.trim().toUpperCase() });
      }
      if (onRoomReady) onRoomReady(room.id);
      else window.location.reload();
    } catch (err) {
      setError(tab === "join" ? "No room with that code." : "Couldn't create the room. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const rejoinRoom = async (roomId: string) => {
    if (onRoomReady) onRoomReady(roomId);
    else window.location.reload();
  };

  const recent = recentRooms.data ?? [];

  return (
    <main className="min-h-dvh flex items-center justify-center px-6" style={{ background: "var(--z-bg)" }}>
      <div className="w-full max-w-sm">
        <div className="mb-12 text-center">
          <div className="text-5xl mb-3" style={{ color: "var(--z-text)" }}>
            Koi
          </div>
          <p className="italic" style={{ color: "var(--z-textMuted)" }}>
            study quietly, prove it softly
          </p>
        </div>

        {!hasIdentity ? (
          <form onSubmit={submitName} className="flex flex-col gap-6">
            <label className="flex flex-col gap-2">
              <span className="text-xs uppercase tracking-[0.18em]" style={{ color: "var(--z-textMuted)" }}>
                What should friends call you?
              </span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={64}
                autoFocus
                placeholder="your name"
                className="bg-transparent text-xl py-2 outline-none placeholder:italic"
                style={{
                  color: "var(--z-text)",
                  borderBottom: "1px solid color-mix(in srgb, var(--z-text) 25%, transparent)",
                }}
              />
            </label>
            <button
              type="submit"
              disabled={!name.trim() || busy}
              className="py-3 rounded-lg text-lg transition-opacity disabled:opacity-40 hover:opacity-85"
              style={{ background: "var(--z-accent)", color: "var(--z-bg)" }}
            >
              continue
            </button>
          </form>
        ) : (
          <div>
            {/* Recent rooms */}
            {recent.length > 0 && (
              <section className="mb-8">
                <h3 className="text-xs uppercase tracking-[0.18em] mb-3" style={{ color: "var(--z-textMuted)" }}>
                  Recent rooms
                </h3>
                <div className="flex flex-col gap-2">
                  {recent.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => rejoinRoom(r.id)}
                      className="flex items-center justify-between py-3 px-4 rounded-lg text-left transition-opacity hover:opacity-85"
                      style={{ background: "var(--z-surface)" }}
                    >
                      <span className="text-base" style={{ color: "var(--z-text)" }}>
                        {r.name}
                      </span>
                      <span
                        className="text-sm"
                        style={{
                          color: "var(--z-textMuted)",
                          fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
                        }}
                      >
                        {r.code}
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* Separator if there are recent rooms */}
            {recent.length > 0 && (
              <div className="flex items-center gap-3 mb-6">
                <div className="flex-1 h-px" style={{ background: "color-mix(in srgb, var(--z-text) 12%, transparent)" }} />
                <span className="text-xs uppercase tracking-[0.18em]" style={{ color: "var(--z-textMuted)" }}>
                  or
                </span>
                <div className="flex-1 h-px" style={{ background: "color-mix(in srgb, var(--z-text) 12%, transparent)" }} />
              </div>
            )}

            <div
              className="flex mb-6 rounded-lg overflow-hidden"
              style={{ border: "1px solid color-mix(in srgb, var(--z-text) 15%, transparent)" }}
            >
              {(["create", "join"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className="flex-1 py-2.5 capitalize transition-colors"
                  style={{
                    background: tab === t ? "var(--z-accent)" : "transparent",
                    color: tab === t ? "var(--z-bg)" : "var(--z-textMuted)",
                  }}
                >
                  {t} a room
                </button>
              ))}
            </div>
            <form onSubmit={submitRoom} className="flex flex-col gap-6">
              {tab === "create" ? (
                <label className="flex flex-col gap-2">
                  <span className="text-xs uppercase tracking-[0.18em]" style={{ color: "var(--z-textMuted)" }}>
                    Room name
                  </span>
                  <input
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                    maxLength={64}
                    autoFocus
                    placeholder="e.g. the grind"
                    className="bg-transparent text-xl py-2 outline-none placeholder:italic"
                    style={{
                      color: "var(--z-text)",
                      borderBottom: "1px solid color-mix(in srgb, var(--z-text) 25%, transparent)",
                    }}
                  />
                </label>
              ) : (
                <label className="flex flex-col gap-2">
                  <span className="text-xs uppercase tracking-[0.18em]" style={{ color: "var(--z-textMuted)" }}>
                    Room code
                  </span>
                  <input
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    maxLength={8}
                    autoFocus
                    placeholder="ABC123"
                    className="bg-transparent text-xl py-2 outline-none placeholder:italic tracking-[0.3em]"
                    style={{
                      color: "var(--z-text)",
                      borderBottom: "1px solid color-mix(in srgb, var(--z-text) 25%, transparent)",
                      fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
                    }}
                  />
                </label>
              )}
              <button
                type="submit"
                disabled={busy || (tab === "create" ? !roomName.trim() : code.trim().length < 4)}
                className="py-3 rounded-lg text-lg transition-opacity disabled:opacity-40 hover:opacity-85"
                style={{ background: "var(--z-accent)", color: "var(--z-bg)" }}
              >
                {tab === "create" ? "create room" : "join room"}
              </button>
            </form>
          </div>
        )}

        {error && (
          <p className="mt-4 text-center text-sm" style={{ color: "var(--z-danger)" }}>
            {error}
          </p>
        )}
      </div>
    </main>
  );
}
