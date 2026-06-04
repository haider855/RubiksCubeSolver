import { solveCube } from "./solveCube.js";
import type {
  SolveCubeWorkerRequest,
  SolveCubeWorkerResponse,
} from "./solveCubeWorkerTypes.js";

const postSolveMessage = globalThis.postMessage as (
  message: SolveCubeWorkerResponse,
) => void;

globalThis.addEventListener(
  "message",
  (event: MessageEvent<SolveCubeWorkerRequest>) => {
    const { id, cube } = event.data;

    try {
      postSolveMessage({
        id,
        result: solveCube(cube),
      });
    } catch (error) {
      postSolveMessage({
        id,
        error: formatWorkerError(error),
      });
    }
  },
);

function formatWorkerError(error: unknown): string {
  return error instanceof Error
    ? `Solver worker stopped unexpectedly: ${error.message}`
    : "Solver worker stopped unexpectedly.";
}
