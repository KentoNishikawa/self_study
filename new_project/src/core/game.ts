import stage001 from "../stages/stage001.json";
import stage002 from "../stages/stage002.json";
import stage003 from "../stages/stage003.json";
import stage004 from "../stages/stage004.json";
import stage005 from "../stages/stage005.json";
import stage006 from "../stages/stage006.json";
import stage007 from "../stages/stage007.json";
import stage008 from "../stages/stage008.json";
import stage009 from "../stages/stage009.json";
import { CHOUBA_STATUS_DURATION_MS, CRUMBLE_FLOOR_DELAY_MS, DEATH_RESPAWN_DELAY_MS, GORUBA_LOCK_MS, TAMBA_STATUS_DURATION_MS, TRAP_JUMP_GAME_OVER_Y, WARP_COOLDOWN_MS } from "./constants";
import { beginRotateTo, cameraPositionAroundPlayer, cameraTargetAroundPlayer, createCameraState, updateCameraRotation } from "./camera";
import { intersectsAabb, playerAabbAt, updateTrappedStateAfterRotate } from "./collision";
import { findInteractableDoor } from "./door";
import { createEnemyStates, isPlayerHitByEnemy, snapEnemiesToView, touchedStatusEnemyKind, updateEnemies } from "./enemy";
import { applyKeyDown, applyKeyUp, consumeInteract, createInputState } from "./input";
import { cloneVec3 } from "./math";
import { warpItemAtPlayer } from "./items";
import { createPlayerState, respawnPlayer, updatePlayer } from "./player";
import { loadSaveData, saveStageClear } from "./save";
import { blockAabb, blockScale, validateStageData } from "./stage";
import type { AABB, BlockData, CrumblingBlockRuntimeState, EnemyKind, FallingBlockRuntimeState, GameConfig, GameHandle, GameState, PlayerStatus, RenderState, StageData, StageItemData, StageSelectItem, Vec3, VerticalPanelKind, VerticalPanelRuntimeState, WarpRuntimeState } from "./types";

const STAGE_ORDER = ["stage001", "stage002", "stage003", "stage004", "stage005", "stage006", "stage007", "stage008", "stage009"] as const;

const STAGES: Record<string, StageData> = {
  stage001: stage001 as StageData,
  stage002: stage002 as StageData,
  stage003: stage003 as StageData,
  stage004: stage004 as StageData,
  stage005: stage005 as StageData,
  stage006: stage006 as StageData,
  stage007: stage007 as StageData,
  stage008: stage008 as StageData,
  stage009: stage009 as StageData
};

export function createGame(config: GameConfig = {}): GameHandle {
  const stageId = config.initialStageId ?? "stage001";
  const stage = getStage(stageId);
  validateStageData(stage);

  const camera = createCameraState(stage);
  const state: GameState = {
    mode: "PLAY",
    stage,
    player: createPlayerState(stage.start.spawn),
    input: createInputState(),
    camera,
    enemies: createEnemyStates(stage, camera.currentView),
    checkpoint: cloneVec3(stage.start.spawn),
    checkpointId: "stage-start",
    elapsedMs: 0,
    deathTimerMs: 0,
    statusMessage: "",
    pausedMode: null,
    warpCooldownMs: 0,
    warpRuntime: createWarpRuntime(stage),
    crumblingBlocks: [],
    verticalPanels: createVerticalPanelRuntime(stage),
    fallingBlocks: createFallingBlockRuntime(stage)
  };

  return { state };
}

export function getStageSelectItems(): StageSelectItem[] {
  const clearedStageId = loadSaveData()?.stageId;
  const clearedIndex = clearedStageId ? STAGE_ORDER.indexOf(clearedStageId as typeof STAGE_ORDER[number]) : -1;

  return STAGE_ORDER.map((stageId, index) => {
    const stage = getStage(stageId);
    return {
      id: stage.id,
      name: stage.name ?? stage.id,
      unlocked: index === 0 || index <= clearedIndex + 1,
      cleared: index <= clearedIndex
    };
  });
}

