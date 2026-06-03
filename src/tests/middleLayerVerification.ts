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
  isMiddleLayerSolved,
  solveMiddleLayer,
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

function solveFirstLayer(scrambledCube: CubeState): CubeState {
  const crossResult = solveWhiteCross(scrambledCube);

  assert(crossResult.success, "Expected white-cross setup success");

  const cornerResult = solveWhiteCorners(crossResult.cubeAfterStage);

  assert(cornerResult.success, "Expected white-corners setup success");
  assert(isFirstLayerSolved(cornerResult.cubeAfterStage), "Expected solved first layer");

  return cornerResult.cubeAfterStage;
}

function verifyMiddleLayerFromScramble(name: string, scramble: Algorithm): void {
  const scrambledCube = applyAlgorithm(createSolvedCube(), scramble);
  const firstLayerCube = solveFirstLayer(scrambledCube);
  const result = solveMiddleLayer(firstLayerCube);

  assert(result.success, `${name}: expected middle-layer stage success`);
  assert(
    isMiddleLayerSolved(result.cubeAfterStage),
    `${name}: expected middle layer to be solved`,
  );
  assert(
    isFirstLayerSolved(result.cubeAfterStage),
    `${name}: expected first layer to remain solved`,
  );
  assert(
    result.moves.every((move) => isMove(move)),
    `${name}: expected every returned move to use legal notation`,
  );

  const replayedCube = applyAlgorithm(firstLayerCube, result.moves);

  assert(
    cubeKey(replayedCube) === cubeKey(result.cubeAfterStage),
    `${name}: move history should reproduce cubeAfterStage`,
  );
  assertColourCountsPreserved(result.cubeAfterStage);
  assertCentresUnchanged(result.cubeAfterStage);
}

function verifySolvedCube(): void {
  const result = solveMiddleLayer(createSolvedCube());

  assert(result.success, "Solved cube should succeed");
  assert(result.moves.length === 0, "Solved cube should require no middle-layer moves");
  assert(isMiddleLayerSolved(result.cubeAfterStage), "Solved cube middle layer should pass");
}

function verifyRequiresFirstLayer(): void {
  const cube = applyAlgorithm(createSolvedCube(), parseAlgorithm("R U R' U'"));
  const result = solveMiddleLayer(cube);

  assert(!result.success, "Middle-layer stage should require solved first layer");
}

function verifySimpleScrambles(): void {
  const cases: Array<[string, Algorithm]> = [
    ["right trigger", parseAlgorithm("R U R' U'")],
    ["front algorithm", parseAlgorithm("F R U R' U' F'")],
    ["mixed setup", parseAlgorithm("R U F2 L' D B R' F")],
  ];

  for (const [name, scramble] of cases) {
    verifyMiddleLayerFromScramble(name, scramble);
  }
}

function verifyGeneratedScrambles(): void {
  const cases = [
    generateScramble(8, createSeededRandom(101)),
    generateScramble(10, createSeededRandom(211)),
    generateScramble(12, createSeededRandom(307)),
  ];

  cases.forEach((scramble, index) => {
    verifyMiddleLayerFromScramble(`generated scramble ${index + 1}`, scramble);
  });
}

const verificationSteps: Array<[string, () => void]> = [
  ["solved cube", verifySolvedCube],
  ["requires first layer", verifyRequiresFirstLayer],
  ["simple scrambles", verifySimpleScrambles],
  ["generated scrambles", verifyGeneratedScrambles],
];

for (const [name, verify] of verificationSteps) {
  verify();
  console.log(`ok - ${name}`);
}

console.log("Middle layer verification passed");
