import { intersectsAabb, playerAabbAt } from "./collision";
import type { GameState, PlayerState, StageItemData } from "./types";

export function findTouchedStageItem(player: PlayerState, items: StageItemData[] | undefined, kinds: StageItemData["kind"][]): StageItemData | null {
  if (!items?.length) {
    return null;
  }

  const playerBox = playerAabbAt(player.position, player.width, player.height);
  for (const item of items) {
    if (!kinds.includes(item.kind)) {
      continue;
    }
    if (intersectsAabb(playerBox, item.aabb)) {
      return item;
    }
  }
  return null;
}

export function movingFloorDirectionAtPlayer(state: GameState): -1 | 0 | 1 {
  const item = findTouchedStageItem(state.player, state.stage.items, ["MOVE_FLOOR_RIGHT", "MOVE_FLOOR_LEFT"]);
  if (!item) {
    return 0;
  }
  return item.kind === "MOVE_FLOOR_RIGHT" ? 1 : -1;
}

export function jumpPadAtPlayer(state: GameState): StageItemData | null {
  return findTouchedStageItem(state.player, state.stage.items, ["JUMP_PAD", "TRAP_JUMP_PAD"]);
}

export function warpItemAtPlayer(state: GameState): StageItemData | null {
  return findTouchedStageItem(state.player, state.stage.items, ["WARP_GOOD", "WARP_BAD"]);
}
