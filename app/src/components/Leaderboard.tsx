import { trpc } from "@/providers/trpc";
import { fmtDur } from "@/lib/format";

interface Props {
  roomId: string;
  meId: string;
}

export function Leaderboard({ roomId, meId }: Props) {
  const query = trpc.zero.leaderboard.useQuery(
    { roomId },
    { refetchInterval: 12000 },
  );

  if (query.isLoading) {
    return (
      <div className="py-8 text-center italic" style={{ color: "var(--z-textMuted)" }}>
        calculating tallies…
      </div>
    );
  }

  const entries = query.data ?? [];

  if (entries.length === 0) {
    return (
      <p className="text-center py-8 italic" style={{ color: "var(--z-textMuted)" }}>
        No members yet in this room.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {entries.map((item, index) => {
        const isMe = item.userId === meId;
        const rank = index + 1;
        const wastedMin = Math.round(item.totalWastedSec / 60);

        return (
          <div
            key={item.userId}
            className="flex items-center justify-between p-3.5 rounded-xl transition-all"
            style={{
              background: isMe
                ? "color-mix(in srgb, var(--z-surface) 90%, var(--z-accent) 10%)"
                : "var(--z-surface)",
              border: isMe
                ? "1px solid color-mix(in srgb, var(--z-accent) 30%, transparent)"
                : "1px solid color-mix(in srgb, var(--z-text) 6%, transparent)",
            }}
          >
            <div className="flex items-center gap-3 min-w-0">
              <span
                className="w-6 text-center text-sm font-mono shrink-0"
                style={{
                  color:
                    rank === 1
                      ? "var(--z-accent)"
                      : "var(--z-textMuted)",
                  fontWeight: rank <= 3 ? 600 : 400,
                }}
              >
                {rank}
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className="text-base truncate"
                    style={{
                      color: isMe ? "var(--z-accent)" : "var(--z-text)",
                      fontWeight: isMe ? 500 : 400,
                    }}
                  >
                    {isMe ? `${item.userName} (You)` : item.userName}
                  </span>
                </div>
                <div
                  className="text-xs italic"
                  style={{ color: "var(--z-textMuted)" }}
                >
                  {item.sessionCount} {item.sessionCount === 1 ? "session" : "sessions"}
                  {wastedMin > 0 && ` · ${wastedMin}m drifted`}
                </div>
              </div>
            </div>

            <div className="text-right shrink-0">
              <div
                className="text-lg tabular-nums font-mono"
                style={{ color: item.totalNetSec > 0 ? "var(--z-text)" : "var(--z-textMuted)" }}
              >
                {item.totalNetSec > 0 ? fmtDur(item.totalNetSec) : "0m"}
              </div>
              <div
                className="text-[11px] uppercase tracking-wider"
                style={{ color: "var(--z-textMuted)" }}
              >
                studied
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
