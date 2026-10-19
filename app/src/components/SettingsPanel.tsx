import { useEffect, useRef, useState } from "react";
import { ColorStrip } from "./ColorStrip";
import {
  FONTS,
  resolvedTokens,
  type StoredThemeShape,
  type ThemeMode,
  type TokenKey,
} from "@/lib/theme";

interface Props {
  open: boolean;
  onClose: () => void;
  theme: StoredThemeShape;
  setTheme: (updater: (t: StoredThemeShape) => StoredThemeShape) => void;
  roomName: string;
  roomCode: string;
  userName: string;
  onRename: (name: string) => void;
  onLeave: () => void;
}

export function SettingsPanel({ open, onClose, theme, setTheme, roomName, roomCode, userName, onRename, onLeave }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [name, setName] = useState(userName);
  const [copied, setCopied] = useState(false);

  useEffect(() => setName(userName), [userName]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const tokens = resolvedTokens(theme, theme.mode);

  const setToken = (key: TokenKey, hex: string) =>
    setTheme((t) => ({
      ...t,
      overrides: { ...t.overrides, [t.mode]: { ...(t.overrides[t.mode] ?? {}), [key]: hex } },
    }));

  const resetPalette = () =>
    setTheme((t) => ({ ...t, overrides: { ...t.overrides, [t.mode]: {} } }));

  const setMode = (mode: ThemeMode) => setTheme((t) => ({ ...t, mode }));

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <div
      className="fixed inset-0 z-40 flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-label="Settings"
    >
      <button
        type="button"
        aria-label="Close settings"
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        className="relative z-10 w-full max-w-md h-full overflow-y-auto p-6 pb-24"
        style={{ background: "var(--z-bg)", borderLeft: "1px solid color-mix(in srgb, var(--z-text) 10%, transparent)" }}
      >
        <div className="flex items-baseline justify-between mb-8">
          <h2 className="text-2xl">Settings</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-sm hover:opacity-70 transition-opacity"
            style={{ color: "var(--z-textMuted)" }}
          >
            close
          </button>
        </div>

        <section className="mb-10">
          <h3 className="text-xs uppercase tracking-[0.18em] mb-3" style={{ color: "var(--z-textMuted)" }}>
            Mode
          </h3>
          <div className="flex rounded-lg overflow-hidden" style={{ border: "1px solid color-mix(in srgb, var(--z-text) 15%, transparent)" }}>
            {(["dark", "light"] as ThemeMode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className="flex-1 py-2.5 text-base capitalize transition-colors"
                style={{
                  background: theme.mode === m ? "var(--z-accent)" : "transparent",
                  color: theme.mode === m ? "var(--z-bg)" : "var(--z-textMuted)",
                }}
              >
                {m}
              </button>
            ))}
          </div>
        </section>

        <section className="mb-10">
          <h3 className="text-xs uppercase tracking-[0.18em] mb-3" style={{ color: "var(--z-textMuted)" }}>
            Colors
          </h3>
          <ColorStrip mode={theme.mode} values={tokens} onChange={setToken} onReset={resetPalette} />
        </section>

        <section className="mb-10">
          <h3 className="text-xs uppercase tracking-[0.18em] mb-3" style={{ color: "var(--z-textMuted)" }}>
            Font
          </h3>
          <div className="flex flex-col" style={{ borderTop: "1px solid color-mix(in srgb, var(--z-text) 10%, transparent)" }}>
            {FONTS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setTheme((t) => ({ ...t, font: f.id }))}
                className="flex items-baseline justify-between py-3 text-left transition-colors"
                style={{
                  borderBottom: "1px solid color-mix(in srgb, var(--z-text) 10%, transparent)",
                  fontFamily: f.stack,
                  color: theme.font === f.id ? "var(--z-text)" : "var(--z-textMuted)",
                }}
              >
                <span className="text-lg">{f.name}</span>
                <span className="text-sm italic">{theme.font === f.id ? "in use" : f.note}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="mb-10">
          <h3 className="text-xs uppercase tracking-[0.18em] mb-3" style={{ color: "var(--z-textMuted)" }}>
            Room
          </h3>
          <div className="flex items-baseline justify-between gap-3 mb-3">
            <span className="text-lg">{roomName}</span>
            <button
              type="button"
              onClick={copyCode}
              className="text-base px-3 py-1 rounded-md transition-opacity hover:opacity-80"
              style={{
                background: "var(--z-surface)",
                color: "var(--z-accent)",
                fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
              }}
              aria-label={`Copy room code ${roomCode}`}
            >
              {copied ? "copied" : roomCode}
            </button>
          </div>
          <p className="text-sm mb-3" style={{ color: "var(--z-textMuted)" }}>
            Share the code with a friend — they join from their own device.
          </p>
          <button
            type="button"
            onClick={onLeave}
            className="text-sm underline underline-offset-4 hover:opacity-70 transition-opacity"
            style={{ color: "var(--z-danger)" }}
          >
            leave room
          </button>
        </section>

        <section>
          <h3 className="text-xs uppercase tracking-[0.18em] mb-3" style={{ color: "var(--z-textMuted)" }}>
            You
          </h3>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (name.trim()) onRename(name.trim());
            }}
          >
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={64}
              aria-label="Your display name"
              className="flex-1 min-w-0 bg-transparent text-base py-2 outline-none"
              style={{
                color: "var(--z-text)",
                borderBottom: "1px solid color-mix(in srgb, var(--z-text) 25%, transparent)",
              }}
            />
            <button
              type="submit"
              className="text-sm px-3 py-2 rounded-md transition-opacity hover:opacity-85"
              style={{ background: "var(--z-accent)", color: "var(--z-bg)" }}
            >
              save
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