export function loadStage(game: GameHandle, stageId: string): void {
  const stage = getStage(stageId);
  validateStageData(stage);

  game.state.stage = stage;
  game.state.mode = "PLAY";
  game.state.camera = createCameraState(stage);
  game.state.player = createPlayerState(stage.start.spawn);
  game.state.input = createInputState();
  game.state.enemies = createEnemyStates(stage, game.state.camera.currentView);
  game.state.checkpoint = cloneVec3(stage.start.spawn);
  game.state.checkpointId = "stage-start";
  game.state.elapsedMs = 0;
  game.state.deathTimerMs = 0;
  game.state.statusMessage = `${stage.id} に移動しました。`;
  game.state.pausedMode = null;
  game.state.warpCooldownMs = 0;
  game.state.warpRuntime = createWarpRuntime(stage);
  game.state.crumblingBlocks = [];
  game.state.verticalPanels = createVerticalPanelRuntime(stage);
  game.state.fallingBlocks = createFallingBlockRuntime(stage);
}

export function onKeyDown(game: GameHandle, code: string, timestampMs: number): void {
  if (code === "Enter") {
    requestPause(game);
    return;
  }

  if (game.state.mode === "PAUSED") {
    return;
  }

  const command = applyKeyDown(game.state.input, code, timestampMs, game.state.mode === "PLAY");

  if (command === "ROTATE") {
    requestRotate(game);
  }

  if (command === "INTERACT") {
    requestInteract(game);
  }
}

export function onKeyUp(game: GameHandle, code: string, timestampMs: number): void {
  void timestampMs;
  applyKeyUp(game.state.input, code);

  if (code === "KeyQ" && game.state.mode !== "PAUSED") {
    requestDefaultView(game);
  }
}

export function requestRotate(game: GameHandle): void {
  requestView(game, "FRONT", "正面視点へ切替中...");
}

function requestDefaultView(game: GameHandle): void {
  requestView(game, "SIDE", "横視点へ戻しています...");
}

function requestView(game: GameHandle, targetView: "SIDE" | "FRONT", message: string): void {
  if (game.state.mode !== "PLAY" && game.state.mode !== "ROTATING") {
    return;
  }

  if (!game.state.camera.rotating && game.state.camera.currentView === targetView) {
    return;
  }

  game.state.mode = "ROTATING";
  beginRotateTo(game.state.camera, game.state.stage, targetView);
  game.state.statusMessage = message;
}

export function requestInteract(game: GameHandle): void {
  if (game.state.mode !== "PLAY") {
    return;
  }
  game.state.input.interactRequested = true;
}

export function requestPause(game: GameHandle): void {
  const state = game.state;
  if (state.mode !== "PLAY" && state.mode !== "ROTATING") {
    return;
  }

  state.pausedMode = state.mode;
  state.mode = "PAUSED";
  state.statusMessage = "一時停止中です。";
}

export function resumeGame(game: GameHandle): void {
  const state = game.state;
  if (state.mode !== "PAUSED") {
    return;
  }

  const resumeMode = state.pausedMode ?? "PLAY";
  state.pausedMode = null;
  state.mode = resumeMode;

  if (!state.input.viewSwitchHeld && state.camera.currentView !== "SIDE") {
    requestDefaultView(game);
    return;
  }

  state.statusMessage = "";
}

export function tick(game: GameHandle, dtMs: number): RenderState {
  const state = game.state;
  const safeDtMs = Math.min(dtMs, 50);

  if (state.mode === "ROTATING") {
    tickRotation(game, safeDtMs);
    return getRenderState(game);
  }

  if (state.mode === "DEAD") {
    tickDeath(game, safeDtMs);
    return getRenderState(game);
  }

  if (state.mode === "PAUSED") {
    return getRenderState(game);
  }

  if (state.mode === "PLAY") {
    tickPlay(game, safeDtMs);
  }

  return getRenderState(game);
}

