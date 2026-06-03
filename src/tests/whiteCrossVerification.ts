import {
  CUBE_COLOURS,
  FACE_CENTRE_INDEX,
  FACE_ORDER,
  applyAlgorithm,
  createSolvedCube,
  generateScramble,
  invertAlgorithm,
  isMove,
  parseAlgorithm,
} from "../cube/index.js";
import { isWhiteCrossSolved, solveWhiteCross } from "../solver/index.js";
import type { Algorithm, CubeColour, CubeState, Move } from "../cube/index.js";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function cubeKey(cube: CubeState): string {
  return JSON.stringify(FACE_ORDER.map((face) => [face, cube[face]]));
}

function colourCounts(cube: CubeState): Record<CubeColour, number> {
  const counts = Object.fromEntries(
    CUBE_COLOURS.map((colour) => [colour, 0]),
  ) as Record<CubeColour, number>;

  for (const face of FACE_ORDER) {
    for (const colour of cube[face]) {
      counts[colour] += 1;
    }
  }

  return counts;
}

function assertColourCountsPreserved(cube: CubeState): void {
  const counts = colourCounts(cube);

  for (const colour of CUBE_COLOURS) {
    assert(counts[colour] === 9, `Expected 9 ${colour} stickers`);
  }
}

function assertCentresUnchanged(cube: CubeState): void {
  const solvedCube = createSolvedCube();

  for (const face of FACE_ORDER) {
    assert(
      cube[face][FACE_CENTRE_INDEX] === solvedCube[face][FACE_CENTRE_INDEX],
      `${face} centre changed`,
    );
  }
}

function createSeededRandom(seed: number): () => number {
  let state = seed;

  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

function verifyWhiteCrossFromScramble(name: string, scramble: Algorithm): void {
  const scrambledCube = applyAlgorithm(createSolvedCube(), scramble);
  const result = solveWhiteCross(scrambledCube);

  assert(result.success, `${name}: expected white-cross stage success`);
  assert(
    isWhiteCrossSolved(result.cubeAfterStage),
    `${name}: expected white cross to be solved`,
  );
  assert(
    result.moves.every((move) => isMove(move)),
    `${name}: expected every returned move to use legal notation`,
  );

  const replayedCube = applyAlgorithm(scrambledCube, result.moves);

  assert(
    cubeKey(replayedCube) === cubeKey(result.cubeAfterStage),
    `${name}: move history should reproduce cubeAfterStage`,
  );
  assertColourCountsPreserved(result.cubeAfterStage);
  assertCentresUnchanged(result.cubeAfterStage);
}

function verifySolvedCube(): void {
  const result = solveWhiteCross(createSolvedCube());

  assert(result.success, "Solved cube should succeed");
  assert(result.moves.length === 0, "Solved cube should require no white-cross moves");
  assert(isWhiteCrossSolved(result.cubeAfterStage), "Solved cube cross should be solved");
}

function verifySimpleScrambles(): void {
  const cases: Array<[string, Algorithm]> = [
    ["front turn", parseAlgorithm("F")],
    ["right trigger", parseAlgorithm("R U R' U'")],
    ["mixed face turns", parseAlgorithm("F R U R' U' F'")],
    ["inverse setup", invertAlgorithm(parseAlgorithm("R U F2 L' D")) as Move[]],
  ];

  for (const [name, scramble] of cases) {
    verifyWhiteCrossFromScramble(name, scramble);
  }
}

function verifyGeneratedScrambles(): void {
  const cases = [
    generateScramble(10, createSeededRandom(11)),
    generateScramble(12, createSeededRandom(23)),
    generateScramble(14, createSeededRandom(37)),
  ];

  cases.forEach((scramble, index) => {
    verifyWhiteCrossFromScramble(`generated scramble ${index + 1}`, scramble);
  });
}

const verificationSteps: Array<[string, () => void]> = [
  ["solved cube", verifySolvedCube],
  ["simple scrambles", verifySimpleScrambles],
  ["generated scrambles", verifyGeneratedScrambles],
];

for (const [name, verify] of verificationSteps) {
  verify();
  console.log(`ok - ${name}`);
}

console.log("White cross verification passed");
