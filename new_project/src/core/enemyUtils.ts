import type { EnemyData, Vec3, View } from "./types";

export function enemyPositionForView(enemy: EnemyData, view: View): Vec3 {
  return enemy.posByView[view] ?? enemy.posByView.SIDE ?? enemy.posByView.FRONT ?? { x: 0, y: 0, z: 0 };
}
