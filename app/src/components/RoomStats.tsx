import { fmtDur } from "@/lib/format";

export interface RoomStat {
  userId: string;
  userName: string;
  studiedSec: number;
  wastedSec: number;
  sessions: number;
}

export function RoomStats({ rows, meId }: { rows: RoomStat[]; meId: string }) {
  if (!rows.length) return <p className="py-10 text-center italic" style={{ color: "var(--z-textMuted)" }}>The room is still waiting for its first logged hour.</p>;
  return <div className="flex flex-col">
    {rows.map((row, index) => (
      <div key={row.userId} className="flex items-center gap-4 py-4" style={{ borderTop: "1px solid color-mix(in srgb, var(--z-text) 10%, transparent)" }}>
        <span className="w-5 text-sm" style={{ color: index < 3 ? "var(--z-accent)" : "var(--z-textMuted)" }}>{index + 1}</span>
        <div className="min-w-0 flex-1"><div className="text-lg truncate">{row.userId === meId ? "You" : row.userName}</div><div className="text-sm italic" style={{ color: "var(--z-textMuted)" }}>{row.sessions} sessions · {Math.round(row.wastedSec / 60)}m drifted</div></div>
        <span className="text-xl tabular-nums">{fmtDur(row.studiedSec)}</span>
      </div>
    ))}
  </div>;
}
