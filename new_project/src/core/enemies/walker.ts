import type { EnemyBehavior } from "./types";
import { enemyPositionForView } from "./types";
import { applyEnemyGrounding, ENEMY_DESPAWN_Y } from "./physics";

const DEFAULT_WALKER_SPEED = 1.8;
const DEFAULT_WALKER_RESPAWN_INTERVAL_MS = 3000;

export const walkerEnemyBehavior: EnemyBehavior = {
  create(enemy, view) {
    const spawnPosition = enemyPositionForView(enemy, view);
    const route = enemy.route
      ? {
          axis: enemy.route.axis,
          min: enemy.route.min,
          max: enemy.route.max,
          speed: enemy.route.speed ?? DEFAULT_WALKER_SPEED,
          respawnIntervalMs: enemy.route.respawnIntervalMs ?? DEFAULT_WALKER_RESPAWN_INTERVAL_MS
        }
      : undefined;

    return {
      id: enemy.id,
      type: enemy.type,
      position: { ...spawnPosition },
      spawnPosition: { ...spawnPosition },
      active: true,
      respawnWaitMs: 0,
      fallVelocityY: 0,
      route,
      direction: enemy.route?.direction ?? -1
    };
  },

  snapToView(enemyRuntime, enemy, view) {
    const position = enemyPositionForView(enemy, view);
    const movingAxis = enemyRuntime.route?.axis;
    enemyRuntime.spawnPosition = { ...position };
    enemyRuntime.position = {
      ...position,
      x: movingAxis === "x" ? enemyRuntime.position.x : position.x,
      z: movingAxis === "z" ? enemyRuntime.position.z : position.z
    };
  },

  update(enemyRuntime, stage, dtSec) {
    const route = enemyRuntime.route;
    if (!route) {
      return;
    }

    if (!enemyRuntime.active) {
      enemyRuntime.respawnWaitMs -= dtSec * 1000;
      if (enemyRuntime.respawnWaitMs <= 0) {
        enemyRuntime.active = true;
        enemyRuntime.respawnWaitMs = 0;
        enemyRuntime.fallVelocityY = 0;
        enemyRuntime.position = { ...enemyRuntime.spawnPosition };
        enemyRuntime.position[route.axis] = enemyRuntime.direction < 0 ? route.max : route.min;
      }
      return;
    }

    enemyRuntime.position[route.axis] += route.speed * enemyRuntime.direction * dtSec;
    applyEnemyGrounding(enemyRuntime, stage.blocks, dtSec);

    if (enemyRuntime.position.y < ENEMY_DESPAWN_Y) {
      enemyRuntime.active = false;
      enemyRuntime.respawnWaitMs = route.respawnIntervalMs;
    }
  }
};
