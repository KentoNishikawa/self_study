export type IconPreset = {
  id: string;
  label: string;
  src?: string;
  emoji?: string;
};

function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function normalizeFileStem(stem: string): string {
  return stem
    .replace(/^[0-9]+[._-]*/, "")
    .replace(/[_-]+/g, " ")
    .trim();
}

function createIconIdFromPath(path: string): string {
  const file = path.split("/").pop() ?? "icon";
  const stem = file.replace(/\.[^.]+$/, "");
  return `img_${stem}`
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "") || "img_icon";
}

function createLabelFromPath(path: string): string {
  const file = path.split("/").pop() ?? "icon";
  const stem = file.replace(/\.[^.]+$/, "");
  const label = normalizeFileStem(stem);
  return label || stem;
}

const iconImageModules = import.meta.glob("./iconlist/*.{png,jpg,jpeg,webp,avif,gif,svg}", {
  eager: true,
  import: "default",
}) as Record<string, string>;

const imagePresets = Object.entries(iconImageModules)
  .sort(([pathA], [pathB]) => {
    const fileA = decodeURIComponent(pathA.split("/").pop() ?? "");
    const fileB = decodeURIComponent(pathB.split("/").pop() ?? "");
    return fileA.localeCompare(fileB, "ja", { numeric: true, sensitivity: "base" });
  })
  .map(([path, src]) => ({
    id: createIconIdFromPath(path),
    label: createLabelFromPath(path),
    src,
  }));

const fallbackPlayerPreset: IconPreset = {
  id: "img_builtin_default",
  label: "Player",
  emoji: "🙂",
};

export const PLAYER_ICON_PRESETS: IconPreset[] = imagePresets.length > 0 ? imagePresets : [fallbackPlayerPreset];
export const DEFAULT_PLAYER_ICON_ID = PLAYER_ICON_PRESETS[0]?.id ?? fallbackPlayerPreset.id;

export const SYSTEM_ICON_PRESETS: IconPreset[] = [
  { id: "npc_default", label: "NPC", emoji: "🤖" },
];

export const ICON_PRESETS: IconPreset[] = [...PLAYER_ICON_PRESETS, ...SYSTEM_ICON_PRESETS];
export const ICON_BY_ID = new Map(ICON_PRESETS.map((preset) => [preset.id, preset] as const));

const LEGACY_ICON_ALIAS: Record<string, string> = {
  player_default: DEFAULT_PLAYER_ICON_ID,
  host_default: DEFAULT_PLAYER_ICON_ID,
  icon_01: DEFAULT_PLAYER_ICON_ID,
  icon_02: DEFAULT_PLAYER_ICON_ID,
  icon_03: DEFAULT_PLAYER_ICON_ID,
};

export function resolveIconId(iconId: unknown, fallbackId: string = DEFAULT_PLAYER_ICON_ID): string {
  const key = typeof iconId === "string" ? iconId : "";
  if (key && ICON_BY_ID.has(key)) return key;
  if (key && LEGACY_ICON_ALIAS[key] && ICON_BY_ID.has(LEGACY_ICON_ALIAS[key])) return LEGACY_ICON_ALIAS[key];
  if (key === "npc_default") return "npc_default";
  return ICON_BY_ID.has(fallbackId) ? fallbackId : DEFAULT_PLAYER_ICON_ID;
}

export function getIconPreset(iconId: unknown, fallbackId?: string): IconPreset {
  const resolved = resolveIconId(iconId, fallbackId);
  return ICON_BY_ID.get(resolved) ?? ICON_BY_ID.get(DEFAULT_PLAYER_ICON_ID) ?? fallbackPlayerPreset;
}

export function iconContentHtml(iconId: unknown, sizePx: number, fallbackId?: string): string {
  const preset = getIconPreset(iconId, fallbackId);
  if (preset.src) {
    return `<img src="${escapeHtml(preset.src)}" alt="${escapeHtml(preset.label)}" style="width:${sizePx}px;height:${sizePx}px;object-fit:contain;display:block;" />`;
  }
  return `<span style="font-size:${sizePx}px;line-height:1;display:inline-flex;align-items:center;justify-content:center;">${escapeHtml(preset.emoji ?? "🙂")}</span>`;
}
