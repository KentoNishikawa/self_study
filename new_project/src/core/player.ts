import {
  AIR_SPEED_LIMIT,
  CHOUBA_JUMP_MULTIPLIER,
  CHOUBA_SPEED_MULTIPLIER,
  CROUCH_SPEED_RATE,
  DASH_JUMP_AIR_SPEED_LIMIT,
  DASH_SPEED,
  GORUBA_AUTO_SPEED,
  GRAVITY,
  JUMP_PAD_VELOCITY,
  JUMP_VELOCITY,
  MOVING_FLOOR_SPEED,
  PLAYER_CROUCHING_HEIGHT,
  PLAYER_STANDING_HEIGHT,
  PLAYER_WIDTH,
  TAMBA_JUMP_MULTIPLIER,
  TAMBA_SPEED_MULTIPLIER,
  TRAP_JUMP_PAD_VELOCITY,
  WALK_SPEED
} from "./constants";
import { canStandUp, moveWithCollision, playerAabbAt } from "./collision";
import { isDashActive, movementIntent, refreshDashState } from "./input";
import { jumpPadAtPlayer, movingFloorDirectionAtPlayer } from "./items";
import { cloneVec3 } from "./math";
import { blockAabb } from "./stage";
import type { BlockData, GameState, PlayerState, Vec3 } from "./types";

export function createPlayerState(spawn: Vec3): PlayerState {
  return {
    position: cloneVec3(spawn),
    velocity: { x: 0, y: 0, z: 0 },
    width: PLAYER_WIDTH,
    standingHeight: PLAYER_STANDING_HEIGHT,
    crouchingHeight: PLAYER_CROUCHING_HEIGHT,
    height: PLAYER_STANDING_HEIGHT,
    crouching: false,
    onGround: false,
    dashJumping: false,
    trappedBlockId: null,
    trapLaunched: false,
    status: "NONE",
    statusTimerMs: 0,
    gorubaLockMs: 0,
    gorubaDirection: 1
  };
}

export function respawnPlayer(player: PlayerState, respawn: Vec3): void {
  player.position = cloneVec3(respawn);
  player.velocity = { x: 0, y: 0, z: 0 };
  player.height = player.standingHeight;
  player.crouching = false;
  player.onGround = false;
  player.dashJumping = false;
  player.trappedBlockId = null;
  player.trapLaunched = false;
  player.status = "NONE";
  player.statusTimerMs = 0;
  player.gorubaLockMs = 0;
  player.gorubaDirection = 1;
}

export function updatePlayer(state: GameState, activeBlocks: BlockData[], dtSec: number, nowMs: number): void {
  if (state.player.status === "GORUBA") {
    updateGorubaPlayer(state, activeBlocks, dtSec);
    return;
  }

  refreshDashState(state.input, state.camera.currentView, nowMs);
  updateCrouch(state.player, activeBlocks, state.input.crouch);
  updateHorizontalVelocity(state, nowMs);
  updateJumpAndGravity(state, dtSec, nowMs);
  moveWithCollision(state.player, activeBlocks, dtSec, state.camera.currentView);

  if (state.player.onGround) {
    state.player.dashJumping = false;
  }
}

function updateCrouch(player: PlayerState, blocks: BlockData[], wantsCrouch: boolean): void {
  player.crouching = wantsCrouch;

  if (wantsCrouch) {
    setPlayerHeightKeepingFeet(player, player.crouchingHeight);
    return;
  }

  if (canStandUpKeepingFeet(player, blocks)) {
    setPlayerHeightKeepingFeet(player, player.standingHeight);
  }
}

function canStandUpKeepingFeet(player: PlayerState, blocks: BlockData[]): boolean {
  const standingCenterY = bottomY(player) + player.standingHeight / 2;
  const standingPlayer = {
    ...player,
    position: {
      ...player.position,
      y: standingCenterY
    },
    height: player.standingHeight
  };
  return canStandUp(standingPlayer, blocks);
}

function setPlayerHeightKeepingFeet(player: PlayerState, nextHeight: number): void {
  if (player.height === nextHeight) {
    return;
  }

  player.position.y = bottomY(player) + nextHeight / 2;
  player.height = nextHeight;
}

function bottomY(player: PlayerState): number {
  return player.position.y - player.height / 2;
}

