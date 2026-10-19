import { useEffect, useRef, useState } from "react";
import { DEFAULT_THEMES, TOKENS, isValidHex, type ThemeMode, type TokenKey, type TokenValues } from "@/lib/theme";

interface Props {
  mode: ThemeMode;
  values: TokenValues;
  onChange: (key: TokenKey, hex: string) => void;
  onReset: () => void;
}

const GROUP_LABEL: Record<string, string> = { base: "Base", accent: "Accent" };

/** The color strip: related tokens rendered attached, click to edit hex. */
export function ColorStrip({ mode, values, onChange, onReset }: Props) {
  const [open, setOpen] = useState<TokenKey | null>(null);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setDraft(values[open]);
      setError(false);
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const groups = ["base", "accent"].map((g) => ({
    group: g,
    tokens: TOKENS.filter((t) => t.group === g),
  }));

  const commit = () => {
    if (!open) return;
    const v = draft.startsWith("#") ? draft : `#${draft}`;
    if (!isValidHex(v)) {
      setError(true);
      return;
    }
    onChange(open, v.toLowerCase());
    setOpen(null);
  };

  return (
    <div>
      <div className="flex flex-col gap-5">
        {groups.map(({ group, tokens }) => (
          <div key={group}>
            <div className="text-xs uppercase tracking-[0.18em] mb-2" style={{ color: "var(--z-textMuted)" }}>
              {GROUP_LABEL[group]}
            </div>
            <div className="flex" role="group" aria-label={`${GROUP_LABEL[group]} colors`}>
              {tokens.map((t, i) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setOpen(open === t.key ? null : t.key)}
                  aria-label={`${t.label}: ${values[t.key]}. Activate to edit.`}
                  aria-expanded={open === t.key}
                  className="h-14 flex-1 transition-transform duration-150 hover:-translate-y-0.5"
                  style={{
                    background: values[t.key],
                    boxShadow: "inset 0 0 0 1px color-mix(in srgb, var(--z-text) 10%, transparent)",
                    borderRadius:
                      i === 0 ? "8px 0 0 8px" : i === tokens.length - 1 ? "0 8px 8px 0" : 0,
                    outline: open === t.key ? "2px solid var(--z-text)" : "none",
                    outlineOffset: -2,
                    zIndex: open === t.key ? 1 : 0,
                  }}
                />
              ))}
            </div>
            <div className="flex mt-1.5">
              {tokens.map((t) => (
                <div
                  key={t.key}
                  className="flex-1 text-center text-[10px] leading-tight"
                  style={{ color: "var(--z-textMuted)" }}
                >
                  {t.label}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {open && (
        <div
          className="mt-4 p-3 rounded-lg flex items-center gap-3"
          style={{ background: "var(--z-surface)" }}
        >
          <span
            className="w-8 h-8 rounded-md shrink-0"
            style={{ background: isValidHex(draft.startsWith("#") ? draft : `#${draft}`) ? (draft.startsWith("#") ? draft : `#${draft}`) : values[open] }}
            aria-hidden
          />
          <label className="sr-only" htmlFor="hex-input">
            Hex value for {TOKENS.find((t) => t.key === open)?.label}
          </label>
          <input
            id="hex-input"
            ref={inputRef}
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              setError(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
              if (e.key === "Escape") setOpen(null);
            }}
            spellCheck={false}
            autoComplete="off"
            className="flex-1 min-w-0 bg-transparent text-base outline-none"
            style={{
              color: "var(--z-text)",
              borderBottom: `1px solid ${error ? "var(--z-danger)" : "color-mix(in srgb, var(--z-text) 25%, transparent)"}`,
              fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
            }}
          />
          <button
            type="button"
            onClick={() => onChange(open, DEFAULT_THEMES[mode][open])}
            className="text-sm px-2 py-1 rounded hover:opacity-70 transition-opacity"
            style={{ color: "var(--z-textMuted)" }}
          >
            default
          </button>
          <button
            type="button"
            onClick={commit}
            className="text-sm px-3 py-1.5 rounded-md transition-opacity hover:opacity-85"
            style={{ background: "var(--z-accent)", color: "var(--z-bg)" }}
          >
            set
          </button>
        </div>
      )}
      {error && (
        <p className="mt-2 text-sm" style={{ color: "var(--z-danger)" }}>
          Not a valid hex color — try something like #d29a6a.
        </p>
      )}

      <button
        type="button"
        onClick={onReset}
        className="mt-4 text-sm underline underline-offset-4 hover:opacity-70 transition-opacity"
        style={{ color: "var(--z-textMuted)" }}
      >
        reset {mode} palette to defaults
      </button>
    </div>
  );
}
