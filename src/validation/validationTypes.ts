export type ValidationSeverity = "error" | "warning";

export type ValidationIssueCode =
  | "missing-face"
  | "unexpected-face"
  | "invalid-face-stickers"
  | "invalid-sticker-colour"
  | "invalid-colour-count"
  | "invalid-centre"
  | "missing-edge-piece"
  | "duplicate-edge-piece"
  | "impossible-edge-piece"
  | "missing-corner-piece"
  | "duplicate-corner-piece"
  | "impossible-corner-piece";

export type ValidationIssue = {
  code: ValidationIssueCode;
  severity: ValidationSeverity;
  message: string;
};

export type ValidationResult = {
  isValid: boolean;
  issues: ValidationIssue[];
};
