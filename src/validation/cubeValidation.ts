import type { CubeState } from "../cube/types.js";
import { validateBasicCube } from "./basicValidation.js";
import { validateCubePieces } from "./pieceValidation.js";
import type { ValidationResult } from "./validationTypes.js";

export function validateCube(input: unknown): ValidationResult {
  const basicResult = validateBasicCube(input);

  if (!basicResult.isValid) {
    return basicResult;
  }

  const pieceIssues = validateCubePieces(input as CubeState);

  return {
    isValid: pieceIssues.length === 0,
    issues: pieceIssues,
  };
}
