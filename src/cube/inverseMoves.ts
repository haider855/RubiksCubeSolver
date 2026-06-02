import type { Algorithm, Move } from "./types.js";

export function invertMove(move: Move): Move {
  if (move.endsWith("2")) {
    return move;
  }

  if (move.endsWith("'")) {
    return move[0] as Move;
  }

  return `${move}'` as Move;
}

export function invertAlgorithm(moves: Algorithm): Algorithm {
  return [...moves].reverse().map(invertMove);
}
