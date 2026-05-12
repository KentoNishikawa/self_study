export type View = "SIDE" | "FRONT" | "BACK";
export type GameMode = "PLAY" | "ROTATING" | "DEAD" | "TRANSITION" | "STAGE_CLEAR" | "PAUSED";
export type BlockSizeName = "S" | "M" | "L" | "XL";
export type DoorKind = "REAL" | "DUMMY";
export type EnemyKind = "WALKER" | "OCHY" | "HOPPINS" | "TAMBA" | "CHOUBA" | "GORUBA";
export type StageItemKind = "JUMP_PAD" | "TRAP_JUMP_PAD" | "MOVE_FLOOR_RIGHT" | "MOVE_FLOOR_LEFT" | "WARP_GOOD" | "WARP_BAD";
export type PlayerStatus = "NONE" | "TAMBA" | "CHOUBA" | "GORUBA";

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface AABB {
  min: Vec3;
  max: Vec3;
}

export interface BlockData {
  id: string;
  pos: Vec3;
  size: BlockSizeName;
  solid: boolean;
  scale?: Vec3;
  tags?: string[];
  fallTriggerX?: number;
  fallStartY?: number;
  fallEndY?: number;
  fallSpeed?: number;
}

export interface DoorData {
  id: string;
  aabb: AABB;
  visibleViews: View[];
  kind: DoorKind;
  toStageId?: string;
}

export interface EnemyRouteData {
  axis: "x" | "z";
  min: number;
  max: number;
  speed?: number;
  direction?: -1 | 1;
  respawnIntervalMs?: number;
}

export interface EnemyRouteRuntimeState {
  axis: "x" | "z";
  min: number;
  max: number;
  speed: number;
  respawnIntervalMs: number;
}

export interface EnemyData {
  id: string;
  type: EnemyKind;
  posByView: Partial<Record<View, Vec3>>;
  route?: EnemyRouteData;
}

export interface CheckpointData {
  id: string;
  aabb: AABB;
  respawn: Vec3;
}

export interface StageItemData {
  id: string;
  kind: StageItemKind;
  aabb: AABB;
  target?: Vec3;
}

export interface StageData {
  id: string;
  name?: string;
  viewCycle: View[];
  blocks: BlockData[];
  doors: DoorData[];
  enemies: EnemyData[];
  checkpoints: CheckpointData[];
  items?: StageItemData[];
  start: {
    spawn: Vec3;
  };
}

export interface InputState {
  left: boolean;
  right: boolean;
  forward: boolean;
  back: boolean;
  jump: boolean;
  crouch: boolean;
  interactRequested: boolean;
  viewSwitchHeld: boolean;
  dashDirection: -1 | 0 | 1;
  dashActive: boolean;
  dashMinUntilMs: number;
  lastTapDirection: -1 | 0 | 1;
  lastTapAtMs: number;
}

export interface PlayerState {
  position: Vec3;
  velocity: Vec3;
  width: number;
  standingHeight: number;
  crouchingHeight: number;
  height: number;
  crouching: boolean;
  onGround: boolean;
  dashJumping: boolean;
  trappedBlockId: string | null;
  trapLaunched: boolean;
  status: PlayerStatus;
  statusTimerMs: number;
  gorubaLockMs: number;
  gorubaDirection: -1 | 1;
  stairAssistUsedInJump: boolean;
}

export interface CameraState {
  currentView: View;
  currentViewIndex: number;
  yaw: number;
  radius: number;
  height: number;
  fov: number;
  right: Vec3;
  rotating: {
    fromYaw: number;
    toYaw: number;
    targetView: View;
    elapsedMs: number;
    durationMs: number;
  } | null;
}

export interface EnemyRuntimeState {
  id: string;
  type: EnemyKind;
  position: Vec3;
  spawnPosition: Vec3;
  active: boolean;
  respawnWaitMs: number;
  fallVelocityY: number;
  route?: EnemyRouteRuntimeState;
  direction: -1 | 1;
}

export interface CrumblingBlockRuntimeState {
  blockId: string;
  elapsedMs: number;
  collapsed: boolean;
}

export type VerticalPanelKind =
  | "UP_PANEL_NORMAL"
  | "UP_PANEL_REVERSE"
  | "UP_PANEL_GRAVITY"
  | "DOWN_PANEL_NORMAL"
  | "DOWN_PANEL_REVERSE"
  | "DOWN_PANEL_GRAVITY";

export interface VerticalPanelRuntimeState {
  blockId: string;
  kind: VerticalPanelKind;
  y: number;
  direction: -1 | 1;
  minY: number;
  maxY: number;
  jumpHeld: boolean;
}

export interface FallingBlockRuntimeState {
  blockId: string;
  triggered: boolean;
  landed: boolean;
  y: number;
  triggerX: number;
  fallStartY: number;
  fallEndY: number;
  fallSpeed: number;
}

export interface WarpRuntimeState {
  goodItemId: string;
  badItemId: string;
  goodTarget: Vec3;
  badTarget: Vec3;
}

export interface GameState {
  mode: GameMode;
  stage: StageData;
  player: PlayerState;
  input: InputState;
  camera: CameraState;
  enemies: EnemyRuntimeState[];
  checkpoint: Vec3;
  checkpointId: string;
  elapsedMs: number;
  deathTimerMs: number;
  statusMessage: string;
  pausedMode: Exclude<GameMode, "PAUSED"> | null;
  warpCooldownMs: number;
  warpRuntime: WarpRuntimeState | null;
  crumblingBlocks: CrumblingBlockRuntimeState[];
  verticalPanels: VerticalPanelRuntimeState[];
  fallingBlocks: FallingBlockRuntimeState[];
}

export interface GameHandle {
  state: GameState;
}

export interface GameConfig {
  initialStageId?: string;
}

export interface StageSelectItem {
  id: string;
  name: string;
  unlocked: boolean;
  cleared: boolean;
}

export interface RenderBlock {
  id: string;
  pos: Vec3;
  scale: Vec3;
  solid: boolean;
  tags?: string[];
}

export interface RenderDoor {
  id: string;
  aabb: AABB;
  visible: boolean;
  kind: DoorKind;
}

export interface RenderEnemy {
  id: string;
  type: EnemyKind;
  position: Vec3;
}

export interface RenderCheckpoint {
  id: string;
  aabb: AABB;
  active: boolean;
}

export interface RenderStageItem {
  id: string;
  kind: StageItemKind;
  aabb: AABB;
}

export interface RenderState {
  mode: GameMode;
  stageId: string;
  view: View;
  viewCycle: View[];
  player: {
    position: Vec3;
    width: number;
    height: number;
    crouching: boolean;
    trapped: boolean;
    status: PlayerStatus;
  };
  camera: {
    position: Vec3;
    target: Vec3;
    yaw: number;
    fov: number;
  };
  blocks: RenderBlock[];
  doors: RenderDoor[];
  enemies: RenderEnemy[];
  checkpoints: RenderCheckpoint[];
  items: RenderStageItem[];
  elapsedMs: number;
  statusMessage: string;
}
