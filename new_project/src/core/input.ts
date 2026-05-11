import { DASH_MIN_DURATION_MS, DOUBLE_TAP_WINDOW_MS } from "./constants";
import type { InputState, View } from "./types";

export type InputCommand = "ROTATE" | "INTERACT" | null;

export function createInputState(): InputState {
  return {
    left: false,
    right: false,
    forward: false,
    back: false,
    jump: false,
    crouch: false,
    interactRequested: false,
    viewSwitchHeld: false,
    dashDirection: 0,
    dashActive: false,
    dashMinUntilMs: 0,
    lastTapDirection: 0,
    lastTapAtMs: Number.NEGATIVE_INFINITY
  };
}

export function applyKeyDown(input: InputState, code: string, timestampMs: number, gameplayInputEnabled: boolean): InputCommand {
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
    applyDirectionDown(input, -1, timestampMs);
    input.left = true;
  }

  if (code === "ArrowRight" || code === "KeyD") {
    applyDirectionDown(input, 1, timestampMs);
    input.right = true;
  }

  if (code === "ArrowUp" || code === "KeyW") {
    applyDirectionDown(input, 1, timestampMs);
    input.forward = true;
  }

  if (code === "ArrowDown" || code === "KeyS") {
    applyDirectionDown(input, -1, timestampMs);
    input.back = true;
  }

  if (code === "Space") {
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

export function isDashActive(input: InputState, view: View, nowMs: number): boolean {
  const direction = movementIntent(input, view);
  if (direction === 0) {
    return nowMs < input.dashMinUntilMs;
  }
  return input.dashActive && input.dashDirection === direction;
}

export function refreshDashState(input: InputState, view: View, nowMs: number): void {
  const direction = movementIntent(input, view);
  const minDurationRunning = nowMs < input.dashMinUntilMs;

  if (!minDurationRunning && direction !== input.dashDirection) {
    input.dashActive = false;
    input.dashDirection = 0;
  }

  if (!minDurationRunning && direction === 0) {
    input.dashActive = false;
    input.dashDirection = 0;
  }
}

export function consumeInteract(input: InputState): boolean {
  const requested = input.interactRequested;
  input.interactRequested = false;
  return requested;
}

function applyDirectionDown(input: InputState, direction: -1 | 1, timestampMs: number): void {
  if (input.lastTapDirection === direction && timestampMs - input.lastTapAtMs <= DOUBLE_TAP_WINDOW_MS) {
    input.dashDirection = direction;
    input.dashActive = true;
    input.dashMinUntilMs = timestampMs + DASH_MIN_DURATION_MS;
  }

  input.lastTapDirection = direction;
  input.lastTapAtMs = timestampMs;
}
