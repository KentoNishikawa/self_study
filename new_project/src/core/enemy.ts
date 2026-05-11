import { ENEMY_HITBOX_SIZE } from "./constants";
import { intersectsAabb, playerAabbAt } from "./collision";
import { enemyBehaviorFor } from "./enemies";
import { aabbFromCenterAndSize } from "./stage";
import type { EnemyKind, EnemyRuntimeState, PlayerState, StageData, View } from "./types";

export function createEnemyStates(stage: StageData, view: View): EnemyRuntimeState[] {
  return stage.enemies.map((enemy) => enemyBehaviorFor(enemy.type).create(enemy, view));
}

export function snapEnemiesToView(enemies: EnemyRuntimeState[], stage: StageData, view: View): void {
  for (const enemyRuntime of enemies) {
    const enemyData = stage.enemies.find((enemy) => enemy.id === enemyRuntime.id);
    if (!enemyData) {
      continue;
    }
    enemyBehaviorFor(enemyRuntime.type).snapToView(enemyRuntime, enemyData, view);
  }
}

export function updateEnemies(enemies: EnemyRuntimeState[], stage: StageData, dtSec: number): void {
  for (const enemy of enemies) {
    enemyBehaviorFor(enemy.type).update(enemy, stage, dtSec);
  }
}

export function touchedStatusEnemyKind(player: PlayerState, enemies: EnemyRuntimeState[]): EnemyKind | null {
  const playerBox = playerAabbAt(player.position, player.width, player.height);
  for (const enemy of enemies) {
    if (!enemy.active || !isStatusEnemy(enemy.type)) {
      continue;
    }

    const enemyBox = enemyAabb(enemy);
    if (intersectsAabb(playerBox, enemyBox)) {
      return enemy.type;
    }
  }
  return null;
}

export function isPlayerHitByEnemy(player: PlayerState, enemies: EnemyRuntimeState[]): boolean {
  if (player.status === "GORUBA") {
    return false;
  }

  const playerBox = playerAabbAt(player.position, player.width, player.height);
  for (const enemy of enemies) {
    if (!enemy.active || isStatusEnemy(enemy.type)) {
      continue;
    }

    const enemyBox = enemyAabb(enemy);
    if (intersectsAabb(playerBox, enemyBox)) {
      return true;
    }
  }
  return false;
}

function enemyAabb(enemy: EnemyRuntimeState) {
  return aabbFromCenterAndSize(enemy.position, {
    x: ENEMY_HITBOX_SIZE,
    y: ENEMY_HITBOX_SIZE,
    z: ENEMY_HITBOX_SIZE
  });
}

function isStatusEnemy(type: EnemyKind): boolean {
  return type === "TAMBA" || type === "CHOUBA" || type === "GORUBA";
}
