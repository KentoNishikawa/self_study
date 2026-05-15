import type { GameState, RenderTutorialOverlay, StageData, TutorialRuntimeState, TutorialStepData } from "./types";

export function createTutorialRuntime(): TutorialRuntimeState {
  return {
    shownStepIds: [],
    active: null
  };
}

export function isTutorialStage(stage: StageData): boolean {
  return stage.id === "tutorial";
}

export function tryStartTutorial(state: GameState): boolean {
  if (!state.stage.tutorials || state.tutorial.active) {
    return false;
  }

  const step = state.stage.tutorials.find((item) => shouldStartStep(state, item));
  if (!step) {
    return false;
  }

  state.tutorial.shownStepIds.push(step.id);
  state.tutorial.active = {
    stepId: step.id,
    pageIndex: 0,
    pages: [...step.pages],
    focusAabb: step.focusAabb
  };
  state.mode = "TUTORIAL";
  state.statusMessage = "チュートリアル確認中です。";
  return true;
}

export function advanceTutorial(state: GameState): void {
  const active = state.tutorial.active;
  if (!active) {
    return;
  }

  if (active.pageIndex < active.pages.length - 1) {
    active.pageIndex += 1;
    return;
  }

  state.tutorial.active = null;
  state.mode = "PLAY";
  state.statusMessage = "";
}

export function renderTutorialOverlay(state: GameState): RenderTutorialOverlay | null {
  const active = state.tutorial.active;
  if (!active) {
    return null;
  }

  return {
    stepId: active.stepId,
    text: active.pages[active.pageIndex] ?? "",
    pageIndex: active.pageIndex,
    pageCount: active.pages.length,
    focusAabb: active.focusAabb
  };
}

function shouldStartStep(state: GameState, step: TutorialStepData): boolean {
  if (state.tutorial.shownStepIds.includes(step.id)) {
    return false;
  }
  return state.player.position.x >= step.triggerX;
}
