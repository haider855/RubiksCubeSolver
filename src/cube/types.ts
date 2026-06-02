export type Face = "U" | "D" | "F" | "B" | "L" | "R";

export type CubeColour =
  | "white"
  | "yellow"
  | "green"
  | "blue"
  | "orange"
  | "red";

export type FaceStickers = [
  CubeColour,
  CubeColour,
  CubeColour,
  CubeColour,
  CubeColour,
  CubeColour,
  CubeColour,
  CubeColour,
  CubeColour,
];

export type CubeState = Record<Face, FaceStickers>;

export type BaseMove = "U" | "D" | "F" | "B" | "L" | "R";
export type MoveSuffix = "" | "'" | "2";
export type Move = `${BaseMove}${MoveSuffix}`;
export type Algorithm = Move[];
