import { BLOCK_SIZE_SCALE, BLOCK_UNIT } from "./constants";
import type { AABB, BlockData, StageData, Vec3, View } from "./types";

const VALID_VIEWS: View[] = ["SIDE", "FRONT", "BACK"];

export function validateStageData(stage: StageData): void {
  if (!stage.id) {
    throw new Error("stage.id が未設定です。");
  }
  if (stage.viewCycle.length < 2) {
    throw new Error(`${stage.id}: viewCycle は2件以上必要です。`);
  }
  for (const view of stage.viewCycle) {
    if (!VALID_VIEWS.includes(view)) {
      throw new Error(`${stage.id}: 不正な viewCycle 値です: ${view}`);
    }
  }
  if (!stage.start?.spawn) {
    throw new Error(`${stage.id}: start.spawn が未設定です。`);
  }
}

export function blockScale(block: BlockData): Vec3 {
  if (block.scale) {
    return {
      x: block.scale.x * BLOCK_UNIT,
      y: block.scale.y * BLOCK_UNIT,
      z: block.scale.z * BLOCK_UNIT
    };
  }

  const scale = BLOCK_SIZE_SCALE[block.size] * BLOCK_UNIT;
  return { x: scale, y: scale, z: scale };
}

export function blockAabb(block: BlockData): AABB {
  const scale = blockScale(block);
  return aabbFromCenterAndSize(block.pos, scale);
}

export function aabbFromCenterAndSize(center: Vec3, size: Vec3): AABB {
  return {
    min: {
      x: center.x - size.x / 2,
      y: center.y - size.y / 2,
      z: center.z - size.z / 2
    },
    max: {
      x: center.x + size.x / 2,
      y: center.y + size.y / 2,
      z: center.z + size.z / 2
    }
  };
}

export function aabbCenter(aabb: AABB): Vec3 {
  return {
    x: (aabb.min.x + aabb.max.x) / 2,
    y: (aabb.min.y + aabb.max.y) / 2,
    z: (aabb.min.z + aabb.max.z) / 2
  };
}

export function aabbSize(aabb: AABB): Vec3 {
  return {
    x: aabb.max.x - aabb.min.x,
    y: aabb.max.y - aabb.min.y,
    z: aabb.max.z - aabb.min.z
  };
}
