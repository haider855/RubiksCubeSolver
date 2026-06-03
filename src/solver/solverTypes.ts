import type { CubeState, Move } from "../cube/index.js";

export type SolverStageName =
  | "white-cross"
  | "white-corners"
  | "middle-layer"
  | "yellow-cross"
  | "orient-yellow-corners"
  | "position-yellow-corners"
  | "position-yellow-edges";

export type SolverStageResult = {
  stage: SolverStageName;
  moves: Move[];
  cubeAfterStage: CubeState;
  success: boolean;
  message?: string;
};
