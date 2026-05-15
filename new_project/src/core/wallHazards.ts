import { intersectsAabb, playerAabbAt } from "./collision";
import { aabbFromCenterAndSize } from "./stage";
import type {
  AABB,
  GameState,
  HazardWallData,
  HazardWallOpeningKind,
  HazardWallRuntimeState,
  HazardWallZoneRuntimeState,
  RenderHazardWall,
  StageData,
  Vec3,
  View
} from "./types";

const DEFAULT_WALL_SPEED = 7.5;
const DEFAULT_PATTERN_INTERVAL_MS = 10000;
const WALL_SPAWN_DISTANCE = 12;
const WALL_END_DISTANCE = 5;
const WALL_THICKNESS = 0.35;
const SIDE_WALL_SPAN = 6.0;
const DEPTH_WALL_SPAN = 400.0;
const WALL_MAX_HEIGHT = 4.2;

export function createHazardWallZoneRuntime(stage: StageData): HazardWallZoneRuntimeState[] {
  return (stage.wallZones ?? []).map((zone) => ({
    id: zone.id,
    startX: zone.startX,
    endX: zone.endX,
    active: false,
    completed: false,
    elapsedMs: 0,
    waitMs: 0,
    emittedWallIds: [],
    spawnedView: null
  }));
}

export function updateHazardWalls(state: GameState, dtMs: number): void {
  if (state.wallZones.length === 0) {
    return;
  }

  moveActiveWalls(state, dtMs);
  completePassedZones(state);

  const activeZone = state.wallZones.find((zone) => zone.active && !zone.completed);
  if (activeZone) {
    if (isPlayerInsideZone(state.player.position.x, activeZone)) {
      updateActiveZone(state, activeZone, dtMs);
    } else {
      activeZone.active = false;
    }
    return;
  }

  const nextZone = state.wallZones.find((zone) => !zone.completed && isPlayerInsideZone(state.player.position.x, zone));
  if (!nextZone) {
    return;
  }

  nextZone.active = true;
  nextZone.elapsedMs = 0;
  nextZone.waitMs = 0;
  nextZone.emittedWallIds = [];
  nextZone.spawnedView = null;
  updateActiveZone(state, nextZone, 0);
}

export function isPlayerHitByHazardWall(state: GameState): boolean {
  if (state.hazardWalls.length === 0) {
    return false;
  }

  const playerBox = playerAabbAt(state.player.position, state.player.width, state.player.height);
  for (const wall of state.hazardWalls) {
    if (!wall.active) {
      continue;
    }

    for (const segment of hazardWallSegments(wall)) {
      if (intersectsAabb(playerBox, segment)) {
        return true;
      }
    }
  }

  return false;
}

export function renderHazardWalls(state: GameState): RenderHazardWall[] {
  return state.hazardWalls.flatMap((wall) => {
    if (!wall.active) {
      return [];
    }

    return hazardWallSegments(wall).map((aabb, index) => ({
      id: `${wall.id}-${index}`,
      wallType: wall.wallType,
      openingKind: wall.openingKind,
      aabb
    }));
  });
}

function completePassedZones(state: GameState): void {
  for (const zone of state.wallZones) {
    if (state.player.position.x >= zone.endX) {
      zone.active = false;
      zone.completed = true;
    }
  }
}

function isPlayerInsideZone(playerX: number, zone: HazardWallZoneRuntimeState): boolean {
  return playerX >= zone.startX && playerX < zone.endX;
}

function moveActiveWalls(state: GameState, dtMs: number): void {
  const dtSec = dtMs / 1000;
  for (const wall of state.hazardWalls) {
    if (!wall.active) {
      continue;
    }

    wall.position += wall.direction * wall.speed * dtSec;
    if (wall.direction > 0 && wall.position >= wall.endPosition) {
      wall.active = false;
    }
    if (wall.direction < 0 && wall.position <= wall.endPosition) {
      wall.active = false;
    }
  }
}

function updateActiveZone(state: GameState, zoneRuntime: HazardWallZoneRuntimeState, dtMs: number): void {
  const zone = state.stage.wallZones?.find((item) => item.id === zoneRuntime.id);
  if (!zone) {
    zoneRuntime.completed = true;
    return;
  }

  if (zoneRuntime.waitMs > 0) {
    zoneRuntime.waitMs = Math.max(0, zoneRuntime.waitMs - dtMs);
    return;
  }

  if (zoneRuntime.spawnedView === null) {
    zoneRuntime.spawnedView = state.camera.currentView;
  }

  zoneRuntime.elapsedMs += dtMs;
  for (const wall of zone.walls) {
    const delayMs = wall.delayMs ?? 0;
    if (zoneRuntime.elapsedMs < delayMs || zoneRuntime.emittedWallIds.includes(wall.id)) {
      continue;
    }

    state.hazardWalls.push(createHazardWallRuntime(state, zoneRuntime, wall));
    zoneRuntime.emittedWallIds.push(wall.id);
  }

  const allWallsEmitted = zone.walls.every((wall) => zoneRuntime.emittedWallIds.includes(wall.id));
  const zoneWallsActive = state.hazardWalls.some((wall) => wall.zoneId === zoneRuntime.id && wall.active);
  if (allWallsEmitted && !zoneWallsActive) {
    zoneRuntime.elapsedMs = 0;
    zoneRuntime.waitMs = zone.patternIntervalMs ?? DEFAULT_PATTERN_INTERVAL_MS;
    zoneRuntime.emittedWallIds = [];
    zoneRuntime.spawnedView = null;
  }
}

