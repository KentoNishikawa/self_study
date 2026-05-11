import { CAMERA_FOV, CAMERA_HEIGHT, CAMERA_RADIUS, ROTATE_DURATION_MS } from "./constants";
import { clamp, easeInOut, lerp, normalizeXZ } from "./math";
import type { CameraState, StageData, Vec3, View } from "./types";

export function createCameraState(stage: StageData): CameraState {
  const currentView = stage.viewCycle[0];
  const yaw = 0;
  return {
    currentView,
    currentViewIndex: 0,
    yaw,
    radius: CAMERA_RADIUS * 1.6,
    height: CAMERA_HEIGHT,
    fov: CAMERA_FOV,
    right: rightVectorFromYaw(yaw),
    rotating: null
  };
}

export function beginRotateTo(camera: CameraState, stage: StageData, targetView: View): void {
  if (!stage.viewCycle.includes(targetView)) {
    return;
  }

  if (!camera.rotating && camera.currentView === targetView) {
    return;
  }

  if (camera.rotating?.targetView === targetView) {
    return;
  }

  camera.rotating = {
    fromYaw: camera.yaw,
    toYaw: yawForView(targetView),
    targetView,
    elapsedMs: 0,
    durationMs: ROTATE_DURATION_MS
  };
}

export function updateCameraRotation(camera: CameraState, stage: StageData, dtMs: number): "RUNNING" | "DONE" {
  if (!camera.rotating) {
    return "DONE";
  }

  camera.rotating.elapsedMs += dtMs;
  const t = clamp(camera.rotating.elapsedMs / camera.rotating.durationMs, 0, 1);
  camera.yaw = lerp(camera.rotating.fromYaw, camera.rotating.toYaw, easeInOut(t));
  camera.right = rightVectorFromYaw(camera.yaw);

  if (t < 1) {
    return "RUNNING";
  }

  const targetView = camera.rotating.targetView;
  camera.yaw = camera.rotating.toYaw;
  camera.right = rightVectorFromYaw(camera.yaw);
  camera.currentView = targetView;
  camera.currentViewIndex = stage.viewCycle.indexOf(targetView);
  camera.rotating = null;

  return "DONE";
}

export function cameraPositionAroundPlayer(camera: CameraState, stage: StageData, playerPosition: Vec3): Vec3 {
  return {
    x: playerPosition.x + Math.sin(camera.yaw) * camera.radius,
    y: cameraViewY(camera, stage, playerPosition),
    z: playerPosition.z + Math.cos(camera.yaw) * camera.radius
  };
}

export function cameraTargetAroundPlayer(camera: CameraState, stage: StageData, playerPosition: Vec3): Vec3 {
  return {
    ...playerPosition,
    y: cameraViewY(camera, stage, playerPosition)
  };
}

export function nextView(stage: StageData, currentIndex: number): View {
  return stage.viewCycle[(currentIndex + 1) % stage.viewCycle.length];
}

function cameraViewY(camera: CameraState, _stage: StageData, playerPosition: Vec3): number {
  if (!camera.rotating) {
    return yForView(camera.currentView, camera, playerPosition);
  }

  const t = clamp(camera.rotating.elapsedMs / camera.rotating.durationMs, 0, 1);
  return lerp(
    yForView(camera.currentView, camera, playerPosition),
    yForView(camera.rotating.targetView, camera, playerPosition),
    easeInOut(t)
  );
}

function yForView(view: View, camera: CameraState, playerPosition: Vec3): number {
  return view === "SIDE" ? camera.height : playerPosition.y + camera.height;
}

function yawForView(view: View): number {
  if (view === "FRONT") {
    return -Math.PI / 2;
  }

  if (view === "BACK") {
    return Math.PI / 2;
  }

  return 0;
}

function rightVectorFromYaw(yaw: number): Vec3 {
  return normalizeXZ({ x: Math.cos(yaw), y: 0, z: -Math.sin(yaw) });
}
