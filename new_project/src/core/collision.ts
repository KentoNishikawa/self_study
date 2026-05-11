import { blockAabb } from "./stage";
import type { AABB, BlockData, PlayerState, Vec3, View } from "./types";

export function intersectsAabb(a: AABB, b: AABB): boolean {
  return a.min.x < b.max.x &&
    a.max.x > b.min.x &&
    a.min.y < b.max.y &&
    a.max.y > b.min.y &&
    a.min.z < b.max.z &&
    a.max.z > b.min.z;
}

export function playerAabbAt(position: Vec3, width: number, height: number): AABB {
  return {
    min: {
      x: position.x - width / 2,
      y: position.y - height / 2,
      z: position.z - width / 2
    },
    max: {
      x: position.x + width / 2,
      y: position.y + height / 2,
      z: position.z + width / 2
    }
  };
}

export function getSolidBlocks(blocks: BlockData[]): BlockData[] {
  return blocks.filter((block) => block.solid);
}

export function findIntersectingBlock(player: PlayerState, blocks: BlockData[]): BlockData | null {
  const playerBox = playerAabbAt(player.position, player.width, player.height);
  return getSolidBlocks(blocks).find((block) => intersectsAabb(playerBox, blockAabb(block))) ?? null;
}

export function updateTrappedStateAfterRotate(player: PlayerState, blocks: BlockData[], view: View): void {
  const playerBox = playerAabbAt(player.position, player.width, player.height);

  if (view === "SIDE") {
    const projectionBlock = getSolidBlocks(blocks).find((block) =>
      isSideProjectionBlock(block) && intersectsSideProjection(playerBox, blockAabb(block))
    );
    if (projectionBlock) {
      player.trappedBlockId = projectionBlock.id;
      return;
    }
  }

  const block = findIntersectingBlock(player, blocks);
  player.trappedBlockId = block?.id ?? null;
}

export function canStandUp(player: PlayerState, blocks: BlockData[]): boolean {
  const standingBox = playerAabbAt(player.position, player.width, player.standingHeight);
  for (const block of getSolidBlocks(blocks)) {
    if (block.id === player.trappedBlockId) {
      continue;
    }
    if (intersectsAabb(standingBox, blockAabb(block))) {
      return false;
    }
  }
  return true;
}

export function moveWithCollision(player: PlayerState, blocks: BlockData[], dtSec: number, view: View): void {
  player.onGround = false;
  moveAxis(player, blocks, "x", player.velocity.x * dtSec, view);
  moveAxis(player, blocks, "z", player.velocity.z * dtSec, view);
  moveAxis(player, blocks, "y", player.velocity.y * dtSec, view);
  refreshTrappedState(player, blocks, view);
}

function moveAxis(player: PlayerState, blocks: BlockData[], axis: "x" | "y" | "z", delta: number, view: View): void {
  if (delta === 0) {
    return;
  }

  player.position[axis] += delta;
  const playerBox = playerAabbAt(player.position, player.width, player.height);

  for (const block of getSolidBlocks(blocks)) {
    if (block.id === player.trappedBlockId) {
      continue;
    }

    const solidBox = blockAabb(block);
    if (!intersectsBlockForView(playerBox, solidBox, block, axis, view)) {
      continue;
    }

    if ((axis === "x" || axis === "z") && isStandingOnBlockTopForView(playerBox, solidBox, block, view)) {
      continue;
    }

    if (axis === "x") {
      if (delta > 0) {
        player.position.x = solidBox.min.x - player.width / 2;
      } else {
        player.position.x = solidBox.max.x + player.width / 2;
      }
      player.velocity.x = 0;
    }

    if (axis === "z") {
      if (delta > 0) {
        player.position.z = solidBox.min.z - player.width / 2;
      } else {
        player.position.z = solidBox.max.z + player.width / 2;
      }
      player.velocity.z = 0;
    }

    if (axis === "y") {
      if (delta > 0) {
        player.position.y = solidBox.min.y - player.height / 2;
      } else {
        player.position.y = solidBox.max.y + player.height / 2;
        player.onGround = true;
      }
      player.velocity.y = 0;
    }
  }
}

function isStandingOnBlockTopForView(playerBox: AABB, solidBox: AABB, block: BlockData, view: View): boolean {
  void block;
  void view;
  const topTolerance = 0.2;
  const overlapsX = playerBox.max.x > solidBox.min.x && playerBox.min.x < solidBox.max.x;
  const overlapsZ = playerBox.max.z > solidBox.min.z && playerBox.min.z < solidBox.max.z;
  const isOnTop = playerBox.min.y >= solidBox.max.y - topTolerance && playerBox.min.y <= solidBox.max.y + topTolerance;
  return overlapsX && overlapsZ && isOnTop;
}

function intersectsBlockForView(playerBox: AABB, solidBox: AABB, block: BlockData, axis: "x" | "y" | "z", view: View): boolean {
  if (view === "SIDE" && axis === "x" && isSideProjectionBlock(block)) {
    return intersectsSideProjection(playerBox, solidBox);
  }

  return intersectsAabb(playerBox, solidBox);
}

function isSideProjectionBlock(block: BlockData): boolean {
  return block.tags?.includes("side-projection-solid") === true;
}

function intersectsSideProjection(a: AABB, b: AABB): boolean {
  return a.min.x < b.max.x &&
    a.max.x > b.min.x &&
    a.min.y < b.max.y &&
    a.max.y > b.min.y;
}

function refreshTrappedState(player: PlayerState, blocks: BlockData[], view: View): void {
  if (!player.trappedBlockId) {
    return;
  }
  const trappedBlock = blocks.find((block) => block.id === player.trappedBlockId);
  if (!trappedBlock) {
    player.trappedBlockId = null;
    return;
  }
  const playerBox = playerAabbAt(player.position, player.width, player.height);
  const trappedBox = blockAabb(trappedBlock);
  const stillInside = isSideProjectionBlock(trappedBlock) && view === "SIDE"
    ? intersectsSideProjection(playerBox, trappedBox)
    : intersectsAabb(playerBox, trappedBox);

  if (!stillInside) {
    player.trappedBlockId = null;
  }
}