export function getRenderState(game: GameHandle): RenderState {
  const state = game.state;
  const cameraPosition = cameraPositionAroundPlayer(state.camera, state.stage, state.player.position);
  const cameraTarget = cameraTargetAroundPlayer(state.camera, state.stage, state.player.position);

  return {
    mode: state.mode,
    stageId: state.stage.id,
    view: state.camera.currentView,
    viewCycle: [...state.stage.viewCycle],
    player: {
      position: cloneVec3(state.player.position),
      width: state.player.width,
      height: state.player.height,
      crouching: state.player.crouching,
      trapped: state.player.trappedBlockId !== null,
      status: state.player.status
    },
    camera: {
      position: cameraPosition,
      target: cameraTarget,
      yaw: state.camera.yaw,
      fov: state.camera.fov
    },
    blocks: activeBlocksForState(state).map((block) => ({
      id: block.id,
      pos: cloneVec3(block.pos),
      scale: blockScale(block),
      solid: block.solid,
      tags: block.tags ? [...block.tags] : undefined
    })),
    doors: state.stage.doors.map((door) => ({
      id: door.id,
      aabb: door.aabb,
      visible: door.visibleViews.includes(state.camera.currentView),
      kind: door.kind
    })),
    enemies: state.enemies
      .filter((enemy) => enemy.active)
      .map((enemy) => ({
        id: enemy.id,
        type: enemy.type,
        position: cloneVec3(enemy.position)
      })),
    checkpoints: state.stage.checkpoints.map((checkpoint) => ({
      id: checkpoint.id,
      aabb: checkpoint.aabb,
      active: checkpoint.id === state.checkpointId
    })),
    items: (state.stage.items ?? []).map((item) => ({
      id: item.id,
      kind: item.kind,
      aabb: item.aabb
    })),
    elapsedMs: state.elapsedMs,
    statusMessage: state.statusMessage
  };
}

function tickRotation(game: GameHandle, dtMs: number): void {
  const state = game.state;
  const result = updateCameraRotation(state.camera, state.stage, dtMs);

  if (result === "RUNNING") {
    return;
  }

  snapEnemiesToView(state.enemies, state.stage, state.camera.currentView);
  updateTrappedStateAfterRotate(state.player, activeBlocksForState(state), state.camera.currentView);

  state.mode = "PLAY";
  state.statusMessage = state.player.trappedBlockId ? "壁の中にいます。ブロック外へ出ると解除されます。" : "";
}

function tickDeath(game: GameHandle, dtMs: number): void {
  const state = game.state;
  state.deathTimerMs -= dtMs;

  if (state.deathTimerMs > 0) {
    return;
  }

  respawnPlayer(state.player, state.checkpoint);
  state.enemies = createEnemyStates(state.stage, state.camera.currentView);
  state.warpCooldownMs = 0;
  state.warpRuntime = createWarpRuntime(state.stage);
  state.crumblingBlocks = [];
  state.verticalPanels = createVerticalPanelRuntime(state.stage);
  state.fallingBlocks = createFallingBlockRuntime(state.stage);
  state.mode = "PLAY";
  state.statusMessage = "チェックポイントから再開しました。";
}

function tickPlay(game: GameHandle, dtMs: number): void {
  const state = game.state;
  const dtSec = dtMs / 1000;
  state.elapsedMs += dtMs;

  if (state.warpCooldownMs > 0) {
    state.warpCooldownMs = Math.max(0, state.warpCooldownMs - dtMs);
  }

  updatePlayerStatusTimer(state, dtMs);
  handleCrumblingBlocksBeforePlayerUpdate(state);
  updateVerticalPanels(state, dtMs);
  updateFallingBlocks(state, dtMs);

  const activeBlocks = activeBlocksForState(state);
  updatePlayer(state, activeBlocks, dtSec, state.elapsedMs);
  updateEnemies(state.enemies, { ...state.stage, blocks: activeBlocksForState(state) }, dtSec);
  handleCrumblingBlocksAfterPlayerUpdate(state, dtMs);
  handleWarp(state);
  handleStatusEnemyContact(state);
  handleFallingBlockHit(state);
  handleCheckpoint(state);
  handleDoor(game);

  if (state.mode !== "PLAY") {
    return;
  }

  if (isPlayerHitByEnemy(state.player, state.enemies)) {
    killPlayer(state, "敵に触れました。");
  }

  if (state.player.trapLaunched && state.player.position.y > TRAP_JUMP_GAME_OVER_Y) {
    killPlayer(state, "トラップジャンプ台で飛ばされました。");
    return;
  }

  if (state.player.position.y < -8) {
    killPlayer(state, "落下しました。");
  }
}


function updatePlayerStatusTimer(state: GameState, dtMs: number): void {
  if (state.player.status !== "TAMBA" && state.player.status !== "CHOUBA") {
    return;
  }

  state.player.statusTimerMs = Math.max(0, state.player.statusTimerMs - dtMs);
  if (state.player.statusTimerMs === 0) {
    state.player.status = "NONE";
    state.statusMessage = "状態が解除されました。";
  }
}

