export interface SaveData {
  stageId: string;
  savedAt: string;
}

export interface StageCheckpointSave {
  checkpointId: string;
  savedAt: string;
}

export interface CheckpointSaveData {
  checkpoints: Record<string, StageCheckpointSave>;
}

const SAVE_KEY = "view-switch-2d-prototype-save";
const CHECKPOINT_SAVE_KEY = "view-switch-2d-prototype-checkpoints";
const TUTORIAL_STAGE_ID = "tutorial";
const PROGRESSION_STAGE_IDS = ["stage001", "stage002", "stage003", "stage004", "stage005", "stage006", "stage007", "stage008", "stage009", "stage010"] as const;

export function saveStageClear(stageId: string): void {
  if (stageId === TUTORIAL_STAGE_ID || stageRank(stageId) < 0) {
    return;
  }
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
    const data = JSON.parse(raw) as SaveData;
    if (data.stageId === TUTORIAL_STAGE_ID || stageRank(data.stageId) < 0) {
      localStorage.removeItem(SAVE_KEY);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

export function saveStageCheckpoint(stageId: string, checkpointId: string): void {
  if (!hasLocalStorage()) {
    return;
  }

  const data = loadCheckpointSaveData();
  data.checkpoints[stageId] = {
    checkpointId,
    savedAt: new Date().toISOString()
  };
  localStorage.setItem(CHECKPOINT_SAVE_KEY, JSON.stringify(data));
}

export function loadStageCheckpoint(stageId: string): StageCheckpointSave | null {
  if (!hasLocalStorage()) {
    return null;
  }

  return loadCheckpointSaveData().checkpoints[stageId] ?? null;
}

function loadCheckpointSaveData(): CheckpointSaveData {
  const fallback: CheckpointSaveData = { checkpoints: {} };
  if (!hasLocalStorage()) {
    return fallback;
  }

  const raw = localStorage.getItem(CHECKPOINT_SAVE_KEY);
  if (!raw) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(raw) as CheckpointSaveData;
    return parsed.checkpoints ? parsed : fallback;
  } catch {
    return fallback;
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
  return PROGRESSION_STAGE_IDS.indexOf(stageId as typeof PROGRESSION_STAGE_IDS[number]);
}
