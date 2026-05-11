import { ENEMY_HITBOX_SIZE, GRAVITY } from "../constants";
import { blockAabb } from "../stage";
import type { BlockData, Vec3 } from "../types";

export const ENEMY_DESPAWN_Y = -8;
export const GROUND_SNAP_TOLERANCE = 0.08;

export function applyEnemyGrounding(
  enemyRuntime: { position: Vec3; fallVelocityY: number },
  blocks: BlockData[],
  dtSec: number
): void {
  const groundTopY = findGroundTopY(enemyRuntime.position, blocks);

  if (groundTopY !== null && enemyBottomY(enemyRuntime.position) <= groundTopY + GROUND_SNAP_TOLERANCE) {
    enemyRuntime.position.y = groundTopY + ENEMY_HITBOX_SIZE / 2;
    enemyRuntime.fallVelocityY = 0;
    return;
  }

  enemyRuntime.fallVelocityY += GRAVITY * dtSec;
  enemyRuntime.position.y += enemyRuntime.fallVelocityY * dtSec;
}

export function applyEnemyHop(
  enemyRuntime: { position: Vec3; fallVelocityY: number },
  blocks: BlockData[],
  dtSec: number,
  jumpVelocity: number
): void {
  const groundTopY = findGroundTopY(enemyRuntime.position, blocks);

  if (
    groundTopY !== null &&
    enemyBottomY(enemyRuntime.position) <= groundTopY + GROUND_SNAP_TOLERANCE &&
    enemyRuntime.fallVelocityY <= 0
  ) {
    enemyRuntime.position.y = groundTopY + ENEMY_HITBOX_SIZE / 2;
    enemyRuntime.fallVelocityY = jumpVelocity;
  }

  enemyRuntime.fallVelocityY += GRAVITY * dtSec;
  enemyRuntime.position.y += enemyRuntime.fallVelocityY * dtSec;
}

export function isEnemyTouchingGround(position: Vec3, blocks: BlockData[]): boolean {
  const groundTopY = findGroundTopY(position, blocks);
  return groundTopY !== null && enemyBottomY(position) <= groundTopY + GROUND_SNAP_TOLERANCE;
}

export function findGroundTopY(position: Vec3, blocks: BlockData[]): number | null {
  let nearestTopY: number | null = null;
  const enemyHalf = ENEMY_HITBOX_SIZE / 2;

  for (const block of blocks) {
    if (!block.solid) {
      continue;
    }

    const box = blockAabb(block);
    const overlapsX = position.x + enemyHalf > box.min.x && position.x - enemyHalf < box.max.x;
    const overlapsZ = position.z + enemyHalf > box.min.z && position.z - enemyHalf < box.max.z;
    const isUnderEnemy = box.max.y <= position.y + enemyHalf;

    if (!overlapsX || !overlapsZ || !isUnderEnemy) {
      continue;
    }

    if (nearestTopY === null || box.max.y > nearestTopY) {
      nearestTopY = box.max.y;
    }
  }

  return nearestTopY;
}

function enemyBottomY(position: Vec3): number {
  return position.y - ENEMY_HITBOX_SIZE / 2;
}
