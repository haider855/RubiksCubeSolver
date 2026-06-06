import { useAnimations, useGLTF } from "@react-three/drei";
import type { ThreeEvent } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { invertMove } from "../../cube/index.js";
import type { CubeColour, CubeState, Face, Move } from "../../cube/index.js";
import { COLOUR_SWATCHES } from "../cubeDisplay.js";
import { getModelAnimationName } from "./animationMap.js";

const MODEL_URL = `${import.meta.env.BASE_URL}models/rubiks_cube.glb`;
const MODEL_SCALE = 0.012;
const CUBIE_STEP = 75.65;
const MOVE_DURATION_MS = 420;

type CubeModelProps = {
  activeMove: string | null;
  baseCube: CubeState;
  currentMoveIndex: number;
  moves: Move[];
  onStickerClick: (face: Face, index: number) => void;
};

type Axis = "x" | "y" | "z";
type GridValue = -1 | 0 | 1;
type CubieCoord = Record<Axis, GridValue>;
type StickerBinding = {
  face: Face;
  index: number;
};

type MeshEntry = {
  mesh: THREE.Mesh;
  sticker?: StickerBinding;
};

type CubieEntry = {
  currentCoord: CubieCoord;
  group: THREE.Group;
  initialCoord: CubieCoord;
  initialPosition: THREE.Vector3;
  initialQuaternion: THREE.Quaternion;
  initialScale: THREE.Vector3;
};

type PreparedModel = {
  cubieEntries: CubieEntry[];
  meshEntries: MeshEntry[];
};

type PlaybackRequest = {
  baseCube: CubeState;
  currentMoveIndex: number;
  moves: Move[];
};

type ModelPlaybackState = PreparedModel & {
  cubeGroup: THREE.Group;
  currentMoveIndex: number;
  isAnimating: boolean;
  pendingRequest: PlaybackRequest | null;
  syncKey: string;
};

type MoveAnimation = {
  axis: Axis;
  layer: GridValue;
  turns: number;
};

const STICKER_MATERIALS = createStickerMaterials();

const BASE_MOVE_DEFINITIONS: Record<
  Move[0],
  { appAxis: Axis; layer: GridValue; clockwiseTurnsOnPositiveAxis: -1 | 1 }
> = {
  U: { appAxis: "y", layer: 1, clockwiseTurnsOnPositiveAxis: -1 },
  D: { appAxis: "y", layer: -1, clockwiseTurnsOnPositiveAxis: 1 },
  F: { appAxis: "z", layer: 1, clockwiseTurnsOnPositiveAxis: -1 },
  B: { appAxis: "z", layer: -1, clockwiseTurnsOnPositiveAxis: 1 },
  L: { appAxis: "x", layer: -1, clockwiseTurnsOnPositiveAxis: 1 },
  R: { appAxis: "x", layer: 1, clockwiseTurnsOnPositiveAxis: -1 },
};

export function CubeModel({
  activeMove,
  baseCube,
  currentMoveIndex,
  moves,
  onStickerClick,
}: CubeModelProps) {
  const groupRef = useRef<THREE.Group>(null);
  const cubeGroupRef = useRef<THREE.Group>(null);
  const playbackStateRef = useRef<ModelPlaybackState | null>(null);
  const { scene: loadedScene, animations } = useGLTF(MODEL_URL);
  const scene = useMemo(() => loadedScene.clone(true), [loadedScene]);
  const { actions } = useAnimations(animations, groupRef);

  useEffect(() => {
    const cubeGroup = cubeGroupRef.current;

    if (!cubeGroup || playbackStateRef.current) {
      return;
    }

    const preparedModel = prepareModel(cubeGroup, scene);

    playbackStateRef.current = {
      ...preparedModel,
      cubeGroup,
      currentMoveIndex: 0,
      isAnimating: false,
      pendingRequest: null,
      syncKey: "",
    };

    applyPlaybackRequest(playbackStateRef.current, {
      baseCube,
      currentMoveIndex,
      moves,
    });
  }, [baseCube, currentMoveIndex, moves, scene]);

  useEffect(() => {
    const playbackState = playbackStateRef.current;

    if (!playbackState) {
      return;
    }

    applyPlaybackRequest(playbackState, {
      baseCube,
      currentMoveIndex,
      moves,
    });
  }, [baseCube, currentMoveIndex, moves]);

  useEffect(() => {
    const clipName = getModelAnimationName(activeMove);

    if (!clipName) {
      return;
    }

    const action = actions[clipName];

    if (!action) {
      return;
    }

    action.reset();
    action.setLoop(THREE.LoopOnce, 1);
    action.clampWhenFinished = true;
    action.fadeIn(0.06).play();

    return () => {
      action.fadeOut(0.1);
    };
  }, [activeMove, actions]);

  function handleClick(event: ThreeEvent<MouseEvent>): void {
    const clickedObject = event.object;

    if (!(clickedObject instanceof THREE.Mesh)) {
      return;
    }

    const binding = getStickerBinding(clickedObject);

    if (!binding) {
      return;
    }

    event.stopPropagation();
    onStickerClick(binding.face, binding.index);
  }

  return (
    <group
      ref={groupRef}
      onClick={handleClick}
      rotation={[0, -Math.PI / 8, 0]}
      scale={MODEL_SCALE}
    >
      <group ref={cubeGroupRef} />
    </group>
  );
}

