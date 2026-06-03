import {
  CUBE_COLOURS,
  FACE_CENTRE_INDEX,
  FACE_ORDER,
  applyAlgorithm,
  createSolvedCube,
  generateScramble,
  isMove,
  parseAlgorithm,
} from "../cube/index.js";
import {
  isFirstLayerSolved,
  isWhiteCrossSolved,
  solveWhiteCorners,
  solveWhiteCross,
} from "../solver/index.js";
import type { Algorithm, CubeColour, CubeState } from "../cube/index.js";

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

function verifyWhiteCornersFromScramble(name: string, scramble: Algorithm): void {
  const scrambledCube = applyAlgorithm(createSolvedCube(), scramble);
  const crossResult = solveWhiteCross(scrambledCube);

  assert(crossResult.success, `${name}: expected white-cross setup success`);
  assert(
    isWhiteCrossSolved(crossResult.cubeAfterStage),
    `${name}: expected white cross before corner stage`,
  );

  const cornerResult = solveWhiteCorners(crossResult.cubeAfterStage);

  assert(cornerResult.success, `${name}: expected white-corners stage success`);
  assert(
    isFirstLayerSolved(cornerResult.cubeAfterStage),
    `${name}: expected first layer to be solved`,
  );
  assert(
    isWhiteCrossSolved(cornerResult.cubeAfterStage),
    `${name}: expected white cross to remain solved`,
  );
  assert(
    cornerResult.moves.every((move) => isMove(move)),
    `${name}: expected every returned move to use legal notation`,
  );

  const replayedCube = applyAlgorithm(crossResult.cubeAfterStage, cornerResult.moves);

  assert(
    cubeKey(replayedCube) === cubeKey(cornerResult.cubeAfterStage),
    `${name}: move history should reproduce cubeAfterStage`,
  );
  assertColourCountsPreserved(cornerResult.cubeAfterStage);
  assertCentresUnchanged(cornerResult.cubeAfterStage);
}

function verifySolvedCube(): void {
  const result = solveWhiteCorners(createSolvedCube());

  assert(result.success, "Solved cube should succeed");
  assert(result.moves.length === 0, "Solved cube should require no white-corner moves");
  assert(isFirstLayerSolved(result.cubeAfterStage), "Solved cube first layer should pass");
}

function verifyRequiresWhiteCross(): void {
  const cube = applyAlgorithm(createSolvedCube(), parseAlgorithm("F"));
  const result = solveWhiteCorners(cube);

  assert(!result.success, "White-corners stage should require solved white cross");
}

function verifySimpleScrambles(): void {
  const cases: Array<[string, Algorithm]> = [
    ["right trigger", parseAlgorithm("R U R' U'")],
    ["front insertion setup", parseAlgorithm("F R U R' U' F'")],
    ["mixed layer scramble", parseAlgorithm("R U F2 L' D B R'")],
  ];

  for (const [name, scramble] of cases) {
    verifyWhiteCornersFromScramble(name, scramble);
  }
}

function verifyGeneratedScrambles(): void {
  const cases = [
    generateScramble(8, createSeededRandom(51)),
    generateScramble(10, createSeededRandom(67)),
    generateScramble(12, createSeededRandom(83)),
  ];

  cases.forEach((scramble, index) => {
    verifyWhiteCornersFromScramble(`generated scramble ${index + 1}`, scramble);
  });
}

const verificationSteps: Array<[string, () => void]> = [
  ["solved cube", verifySolvedCube],
  ["requires white cross", verifyRequiresWhiteCross],
  ["simple scrambles", verifySimpleScrambles],
  ["generated scrambles", verifyGeneratedScrambles],
];

for (const [name, verify] of verificationSteps) {
  verify();
  console.log(`ok - ${name}`);
}

console.log("White corners verification passed");
