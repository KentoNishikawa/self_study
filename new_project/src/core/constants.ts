import type { BlockSizeName } from "./types";

export const BLOCK_UNIT = 1.0;
export const BLOCK_SIZE_SCALE: Record<BlockSizeName, number> = {
  S: 0.5,
  M: 1.0,
  L: 1.5,
  XL: 2.0
};

export const PLAYER_WIDTH = 0.8;
export const PLAYER_STANDING_HEIGHT = 1.8;
export const PLAYER_CROUCHING_HEIGHT = 1.2;

export const CROUCH_SPEED_RATE = 0.45;
export const WALK_SPEED = 6.0;
export const DASH_SPEED = 9.0;
export const AIR_SPEED_LIMIT = 6.5;
export const DASH_JUMP_AIR_SPEED_LIMIT = 13.0;
export const DOUBLE_TAP_WINDOW_MS = 250;
export const DASH_MIN_DURATION_MS = 200;

export const ROTATE_DURATION_MS = 1000;
export const ROTATE_STEP_RAD = Math.PI / 2;
export const CAMERA_RADIUS = 8;
export const CAMERA_HEIGHT = 0;
export const CAMERA_FOV = 40;

export const GRAVITY = -24;
export const JUMP_VELOCITY = 8.8; // TBD: 「2ブロック弱」に合わせた体感値として初期設定。
export const JUMP_PAD_VELOCITY = 20;
export const TRAP_JUMP_PAD_VELOCITY = 100;
export const TRAP_JUMP_GAME_OVER_Y = 55;
export const MOVING_FLOOR_SPEED = WALK_SPEED;
export const WARP_COOLDOWN_MS = 600;
export const CRUMBLE_FLOOR_DELAY_MS = 2000;
export const DOOR_INTERACT_DISTANCE = 1.25;
export const ENEMY_HITBOX_SIZE = 0.8;
export const DEATH_RESPAWN_DELAY_MS = 800;

export const TAMBA_STATUS_DURATION_MS = 15000;
export const CHOUBA_STATUS_DURATION_MS = 15000;
export const TAMBA_SPEED_MULTIPLIER = 1.5;
export const TAMBA_JUMP_MULTIPLIER = 0.5;
export const CHOUBA_SPEED_MULTIPLIER = 0.5;
export const CHOUBA_JUMP_MULTIPLIER = 1.5;
export const GORUBA_LOCK_MS = 1000;
export const GORUBA_AUTO_SPEED = WALK_SPEED;
