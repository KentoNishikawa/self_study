import { DOOR_INTERACT_DISTANCE } from "./constants";
import { distanceSq } from "./math";
import { aabbCenter } from "./stage";
import type { DoorData, PlayerState, StageData, View } from "./types";

export function findInteractableDoor(stage: StageData, player: PlayerState, view: View): DoorData | null {
  let nearest: DoorData | null = null;
  let nearestDistanceSq = Number.POSITIVE_INFINITY;

  for (const door of stage.doors) {
    if (!door.visibleViews.includes(view)) {
      continue;
    }

    const center = aabbCenter(door.aabb);
    const distSq = distanceSq(center, player.position);
    if (distSq <= DOOR_INTERACT_DISTANCE * DOOR_INTERACT_DISTANCE && distSq < nearestDistanceSq) {
      nearest = door;
      nearestDistanceSq = distSq;
    }
  }

  return nearest;
}
