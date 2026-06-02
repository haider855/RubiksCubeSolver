import { ALL_MOVES } from "./constants.js";
import { applyAlgorithm } from "./moveEngine.js";
import type { Algorithm, CubeState, Move } from "./types.js";

export type ScrambleResult = {
  cube: CubeState;
  moves: Algorithm;
};

export function generateScramble(
  length: number,
  random: () => number = Math.random,
): Algorithm {
  if (!Number.isInteger(length) || length < 0) {
    throw new Error("Scramble length must be a non-negative integer");
  }

  const moves: Move[] = [];

  while (moves.length < length) {
    const move = ALL_MOVES[Math.floor(random() * ALL_MOVES.length)];
    const previousMove = moves.at(-1);

    if (previousMove && previousMove[0] === move[0]) {
      continue;
    }

    moves.push(move);
  }

  return moves;
}

export function scrambleCube(
  cube: CubeState,
  length: number,
  random?: () => number,
): ScrambleResult {
  const moves = generateScramble(length, random);

  return {
    cube: applyAlgorithm(cube, moves),
    moves,
  };
}
