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
import { solveCube } from "../solver/index.js";
import type { Algorithm, CubeColour, CubeState } from "../cube/index.js";
import type { SolverStageName, SolverStageResult } from "../solver/index.js";

const EXPECTED_STAGE_ORDER: SolverStageName[] = [
  "white-cross",
  "white-corners",
  "middle-layer",
  "yellow-cross",
  "orient-yellow-corners",
  "position-yellow-corners",
  "position-yellow-edges",
];

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

function assertStageOrder(stages: SolverStageResult[]): void {
  assert(
    stages.length === EXPECTED_STAGE_ORDER.length,
    `Expected ${EXPECTED_STAGE_ORDER.length} stage results`,
  );

  stages.forEach((stage, index) => {
    assert(
      stage.stage === EXPECTED_STAGE_ORDER[index],
      `Expected stage ${index + 1} to be ${EXPECTED_STAGE_ORDER[index]}`,
    );
  });
}

function assertStageReplay(
  initialCube: CubeState,
  stages: SolverStageResult[],
): void {
  let replayedCube = cloneCube(initialCube);

  for (const stage of stages) {
    replayedCube = applyAlgorithm(replayedCube, stage.moves);
    assert(
      cubeKey(replayedCube) === cubeKey(stage.cubeAfterStage),
      `${stage.stage}: stage moves should reproduce cubeAfterStage`,
    );
  }
}

function verifySolveCubeFromScramble(name: string, scramble: Algorithm): void {
  const scrambledCube = applyAlgorithm(createSolvedCube(), scramble);
  const result = solveCube(scrambledCube);

  assert(result.success, `${name}: expected full solver success`);
  assert(!result.error, `${name}: expected no solver error`);
  assert(isSolved(result.cubeAfterSolve), `${name}: expected solved final cube`);
  assert(
    result.moves.every((move) => isMove(move)),
    `${name}: expected every returned move to use legal notation`,
  );
  assertStageOrder(result.stages);
  assert(
    result.stages.every((stage) => stage.success),
    `${name}: expected every stage to succeed`,
  );
  assertStageReplay(scrambledCube, result.stages);

  const replayedSolution = applyAlgorithm(scrambledCube, result.moves);

  assert(
    cubeKey(replayedSolution) === cubeKey(result.cubeAfterSolve),
    `${name}: full move list should reproduce cubeAfterSolve`,
  );
  assert(isSolved(replayedSolution), `${name}: replayed solution should solve cube`);
  assertColourCountsPreserved(result.cubeAfterSolve);
  assertCentresUnchanged(result.cubeAfterSolve);
}

function verifySolvedCube(): void {
  const result = solveCube(createSolvedCube());

  assert(result.success, "Solved cube should succeed");
  assert(result.moves.length === 0, "Solved cube should require no moves");
  assert(isSolved(result.cubeAfterSolve), "Solved cube should remain solved");
  assertStageOrder(result.stages);
  assert(
    result.stages.every((stage) => stage.moves.length === 0),
    "Solved cube should require no stage moves",
  );
}

function verifySimpleScrambles(): void {
  const cases: Array<[string, Algorithm]> = [
    ["right trigger", parseAlgorithm("R U R' U'")],
    ["front algorithm", parseAlgorithm("F R U R' U' F'")],
    ["mixed setup", parseAlgorithm("R U F2 L' D B R' F")],
  ];

  for (const [name, scramble] of cases) {
    verifySolveCubeFromScramble(name, scramble);
  }
}

function verifyGeneratedScrambles(): void {
  const cases = [
    generateScramble(8, createSeededRandom(1601)),
    generateScramble(10, createSeededRandom(1709)),
    generateScramble(12, createSeededRandom(1801)),
  ];

  cases.forEach((scramble, index) => {
    verifySolveCubeFromScramble(`generated scramble ${index + 1}`, scramble);
  });
}

function verifyReadableFailure(): void {
  const invalidCube = cloneCube(createSolvedCube());
  invalidCube.D[0] = "blue";
  const result = solveCube(invalidCube);
  const error = result.error;

  assert(!result.success, "Invalid cube should fail");
  if (error === undefined) {
    throw new Error("Invalid cube should return a readable error");
  }
  assert(
    error.includes("Orient Yellow Corners failed"),
    "Expected error to name the failed stage",
  );
  assert(
    result.stages.some((stage) => !stage.success),
    "Expected failed stage to be stored",
  );
}

const verificationSteps: Array<[string, () => void]> = [
  ["solved cube", verifySolvedCube],
  ["simple scrambles", verifySimpleScrambles],
  ["generated scrambles", verifyGeneratedScrambles],
  ["readable failure", verifyReadableFailure],
];

for (const [name, verify] of verificationSteps) {
  verify();
  console.log(`ok - ${name}`);
}

console.log("Full solver integration verification passed");
