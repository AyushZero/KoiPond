import { fmtDur, fmtTime, dayLabel } from "@/lib/format";

export interface FeedSession {
  id: string;
  userId: string;
  userName: string;
  startedAt: Date | string;
  endedAt: Date | string | null;
  elapsedSec: number;
  wastedSec: number;
  netSec: number;
  counted: boolean;
  note: string | null;
}

interface Props {
  live: FeedSession[];
  feed: FeedSession[];
  meId: string;
  liveElapsed: (s: FeedSession) => number;
}

export function Feed({ live, feed, meId, liveElapsed }: Props) {
  if (live.length === 0 && feed.length === 0) {
    return (
      <p className="text-center py-10 italic" style={{ color: "var(--z-textMuted)" }}>
        Nothing yet. The first session starts the story.
      </p>
    );
  }

  let lastDay = "";

  return (
    <div className="flex flex-col">
      {live.map((s) => (
        <div key={s.id} className="flex items-baseline gap-3 py-3">
          <span
            className="w-1.5 h-1.5 rounded-full shrink-0 translate-y-[-2px] animate-pulse"
            style={{ background: "var(--z-accent)" }}
            aria-hidden
          />
          <div className="flex-1 min-w-0">
            <span className="text-base">
              {s.userId === meId ? "You" : s.userName}
              <span style={{ color: "var(--z-textMuted)" }}> — studying now, </span>
              <span style={{ color: "var(--z-accent)" }}>{fmtDur(liveElapsed(s))} in</span>
            </span>
          </div>
        </div>
      ))}

      {feed.map((s) => {
        const day = dayLabel(s.startedAt);
        const showDay = day !== lastDay;
        lastDay = day;
        const wastedMin = Math.round(s.wastedSec / 60);
        return (
          <div key={s.id}>
            {showDay && (
              <div
                className="pt-6 pb-2 text-xs uppercase tracking-[0.18em]"
                style={{ color: "var(--z-textMuted)" }}
              >
                {day}
              </div>
            )}
            <div
              className="flex items-baseline gap-3 py-3"
              style={{
                borderTop: "1px solid color-mix(in srgb, var(--z-text) 8%, transparent)",
                opacity: s.counted ? 1 : 0.75,
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0 translate-y-[-2px]"
                style={{ background: s.counted ? "var(--z-accent)" : "var(--z-danger)" }}
                aria-hidden
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-3 flex-wrap">
                  <span className="text-base">
                    {s.userId === meId ? "You" : s.userName}
                    <span style={{ color: "var(--z-textMuted)" }}>
                      {" "}studied{" "}
                    </span>
                    <span className="text-lg">{fmtDur(s.netSec)}</span>
                    {wastedMin > 0 && (
                      <span className="text-sm" style={{ color: "var(--z-textMuted)" }}>
                        {" "}· {wastedMin}m wasted
                      </span>
                    )}
                  </span>
                  <span className="text-sm shrink-0" style={{ color: "var(--z-textMuted)" }}>
                    {fmtTime(s.startedAt)}
                  </span>
                </div>
                {s.note && (
                  <div className="text-sm italic mt-0.5" style={{ color: "var(--z-textMuted)" }}>
                    {s.note}
                  </div>
                )}
                {!s.counted && (
                  <div className="text-sm mt-0.5" style={{ color: "var(--z-danger)" }}>
                    under 25 minutes — didn't count
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