function createHazardWallRuntime(state: GameState, zoneRuntime: HazardWallZoneRuntimeState, wall: HazardWallData): HazardWallRuntimeState {
  const spawnedView = zoneRuntime.spawnedView ?? state.camera.currentView;
  const movement = hazardWallMovement(wall.wallType, spawnedView, state.player.position);
  return {
    id: `${zoneRuntime.id}-${wall.id}-${state.elapsedMs}`,
    zoneId: zoneRuntime.id,
    wallType: wall.wallType,
    openingKind: wall.openingKind,
    spawnedView,
    axis: movement.axis,
    direction: movement.direction,
    position: movement.startPosition,
    endPosition: movement.endPosition,
    fixedX: movement.fixedX,
    fixedZ: movement.fixedZ,
    speed: wall.speed ?? DEFAULT_WALL_SPEED,
    active: true
  };
}

function hazardWallMovement(wallType: HazardWallData["wallType"], view: View, playerPosition: Vec3): {
  axis: "x" | "z";
  direction: -1 | 1;
  startPosition: number;
  endPosition: number;
  fixedX: number;
  fixedZ: number;
} {
  if (wallType === "SIDE_WALL" && view === "SIDE") {
    return {
      axis: "x",
      direction: -1,
      startPosition: playerPosition.x + WALL_SPAWN_DISTANCE,
      endPosition: playerPosition.x - WALL_END_DISTANCE,
      fixedX: 0,
      fixedZ: playerPosition.z
    };
  }

  if (wallType === "SIDE_WALL") {
    return {
      axis: "z",
      direction: -1,
      startPosition: playerPosition.z + WALL_SPAWN_DISTANCE,
      endPosition: playerPosition.z - WALL_END_DISTANCE,
      fixedX: playerPosition.x,
      fixedZ: 0
    };
  }

  if (view === "SIDE") {
    return {
      axis: "z",
      direction: 1,
      startPosition: playerPosition.z - WALL_SPAWN_DISTANCE,
      endPosition: playerPosition.z + WALL_END_DISTANCE,
      fixedX: playerPosition.x,
      fixedZ: 0
    };
  }

  return {
    axis: "x",
    direction: 1,
    startPosition: playerPosition.x - WALL_SPAWN_DISTANCE,
    endPosition: playerPosition.x + WALL_END_DISTANCE,
    fixedX: 0,
    fixedZ: playerPosition.z
  };
}

function hazardWallSegments(wall: HazardWallRuntimeState): AABB[] {
  const baseCenter = wallCenter(wall);
  const span = wall.wallType === "DEPTH_WALL" ? DEPTH_WALL_SPAN : SIDE_WALL_SPAN;
  const travelSize = wall.axis === "x"
    ? { x: WALL_THICKNESS, y: 1, z: span }
    : { x: span, y: 1, z: WALL_THICKNESS };

  return verticalSegmentsForOpening(wall.openingKind, wall.wallType).map((segment) => {
    const height = segment.maxY - segment.minY;
    return aabbFromCenterAndSize({
      ...baseCenter,
      y: segment.minY + height / 2
    }, {
      ...travelSize,
      y: height
    });
  });
}

function wallCenter(wall: HazardWallRuntimeState): Vec3 {
  if (wall.axis === "x") {
    return {
      x: wall.position,
      y: 0,
      z: wall.fixedZ
    };
  }

  return {
    x: wall.fixedX,
    y: 0,
    z: wall.position
  };
}

function verticalSegmentsForOpening(openingKind: HazardWallOpeningKind, wallType: HazardWallData["wallType"]): { minY: number; maxY: number }[] {
  const depthWallHeightOffset = wallType === "DEPTH_WALL" ? 0.2 : 0;
  switch (openingKind) {
    case "CROUCH":
      return [{ minY: 1.35, maxY: WALL_MAX_HEIGHT }];
    case "STAND":
      return [{ minY: 2.25, maxY: WALL_MAX_HEIGHT }];
    case "SMALL_JUMP":
      return [{ minY: 0.0, maxY: 0.75 - depthWallHeightOffset }];
    case "NORMAL_JUMP":
      return [{ minY: 0.0, maxY: 1.45 - depthWallHeightOffset }];
    default:
      return [{ minY: 0.0, maxY: WALL_MAX_HEIGHT }];
  }
}