function handleStatusEnemyContact(state: GameState): void {
  const touchedKind = touchedStatusEnemyKind(state.player, state.enemies);
  if (!touchedKind) {
    return;
  }

  const status = playerStatusForEnemy(touchedKind);
  if (!status) {
    return;
  }

  applyPlayerStatus(state, status);
}

function playerStatusForEnemy(enemyKind: EnemyKind): PlayerStatus | null {
  if (enemyKind === "TAMBA") {
    return "TAMBA";
  }
  if (enemyKind === "CHOUBA") {
    return "CHOUBA";
  }
  if (enemyKind === "GORUBA") {
    return "GORUBA";
  }
  return null;
}

function applyPlayerStatus(state: GameState, status: PlayerStatus): void {
  if (status === "TAMBA") {
    state.player.status = "TAMBA";
    state.player.statusTimerMs = TAMBA_STATUS_DURATION_MS;
    state.player.gorubaLockMs = 0;
    state.statusMessage = "タンバ状態：移動速度1.5倍 / ジャンプ0.5倍";
    return;
  }

  if (status === "CHOUBA") {
    state.player.status = "CHOUBA";
    state.player.statusTimerMs = CHOUBA_STATUS_DURATION_MS;
    state.player.gorubaLockMs = 0;
    state.statusMessage = "チョウバ状態：移動速度0.5倍 / ジャンプ1.5倍";
    return;
  }

  if (status === "GORUBA" && state.player.status !== "GORUBA") {
    state.player.status = "GORUBA";
    state.player.statusTimerMs = 0;
    state.player.gorubaLockMs = GORUBA_LOCK_MS;
    state.player.gorubaDirection = nearestCliffDirection(state);
    state.player.velocity = { x: 0, y: 0, z: 0 };
    state.statusMessage = "ゴルバ状態：1秒後に崖へ歩き出します。";
  }
}

function nearestCliffDirection(state: GameState): -1 | 1 {
  const blocks = activeBlocksForState(state);
  const originX = state.player.position.x;
  const bottom = state.player.position.y - state.player.height / 2;
  const step = 0.5;
  const maxDistance = 32;

  for (let distance = step; distance <= maxDistance; distance += step) {
    const leftHasGround = hasGroundAtX(blocks, originX - distance, state.player.position.z, bottom, state.player.width);
    const rightHasGround = hasGroundAtX(blocks, originX + distance, state.player.position.z, bottom, state.player.width);

    if (!leftHasGround && rightHasGround) {
      return -1;
    }
    if (!rightHasGround && leftHasGround) {
      return 1;
    }
    if (!leftHasGround && !rightHasGround) {
      return 1;
    }
  }

  return 1;
}

function hasGroundAtX(blocks: BlockData[], x: number, z: number, playerBottomY: number, playerWidth: number): boolean {
  const half = playerWidth / 2;
  for (const block of blocks) {
    if (!block.solid) {
      continue;
    }

    const box = blockAabb(block);
    const overlapsX = x + half > box.min.x && x - half < box.max.x;
    const overlapsZ = z + half > box.min.z && z - half < box.max.z;
    const groundLevel = box.max.y <= playerBottomY + 0.25 && box.max.y >= playerBottomY - 1.25;

    if (overlapsX && overlapsZ && groundLevel) {
      return true;
    }
  }

  return false;
}

function handleCheckpoint(state: GameState): void {
  const playerBox = playerAabbAt(state.player.position, state.player.width, state.player.height);
  for (const checkpoint of state.stage.checkpoints) {
    if (intersectsAabb(playerBox, checkpoint.aabb)) {
      if (state.checkpointId !== checkpoint.id) {
        state.checkpoint = cloneVec3(checkpoint.respawn);
        state.checkpointId = checkpoint.id;
        state.statusMessage = "チェックポイントを更新しました。";
      }
      return;
    }
  }
}

function handleDoor(game: GameHandle): void {
  const state = game.state;
  if (!consumeInteract(state.input)) {
    return;
  }

  const door = findInteractableDoor(state.stage, state.player, state.camera.currentView);
  if (!door) {
    state.statusMessage = "開けられる扉が近くにありません。";
    return;
  }

  if (door.kind === "DUMMY") {
    killPlayer(state, "ダミー扉でした。");
    return;
  }

  if (!door.toStageId) {
    clearStage(state);
    return;
  }

  loadStage(game, door.toStageId);
}

