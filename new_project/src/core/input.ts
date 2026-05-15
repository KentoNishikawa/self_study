import type { InputState, View } from "./types";

export type InputCommand = "ROTATE" | "INTERACT" | null;

export function createInputState(): InputState {
  return {
    left: false,
    right: false,
    forward: false,
    back: false,
    jump: false,
    jumpRequested: false,
    crouch: false,
    interactRequested: false,
    viewSwitchHeld: false,
  };
}

export function resetInputState(input: InputState): void {
  Object.assign(input, createInputState());
}

export function applyKeyDown(input: InputState, code: string, _timestampMs: number, gameplayInputEnabled: boolean): InputCommand {
  if (code === "KeyQ") {
    if (input.viewSwitchHeld) {
      return null;
    }
    input.viewSwitchHeld = true;
    return "ROTATE";
  }

  if (!gameplayInputEnabled) {
    return null;
  }

  if (code === "KeyE") {
    input.interactRequested = true;
    return "INTERACT";
  }

  if (code === "ArrowLeft" || code === "KeyA") {
    input.left = true;
  }

  if (code === "ArrowRight" || code === "KeyD") {
    input.right = true;
  }

  if (code === "ArrowUp" || code === "KeyW") {
    input.forward = true;
  }

  if (code === "ArrowDown" || code === "KeyS") {
    input.back = true;
  }

  if (code === "Space") {
    if (!input.jump) {
      input.jumpRequested = true;
    }
    input.jump = true;
  }

  if (code === "ShiftLeft" || code === "ShiftRight") {
    input.crouch = true;
  }

  return null;
}

export function applyKeyUp(input: InputState, code: string): void {
  if (code === "KeyQ") {
    input.viewSwitchHeld = false;
  }

  if (code === "ArrowLeft" || code === "KeyA") {
    input.left = false;
  }

  if (code === "ArrowRight" || code === "KeyD") {
    input.right = false;
  }

  if (code === "ArrowUp" || code === "KeyW") {
    input.forward = false;
  }

  if (code === "ArrowDown" || code === "KeyS") {
    input.back = false;
  }

  if (code === "Space") {
    input.jump = false;
  }

  if (code === "ShiftLeft" || code === "ShiftRight") {
    input.crouch = false;
  }
}

export function movementIntent(input: InputState, view: View): -1 | 0 | 1 {
  if (view === "FRONT") {
    if (input.back === input.forward) {
      return 0;
    }
    return input.back ? -1 : 1;
  }

  if (input.left === input.right) {
    return 0;
  }
  return input.left ? -1 : 1;
}

export function consumeInteract(input: InputState): boolean {
  const requested = input.interactRequested;
  input.interactRequested = false;
  return requested;
}
