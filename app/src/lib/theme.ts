export type ThemeMode = "dark" | "light";

export interface TokenDef {
  key: string;
  label: string;
  group: "base" | "accent";
}

export const TOKENS: TokenDef[] = [
  { key: "bg", label: "Background", group: "base" },
  { key: "surface", label: "Surface", group: "base" },
  { key: "text", label: "Text", group: "base" },
  { key: "textMuted", label: "Muted text", group: "base" },
  { key: "accent", label: "Accent", group: "accent" },
  { key: "danger", label: "Missed", group: "accent" },
];

export type TokenKey = (typeof TOKENS)[number]["key"];
export type TokenValues = Record<TokenKey, string>;

export const DEFAULT_THEMES: Record<ThemeMode, TokenValues> = {
  dark: {
    bg: "#1c1b19",
    surface: "#272522",
    text: "#ede7dd",
    textMuted: "#a49b8e",
    accent: "#d29a6a",
    danger: "#a8584c",
  },
  light: {
    bg: "#f4eee3",
    surface: "#fbf7ee",
    text: "#2a241c",
    textMuted: "#8b7f6e",
    accent: "#c26b45",
    danger: "#a05144",
  },
};

export interface FontOption {
  id: string;
  name: string;
  stack: string;
  note: string;
}

export const FONTS: FontOption[] = [
  { id: "newsreader", name: "Newsreader", stack: "'Newsreader', Georgia, serif", note: "editorial serif" },
  { id: "source-serif", name: "Source Serif 4", stack: "'Source Serif 4', Georgia, serif", note: "book serif" },
  { id: "instrument", name: "Instrument Sans", stack: "'Instrument Sans', system-ui, sans-serif", note: "quiet sans" },
  { id: "plex-mono", name: "IBM Plex Mono", stack: "'IBM Plex Mono', ui-monospace, monospace", note: "mono" },
];

export interface StoredThemeShape {
  mode: ThemeMode;
  font: string;
  overrides: Partial<Record<ThemeMode, Partial<TokenValues>>>;
}

const STORAGE_KEY = "zero:theme";

export function loadTheme(): StoredThemeShape {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as StoredThemeShape;
  } catch {
    /* ignore */
  }
  return { mode: "dark", font: "newsreader", overrides: {} };
}

export function saveTheme(t: StoredThemeShape) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(t));
}

export function resolvedTokens(t: StoredThemeShape, mode: ThemeMode): TokenValues {
  return { ...DEFAULT_THEMES[mode], ...(t.overrides[mode] ?? {}) } as TokenValues;
}

export function applyTheme(t: StoredThemeShape) {
  const root = document.documentElement;
  const tokens = resolvedTokens(t, t.mode);
  for (const [k, v] of Object.entries(tokens)) {
    root.style.setProperty(`--z-${k}`, v);
  }
  const font = FONTS.find((f) => f.id === t.font) ?? FONTS[0];
  root.style.setProperty("--z-font", font.stack);
  root.style.setProperty("--z-scheme", t.mode);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", tokens.bg);
}

export function isValidHex(v: string) {
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(v.trim());
}