useGLTF.preload(MODEL_URL);

function prepareModel(
  cubeGroup: THREE.Group,
  modelScene: THREE.Group,
): PreparedModel {
  const sourceMeshes: THREE.Mesh[] = [];

  cubeGroup.add(modelScene);
  cubeGroup.updateMatrixWorld(true);
  modelScene.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      sourceMeshes.push(object);
    }
  });

  for (const mesh of sourceMeshes) {
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    cubeGroup.attach(mesh);
  }

  cubeGroup.remove(modelScene);
  cubeGroup.updateMatrixWorld(true);

  const modelBounds = new THREE.Box3().setFromObject(cubeGroup);
  const modelCenter = cubeGroup.worldToLocal(
    modelBounds.getCenter(new THREE.Vector3()),
  );

  for (const mesh of sourceMeshes) {
    mesh.position.sub(modelCenter);
  }

  cubeGroup.updateMatrixWorld(true);

  const meshEntries: MeshEntry[] = [];
  const cubieMap = new Map<string, CubieEntry>();

  for (const mesh of sourceMeshes) {
    const center = getMeshCenterInModelSpace(cubeGroup, mesh);
    const currentCoord = getCubieCoord(center);
    const sticker =
      getMaterialName(mesh) === "Cube"
        ? undefined
        : getStickerBindingFromModelCenter(center);
    const cubieKey = createCubieKey(currentCoord);
    let cubieEntry = cubieMap.get(cubieKey);

    if (!cubieEntry) {
      const group = new THREE.Group();

      group.position.copy(getCubieCenter(currentCoord));
      cubeGroup.add(group);

      cubieEntry = {
        currentCoord,
        group,
        initialCoord: { ...currentCoord },
        initialPosition: group.position.clone(),
        initialQuaternion: group.quaternion.clone(),
        initialScale: group.scale.clone(),
      };
      cubieMap.set(cubieKey, cubieEntry);
    }

    cubieEntry.group.attach(mesh);
    if (sticker) {
      mesh.userData.stickerBinding = sticker;
    }
    meshEntries.push({
      mesh,
      ...(sticker ? { sticker } : {}),
    });
  }

  return {
    cubieEntries: [...cubieMap.values()],
    meshEntries,
  };
}

function applyPlaybackRequest(
  state: ModelPlaybackState,
  request: PlaybackRequest,
): void {
  state.pendingRequest = request;

  if (!state.isAnimating) {
    void processPendingRequest(state);
  }
}

async function processPendingRequest(state: ModelPlaybackState): Promise<void> {
  const request = state.pendingRequest;

  if (!request) {
    return;
  }

  state.pendingRequest = null;
  const requestKey = createSyncKey(request.baseCube, request.moves);

  if (state.syncKey !== requestKey) {
    resetViewerToBaseCube(state, request.baseCube);
    state.syncKey = requestKey;
    state.currentMoveIndex = 0;
  }

  if (request.currentMoveIndex === state.currentMoveIndex + 1) {
    const move = request.moves[state.currentMoveIndex];

    if (move) {
      await applyMoveToModel(state, move, true);
      state.currentMoveIndex += 1;
    }
  } else if (request.currentMoveIndex === state.currentMoveIndex - 1) {
    const move = request.moves[request.currentMoveIndex];

    if (move) {
      await applyMoveToModel(state, invertMove(move), true);
      state.currentMoveIndex -= 1;
    }
  } else if (request.currentMoveIndex !== state.currentMoveIndex) {
    resetViewerToBaseCube(state, request.baseCube);
    for (let index = 0; index < request.currentMoveIndex; index += 1) {
      const move = request.moves[index];

      if (move) {
        await applyMoveToModel(state, move, false);
      }
    }
    state.currentMoveIndex = request.currentMoveIndex;
  }

  if (state.pendingRequest) {
    await processPendingRequest(state);
  }
}

