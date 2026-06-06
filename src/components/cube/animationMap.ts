export const MODEL_ANIMATION_CLIPS = ["Scene"] as const;

export const animationMap: Record<string, string | null> = {
  R: null,
  "R'": null,
  U: null,
  "U'": null,
  F: null,
  "F'": null,
  L: null,
  "L'": null,
  D: null,
  "D'": null,
  B: null,
  "B'": null,
};

export function getModelAnimationName(move: string | null): string | null {
  if (!move) {
    return null;
  }

  return animationMap[move] ?? null;
}
