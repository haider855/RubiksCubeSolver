import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { invertMove } from "../cube/index.js";
import type { CubeColour, CubeState, Face, Move } from "../cube/index.js";
import { COLOUR_SWATCHES } from "./cubeDisplay.js";

type ThreeCubeViewerProps = {
  baseCube: CubeState;
  currentMoveIndex: number;
  moves: Move[];
};

type Axis = "x" | "y" | "z";
type GridValue = -1 | 0 | 1;
type CubieCoord = Record<Axis, GridValue>;

type MeshEntry = {
  mesh: THREE.Mesh;
  sticker?: {
    face: Face;
    index: number;
  };
};

type CubieEntry = {
  group: THREE.Group;
  initialCoord: CubieCoord;
  currentCoord: CubieCoord;
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

type ViewerState = {
  animationFrame: number | null;
  camera: THREE.PerspectiveCamera;
  cubeGroup: THREE.Group;
  cubieEntries: CubieEntry[];
  isAnimating: boolean;
  materialByColour: Record<CubeColour, THREE.MeshStandardMaterial>;
  meshEntries: MeshEntry[];
  pendingRequest: PlaybackRequest | null;
  pitchGroup: THREE.Group;
  renderer: THREE.WebGLRenderer;
  resizeObserver: ResizeObserver;
  scene: THREE.Scene;
  syncKey: string;
  viewControlAnimationFrame: number | null;
  viewGroup: THREE.Group;
  currentMoveIndex: number;
};

type MoveAnimation = {
  axis: Axis;
  layer: GridValue;
  turns: number;
};

type ViewDirection = "left" | "right" | "up" | "down";

const MODEL_URL = `${import.meta.env.BASE_URL}models/rubiks_cube.glb`;
const CUBE_MODEL_SCALE = 0.012;
const CUBIE_STEP = 75.65;
const MOVE_DURATION_MS = 420;
const VIEW_ROTATION_DURATION_MS = 300;
const VIEW_ROTATION_STEP_RADIANS = Math.PI / 2;

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

export function ThreeCubeViewer({
  baseCube,
  currentMoveIndex,
  moves,
}: ThreeCubeViewerProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewerStateRef = useRef<ViewerState | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">(
    "loading",
  );

  useEffect(() => {
    const host = hostRef.current;

    if (!host) {
      return;
    }

    const hostElement = host;
    let isDisposed = false;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#eef3f8");

    const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
    camera.position.set(-3.2, 4.2, 5.2);
    camera.up.set(-1, 0, 0);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    hostElement.appendChild(renderer.domElement);

    const viewGroup = new THREE.Group();
    scene.add(viewGroup);

    const pitchGroup = new THREE.Group();
    viewGroup.add(pitchGroup);

    const cubeGroup = new THREE.Group();
    cubeGroup.scale.setScalar(CUBE_MODEL_SCALE);
    pitchGroup.add(cubeGroup);

    const ambientLight = new THREE.HemisphereLight("#ffffff", "#9aa8b8", 2.2);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight("#ffffff", 3.2);
    keyLight.position.set(4, 5, 6);
    keyLight.castShadow = true;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight("#dbeafe", 1.4);
    fillLight.position.set(-5, 2, -4);
    scene.add(fillLight);

    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(2.9, 72),
      new THREE.ShadowMaterial({ color: "#1f2937", opacity: 0.13 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -1.55;
    floor.receiveShadow = true;
    scene.add(floor);

    function resize(): void {
      const width = Math.max(1, hostElement.clientWidth);
      const height = Math.max(1, hostElement.clientHeight);

      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    }

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(hostElement);
    resize();

    function render(): void {
      renderer.render(scene, camera);
      const state = viewerStateRef.current;
      if (state) {
        state.animationFrame = window.requestAnimationFrame(render);
      }
    }

    const loader = new GLTFLoader();
    loader.load(
      MODEL_URL,
      (gltf) => {
        if (isDisposed) {
          return;
        }

        const preparedModel = prepareModel(cubeGroup, gltf.scene);
        const materialByColour = createStickerMaterials();
        const state: ViewerState = {
          animationFrame: null,
          camera,
          cubeGroup,
          cubieEntries: preparedModel.cubieEntries,
          currentMoveIndex: 0,
          isAnimating: false,
          materialByColour,
          meshEntries: preparedModel.meshEntries,
          pendingRequest: null,
          pitchGroup,
          renderer,
          resizeObserver,
          scene,
          syncKey: "",
          viewControlAnimationFrame: null,
          viewGroup,
        };

        viewerStateRef.current = state;
        applyPlaybackRequest(state, { baseCube, currentMoveIndex, moves });
        setLoadState("ready");
        render();
      },
      undefined,
      () => {
        if (!isDisposed) {
          setLoadState("error");
        }
      },
    );

    return () => {
      isDisposed = true;
      const state = viewerStateRef.current;

      if (state?.animationFrame) {
        window.cancelAnimationFrame(state.animationFrame);
      }

      if (state?.viewControlAnimationFrame) {
        window.cancelAnimationFrame(state.viewControlAnimationFrame);
      }

      viewerStateRef.current = null;
      resizeObserver.disconnect();
      renderer.dispose();
      hostElement.replaceChildren();
    };
  }, []);

  useEffect(() => {
    const state = viewerStateRef.current;

    if (!state) {
      return;
    }

    applyPlaybackRequest(state, { baseCube, currentMoveIndex, moves });
  }, [baseCube, currentMoveIndex, moves]);

  function handleViewControl(direction: ViewDirection): void {
    const state = viewerStateRef.current;

    if (!state) {
      return;
    }

    rotateView(state, direction);
  }

  return (
    <div className="three-cube-viewer" aria-label="3D animated cube viewer">
      <div className="three-cube-canvas" ref={hostRef} />
      {loadState === "ready" ? (
        <div className="three-cube-controls" aria-label="3D view controls">
          <button
            type="button"
            className="three-cube-control three-cube-control-up"
            aria-label="Rotate 3D cube view up"
            onClick={() => handleViewControl("up")}
          >
            ^
          </button>
          <button
            type="button"
            className="three-cube-control three-cube-control-left"
            aria-label="Rotate 3D cube view left"
            onClick={() => handleViewControl("left")}
          >
            {"<"}
          </button>
          <button
            type="button"
            className="three-cube-control three-cube-control-right"
            aria-label="Rotate 3D cube view right"
            onClick={() => handleViewControl("right")}
          >
            {">"}
          </button>
          <button
            type="button"
            className="three-cube-control three-cube-control-down"
            aria-label="Rotate 3D cube view down"
            onClick={() => handleViewControl("down")}
          >
            v
          </button>
        </div>
      ) : null}
      {loadState !== "ready" ? (
        <div className="three-cube-status">
          {loadState === "loading" ? "Loading 3D cube" : "Could not load 3D cube"}
        </div>
      ) : null}
    </div>
  );
}

function rotateView(state: ViewerState, direction: ViewDirection): void {
  switch (direction) {
    case "left":
      animateViewRotation(state, state.viewGroup, "y", -VIEW_ROTATION_STEP_RADIANS);
      break;
    case "right":
      animateViewRotation(state, state.viewGroup, "y", VIEW_ROTATION_STEP_RADIANS);
      break;
    case "up":
      animateViewRotation(state, state.pitchGroup, "x", -VIEW_ROTATION_STEP_RADIANS);
      break;
    case "down":
      animateViewRotation(state, state.pitchGroup, "x", VIEW_ROTATION_STEP_RADIANS);
      break;
  }
}

function animateViewRotation(
  state: ViewerState,
  group: THREE.Group,
  axis: "x" | "y",
  deltaRadians: number,
): void {
  if (state.viewControlAnimationFrame) {
    window.cancelAnimationFrame(state.viewControlAnimationFrame);
    state.viewControlAnimationFrame = null;
  }

  const startedAt = performance.now();
  const startRotation = group.rotation[axis];
  const endRotation = startRotation + deltaRadians;

  function frame(now: number): void {
    const progress = Math.min(1, (now - startedAt) / VIEW_ROTATION_DURATION_MS);
    const easedProgress = easeInOutCubic(progress);

    group.rotation[axis] =
      startRotation + (endRotation - startRotation) * easedProgress;

    if (progress < 1) {
      state.viewControlAnimationFrame = window.requestAnimationFrame(frame);
      return;
    }

    group.rotation[axis] = endRotation;
    state.viewControlAnimationFrame = null;
  }

  state.viewControlAnimationFrame = window.requestAnimationFrame(frame);
}

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
    const bounds = new THREE.Box3().setFromObject(mesh);
    const center = cubeGroup.worldToLocal(bounds.getCenter(new THREE.Vector3()));
    const materialName = getMaterialName(mesh);
    const currentCoord = getCubieCoord(center);
    const sticker =
      materialName === "Cube" ? undefined : getStickerBindingFromModelCenter(center);
    const cubieKey = createCubieKey(currentCoord);
    let cubieEntry = cubieMap.get(cubieKey);

    if (!cubieEntry) {
      const group = new THREE.Group();

      group.position.copy(getCubieCenter(currentCoord));
      cubeGroup.add(group);

      cubieEntry = {
        group,
        currentCoord,
        initialCoord: { ...currentCoord },
        initialPosition: group.position.clone(),
        initialQuaternion: group.quaternion.clone(),
        initialScale: group.scale.clone(),
      };
      cubieMap.set(cubieKey, cubieEntry);
    }

    cubieEntry.group.attach(mesh);
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
    roughness: 0.58,
    metalness: 0,
  });
}

function applyPlaybackRequest(
  state: ViewerState,
  request: PlaybackRequest,
): void {
  state.pendingRequest = request;

  if (!state.isAnimating) {
    void processPendingRequest(state);
  }
}

async function processPendingRequest(state: ViewerState): Promise<void> {
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

function resetViewerToBaseCube(state: ViewerState, baseCube: CubeState): void {
  for (const cubie of state.cubieEntries) {
    cubie.group.position.copy(cubie.initialPosition);
    cubie.group.quaternion.copy(cubie.initialQuaternion);
    cubie.group.scale.copy(cubie.initialScale);
    cubie.currentCoord = { ...cubie.initialCoord };
  }

  for (const entry of state.meshEntries) {
    if (entry.sticker) {
      entry.mesh.material =
        state.materialByColour[baseCube[entry.sticker.face][entry.sticker.index]];
    }
  }
}

async function applyMoveToModel(
  state: ViewerState,
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

function getStickerBindingFromModelCenter(center: THREE.Vector3): {
  face: Face;
  index: number;
} {
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
