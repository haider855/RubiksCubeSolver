export const MOCK_SOLUTION_STEPS = [
  "R",
  "U",
  "R'",
  "U'",
  "F",
  "R",
  "U",
  "R'",
  "U'",
  "F'",
];

export const MOVE_DESCRIPTIONS: Record<string, string> = {
  R: "Rotate the right face clockwise.",
  "R'": "Rotate the right face counter-clockwise.",
  U: "Rotate the upper face clockwise.",
  "U'": "Rotate the upper face counter-clockwise.",
  F: "Rotate the front face clockwise.",
  "F'": "Rotate the front face counter-clockwise.",
  L: "Rotate the left face clockwise.",
  "L'": "Rotate the left face counter-clockwise.",
  D: "Rotate the bottom face clockwise.",
  "D'": "Rotate the bottom face counter-clockwise.",
  B: "Rotate the back face clockwise.",
  "B'": "Rotate the back face counter-clockwise.",
};