function clearStage(state: GameState): void {
  saveStageClear(state.stage.id);
  state.mode = "STAGE_CLEAR";
  state.statusMessage = "ステージクリア！";
}

function handleWarp(state: GameState): void {
  if (state.warpCooldownMs > 0) {
    return;
  }

  const item = warpItemAtPlayer(state);
  if (!item) {
    return;
  }

  const warpResult = resolveWarpResult(state, item);
  if (!warpResult) {
    return;
  }

  state.player.position = cloneVec3(warpResult.target);
  state.player.velocity = { x: 0, y: 0, z: 0 };
  state.player.onGround = false;
  state.player.trappedBlockId = null;
  state.warpCooldownMs = WARP_COOLDOWN_MS;

  if (!warpResult.good) {
    state.statusMessage = "ワープ先に足場がありません。";
    return;
  }

  state.statusMessage = "ワープしました。";
}

function resolveWarpResult(state: GameState, item: StageItemData): { target: Vec3; good: boolean } | null {
  if (state.warpRuntime) {
    if (item.id === state.warpRuntime.goodItemId) {
      return { target: state.warpRuntime.goodTarget, good: true };
    }

    if (item.id === state.warpRuntime.badItemId) {
      return { target: state.warpRuntime.badTarget, good: false };
    }
  }

  if (!item.target) {
    return null;
  }

  return { target: item.target, good: item.kind === "WARP_GOOD" };
}

function createWarpRuntime(stage: StageData): WarpRuntimeState | null {
  const goodWarp = stage.items?.find(isGoodWarpWithTarget);
  const badWarp = stage.items?.find(isBadWarpWithTarget);
  if (!goodWarp || !badWarp) {
    return null;
  }

  const swap = Math.random() < 0.5;
  return {
    goodItemId: swap ? badWarp.id : goodWarp.id,
    badItemId: swap ? goodWarp.id : badWarp.id,
    goodTarget: cloneVec3(goodWarp.target),
    badTarget: cloneVec3(badWarp.target)
  };
}

function isGoodWarpWithTarget(item: StageItemData): item is StageItemData & { target: Vec3 } {
  return item.kind === "WARP_GOOD" && item.target !== undefined;
}

function isBadWarpWithTarget(item: StageItemData): item is StageItemData & { target: Vec3 } {
  return item.kind === "WARP_BAD" && item.target !== undefined;
}

function handleCrumblingBlocksBeforePlayerUpdate(state: GameState): void {
  const block = findTouchedCrumblingFloor(state, state.stage.blocks);
  if (!block || !state.input.jump || !state.player.onGround) {
    return;
  }

  collapseCrumblingBlock(state, block.id);
}

function handleCrumblingBlocksAfterPlayerUpdate(state: GameState, dtMs: number): void {
  const block = findTouchedCrumblingFloor(state, activeBlocksForState(state));
  if (block) {
    const runtime = crumblingRuntimeFor(state, block.id);
    runtime.elapsedMs += dtMs;
    if (runtime.elapsedMs >= CRUMBLE_FLOOR_DELAY_MS) {
      collapseCrumblingBlock(state, block.id);
    }
  }
}

function findTouchedCrumblingFloor(state: GameState, blocks: BlockData[]): BlockData | null {
  const playerBox = playerAabbAt(state.player.position, state.player.width, state.player.height);
  const playerBottom = playerBox.min.y;

  for (const block of blocks) {
    if (!block.solid || !block.tags?.includes("crumbling-floor")) {
      continue;
    }

    const box = blockAabb(block);
    const overlapsX = playerBox.max.x > box.min.x && playerBox.min.x < box.max.x;
    const overlapsZ = playerBox.max.z > box.min.z && playerBox.min.z < box.max.z;
    const isOnTop = Math.abs(playerBottom - box.max.y) <= 0.12;

    if (overlapsX && overlapsZ && isOnTop) {
      return block;
    }
  }

  return null;
}

function crumblingRuntimeFor(state: GameState, blockId: string): CrumblingBlockRuntimeState {
  let runtime = state.crumblingBlocks.find((item) => item.blockId === blockId);
  if (!runtime) {
    runtime = { blockId, elapsedMs: 0, collapsed: false };
    state.crumblingBlocks.push(runtime);
  }
  return runtime;
}

function collapseCrumblingBlock(state: GameState, blockId: string): void {
  const runtime = crumblingRuntimeFor(state, blockId);
  runtime.collapsed = true;
  runtime.elapsedMs = CRUMBLE_FLOOR_DELAY_MS;
  state.statusMessage = "床が崩れました。";
}


