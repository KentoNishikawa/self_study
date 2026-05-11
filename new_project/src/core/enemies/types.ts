import type { EnemyData, EnemyRuntimeState, StageData, View } from "../types";

export interface EnemyBehavior {
  create(enemy: EnemyData, view: View): EnemyRuntimeState;
  snapToView(enemyRuntime: EnemyRuntimeState, enemy: EnemyData, view: View): void;
  update(enemyRuntime: EnemyRuntimeState, stage: StageData, dtSec: number): void;
}

export function enemyPositionForView(enemy: EnemyData, view: View) {
  return enemy.posByView[view] ?? enemy.posByView.SIDE ?? enemy.posByView.FRONT ?? { x: 0, y: 0, z: 0 };
}
