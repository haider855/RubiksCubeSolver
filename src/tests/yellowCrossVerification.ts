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
  getYellowCrossCase,
  isMiddleLayerSolved,
  isYellowCrossSolved,
  solveMiddleLayer,
  solveWhiteCorners,
  solveWhiteCross,
  solveYellowCross,
} from "../solver/index.js";
import type { Algorithm, CubeColour, CubeState } from "../cube/index.js";
import type { YellowCrossCase } from "../solver/index.js";

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

function solveFirstTwoLayers(scrambledCube: CubeState): CubeState {
  const crossResult = solveWhiteCross(scrambledCube);

  assert(crossResult.success, "Expected white-cross setup success");

  const cornerResult = solveWhiteCorners(crossResult.cubeAfterStage);

  assert(cornerResult.success, "Expected white-corners setup success");

  const middleResult = solveMiddleLayer(cornerResult.cubeAfterStage);

  assert(middleResult.success, "Expected middle-layer setup success");
  assert(isMiddleLayerSolved(middleResult.cubeAfterStage), "Expected solved middle layer");

  return middleResult.cubeAfterStage;
}

function verifyYellowCrossFromScramble(name: string, scramble: Algorithm): void {
  const scrambledCube = applyAlgorithm(createSolvedCube(), scramble);
  const middleLayerCube = solveFirstTwoLayers(scrambledCube);
  const result = solveYellowCross(middleLayerCube);

  assert(result.success, `${name}: expected yellow-cross stage success`);
  assert(
    isYellowCrossSolved(result.cubeAfterStage),
    `${name}: expected yellow cross to be solved`,
  );
  assert(
    isMiddleLayerSolved(result.cubeAfterStage),
    `${name}: expected middle layer to remain solved`,
  );
  assert(
    getYellowCrossCase(result.cubeAfterStage) === "cross",
    `${name}: expected cross case after yellow-cross stage`,
  );
  assert(
    result.moves.every((move) => isMove(move)),
    `${name}: expected every returned move to use legal notation`,
  );

  const replayedCube = applyAlgorithm(middleLayerCube, result.moves);

  assert(
    cubeKey(replayedCube) === cubeKey(result.cubeAfterStage),
    `${name}: move history should reproduce cubeAfterStage`,
  );
  assertColourCountsPreserved(result.cubeAfterStage);
  assertCentresUnchanged(result.cubeAfterStage);
}

function verifySolvedCube(): void {
  const result = solveYellowCross(createSolvedCube());

  assert(result.success, "Solved cube should succeed");
  assert(result.moves.length === 0, "Solved cube should require no yellow-cross moves");
  assert(isYellowCrossSolved(result.cubeAfterStage), "Solved cube yellow cross should pass");
}

function verifyRequiresMiddleLayer(): void {
  const cube = applyAlgorithm(createSolvedCube(), parseAlgorithm("R U R' U'"));
  const result = solveYellowCross(cube);

  assert(!result.success, "Yellow-cross stage should require solved middle layer");
}

function verifyCaseDetection(): void {
  const cases: Array<[string, Algorithm, YellowCrossCase]> = [
    ["cross", [], "cross"],
    ["l-shape", parseAlgorithm("F' R' D' R D F"), "l-shape"],
    ["line", parseAlgorithm("F' R' D' R D F F' R' D' R D F"), "line"],
    [
      "dot",
      parseAlgorithm("F' R' D' R D F F' R' D' R D F R' B' D' B D R"),
      "dot",
    ],
  ];

  for (const [name, moves, expectedCase] of cases) {
    const cube = applyAlgorithm(createSolvedCube(), moves);

    assert(isMiddleLayerSolved(cube), `${name}: expected first two layers preserved`);
    assert(
      getYellowCrossCase(cube) === expectedCase,
      `${name}: expected ${expectedCase} yellow-cross case`,
    );
  }
}

function verifySimpleScrambles(): void {
  const cases: Array<[string, Algorithm]> = [
    ["right trigger", parseAlgorithm("R U R' U'")],
    ["front algorithm", parseAlgorithm("F R U R' U' F'")],
    ["mixed setup", parseAlgorithm("R U F2 L' D B R' F")],
  ];

  for (const [name, scramble] of cases) {
    verifyYellowCrossFromScramble(name, scramble);
  }
}

function verifyGeneratedScrambles(): void {
  const cases = [
    generateScramble(8, createSeededRandom(401)),
    generateScramble(10, createSeededRandom(503)),
    generateScramble(12, createSeededRandom(607)),
  ];

  cases.forEach((scramble, index) => {
    verifyYellowCrossFromScramble(`generated scramble ${index + 1}`, scramble);
  });
}

const verificationSteps: Array<[string, () => void]> = [
  ["solved cube", verifySolvedCube],
  ["requires middle layer", verifyRequiresMiddleLayer],
  ["case detection", verifyCaseDetection],
  ["simple scrambles", verifySimpleScrambles],
  ["generated scrambles", verifyGeneratedScrambles],
];

for (const [name, verify] of verificationSteps) {
  verify();
  console.log(`ok - ${name}`);
}

console.log("Yellow cross verification passed");
