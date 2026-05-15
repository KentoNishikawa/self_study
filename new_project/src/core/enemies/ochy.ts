import type { EnemyBehavior } from "../types";
import { enemyPositionForView } from "../enemyUtils";
import { ENEMY_DESPAWN_Y, isEnemyTouchingGround } from "../enemyPhysics";

const DEFAULT_OCHY_FALL_SPEED = 9.0;
const DEFAULT_OCHY_RESPAWN_INTERVAL_MS = 3000;

export const ochyEnemyBehavior: EnemyBehavior = {
  create(enemy, view) {
    const spawnPosition = enemyPositionForView(enemy, view);

    return {
      id: enemy.id,
      type: enemy.type,
      position: { ...spawnPosition },
      spawnPosition: { ...spawnPosition },
      active: true,
      respawnWaitMs: 0,
      fallVelocityY: -DEFAULT_OCHY_FALL_SPEED,
      direction: enemy.route?.direction ?? -1,
      route: enemy.route
        ? {
            axis: enemy.route.axis,
            min: enemy.route.min,
            max: enemy.route.max,
            speed: enemy.route.speed ?? DEFAULT_OCHY_FALL_SPEED,
            respawnIntervalMs: enemy.route.respawnIntervalMs ?? DEFAULT_OCHY_RESPAWN_INTERVAL_MS
          }
        : undefined
    };
  },

  snapToView(enemyRuntime, enemy, view) {
    const position = enemyPositionForView(enemy, view);
    enemyRuntime.spawnPosition = { ...position };
    enemyRuntime.position.x = position.x;
    enemyRuntime.position.z = position.z;
  },

  update(enemyRuntime, stage, dtSec) {
    const respawnIntervalMs = enemyRuntime.route?.respawnIntervalMs ?? DEFAULT_OCHY_RESPAWN_INTERVAL_MS;
    const fallSpeed = enemyRuntime.route?.speed ?? DEFAULT_OCHY_FALL_SPEED;

    if (!enemyRuntime.active) {
      enemyRuntime.respawnWaitMs -= dtSec * 1000;
      if (enemyRuntime.respawnWaitMs <= 0) {
        enemyRuntime.active = true;
        enemyRuntime.respawnWaitMs = 0;
        enemyRuntime.fallVelocityY = -fallSpeed;
        enemyRuntime.position = { ...enemyRuntime.spawnPosition };
      }
      return;
    }

    enemyRuntime.position.y -= fallSpeed * dtSec;

    if (isEnemyTouchingGround(enemyRuntime.position, stage.blocks) || enemyRuntime.position.y < ENEMY_DESPAWN_Y) {
      enemyRuntime.active = false;
      enemyRuntime.respawnWaitMs = respawnIntervalMs;
    }
  }
};
