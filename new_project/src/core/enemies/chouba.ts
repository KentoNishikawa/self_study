import type { EnemyBehavior } from "./types";
import { enemyPositionForView } from "./types";

export const choubaEnemyBehavior: EnemyBehavior = {
  create(enemy, view) {
    const spawnPosition = enemyPositionForView(enemy, view);
    return {
      id: enemy.id,
      type: enemy.type,
      position: { ...spawnPosition },
      spawnPosition: { ...spawnPosition },
      active: true,
      respawnWaitMs: 0,
      fallVelocityY: 0,
      direction: enemy.route?.direction ?? -1
    };
  },

  snapToView(enemyRuntime, enemy, view) {
    const position = enemyPositionForView(enemy, view);
    enemyRuntime.spawnPosition = { ...position };
    enemyRuntime.position = { ...position };
  },

  update() {
    return;
  }
};
