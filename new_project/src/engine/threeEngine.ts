import * as THREE from "three";
import { aabbCenter, aabbSize } from "../core/stage";
import type { AABB, RenderState, Vec3 } from "../core/types";

export interface ThreeEngine {
  render(state: RenderState): void;
  projectAabbToScreen(aabb: AABB): { x: number; y: number; width: number; height: number } | null;
  dispose(): void;
}

export function createThreeEngine(root: HTMLElement): ThreeEngine {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0f172a);

  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 1000);
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = false;
  root.appendChild(renderer.domElement);

  const hemiLight = new THREE.HemisphereLight(0xffffff, 0x334155, 1.7);
  scene.add(hemiLight);

  const dirLight = new THREE.DirectionalLight(0xffffff, 2.2);
  dirLight.position.set(4, 8, 6);
  dirLight.castShadow = false;
  scene.add(dirLight);

  const grid = new THREE.GridHelper(40, 40, 0x475569, 0x1e293b);
  scene.add(grid);

  const blockMeshes = new Map<string, THREE.Mesh>();
  const doorMeshes = new Map<string, THREE.Mesh>();
  const checkpointMeshes = new Map<string, THREE.Mesh>();
  const enemyMeshes = new Map<string, THREE.Mesh>();
  const itemMeshes = new Map<string, THREE.Mesh>();
  const hazardWallMeshes = new Map<string, THREE.Mesh>();
  const playerMesh = createBoxMesh(0x93c5fd);
  scene.add(playerMesh);

  const resize = () => {
    const width = Math.max(root.clientWidth, 1);
    const height = Math.max(root.clientHeight, 1);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  };

  window.addEventListener("resize", resize);
  resize();

  return {
    render(state: RenderState): void {
      resize();
      syncBlocks(scene, blockMeshes, state);
      syncDoors(scene, doorMeshes, state);
      syncCheckpoints(scene, checkpointMeshes, state);
      syncEnemies(scene, enemyMeshes, state);
      syncItems(scene, itemMeshes, state);
      syncHazardWalls(scene, hazardWallMeshes, state);

      playerMesh.position.set(state.player.position.x, state.player.position.y, state.player.position.z);
      playerMesh.scale.set(state.player.width, state.player.height, state.player.width);
      setMeshColor(playerMesh, playerColor(state.player.status, state.player.trapped));

      camera.fov = state.camera.fov;
      camera.position.set(state.camera.position.x, state.camera.position.y, state.camera.position.z);
      camera.lookAt(state.camera.target.x, state.camera.target.y, state.camera.target.z);
      camera.updateProjectionMatrix();

      renderer.render(scene, camera);
    },
    projectAabbToScreen(aabb: AABB): { x: number; y: number; width: number; height: number } | null {
      return projectAabbToScreen(aabb, camera, root);
    },
    dispose(): void {
      window.removeEventListener("resize", resize);
      renderer.dispose();
      root.replaceChildren();
      disposeMap(blockMeshes);
      disposeMap(doorMeshes);
      disposeMap(checkpointMeshes);
      disposeMap(enemyMeshes);
      disposeMap(itemMeshes);
      disposeMap(hazardWallMeshes);
      playerMesh.geometry.dispose();
      disposeMaterial(playerMesh.material);
    }
  };
}

function projectAabbToScreen(aabb: AABB, camera: THREE.Camera, root: HTMLElement): { x: number; y: number; width: number; height: number } | null {
  const corners: Vec3[] = [
    { x: aabb.min.x, y: aabb.min.y, z: aabb.min.z },
    { x: aabb.min.x, y: aabb.min.y, z: aabb.max.z },
    { x: aabb.min.x, y: aabb.max.y, z: aabb.min.z },
    { x: aabb.min.x, y: aabb.max.y, z: aabb.max.z },
    { x: aabb.max.x, y: aabb.min.y, z: aabb.min.z },
    { x: aabb.max.x, y: aabb.min.y, z: aabb.max.z },
    { x: aabb.max.x, y: aabb.max.y, z: aabb.min.z },
    { x: aabb.max.x, y: aabb.max.y, z: aabb.max.z }
  ];
  const projected = corners.map((corner) => {
    const vector = new THREE.Vector3(corner.x, corner.y, corner.z).project(camera);
    return {
      x: (vector.x * 0.5 + 0.5) * root.clientWidth,
      y: (-vector.y * 0.5 + 0.5) * root.clientHeight,
      z: vector.z
    };
  }).filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y));

  if (projected.length === 0) {
    return null;
  }

  const minX = Math.min(...projected.map((point) => point.x));
  const maxX = Math.max(...projected.map((point) => point.x));
  const minY = Math.min(...projected.map((point) => point.y));
  const maxY = Math.max(...projected.map((point) => point.y));

  return {
    x: (minX + maxX) / 2,
    y: (minY + maxY) / 2,
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY)
  };
}

