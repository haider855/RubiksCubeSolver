import type { CubeColour, Face } from "../cube/index.js";

export const FACE_LABELS: Record<Face, string> = {
  U: "Up",
  D: "Down",
  F: "Front",
  B: "Back",
  L: "Left",
  R: "Right",
};

export const COLOUR_LABELS: Record<CubeColour, string> = {
  white: "White",
  yellow: "Yellow",
  green: "Green",
  blue: "Blue",
  orange: "Orange",
  red: "Red",
};

export const COLOUR_SWATCHES: Record<CubeColour, string> = {
  white: "#f8fafc",
  yellow: "#facc15",
  green: "#16a34a",
  blue: "#2563eb",
  orange: "#f97316",
  red: "#dc2626",
};