function createVerticalPanelRuntime(stage: StageData): VerticalPanelRuntimeState[] {
  return stage.blocks.flatMap((block) => {
    const kind = verticalPanelKind(block);
    if (!kind) {
      return [];
    }

    const direction: -1 | 1 = kind.startsWith("DOWN_") ? -1 : 1;
    return [{
      blockId: block.id,
      kind,
      y: block.pos.y,
      direction,
      minY: -7,
      maxY: 9,
      jumpHeld: false
    }];
  });
}

function updateVerticalPanels(state: GameState, dtMs: number): void {
  if (state.verticalPanels.length === 0) {
    return;
  }

  const dtSec = dtMs / 1000;
  const blocksBefore = activeBlocksForState(state);
  for (const panel of state.verticalPanels) {
    const block = blocksBefore.find((item) => item.id === panel.blockId);
    if (!block) {
      continue;
    }

    const riderOnPanel = isPlayerOnBlockTop(state, block);
    if (isReversePanel(panel.kind) && riderOnPanel && state.input.jump && state.player.onGround && !panel.jumpHeld) {
      panel.direction = panel.direction === 1 ? -1 : 1;
      panel.jumpHeld = true;
    }
    if (!state.input.jump) {
      panel.jumpHeld = false;
    }

    const beforeY = panel.y;
    const moveDirection = verticalPanelMoveDirection(panel, riderOnPanel);
    const speed = verticalPanelSpeed(panel, riderOnPanel);
    panel.y += moveDirection * speed * dtSec;

    let wrapped = false;
    if (panel.y > panel.maxY) {
      panel.y = panel.minY;
      wrapped = true;
    }
    if (panel.y < panel.minY) {
      panel.y = panel.maxY;
      wrapped = true;
    }

    const deltaY = panel.y - beforeY;
    if (riderOnPanel && !wrapped && !state.input.jump) {
      state.player.position.y += deltaY;
    }
  }
}

function verticalPanelKind(block: BlockData): VerticalPanelKind | null {
  if (block.tags?.includes("up-panel-normal")) {
    return "UP_PANEL_NORMAL";
  }
  if (block.tags?.includes("up-panel-reverse")) {
    return "UP_PANEL_REVERSE";
  }
  if (block.tags?.includes("up-panel-gravity")) {
    return "UP_PANEL_GRAVITY";
  }
  if (block.tags?.includes("down-panel-normal")) {
    return "DOWN_PANEL_NORMAL";
  }
  if (block.tags?.includes("down-panel-reverse")) {
    return "DOWN_PANEL_REVERSE";
  }
  if (block.tags?.includes("down-panel-gravity")) {
    return "DOWN_PANEL_GRAVITY";
  }
  return null;
}

function isReversePanel(kind: VerticalPanelKind): boolean {
  return kind === "UP_PANEL_REVERSE" || kind === "DOWN_PANEL_REVERSE";
}

function verticalPanelMoveDirection(panel: VerticalPanelRuntimeState, riderOnPanel: boolean): -1 | 1 {
  if (panel.kind === "UP_PANEL_GRAVITY") {
    return riderOnPanel ? -1 : 1;
  }

  if (panel.kind === "DOWN_PANEL_GRAVITY") {
    return -1;
  }

  return panel.direction;
}

function verticalPanelSpeed(panel: VerticalPanelRuntimeState, riderOnPanel: boolean): number {
  if (panel.kind === "UP_PANEL_GRAVITY") {
    return riderOnPanel ? 0.8 : 2.2;
  }

  if (panel.kind === "DOWN_PANEL_GRAVITY") {
    return riderOnPanel ? 6.0 : 2.2;
  }

  return 2.4;
}

function isPlayerOnBlockTop(state: GameState, block: BlockData): boolean {
  const playerBox = playerAabbAt(state.player.position, state.player.width, state.player.height);
  const blockBox = blockAabb(block);
  const overlapsX = playerBox.max.x > blockBox.min.x && playerBox.min.x < blockBox.max.x;
  const overlapsZ = playerBox.max.z > blockBox.min.z && playerBox.min.z < blockBox.max.z;
  const isOnTop = Math.abs(playerBox.min.y - blockBox.max.y) <= 0.16;
  return overlapsX && overlapsZ && isOnTop;
}