function syncBlocks(scene: THREE.Scene, meshes: Map<string, THREE.Mesh>, state: RenderState): void {
  const activeIds = new Set<string>();

  for (let index = 0; index < state.blocks.length; index += 1) {
    const block = state.blocks[index];
    activeIds.add(block.id);
    const color = blockColor(state.stageId, block.solid, index, block.tags);
    let mesh = meshes.get(block.id);
    if (!mesh) {
      mesh = createFlatBoxMesh(color);
      meshes.set(block.id, mesh);
      scene.add(mesh);
    }
    mesh.position.set(block.pos.x, block.pos.y, block.pos.z);
    mesh.scale.set(block.scale.x, block.scale.y, block.scale.z);
    setMeshColor(mesh, color);
  }

  removeInactive(scene, meshes, activeIds);
}

function blockColor(stageId: string, solid: boolean, blockIndex: number, tags?: string[]): number {
  if (tags?.includes("falling-block")) {
    return 0xe879f9;
  }

  if (tags?.includes("up-panel-normal")) {
    return 0x38bdf8;
  }
  if (tags?.includes("down-panel-normal")) {
    return 0xf87171;
  }
  if (tags?.includes("up-panel-reverse") || tags?.includes("down-panel-reverse")) {
    return 0xa78bfa;
  }
  if (tags?.includes("up-panel-gravity") || tags?.includes("down-panel-gravity")) {
    return 0xfacc15;
  }

  void stageId;
  void blockIndex;
  return solid ? 0x64748b : 0x334155;
}

function syncDoors(scene: THREE.Scene, meshes: Map<string, THREE.Mesh>, state: RenderState): void {
  const activeIds = new Set<string>();

  for (const door of state.doors) {
    activeIds.add(door.id);
    let mesh = meshes.get(door.id);
    if (!mesh) {
      mesh = createBoxMesh(door.kind === "REAL" ? 0x22c55e : 0xef4444);
      meshes.set(door.id, mesh);
      scene.add(mesh);
    }

    const center = aabbCenter(door.aabb);
    const size = aabbSize(door.aabb);
    mesh.position.set(center.x, center.y, center.z);
    mesh.scale.set(size.x, size.y, size.z);
    mesh.visible = door.visible;
  }

  removeInactive(scene, meshes, activeIds);
}

function syncCheckpoints(scene: THREE.Scene, meshes: Map<string, THREE.Mesh>, state: RenderState): void {
  const activeIds = new Set<string>();

  for (const checkpoint of state.checkpoints) {
    activeIds.add(checkpoint.id);
    let mesh = meshes.get(checkpoint.id);
    if (!mesh) {
      mesh = createBoxMesh(checkpoint.active ? 0x22c55e : 0xfde047);
      meshes.set(checkpoint.id, mesh);
      scene.add(mesh);
    }

    const center = aabbCenter(checkpoint.aabb);
    const size = aabbSize(checkpoint.aabb);
    mesh.position.set(center.x, center.y, center.z);
    mesh.scale.set(size.x, size.y, size.z);
    setMeshColor(mesh, checkpoint.active ? 0x22c55e : 0xfde047);
  }

  removeInactive(scene, meshes, activeIds);
}

function syncEnemies(scene: THREE.Scene, meshes: Map<string, THREE.Mesh>, state: RenderState): void {
  const activeIds = new Set<string>();

  for (const enemy of state.enemies) {
    activeIds.add(enemy.id);
    let mesh = meshes.get(enemy.id);
    if (!mesh) {
      mesh = createBoxMesh(enemyColor(enemy.type));
      meshes.set(enemy.id, mesh);
      scene.add(mesh);
    }
    mesh.position.set(enemy.position.x, enemy.position.y, enemy.position.z);
    mesh.scale.set(0.8, 0.8, 0.8);
    setMeshColor(mesh, enemyColor(enemy.type));
  }

  removeInactive(scene, meshes, activeIds);
}

function syncItems(scene: THREE.Scene, meshes: Map<string, THREE.Mesh>, state: RenderState): void {
  const activeIds = new Set<string>();

  for (const item of state.items) {
    activeIds.add(item.id);
    let mesh = meshes.get(item.id);
    if (!mesh) {
      mesh = createBoxMesh(itemColor(item.kind));
      meshes.set(item.id, mesh);
      scene.add(mesh);
    }

    const center = aabbCenter(item.aabb);
    const size = aabbSize(item.aabb);
    mesh.position.set(center.x, center.y, center.z);
    mesh.scale.set(size.x, size.y, size.z);
    setMeshColor(mesh, itemColor(item.kind));
  }

  removeInactive(scene, meshes, activeIds);
}

