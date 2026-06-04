import {
  CUBE_COLOURS,
  FACE_CENTRE_INDEX,
  FACE_ORDER,
  applyAlgorithm,
  cloneCube,
  createSolvedCube,
  generateScramble,
  isMove,
  isSolved,
  parseAlgorithm,
} from "../cube/index.js";
import {
  countPositionedYellowEdges,
  getYellowEdgePositionCase,
  isMiddleLayerSolved,
  isYellowCornersPositioned,
  isYellowEdgesPositioned,
  isYellowFaceOriented,
  orientYellowCorners,
  positionYellowCorners,
  positionYellowEdges,
  solveMiddleLayer,
  solveWhiteCorners,
  solveWhiteCross,
  solveYellowCross,
} from "../solver/index.js";
import type { Algorithm, CubeColour, CubeState } from "../cube/index.js";
import type { YellowEdgePositionCase } from "../solver/index.js";

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

function solveThroughYellowCorners(scrambledCube: CubeState): CubeState {
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

  const cornerPositionResult = positionYellowCorners(
    orientationResult.cubeAfterStage,
  );

  assert(cornerPositionResult.success, "Expected yellow-corner position setup success");
  assert(
    isYellowCornersPositioned(cornerPositionResult.cubeAfterStage),
    "Expected positioned yellow corners",
  );

  return cornerPositionResult.cubeAfterStage;
}

function verifyPositionYellowEdgesFromScramble(
  name: string,
  scramble: Algorithm,
): void {
  const scrambledCube = applyAlgorithm(createSolvedCube(), scramble);
  const yellowCornerCube = solveThroughYellowCorners(scrambledCube);
  const result = positionYellowEdges(yellowCornerCube);

  assert(result.success, `${name}: expected yellow-edge permutation success`);
  assert(isSolved(result.cubeAfterStage), `${name}: expected solved cube`);
  assert(
    isYellowEdgesPositioned(result.cubeAfterStage),
    `${name}: expected yellow edges to be positioned`,
  );
  assert(
    isYellowCornersPositioned(result.cubeAfterStage),
    `${name}: expected yellow corners to remain positioned`,
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

  const replayedCube = applyAlgorithm(yellowCornerCube, result.moves);

  assert(
    cubeKey(replayedCube) === cubeKey(result.cubeAfterStage),
    `${name}: move history should reproduce cubeAfterStage`,
  );
  assertColourCountsPreserved(result.cubeAfterStage);
  assertCentresUnchanged(result.cubeAfterStage);
}

function verifySolvedCube(): void {
  const result = positionYellowEdges(createSolvedCube());

  assert(result.success, "Solved cube should succeed");
  assert(result.moves.length === 0, "Solved cube should require no edge moves");
  assert(isSolved(result.cubeAfterStage), "Solved cube should remain solved");
}

function verifyRequiresPositionedYellowCorners(): void {
  const cube = applyAlgorithm(createSolvedCube(), parseAlgorithm("D"));

  assert(
    !isYellowCornersPositioned(cube),
    "Setup cube should not have positioned yellow corners",
  );

  const result = positionYellowEdges(cube);

  assert(!result.success, "Edge permutation should require positioned yellow corners");
}

function verifyCaseDetection(): void {
  const cases: Array<[string, Algorithm, YellowEdgePositionCase, number]> = [
    ["positioned", [], "positioned", 4],
    [
      "one",
      parseAlgorithm("R2 D R D R' D' R' D' R' D R'"),
      "one",
      1,
    ],
    [
      "none",
      parseAlgorithm(
        "R2 D R D R' D' R' D' R' D R' F2 D F D F' D' F' D' F' D F'",
      ),
      "none",
      0,
    ],
  ];

  for (const [name, moves, expectedCase, expectedCount] of cases) {
    const cube = applyAlgorithm(createSolvedCube(), moves);

    assert(isYellowCornersPositioned(cube), `${name}: expected corners preserved`);
    assert(
      getYellowEdgePositionCase(cube) === expectedCase,
      `${name}: expected ${expectedCase} yellow-edge position case`,
    );
    assert(
      countPositionedYellowEdges(cube) === expectedCount,
      `${name}: expected ${expectedCount} positioned yellow edges`,
    );
  }

  const invalidCube = cloneCube(createSolvedCube());
  invalidCube.F[7] = "red";

  assert(
    getYellowEdgePositionCase(invalidCube) === "invalid",
    "Expected three positioned yellow edges to be invalid",
  );
}

function verifyKnownEdgeCases(): void {
  const cases: Array<[string, Algorithm]> = [
    ["one", parseAlgorithm("R2 D R D R' D' R' D' R' D R'")],
    [
      "none",
      parseAlgorithm(
        "R2 D R D R' D' R' D' R' D R' F2 D F D F' D' F' D' F' D F'",
      ),
    ],
  ];

  for (const [name, moves] of cases) {
    const cube = applyAlgorithm(createSolvedCube(), moves);
    const result = positionYellowEdges(cube);

    assert(result.success, `${name}: expected edge permutation success`);
    assert(isSolved(result.cubeAfterStage), `${name}: expected solved cube`);
  }
}

function verifySimpleScrambles(): void {
  const cases: Array<[string, Algorithm]> = [
    ["right trigger", parseAlgorithm("R U R' U'")],
    ["front algorithm", parseAlgorithm("F R U R' U' F'")],
    ["mixed setup", parseAlgorithm("R U F2 L' D B R' F")],
  ];

  for (const [name, scramble] of cases) {
    verifyPositionYellowEdgesFromScramble(name, scramble);
  }
}

function verifyGeneratedScrambles(): void {
  const cases = [
    generateScramble(8, createSeededRandom(1301)),
    generateScramble(10, createSeededRandom(1409)),
    generateScramble(12, createSeededRandom(1511)),
  ];

  cases.forEach((scramble, index) => {
    verifyPositionYellowEdgesFromScramble(`generated scramble ${index + 1}`, scramble);
  });
}

const verificationSteps: Array<[string, () => void]> = [
  ["solved cube", verifySolvedCube],
  ["requires positioned yellow corners", verifyRequiresPositionedYellowCorners],
  ["case detection", verifyCaseDetection],
  ["known edge cases", verifyKnownEdgeCases],
  ["simple scrambles", verifySimpleScrambles],
  ["generated scrambles", verifyGeneratedScrambles],
];

for (const [name, verify] of verificationSteps) {
  verify();
  console.log(`ok - ${name}`);
}

console.log("Yellow edge permutation verification passed");
