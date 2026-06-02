import { applyMove, cloneCube, createSolvedCube } from "../cube/index.js";
import { validateBasicCube } from "../validation/index.js";
import type { CubeState } from "../cube/index.js";
import type { ValidationIssueCode } from "../validation/index.js";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function assertValid(cube: unknown, message: string): void {
  const result = validateBasicCube(cube);

  assert(
    result.isValid,
    `${message}: expected valid cube, got ${result.issues
      .map((issue) => issue.message)
      .join(" ")}`,
  );
}

function assertInvalid(
  cube: unknown,
  expectedCode: ValidationIssueCode,
  message: string,
): void {
  const result = validateBasicCube(cube);

  assert(!result.isValid, `${message}: expected invalid cube`);
  assert(
    result.issues.some((issue) => issue.code === expectedCode),
    `${message}: expected ${expectedCode}, got ${result.issues
      .map((issue) => issue.code)
      .join(", ")}`,
  );
}

function verifySolvedCubeIsValid(): void {
  assertValid(createSolvedCube(), "Solved cube should pass basic validation");
}

function verifyMovedCubeIsValid(): void {
  const cube = applyMove(createSolvedCube(), "R");

  assertValid(cube, "A legally moved cube should pass basic validation");
}

function verifyInputShape(): void {
  assertInvalid(null, "invalid-face-stickers", "Null input should be invalid");

  const missingFace = cloneCube(createSolvedCube()) as Partial<CubeState>;
  delete missingFace.B;

  assertInvalid(missingFace, "missing-face", "Cube with missing face should fail");

  const extraFace = {
    ...cloneCube(createSolvedCube()),
    X: Array.from({ length: 9 }, () => "white"),
  };

  assertInvalid(extraFace, "unexpected-face", "Cube with unexpected face should fail");

  const shortFace = {
    ...cloneCube(createSolvedCube()),
    U: Array.from({ length: 8 }, () => "white"),
  };

  assertInvalid(shortFace, "invalid-face-stickers", "Short face should fail");
}

function verifyColourCounts(): void {
  const cube = cloneCube(createSolvedCube());
  cube.U[0] = "yellow";

  assertInvalid(cube, "invalid-colour-count", "Wrong colour counts should fail");
}

function verifyInvalidStickerColours(): void {
  const cube = cloneCube(createSolvedCube()) as unknown as Record<string, unknown[]>;
  cube.U[0] = "";

  assertInvalid(
    cube,
    "invalid-sticker-colour",
    "Empty sticker value should fail",
  );
}

function verifyCentres(): void {
  const cube = cloneCube(createSolvedCube());
  cube.U[4] = "yellow";

  assertInvalid(cube, "invalid-centre", "Changed centre should fail");

  const duplicateCentre = cloneCube(createSolvedCube());
  duplicateCentre.F[4] = "red";

  assertInvalid(
    duplicateCentre,
    "invalid-centre",
    "Duplicate centre colour should fail",
  );
}

const verificationSteps: Array<[string, () => void]> = [
  ["solved cube is valid", verifySolvedCubeIsValid],
  ["moved cube is valid", verifyMovedCubeIsValid],
  ["input shape", verifyInputShape],
  ["colour counts", verifyColourCounts],
  ["invalid sticker colours", verifyInvalidStickerColours],
  ["centres", verifyCentres],
];

for (const [name, verify] of verificationSteps) {
  verify();
  console.log(`ok - ${name}`);
}

console.log("Basic validation verification passed");
