import { applyAlgorithm } from "./moveEngine.js";
import { parseAlgorithm } from "./notation.js";
import type { CubeState } from "./types.js";

export function applyAlgorithmNotation(
  cube: CubeState,
  algorithm: string,
): CubeState {
  return applyAlgorithm(cube, parseAlgorithm(algorithm));
}
