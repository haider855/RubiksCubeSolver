import {
  ALL_MOVES,
  CUBE_COLOURS,
  FACE_CENTRE_INDEX,
  FACE_ORDER,
  applyAlgorithm,
  applyMove,
  cloneCube,
  createSolvedCube,
  formatAlgorithm,
  generateScramble,
  invertAlgorithm,
  invertMove,
  isMove,
  isSolved,
  parseAlgorithm,
  scrambleCube,
} from "../cube/index.js";
import type { Algorithm, CubeColour, CubeState, Move } from "../cube/index.js";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function assertCubeEqual(actual: CubeState, expected: CubeState, message: string): void {
  assert(cubeKey(actual) === cubeKey(expected), message);
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

function assertSolved(cube: CubeState, message: string): void {
  assert(isSolved(cube), message);
}

function assertColourCountsPreserved(cube: CubeState, message: string): void {
  const counts = colourCounts(cube);

  for (const colour of CUBE_COLOURS) {
    assert(counts[colour] === 9, `${message}: expected 9 ${colour} stickers`);
  }
}

function assertCentresUnchanged(cube: CubeState, message: string): void {
  const solvedCube = createSolvedCube();

  for (const face of FACE_ORDER) {
    assert(
      cube[face][FACE_CENTRE_INDEX] === solvedCube[face][FACE_CENTRE_INDEX],
      `${message}: ${face} centre changed`,
    );
  }
}

function assertStickers(
  cube: CubeState,
  face: keyof CubeState,
  indexes: number[],
  expectedColour: CubeColour,
  message: string,
): void {
  for (const index of indexes) {
    assert(cube[face][index] === expectedColour, `${message}: ${face}${index}`);
  }
}

function createSeededRandom(seed: number): () => number {
  let state = seed;

  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

function verifySolvedCubeAndClone(): void {
  const solvedCube = createSolvedCube();
  const clonedCube = cloneCube(solvedCube);

  assertSolved(solvedCube, "A newly created solved cube should be solved");
  assertCubeEqual(clonedCube, solvedCube, "A cloned solved cube should match");

  clonedCube.U[0] = "yellow";
  assert(
    solvedCube.U[0] === "white",
    "cloneCube should create independent face arrays",
  );
}

function verifyNotation(): void {
  const algorithm = parseAlgorithm("R U R' U' F2");

  assert(
    formatAlgorithm(algorithm) === "R U R' U' F2",
    "formatAlgorithm should preserve parsed notation",
  );
  assert(isMove("R2"), "R2 should be valid notation");
  assert(!isMove("M"), "Unsupported slice moves should be invalid");

  try {
    parseAlgorithm("R M U");
    assert(false, "parseAlgorithm should reject unsupported moves");
  } catch (error) {
    assert(
      error instanceof Error && error.message.includes("Invalid move notation"),
      "parseAlgorithm should throw a clear invalid-move error",
    );
  }
}

function verifyMoveInverses(): void {
  const solvedCube = createSolvedCube();

  for (const move of ALL_MOVES) {
    const movedCube = applyMove(solvedCube, move);
    const restoredCube = applyMove(movedCube, invertMove(move));

    assertCubeEqual(
      restoredCube,
      solvedCube,
      `${move} followed by its inverse should restore solved cube`,
    );
    assertColourCountsPreserved(movedCube, `${move} should preserve colour counts`);
    assertCentresUnchanged(movedCube, `${move} should preserve centres`);
    assertCubeEqual(
      solvedCube,
      createSolvedCube(),
      `${move} should not mutate its input cube`,
    );
  }
}

function verifyRepeatedTurns(): void {
  const solvedCube = createSolvedCube();
  const baseMoves: Move[] = ["U", "D", "F", "B", "L", "R"];
  const doubleMoves: Move[] = ["U2", "D2", "F2", "B2", "L2", "R2"];

  for (const move of baseMoves) {
    assertSolved(
      applyAlgorithm(solvedCube, [move, move, move, move]),
      `${move} four times should restore solved cube`,
    );
  }

  for (const move of doubleMoves) {
    assertSolved(
      applyAlgorithm(solvedCube, [move, move]),
      `${move} twice should restore solved cube`,
    );
  }
}

function verifyStandardMoveOrientation(): void {
  const solvedCube = createSolvedCube();
  const afterF = applyMove(solvedCube, "F");
  const afterR = applyMove(solvedCube, "R");
  const afterU = applyMove(solvedCube, "U");

  assertStickers(
    afterF,
    "R",
    [0, 3, 6],
    "white",
    "F should move the U bottom edge to the R left edge",
  );
  assertStickers(
    afterR,
    "U",
    [2, 5, 8],
    "green",
    "R should move the F right edge to the U right edge",
  );
  assertStickers(
    afterU,
    "L",
    [0, 1, 2],
    "green",
    "U should move the F top edge to the L top edge",
  );
}

function verifyAlgorithmInversion(): void {
  const solvedCube = createSolvedCube();
  const scramble = parseAlgorithm("R U R' U' F2 L D B' R2");
  const scrambledCube = applyAlgorithm(solvedCube, scramble);
  const restoredCube = applyAlgorithm(scrambledCube, invertAlgorithm(scramble));

  assertSolved(restoredCube, "A scramble followed by its inverse should solve");
  assertColourCountsPreserved(scrambledCube, "Scramble should preserve colour counts");
  assertCentresUnchanged(scrambledCube, "Scramble should preserve centres");
}

function verifyGeneratedScramble(): void {
  const scramble = generateScramble(25, createSeededRandom(42));

  assert(scramble.length === 25, "generateScramble should create requested length");

  for (let index = 1; index < scramble.length; index += 1) {
    assert(
      scramble[index][0] !== scramble[index - 1][0],
      "generateScramble should avoid consecutive moves on the same face",
    );
  }

  const result = scrambleCube(createSolvedCube(), 25, createSeededRandom(42));
  const restoredCube = applyAlgorithm(result.cube, invertAlgorithm(result.moves));

  assertSolved(restoredCube, "scrambleCube moves should be invertible");
}

const verificationSteps: Array<[string, () => void]> = [
  ["solved cube and clone", verifySolvedCubeAndClone],
  ["notation", verifyNotation],
  ["move inverses", verifyMoveInverses],
  ["repeated turns", verifyRepeatedTurns],
  ["standard move orientation", verifyStandardMoveOrientation],
  ["algorithm inversion", verifyAlgorithmInversion],
  ["generated scramble", verifyGeneratedScramble],
];

for (const [name, verify] of verificationSteps) {
  verify();
  console.log(`ok - ${name}`);
}

console.log("Cube engine verification passed");
