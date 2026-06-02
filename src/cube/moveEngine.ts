import { FACE_ORDER, SOLVED_FACE_COLOURS } from "./constants.js";
import type { BaseMove, CubeState, Face, FaceStickers, Move } from "./types.js";

type Axis = "x" | "y" | "z";
type Coordinate = -1 | 0 | 1;
type Vector = Record<Axis, Coordinate>;

type StickerLocation = {
  face: Face;
  index: number;
  position: Vector;
  normal: Vector;
};

type BaseMoveDefinition = {
  axis: Axis;
  layer: Coordinate;
  clockwiseTurnsOnPositiveAxis: -1 | 1;
};

const BASE_MOVE_DEFINITIONS: Record<BaseMove, BaseMoveDefinition> = {
  U: { axis: "y", layer: 1, clockwiseTurnsOnPositiveAxis: -1 },
  D: { axis: "y", layer: -1, clockwiseTurnsOnPositiveAxis: 1 },
  F: { axis: "z", layer: 1, clockwiseTurnsOnPositiveAxis: -1 },
  B: { axis: "z", layer: -1, clockwiseTurnsOnPositiveAxis: 1 },
  L: { axis: "x", layer: -1, clockwiseTurnsOnPositiveAxis: 1 },
  R: { axis: "x", layer: 1, clockwiseTurnsOnPositiveAxis: -1 },
};

const STICKER_LOCATIONS: StickerLocation[] = FACE_ORDER.flatMap((face) =>
  Array.from({ length: 9 }, (_, index) => ({
    face,
    index,
    ...getStickerVectors(face, index),
  })),
);

const LOCATION_BY_VECTOR = new Map(
  STICKER_LOCATIONS.map((location) => [
    vectorKey(location.position, location.normal),
    location,
  ]),
);

export function applyMove(cube: CubeState, move: Move): CubeState {
  const { baseMove, turns } = getMoveParts(move);
  const moveDefinition = BASE_MOVE_DEFINITIONS[baseMove];
  const turnCount =
    turns === 2
      ? 2
      : turns * moveDefinition.clockwiseTurnsOnPositiveAxis;
  const nextCube = createEmptyCube();

  for (const source of STICKER_LOCATIONS) {
    const shouldRotate = source.position[moveDefinition.axis] === moveDefinition.layer;
    const position = shouldRotate
      ? rotateVector(source.position, moveDefinition.axis, turnCount)
      : source.position;
    const normal = shouldRotate
      ? rotateVector(source.normal, moveDefinition.axis, turnCount)
      : source.normal;
    const target = LOCATION_BY_VECTOR.get(vectorKey(position, normal));

    if (!target) {
      throw new Error(`Move ${move} produced an invalid sticker location`);
    }

    nextCube[target.face][target.index] = cube[source.face][source.index];
  }

  return nextCube;
}

export function applyAlgorithm(cube: CubeState, moves: Move[]): CubeState {
  return moves.reduce((currentCube, move) => applyMove(currentCube, move), cube);
}

export function isSolved(cube: CubeState): boolean {
  return FACE_ORDER.every((face) =>
    cube[face].every((colour) => colour === SOLVED_FACE_COLOURS[face]),
  );
}

function createEmptyCube(): CubeState {
  return FACE_ORDER.reduce((cube, face) => {
    cube[face] = Array.from({ length: 9 }, () => "white") as FaceStickers;
    return cube;
  }, {} as CubeState);
}

function getMoveParts(move: Move): { baseMove: BaseMove; turns: 1 | 2 | -1 } {
  const baseMove = move[0] as BaseMove;

  if (move.endsWith("2")) {
    return { baseMove, turns: 2 };
  }

  if (move.endsWith("'")) {
    return { baseMove, turns: -1 };
  }

  return { baseMove, turns: 1 };
}

function getStickerVectors(
  face: Face,
  index: number,
): Pick<StickerLocation, "position" | "normal"> {
  const row = Math.floor(index / 3);
  const column = index % 3;

  switch (face) {
    case "U":
      return {
        position: { x: toCoordinate(column - 1), y: 1, z: toCoordinate(row - 1) },
        normal: { x: 0, y: 1, z: 0 },
      };
    case "D":
      return {
        position: { x: toCoordinate(column - 1), y: -1, z: toCoordinate(1 - row) },
        normal: { x: 0, y: -1, z: 0 },
      };
    case "F":
      return {
        position: { x: toCoordinate(column - 1), y: toCoordinate(1 - row), z: 1 },
        normal: { x: 0, y: 0, z: 1 },
      };
    case "B":
      return {
        position: { x: toCoordinate(1 - column), y: toCoordinate(1 - row), z: -1 },
        normal: { x: 0, y: 0, z: -1 },
      };
    case "L":
      return {
        position: { x: -1, y: toCoordinate(1 - row), z: toCoordinate(column - 1) },
        normal: { x: -1, y: 0, z: 0 },
      };
    case "R":
      return {
        position: { x: 1, y: toCoordinate(1 - row), z: toCoordinate(1 - column) },
        normal: { x: 1, y: 0, z: 0 },
      };
  }
}

function rotateVector(vector: Vector, axis: Axis, turns: number): Vector {
  const normalizedTurns = ((turns % 4) + 4) % 4;
  let result = vector;

  for (let index = 0; index < normalizedTurns; index += 1) {
    result = rotateQuarterTurnPositive(result, axis);
  }

  return result;
}

function rotateQuarterTurnPositive(vector: Vector, axis: Axis): Vector {
  switch (axis) {
    case "x":
      return { x: vector.x, y: negative(vector.z), z: vector.y };
    case "y":
      return { x: vector.z, y: vector.y, z: negative(vector.x) };
    case "z":
      return { x: negative(vector.y), y: vector.x, z: vector.z };
  }
}

function negative(value: Coordinate): Coordinate {
  return toCoordinate(-value);
}

function toCoordinate(value: number): Coordinate {
  if (value !== -1 && value !== 0 && value !== 1) {
    throw new Error(`Invalid coordinate value: ${value}`);
  }

  return value;
}

function vectorKey(position: Vector, normal: Vector): string {
  return `${position.x},${position.y},${position.z}|${normal.x},${normal.y},${normal.z}`;
}