function resetViewerToBaseCube(
  state: ModelPlaybackState,
  baseCube: CubeState,
): void {
  for (const cubie of state.cubieEntries) {
    cubie.group.position.copy(cubie.initialPosition);
    cubie.group.quaternion.copy(cubie.initialQuaternion);
    cubie.group.scale.copy(cubie.initialScale);
    cubie.currentCoord = { ...cubie.initialCoord };
  }

  for (const entry of state.meshEntries) {
    if (entry.sticker) {
      entry.mesh.material =
        STICKER_MATERIALS[baseCube[entry.sticker.face][entry.sticker.index]];
    }
  }
}

async function applyMoveToModel(
  state: ModelPlaybackState,
  move: Move,
  shouldAnimate: boolean,
): Promise<void> {
  const animation = getMoveAnimation(move);
  const selectedCubies = state.cubieEntries.filter(
    (cubie) => cubie.currentCoord[animation.axis] === animation.layer,
  );
  const pivot = new THREE.Group();

  state.cubeGroup.add(pivot);
  for (const cubie of selectedCubies) {
    pivot.attach(cubie.group);
  }

  const finalAngle = animation.turns * (Math.PI / 2);

  if (shouldAnimate) {
    state.isAnimating = true;
    await animatePivotTurn(pivot, animation.axis, finalAngle);
    state.isAnimating = false;
  } else {
    pivot.rotation[animation.axis] = finalAngle;
  }

  pivot.updateMatrixWorld(true);
  for (const cubie of selectedCubies) {
    state.cubeGroup.attach(cubie.group);
    cubie.currentCoord = rotateCubieCoord(
      cubie.currentCoord,
      animation.axis,
      animation.turns,
    );
  }

  state.cubeGroup.remove(pivot);
}

function animatePivotTurn(
  pivot: THREE.Group,
  axis: Axis,
  finalAngle: number,
): Promise<void> {
  const startedAt = performance.now();

  return new Promise((resolve) => {
    function frame(now: number): void {
      const progress = Math.min(1, (now - startedAt) / MOVE_DURATION_MS);
      const easedProgress = easeInOutCubic(progress);

      pivot.rotation[axis] = finalAngle * easedProgress;

      if (progress < 1) {
        window.requestAnimationFrame(frame);
        return;
      }

      resolve();
    }

    window.requestAnimationFrame(frame);
  });
}

function getMoveAnimation(move: Move): MoveAnimation {
  const baseMove = move[0] as Move[0];
  const moveDefinition = BASE_MOVE_DEFINITIONS[baseMove];
  const suffixTurns = move.endsWith("2") ? 2 : move.endsWith("'") ? -1 : 1;
  const appTurns =
    suffixTurns === 2
      ? 2
      : suffixTurns * moveDefinition.clockwiseTurnsOnPositiveAxis;
  const modelAxis = getModelAxis(moveDefinition.appAxis);
  const turns = appTurns * modelAxis.sign;

  return {
    axis: modelAxis.axis,
    layer: toLogicalGridValue(moveDefinition.layer * modelAxis.sign),
    turns,
  };
}

function getModelAxis(appAxis: Axis): { axis: Axis; sign: -1 | 1 } {
  switch (appAxis) {
    case "x":
      return { axis: "y", sign: 1 };
    case "y":
      return { axis: "x", sign: -1 };
    case "z":
      return { axis: "z", sign: 1 };
  }
}

function rotateCubieCoord(
  coord: CubieCoord,
  axis: Axis,
  turns: number,
): CubieCoord {
  const normalizedTurns = ((turns % 4) + 4) % 4;
  let result = { ...coord };

  for (let index = 0; index < normalizedTurns; index += 1) {
    result = rotateQuarterTurnPositive(result, axis);
  }

  return result;
}

function rotateQuarterTurnPositive(coord: CubieCoord, axis: Axis): CubieCoord {
  switch (axis) {
    case "x":
      return { x: coord.x, y: toLogicalGridValue(-coord.z), z: coord.y };
    case "y":
      return { x: coord.z, y: coord.y, z: toLogicalGridValue(-coord.x) };
    case "z":
      return { x: toLogicalGridValue(-coord.y), y: coord.x, z: coord.z };
  }
}