function applyVerticalPanelPositions(state: GameState, blocks: BlockData[]): BlockData[] {
  if (state.verticalPanels.length === 0) {
    return blocks;
  }

  const panelYById = new Map(state.verticalPanels.map((panel) => [panel.blockId, panel.y]));
  return blocks.map((block) => {
    const panelY = panelYById.get(block.id);
    if (panelY === undefined) {
      return block;
    }

    return {
      ...block,
      pos: {
        ...block.pos,
        y: panelY
      }
    };
  });
}


function createFallingBlockRuntime(stage: StageData): FallingBlockRuntimeState[] {
  return stage.blocks.flatMap((block) => {
    if (!block.tags?.includes("falling-block")) {
      return [];
    }

    const fallStartY = block.fallStartY ?? block.pos.y;
    return [{
      blockId: block.id,
      triggered: false,
      landed: false,
      y: fallStartY,
      triggerX: block.fallTriggerX ?? block.pos.x,
      fallStartY,
      fallEndY: block.fallEndY ?? -1.5,
      fallSpeed: block.fallSpeed ?? 18
    }];
  });
}

function updateFallingBlocks(state: GameState, dtMs: number): void {
  if (state.fallingBlocks.length === 0) {
    return;
  }

  const dtSec = dtMs / 1000;
  for (const falling of state.fallingBlocks) {
    if (!falling.triggered && state.player.position.x >= falling.triggerX) {
      falling.triggered = true;
      falling.y = falling.fallStartY;
    }

    if (!falling.triggered || falling.landed) {
      continue;
    }

    falling.y -= falling.fallSpeed * dtSec;
    if (falling.y <= falling.fallEndY) {
      falling.y = falling.fallEndY;
      falling.landed = true;
    }
  }
}

function handleFallingBlockHit(state: GameState): void {
  if (state.mode !== "PLAY" || state.fallingBlocks.length === 0) {
    return;
  }

  const playerBox = playerAabbAt(state.player.position, state.player.width, state.player.height);
  const fallingBlockIds = new Set(state.fallingBlocks
    .filter((falling) => falling.triggered && !falling.landed)
    .map((falling) => falling.blockId));

  if (fallingBlockIds.size === 0) {
    return;
  }

  for (const block of activeBlocksForState(state)) {
    if (!fallingBlockIds.has(block.id)) {
      continue;
    }

    const box = blockAabb(block);
    const hit = state.camera.currentView === "SIDE"
      ? intersectsSideProjectionAabb(playerBox, box)
      : intersectsAabb(playerBox, box);

    if (hit) {
      killPlayer(state, "落下ブロックに当たりました。");
      return;
    }
  }
}

function intersectsSideProjectionAabb(a: AABB, b: AABB): boolean {
  return a.min.x < b.max.x &&
    a.max.x > b.min.x &&
    a.min.y < b.max.y &&
    a.max.y > b.min.y;
}

function applyFallingBlockPositions(state: GameState, blocks: BlockData[]): BlockData[] {
  if (state.fallingBlocks.length === 0) {
    return blocks;
  }

  const fallingById = new Map(state.fallingBlocks.map((falling) => [falling.blockId, falling]));
  return blocks.flatMap((block) => {
    const falling = fallingById.get(block.id);
    if (!falling) {
      return [block];
    }

    if (!falling.triggered) {
      return [];
    }

    return [{
      ...block,
      pos: {
        ...block.pos,
        y: falling.y
      }
    }];
  });
}

function activeBlocksForState(state: GameState): BlockData[] {
  const collapsedIds = new Set(state.crumblingBlocks.filter((item) => item.collapsed).map((item) => item.blockId));
  const activeBlocks = state.stage.blocks.filter((block) => !collapsedIds.has(block.id));
  return applyFallingBlockPositions(state, applyVerticalPanelPositions(state, activeBlocks));
}

function killPlayer(state: GameState, reason: string): void {
  if (state.mode === "DEAD") {
    return;
  }

  state.mode = "DEAD";
  state.elapsedMs = 0;
  state.deathTimerMs = DEATH_RESPAWN_DELAY_MS;
  state.statusMessage = `${reason} 再開します...`;
}

function getStage(stageId: string): StageData {
  const stage = STAGES[stageId];
  if (!stage) {
    throw new Error(`ステージが見つかりません: ${stageId}`);
  }
  return stage;
}
