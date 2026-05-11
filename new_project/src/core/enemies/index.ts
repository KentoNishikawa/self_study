import type { EnemyKind } from "../types";
import type { EnemyBehavior } from "./types";
import { choubaEnemyBehavior } from "./chouba";
import { gorubaEnemyBehavior } from "./goruba";
import { hoppinsEnemyBehavior } from "./hoppins";
import { ochyEnemyBehavior } from "./ochy";
import { tambaEnemyBehavior } from "./tamba";
import { walkerEnemyBehavior } from "./walker";

const ENEMY_BEHAVIORS: Record<EnemyKind, EnemyBehavior> = {
  WALKER: walkerEnemyBehavior,
  OCHY: ochyEnemyBehavior,
  HOPPINS: hoppinsEnemyBehavior,
  TAMBA: tambaEnemyBehavior,
  CHOUBA: choubaEnemyBehavior,
  GORUBA: gorubaEnemyBehavior
};

export function enemyBehaviorFor(type: EnemyKind): EnemyBehavior {
  return ENEMY_BEHAVIORS[type];
}
