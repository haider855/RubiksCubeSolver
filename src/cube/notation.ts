import { ALL_MOVES } from "./constants.js";
import type { Algorithm, Move } from "./types.js";

const VALID_MOVE_SET = new Set<string>(ALL_MOVES);

export function isMove(value: string): value is Move {
  return VALID_MOVE_SET.has(value);
}

export function parseAlgorithm(algorithm: string): Algorithm {
  const trimmedAlgorithm = algorithm.trim();

  if (!trimmedAlgorithm) {
    return [];
  }

  return trimmedAlgorithm.split(/\s+/).map((token) => {
    if (!isMove(token)) {
      throw new Error(`Invalid move notation: ${token}`);
    }

    return token;
  });
}

export function formatAlgorithm(moves: Algorithm): string {
  return moves.join(" ");
}
