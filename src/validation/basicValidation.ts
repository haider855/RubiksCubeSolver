import {
  CUBE_COLOURS,
  FACE_CENTRE_INDEX,
  FACE_ORDER,
  FACE_STICKER_COUNT,
  SOLVED_FACE_COLOURS,
} from "../cube/constants.js";
import type { CubeColour, CubeState, Face } from "../cube/types.js";
import type { ValidationIssue, ValidationResult } from "./validationTypes.js";

const VALID_FACE_SET = new Set<string>(FACE_ORDER);
const VALID_COLOUR_SET = new Set<string>(CUBE_COLOURS);

export function validateBasicCube(input: unknown): ValidationResult {
  const issues: ValidationIssue[] = [];

  if (!isRecord(input)) {
    return createValidationResult([
      createIssue(
        "invalid-face-stickers",
        "Cube state must be an object with U, D, F, B, L, and R faces.",
      ),
    ]);
  }

  validateFaces(input, issues);

  if (hasStructuralErrors(issues)) {
    return createValidationResult(issues);
  }

  const cube = input as CubeState;

  validateStickerColours(cube, issues);
  validateColourCounts(cube, issues);
  validateCentres(cube, issues);

  return createValidationResult(issues);
}

function validateFaces(input: Record<string, unknown>, issues: ValidationIssue[]): void {
  for (const face of FACE_ORDER) {
    if (!(face in input)) {
      issues.push(createIssue("missing-face", `Missing ${face} face.`));
      continue;
    }

    if (!Array.isArray(input[face]) || input[face].length !== FACE_STICKER_COUNT) {
      issues.push(
        createIssue(
          "invalid-face-stickers",
          `${face} face must contain exactly ${FACE_STICKER_COUNT} stickers.`,
        ),
      );
    }
  }

  for (const key of Object.keys(input)) {
    if (!VALID_FACE_SET.has(key)) {
      issues.push(createIssue("unexpected-face", `Unexpected face ${key}.`));
    }
  }
}

function validateStickerColours(cube: CubeState, issues: ValidationIssue[]): void {
  for (const face of FACE_ORDER) {
    cube[face].forEach((colour, index) => {
      if (!VALID_COLOUR_SET.has(colour)) {
        issues.push(
          createIssue(
            "invalid-sticker-colour",
            `${face}${index} must be one of: ${CUBE_COLOURS.join(", ")}.`,
          ),
        );
      }
    });
  }
}

function validateColourCounts(cube: CubeState, issues: ValidationIssue[]): void {
  const counts = createColourCounts();

  for (const face of FACE_ORDER) {
    for (const colour of cube[face]) {
      if (VALID_COLOUR_SET.has(colour)) {
        counts[colour] += 1;
      }
    }
  }

  const invalidCounts = CUBE_COLOURS.filter((colour) => counts[colour] !== 9);

  if (invalidCounts.length === 0) {
    return;
  }

  issues.push(
    createIssue(
      "invalid-colour-count",
      `Invalid colour counts: ${invalidCounts
        .map((colour) => `${colour} appears ${counts[colour]} times`)
        .join("; ")}.`,
    ),
  );
}

function validateCentres(cube: CubeState, issues: ValidationIssue[]): void {
  const seenCentres = new Set<CubeColour>();

  for (const face of FACE_ORDER) {
    const centre = cube[face][FACE_CENTRE_INDEX];
    const expectedCentre = SOLVED_FACE_COLOURS[face];

    if (centre !== expectedCentre) {
      issues.push(
        createIssue(
          "invalid-centre",
          `${face} centre must be ${expectedCentre}, but found ${String(centre)}.`,
        ),
      );
    }

    if (VALID_COLOUR_SET.has(centre)) {
      if (seenCentres.has(centre)) {
        issues.push(
          createIssue(
            "invalid-centre",
            `Centre colour ${centre} appears more than once.`,
          ),
        );
      }

      seenCentres.add(centre);
    }
  }
}

function hasStructuralErrors(issues: ValidationIssue[]): boolean {
  return issues.some(
    (issue) =>
      issue.code === "missing-face" ||
      issue.code === "unexpected-face" ||
      issue.code === "invalid-face-stickers",
  );
}

function createColourCounts(): Record<CubeColour, number> {
  return Object.fromEntries(
    CUBE_COLOURS.map((colour) => [colour, 0]),
  ) as Record<CubeColour, number>;
}

function createValidationResult(issues: ValidationIssue[]): ValidationResult {
  return {
    isValid: issues.length === 0,
    issues,
  };
}

function createIssue(
  code: ValidationIssue["code"],
  message: string,
): ValidationIssue {
  return {
    code,
    severity: "error",
    message,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