function createStickerMaterials(): Record<CubeColour, THREE.MeshStandardMaterial> {
  return {
    white: createStickerMaterial("white"),
    yellow: createStickerMaterial("yellow"),
    green: createStickerMaterial("green"),
    blue: createStickerMaterial("blue"),
    orange: createStickerMaterial("orange"),
    red: createStickerMaterial("red"),
  };
}

function createStickerMaterial(colour: CubeColour): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: COLOUR_SWATCHES[colour],
    metalness: 0,
    roughness: 0.58,
  });
}

function getMeshCenterInModelSpace(
  group: THREE.Group,
  mesh: THREE.Mesh,
): THREE.Vector3 {
  const bounds = new THREE.Box3().setFromObject(mesh);

  return group.worldToLocal(bounds.getCenter(new THREE.Vector3()));
}

function getStickerBinding(mesh: THREE.Mesh): StickerBinding | null {
  const value = mesh.userData.stickerBinding;

  return isStickerBinding(value) ? value : null;
}

function isStickerBinding(value: unknown): value is StickerBinding {
  if (!value || typeof value !== "object") {
    return false;
  }

  const maybeBinding = value as Partial<StickerBinding>;

  return (
    typeof maybeBinding.index === "number" &&
    typeof maybeBinding.face === "string"
  );
}

function getStickerBindingFromModelCenter(center: THREE.Vector3): StickerBinding {
  const modelX = toGridValue(center.x);
  const modelY = toGridValue(center.y);
  const modelZ = toGridValue(center.z);
  const appPosition = {
    x: modelY,
    y: toLogicalGridValue(-modelX),
    z: modelZ,
  };
  const face = getFaceFromModelStickerCenter(center);

  return {
    face,
    index: getStickerIndex(face, appPosition),
  };
}

function getFaceFromModelStickerCenter(center: THREE.Vector3): Face {
  const absX = Math.abs(center.x);
  const absY = Math.abs(center.y);
  const absZ = Math.abs(center.z);

  if (absX > absY && absX > absZ) {
    return center.x < 0 ? "U" : "D";
  }

  if (absY > absZ) {
    return center.y < 0 ? "L" : "R";
  }

  return center.z < 0 ? "B" : "F";
}

function getStickerIndex(face: Face, position: CubieCoord): number {
  let row = 0;
  let column = 0;

  switch (face) {
    case "U":
      row = position.z + 1;
      column = position.x + 1;
      break;
    case "D":
      row = 1 - position.z;
      column = position.x + 1;
      break;
    case "F":
      row = 1 - position.y;
      column = position.x + 1;
      break;
    case "B":
      row = 1 - position.y;
      column = 1 - position.x;
      break;
    case "L":
      row = 1 - position.y;
      column = position.z + 1;
      break;
    case "R":
      row = 1 - position.y;
      column = 1 - position.z;
      break;
  }

  return row * 3 + column;
}

function getCubieCoord(center: THREE.Vector3): CubieCoord {
  return {
    x: toGridValue(center.x),
    y: toGridValue(center.y),
    z: toGridValue(center.z),
  };
}

function getCubieCenter(coord: CubieCoord): THREE.Vector3 {
  return new THREE.Vector3(
    coord.x * CUBIE_STEP,
    coord.y * CUBIE_STEP,
    coord.z * CUBIE_STEP,
  );
}

function createCubieKey(coord: CubieCoord): string {
  return `${coord.x},${coord.y},${coord.z}`;
}

function toGridValue(value: number): GridValue {
  if (value < -38) {
    return -1;
  }

  if (value > 38) {
    return 1;
  }

  return 0;
}

function toLogicalGridValue(value: number): GridValue {
  if (value < 0) {
    return -1;
  }

  if (value > 0) {
    return 1;
  }

  return 0;
}

function getMaterialName(mesh: THREE.Mesh): string {
  const material = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;

  return material.name;
}

function createSyncKey(baseCube: CubeState, moves: Move[]): string {
  return `${JSON.stringify(baseCube)}|${moves.join(" ")}`;
}

function easeInOutCubic(value: number): number {
  return value < 0.5
    ? 4 * value * value * value
    : 1 - Math.pow(-2 * value + 2, 3) / 2;
}
