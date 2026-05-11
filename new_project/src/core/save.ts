export interface SaveData {
  stageId: string;
  savedAt: string;
}

const SAVE_KEY = "view-switch-2d-prototype-save";

export function saveStageClear(stageId: string): void {
  if (!hasLocalStorage()) {
    return;
  }

  const current = loadSaveData();
  if (current && stageRank(current.stageId) > stageRank(stageId)) {
    return;
  }

  const data: SaveData = {
    stageId,
    savedAt: new Date().toISOString()
  };
  localStorage.setItem(SAVE_KEY, JSON.stringify(data));
}

export function loadSaveData(): SaveData | null {
  if (!hasLocalStorage()) {
    return null;
  }

  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as SaveData;
  } catch {
    return null;
  }
}

function hasLocalStorage(): boolean {
  try {
    return typeof window !== "undefined" && "localStorage" in window;
  } catch {
    return false;
  }
}

function stageRank(stageId: string): number {
  const matched = stageId.match(/(\d+)$/);
  return matched ? Number(matched[1]) : 0;
}