function syncHazardWalls(scene: THREE.Scene, meshes: Map<string, THREE.Mesh>, state: RenderState): void {
  const activeIds = new Set<string>();

  for (const wall of state.hazardWalls) {
    activeIds.add(wall.id);
    let mesh = meshes.get(wall.id);
    if (!mesh) {
      mesh = createFlatBoxMesh(hazardWallColor(wall.wallType, wall.openingKind));
      meshes.set(wall.id, mesh);
      scene.add(mesh);
    }

    const center = aabbCenter(wall.aabb);
    const size = aabbSize(wall.aabb);
    mesh.position.set(center.x, center.y, center.z);
    mesh.scale.set(size.x, size.y, size.z);
    setMeshColor(mesh, hazardWallColor(wall.wallType, wall.openingKind));
  }

  removeInactive(scene, meshes, activeIds);
}

function hazardWallColor(wallType: RenderState["hazardWalls"][number]["wallType"], openingKind: RenderState["hazardWalls"][number]["openingKind"]): number {
  if (wallType === "DEPTH_WALL") {
    return openingKind === "NORMAL_JUMP" ? 0xfb7185 : 0xf43f5e;
  }

  switch (openingKind) {
    case "CROUCH":
      return 0xef4444;
    case "STAND":
      return 0xf97316;
    case "SMALL_JUMP":
      return 0xeab308;
    case "NORMAL_JUMP":
      return 0xdc2626;
    default:
      return 0xef4444;
  }
}

function itemColor(kind: RenderState["items"][number]["kind"]): number {
  switch (kind) {
    case "JUMP_PAD":
      return 0x38bdf8;
    case "TRAP_JUMP_PAD":
      return 0xec4899;
    case "MOVE_FLOOR_RIGHT":
      return 0xfacc15;
    case "MOVE_FLOOR_LEFT":
      return 0xfb923c;
    case "WARP_GOOD":
    case "WARP_BAD":
      return 0x14b8a6;
    default:
      return 0xdc2626;
  }
}

function playerColor(status: RenderState["player"]["status"], trapped: boolean): number {
  if (trapped) {
    return 0xfde68a;
  }

  switch (status) {
    case "TAMBA":
      return 0xfacc15;
    case "CHOUBA":
      return 0x38bdf8;
    case "GORUBA":
      return 0x6d28d9;
    case "NONE":
    default:
      return 0x93c5fd;
  }
}

function enemyColor(type: RenderState["enemies"][number]["type"]): number {
  switch (type) {
    case "OCHY":
      return 0xa855f7;
    case "HOPPINS":
      return 0x22c55e;
    case "TAMBA":
      return 0xfacc15;
    case "CHOUBA":
      return 0x38bdf8;
    case "GORUBA":
      return 0x6d28d9;
    case "WALKER":
    default:
      return 0xf97316;
  }
}

function createBoxMesh(color: number): THREE.Mesh {
  return new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshStandardMaterial({ color, roughness: 0.72 })
  );
}

function createFlatBoxMesh(color: number): THREE.Mesh {
  return new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshBasicMaterial({ color })
  );
}

function setMeshColor(mesh: THREE.Mesh, color: number): void {
  const material = mesh.material;
  if (Array.isArray(material)) {
    for (const item of material) {
      setMaterialColor(item, color);
    }
    return;
  }
  setMaterialColor(material, color);
}

function setMaterialColor(material: THREE.Material, color: number): void {
  if (material instanceof THREE.MeshStandardMaterial || material instanceof THREE.MeshBasicMaterial) {
    material.color.setHex(color);
  }
}

function removeInactive(scene: THREE.Scene, meshes: Map<string, THREE.Mesh>, activeIds: Set<string>): void {
  for (const [id, mesh] of meshes) {
    if (!activeIds.has(id)) {
      scene.remove(mesh);
      mesh.geometry.dispose();
      disposeMaterial(mesh.material);
      meshes.delete(id);
    }
  }
}

function disposeMap(meshes: Map<string, THREE.Mesh>): void {
  for (const mesh of meshes.values()) {
    mesh.geometry.dispose();
    disposeMaterial(mesh.material);
  }
  meshes.clear();
}

function disposeMaterial(material: THREE.Material | THREE.Material[]): void {
  if (Array.isArray(material)) {
    for (const item of material) {
      item.dispose();
    }
    return;
  }
  material.dispose();
}
