import {
  CUBE_COLOURS,
  FACE_CENTRE_INDEX,
  FACE_ORDER,
  applyAlgorithm,
  cloneCube,
  createSolvedCube,
  generateScramble,
  isMove,
  parseAlgorithm,
} from "../cube/index.js";
import {
  getYellowCornerOrientationCase,
  isMiddleLayerSolved,
  isYellowCrossSolved,
  isYellowFaceOriented,
  orientYellowCorners,
  solveMiddleLayer,
  solveWhiteCorners,
  solveWhiteCross,
  solveYellowCross,
} from "../solver/index.js";
import type { Algorithm, CubeColour, CubeState } from "../cube/index.js";
import type { YellowCornerOrientationCase } from "../solver/index.js";

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

function solveThroughYellowCross(scrambledCube: CubeState): CubeState {
  const crossResult = solveWhiteCross(scrambledCube);

  assert(crossResult.success, "Expected white-cross setup success");

  const cornerResult = solveWhiteCorners(crossResult.cubeAfterStage);

  assert(cornerResult.success, "Expected white-corners setup success");

  const middleResult = solveMiddleLayer(cornerResult.cubeAfterStage);

  assert(middleResult.success, "Expected middle-layer setup success");

  const yellowCrossResult = solveYellowCross(middleResult.cubeAfterStage);

  assert(yellowCrossResult.success, "Expected yellow-cross setup success");
  assert(
    isYellowCrossSolved(yellowCrossResult.cubeAfterStage),
    "Expected solved yellow cross",
  );

  return yellowCrossResult.cubeAfterStage;
}

function verifyOrientYellowCornersFromScramble(
  name: string,
  scramble: Algorithm,
): void {
  const scrambledCube = applyAlgorithm(createSolvedCube(), scramble);
  const yellowCrossCube = solveThroughYellowCross(scrambledCube);
  const result = orientYellowCorners(yellowCrossCube);

  assert(result.success, `${name}: expected yellow-corner orientation success`);
  assert(
    isYellowFaceOriented(result.cubeAfterStage),
    `${name}: expected yellow face to be fully oriented`,
  );
  assert(
    isYellowCrossSolved(result.cubeAfterStage),
    `${name}: expected yellow cross to remain solved`,
  );
  assert(
    isMiddleLayerSolved(result.cubeAfterStage),
    `${name}: expected middle layer to remain solved`,
  );
  assert(
    result.moves.every((move) => isMove(move)),
    `${name}: expected every returned move to use legal notation`,
  );

  const replayedCube = applyAlgorithm(yellowCrossCube, result.moves);

  assert(
    cubeKey(replayedCube) === cubeKey(result.cubeAfterStage),
    `${name}: move history should reproduce cubeAfterStage`,
  );
  assertColourCountsPreserved(result.cubeAfterStage);
  assertCentresUnchanged(result.cubeAfterStage);
}

function verifySolvedCube(): void {
  const result = orientYellowCorners(createSolvedCube());

  assert(result.success, "Solved cube should succeed");
  assert(
    result.moves.length === 0,
    "Solved cube should require no corner-orientation moves",
  );
  assert(isYellowFaceOriented(result.cubeAfterStage), "Solved cube yellow face should pass");
}

function verifyRequiresYellowCross(): void {
  const cube = applyAlgorithm(createSolvedCube(), parseAlgorithm("F' R' D' R D F"));

  assert(!isYellowCrossSolved(cube), "Setup cube should not have a yellow cross");

  const result = orientYellowCorners(cube);

  assert(!result.success, "Corner orientation should require solved yellow cross");
}

function verifyCaseDetection(): void {
  const cases: Array<[string, Algorithm, YellowCornerOrientationCase]> = [
    ["oriented", [], "oriented"],
    ["single", parseAlgorithm("R D R' D R D2 R'"), "single"],
    ["none", parseAlgorithm("R D R' D R D2 R' R D R' D R D2 R'"), "none"],
    [
      "pair",
      parseAlgorithm("R D R' D R D2 R' R D R' D R D2 R' R D R' D R D2 R'"),
      "pair",
    ],
  ];

  for (const [name, moves, expectedCase] of cases) {
    const cube = applyAlgorithm(createSolvedCube(), moves);

    assert(isYellowCrossSolved(cube), `${name}: expected yellow cross preserved`);
    assert(
      getYellowCornerOrientationCase(cube) === expectedCase,
      `${name}: expected ${expectedCase} corner-orientation case`,
    );
  }

  const invalidCube = cloneCube(createSolvedCube());
  invalidCube.D[0] = "blue";

  assert(
    getYellowCornerOrientationCase(invalidCube) === "invalid",
    "Expected three oriented yellow corners to be invalid",
  );
}

function verifyKnownCornerCases(): void {
  const cases: Array<[string, Algorithm]> = [
    ["single", parseAlgorithm("R D R' D R D2 R'")],
    ["none", parseAlgorithm("R D R' D R D2 R' R D R' D R D2 R'")],
    [
      "pair",
      parseAlgorithm("R D R' D R D2 R' R D R' D R D2 R' R D R' D R D2 R'"),
    ],
  ];

  for (const [name, moves] of cases) {
    const cube = applyAlgorithm(createSolvedCube(), moves);
    const result = orientYellowCorners(cube);

    assert(result.success, `${name}: expected orientation success`);
    assert(
      isYellowFaceOriented(result.cubeAfterStage),
      `${name}: expected oriented yellow face`,
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
    verifyOrientYellowCornersFromScramble(name, scramble);
  }
}

function verifyGeneratedScrambles(): void {
  const cases = [
    generateScramble(8, createSeededRandom(701)),
    generateScramble(10, createSeededRandom(809)),
    generateScramble(12, createSeededRandom(907)),
  ];

  cases.forEach((scramble, index) => {
    verifyOrientYellowCornersFromScramble(`generated scramble ${index + 1}`, scramble);
  });
}

const verificationSteps: Array<[string, () => void]> = [
  ["solved cube", verifySolvedCube],
  ["requires yellow cross", verifyRequiresYellowCross],
  ["case detection", verifyCaseDetection],
  ["known corner cases", verifyKnownCornerCases],
  ["simple scrambles", verifySimpleScrambles],
  ["generated scrambles", verifyGeneratedScrambles],
];

for (const [name, verify] of verificationSteps) {
  verify();
  console.log(`ok - ${name}`);
}

console.log("Yellow corner orientation verification passed");
