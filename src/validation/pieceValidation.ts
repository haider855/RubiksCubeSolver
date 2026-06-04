import { SOLVED_FACE_COLOURS } from "../cube/constants.js";
import type { CubeColour, CubeState, Face } from "../cube/types.js";
import type { ValidationIssue } from "./validationTypes.js";

type PieceKind = "edge" | "corner";

type PieceSticker = {
  face: Face;
  index: number;
};

type PieceDefinition = {
  label: string;
  stickers: PieceSticker[];
};

type PieceOccurrence = {
  label: string;
  colours: CubeColour[];
};

const COLOUR_KEY_ORDER: CubeColour[] = [
  "white",
  "yellow",
  "green",
  "blue",
  "orange",
  "red",
];

const COLOUR_KEY_INDEX = new Map(
  COLOUR_KEY_ORDER.map((colour, index) => [colour, index]),
);

const EDGE_PIECES: PieceDefinition[] = [
  createPiece("UF", ["U", 7], ["F", 1]),
  createPiece("UR", ["U", 5], ["R", 1]),
  createPiece("UB", ["U", 1], ["B", 1]),
  createPiece("UL", ["U", 3], ["L", 1]),
  createPiece("DF", ["D", 1], ["F", 7]),
  createPiece("DR", ["D", 5], ["R", 7]),
  createPiece("DB", ["D", 7], ["B", 7]),
  createPiece("DL", ["D", 3], ["L", 7]),
  createPiece("FR", ["F", 5], ["R", 3]),
  createPiece("BR", ["B", 3], ["R", 5]),
  createPiece("BL", ["B", 5], ["L", 3]),
  createPiece("FL", ["F", 3], ["L", 5]),
];

const CORNER_PIECES: PieceDefinition[] = [
  createPiece("UFR", ["U", 8], ["F", 2], ["R", 0]),
  createPiece("URB", ["U", 2], ["R", 2], ["B", 0]),
  createPiece("UBL", ["U", 0], ["B", 2], ["L", 0]),
  createPiece("ULF", ["U", 6], ["L", 2], ["F", 0]),
  createPiece("DFR", ["D", 2], ["R", 6], ["F", 8]),
  createPiece("DRB", ["D", 8], ["B", 6], ["R", 8]),
  createPiece("DBL", ["D", 6], ["L", 6], ["B", 8]),
  createPiece("DLF", ["D", 0], ["F", 6], ["L", 8]),
];

export function validateCubePieces(cube: CubeState): ValidationIssue[] {
  return [
    ...validatePieceGroup(cube, "edge", EDGE_PIECES),
    ...validatePieceGroup(cube, "corner", CORNER_PIECES),
  ];
}

function validatePieceGroup(
  cube: CubeState,
  kind: PieceKind,
  pieces: PieceDefinition[],
): ValidationIssue[] {
  const expectedPieces = createExpectedPieceMap(pieces);
  const occurrences = new Map<string, PieceOccurrence[]>();
  const issues: ValidationIssue[] = [];

  for (const piece of pieces) {
    const colours = getPieceColours(cube, piece);
    const key = createColourKey(colours);
    const existingOccurrences = occurrences.get(key) ?? [];

    occurrences.set(key, [...existingOccurrences, { label: piece.label, colours }]);

    if (!expectedPieces.has(key)) {
      issues.push(
        createIssue(
          `impossible-${kind}-piece`,
          `Impossible ${kind} at ${piece.label}: ${formatColours(
            colours,
          )} is not a valid ${kind} piece.`,
        ),
      );
    }
  }

  for (const [key, expectedPiece] of expectedPieces) {
    const pieceOccurrences = occurrences.get(key) ?? [];

    if (pieceOccurrences.length === 0) {
      issues.push(
        createIssue(
          `missing-${kind}-piece`,
          `Missing ${kind} piece ${formatColours(expectedPiece.colours)}.`,
        ),
      );
      continue;
    }

    if (pieceOccurrences.length > 1) {
      issues.push(
        createIssue(
          `duplicate-${kind}-piece`,
          `Duplicate ${kind} piece ${formatColours(
            expectedPiece.colours,
          )} appears at ${formatLocations(pieceOccurrences)}.`,
        ),
      );
    }
  }

  return issues;
}

function createExpectedPieceMap(
  pieces: PieceDefinition[],
): Map<string, PieceOccurrence> {
  return new Map(
    pieces.map((piece) => {
      const colours = piece.stickers.map(
        (sticker) => SOLVED_FACE_COLOURS[sticker.face],
      );

      return [
        createColourKey(colours),
        {
          label: piece.label,
          colours,
        },
      ];
    }),
  );
}

function getPieceColours(cube: CubeState, piece: PieceDefinition): CubeColour[] {
  return piece.stickers.map((sticker) => cube[sticker.face][sticker.index]);
}

function createPiece(
  label: string,
  ...stickers: Array<[Face, number]>
): PieceDefinition {
  return {
    label,
    stickers: stickers.map(([face, index]) => ({ face, index })),
  };
}

function createColourKey(colours: CubeColour[]): string {
  return [...colours]
    .sort((left, right) => getColourIndex(left) - getColourIndex(right))
    .join("-");
}

function getColourIndex(colour: CubeColour): number {
  const index = COLOUR_KEY_INDEX.get(colour);

  if (index === undefined) {
    throw new Error(`Unknown cube colour: ${colour}`);
  }

  return index;
}

function formatColours(colours: CubeColour[]): string {
  return colours.join("-");
}

function formatLocations(occurrences: PieceOccurrence[]): string {
  return occurrences.map((occurrence) => occurrence.label).join(", ");
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