function updateHorizontalVelocity(state: GameState, nowMs: number): void {
  const direction = movementIntent(state.input, state.camera.currentView);
  const dash = isDashActive(state.input, state.camera.currentView, nowMs);
  const baseSpeed = dash ? DASH_SPEED : WALK_SPEED;
  const speed = statusSpeed(baseSpeed, state.player.status) * (state.player.crouching ? CROUCH_SPEED_RATE : 1);
  const floorDirection = state.player.onGround ? movingFloorDirectionAtPlayer(state) : 0;
  const moveAxis = { x: movingFloorVelocity(direction, speed, floorDirection), y: 0, z: 0 };

  if (state.player.onGround) {
    state.player.velocity.x = moveAxis.x;
    state.player.velocity.z = moveAxis.z;
    return;
  }

  const limit = state.player.dashJumping ? DASH_JUMP_AIR_SPEED_LIMIT : AIR_SPEED_LIMIT;
  state.player.velocity.x = clampMagnitude(moveAxis.x, limit);
  state.player.velocity.z = clampMagnitude(moveAxis.z, limit);
}

function updateJumpAndGravity(state: GameState, dtSec: number, nowMs: number): void {
  const dash = isDashActive(state.input, state.camera.currentView, nowMs);
  const canJump = state.input.jump && state.player.onGround && !state.player.crouching;

  if (canJump) {
    const jumpPad = jumpPadAtPlayer(state);
    if (jumpPad?.kind === "JUMP_PAD") {
      state.player.velocity.y = JUMP_PAD_VELOCITY;
    } else if (jumpPad?.kind === "TRAP_JUMP_PAD") {
      state.player.velocity.y = TRAP_JUMP_PAD_VELOCITY;
      state.player.trapLaunched = true;
    } else {
      state.player.velocity.y = statusJumpVelocity(JUMP_VELOCITY, state.player.status);
    }
    state.player.onGround = false;
    state.player.dashJumping = dash;
  }

  state.player.velocity.y += GRAVITY * dtSec;
}

function updateGorubaPlayer(state: GameState, activeBlocks: BlockData[], dtSec: number): void {
  state.input.left = false;
  state.input.right = false;
  state.input.forward = false;
  state.input.back = false;
  state.input.jump = false;
  state.input.crouch = false;
  state.input.dashActive = false;
  state.input.dashDirection = 0;
  state.player.crouching = false;
  setPlayerHeightKeepingFeet(state.player, state.player.standingHeight);

  if (state.player.gorubaLockMs > 0) {
    state.player.gorubaLockMs = Math.max(0, state.player.gorubaLockMs - dtSec * 1000);
    state.player.velocity = { x: 0, y: 0, z: 0 };
    return;
  }

  state.player.position.x += state.player.gorubaDirection * GORUBA_AUTO_SPEED * dtSec;

  const groundTopY = groundTopUnderPlayer(state.player, activeBlocks);
  if (groundTopY !== null) {
    state.player.position.y = groundTopY + state.player.height / 2;
    state.player.velocity.y = 0;
    state.player.onGround = true;
    return;
  }

  state.player.velocity.y += GRAVITY * dtSec;
  state.player.position.y += state.player.velocity.y * dtSec;
  state.player.onGround = false;
}

function groundTopUnderPlayer(player: PlayerState, blocks: BlockData[]): number | null {
  const playerBox = playerAabbAt(player.position, player.width, player.height);
  let nearestTopY: number | null = null;

  for (const block of blocks) {
    if (!block.solid) {
      continue;
    }

    const box = blockAabb(block);
    const overlapsX = playerBox.max.x > box.min.x && playerBox.min.x < box.max.x;
    const overlapsZ = playerBox.max.z > box.min.z && playerBox.min.z < box.max.z;
    const isBelowFeet = box.max.y <= playerBox.min.y + 0.2;

    if (!overlapsX || !overlapsZ || !isBelowFeet) {
      continue;
    }

    if (nearestTopY === null || box.max.y > nearestTopY) {
      nearestTopY = box.max.y;
    }
  }

  return nearestTopY;
}

function statusSpeed(speed: number, status: PlayerState["status"]): number {
  if (status === "TAMBA") {
    return speed * TAMBA_SPEED_MULTIPLIER;
  }
  if (status === "CHOUBA") {
    return speed * CHOUBA_SPEED_MULTIPLIER;
  }
  return speed;
}

function statusJumpVelocity(velocity: number, status: PlayerState["status"]): number {
  if (status === "TAMBA") {
    return velocity * TAMBA_JUMP_MULTIPLIER;
  }
  if (status === "CHOUBA") {
    return velocity * CHOUBA_JUMP_MULTIPLIER;
  }
  return velocity;
}

function movingFloorVelocity(direction: -1 | 0 | 1, speed: number, floorDirection: -1 | 0 | 1): number {
  if (floorDirection === 0) {
    return direction * speed;
  }

  if (direction === 0) {
    return floorDirection * MOVING_FLOOR_SPEED;
  }

  if (direction === floorDirection) {
    return floorDirection * speed * 1.5;
  }

  return floorDirection * speed * 0.5;
}

function clampMagnitude(value: number, limit: number): number {
  return Math.max(-limit, Math.min(limit, value));
}
