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
  countPositionedYellowCorners,
  getYellowCornerPositionCase,
  isMiddleLayerSolved,
  isYellowCornersPositioned,
  isYellowFaceOriented,
  orientYellowCorners,
  positionYellowCorners,
  solveMiddleLayer,
  solveWhiteCorners,
  solveWhiteCross,
  solveYellowCross,
} from "../solver/index.js";
import type { Algorithm, CubeColour, CubeState } from "../cube/index.js";
import type { YellowCornerPositionCase } from "../solver/index.js";

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

function solveThroughYellowFace(scrambledCube: CubeState): CubeState {
  const crossResult = solveWhiteCross(scrambledCube);

  assert(crossResult.success, "Expected white-cross setup success");

  const cornerResult = solveWhiteCorners(crossResult.cubeAfterStage);

  assert(cornerResult.success, "Expected white-corners setup success");

  const middleResult = solveMiddleLayer(cornerResult.cubeAfterStage);

  assert(middleResult.success, "Expected middle-layer setup success");

  const yellowCrossResult = solveYellowCross(middleResult.cubeAfterStage);

  assert(yellowCrossResult.success, "Expected yellow-cross setup success");

  const orientationResult = orientYellowCorners(yellowCrossResult.cubeAfterStage);

  assert(orientationResult.success, "Expected yellow-corner orientation setup success");
  assert(
    isYellowFaceOriented(orientationResult.cubeAfterStage),
    "Expected oriented yellow face",
  );

  return orientationResult.cubeAfterStage;
}

function verifyPositionYellowCornersFromScramble(
  name: string,
  scramble: Algorithm,
): void {
  const scrambledCube = applyAlgorithm(createSolvedCube(), scramble);
  const yellowFaceCube = solveThroughYellowFace(scrambledCube);
  const result = positionYellowCorners(yellowFaceCube);

  assert(result.success, `${name}: expected yellow-corner permutation success`);
  assert(
    isYellowCornersPositioned(result.cubeAfterStage),
    `${name}: expected yellow corners to be positioned`,
  );
  assert(
    isYellowFaceOriented(result.cubeAfterStage),
    `${name}: expected yellow face to remain oriented`,
  );
  assert(
    isMiddleLayerSolved(result.cubeAfterStage),
    `${name}: expected middle layer to remain solved`,
  );
  assert(
    result.moves.every((move) => isMove(move)),
    `${name}: expected every returned move to use legal notation`,
  );

  const replayedCube = applyAlgorithm(yellowFaceCube, result.moves);

  assert(
    cubeKey(replayedCube) === cubeKey(result.cubeAfterStage),
    `${name}: move history should reproduce cubeAfterStage`,
  );
  assertColourCountsPreserved(result.cubeAfterStage);
  assertCentresUnchanged(result.cubeAfterStage);
}

function verifySolvedCube(): void {
  const result = positionYellowCorners(createSolvedCube());

  assert(result.success, "Solved cube should succeed");
  assert(
    result.moves.length === 0,
    "Solved cube should require no corner-permutation moves",
  );
  assert(
    isYellowCornersPositioned(result.cubeAfterStage),
    "Solved cube yellow corners should pass",
  );
}

function verifyRequiresOrientedYellowFace(): void {
  const cube = applyAlgorithm(createSolvedCube(), parseAlgorithm("R D R' D R D2 R'"));

  assert(!isYellowFaceOriented(cube), "Setup cube should not have an oriented yellow face");

  const result = positionYellowCorners(cube);

  assert(!result.success, "Corner permutation should require oriented yellow face");
}

function verifyCaseDetection(): void {
  const cases: Array<[string, Algorithm, YellowCornerPositionCase, number]> = [
    ["positioned", [], "positioned", 4],
    ["none", parseAlgorithm("D"), "none", 0],
    ["one", parseAlgorithm("R' B R' F2 R B' R' F2 R2"), "one", 1],
    [
      "two",
      parseAlgorithm("R' B R' F2 R B' R' F2 R2 D R' B R' F2 R B' R' F2 R2"),
      "two",
      2,
    ],
  ];

  for (const [name, moves, expectedCase, expectedCount] of cases) {
    const cube = applyAlgorithm(createSolvedCube(), moves);

    assert(isYellowFaceOriented(cube), `${name}: expected yellow face preserved`);
    assert(
      getYellowCornerPositionCase(cube) === expectedCase,
      `${name}: expected ${expectedCase} yellow-corner position case`,
    );
    assert(
      countPositionedYellowCorners(cube) === expectedCount,
      `${name}: expected ${expectedCount} positioned yellow corners`,
    );
  }

  const invalidCube = cloneCube(createSolvedCube());
  invalidCube.F[6] = "red";

  assert(
    getYellowCornerPositionCase(invalidCube) === "invalid",
    "Expected three positioned yellow corners to be invalid",
  );
}

function verifyKnownCornerCases(): void {
  const cases: Array<[string, Algorithm]> = [
    ["none", parseAlgorithm("D")],
    ["one", parseAlgorithm("R' B R' F2 R B' R' F2 R2")],
    [
      "two",
      parseAlgorithm("R' B R' F2 R B' R' F2 R2 D R' B R' F2 R B' R' F2 R2"),
    ],
  ];

  for (const [name, moves] of cases) {
    const cube = applyAlgorithm(createSolvedCube(), moves);
    const result = positionYellowCorners(cube);

    assert(result.success, `${name}: expected permutation success`);
    assert(
      isYellowCornersPositioned(result.cubeAfterStage),
      `${name}: expected positioned yellow corners`,
    );
    assert(
      isYellowFaceOriented(result.cubeAfterStage),
      `${name}: expected oriented yellow face after permutation`,
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
    verifyPositionYellowCornersFromScramble(name, scramble);
  }
}

function verifyGeneratedScrambles(): void {
  const cases = [
    generateScramble(8, createSeededRandom(1009)),
    generateScramble(10, createSeededRandom(1103)),
    generateScramble(12, createSeededRandom(1201)),
  ];

  cases.forEach((scramble, index) => {
    verifyPositionYellowCornersFromScramble(`generated scramble ${index + 1}`, scramble);
  });
}

const verificationSteps: Array<[string, () => void]> = [
  ["solved cube", verifySolvedCube],
  ["requires oriented yellow face", verifyRequiresOrientedYellowFace],
  ["case detection", verifyCaseDetection],
  ["known corner cases", verifyKnownCornerCases],
  ["simple scrambles", verifySimpleScrambles],
  ["generated scrambles", verifyGeneratedScrambles],
];

for (const [name, verify] of verificationSteps) {
  verify();
  console.log(`ok - ${name}`);
}

console.log("Yellow corner permutation verification passed");
