import type { BaseMove, CubeColour, Face, Move, MoveSuffix } from "./types.js";

export const FACE_ORDER: Face[] = ["U", "D", "F", "B", "L", "R"];

export const CUBE_COLOURS: CubeColour[] = [
  "white",
  "yellow",
  "green",
  "blue",
  "orange",
  "red",
];

export const SOLVED_FACE_COLOURS: Record<Face, CubeColour> = {
  U: "white",
  D: "yellow",
  F: "green",
  B: "blue",
  L: "orange",
  R: "red",
};

export const BASE_MOVES: BaseMove[] = ["U", "D", "F", "B", "L", "R"];
export const MOVE_SUFFIXES: MoveSuffix[] = ["", "'", "2"];

export const ALL_MOVES: Move[] = BASE_MOVES.flatMap((baseMove) =>
  MOVE_SUFFIXES.map((suffix) => `${baseMove}${suffix}` as Move),
);

export const FACE_STICKER_COUNT = 9;
export const FACE_CENTRE_INDEX = 4;
