import { formatAlgorithm } from "../cube/index.js";
import type { Move } from "../cube/index.js";
import type {
  FullSolverResult,
  SolverStageName,
  SolverStageResult,
} from "../solver/index.js";

type SolutionPanelProps = {
  result: FullSolverResult | null;
  currentMoveIndex: number;
  onPrevious: () => void;
  onNext: () => void;
  onJumpToMove: (moveIndex: number) => void;
  onResetToInitial: () => void;
};

type StageSummary = {
  label: string;
  stage: SolverStageName;
  moves: Move[];
  startMove: number;
  endMove: number;
  success: boolean;
  message?: string;
};

const STAGE_LABELS: Record<SolverStageName, string> = {
  "white-cross": "White Cross",
  "white-corners": "White Corners",
  "middle-layer": "Middle Layer",
  "yellow-cross": "Yellow Cross",
  "orient-yellow-corners": "Orient Yellow Corners",
  "position-yellow-corners": "Position Yellow Corners",
  "position-yellow-edges": "Position Yellow Edges",
};

export function SolutionPanel({
  result,
  currentMoveIndex,
  onPrevious,
  onNext,
  onJumpToMove,
  onResetToInitial,
}: SolutionPanelProps) {
  if (!result) {
    return (
      <section className="tool-panel" aria-labelledby="solution-title">
        <div className="panel-header compact">
          <h2 id="solution-title">Solution</h2>
        </div>
        <p>No solution generated.</p>
      </section>
    );
  }

  const stageSummaries = createStageSummaries(result.stages);
  const totalMoves = result.moves.length;
  const currentStage = getCurrentStageLabel(
    stageSummaries,
    currentMoveIndex,
    result.success,
  );
  const currentMove =
    currentMoveIndex > 0 ? result.moves[currentMoveIndex - 1] : undefined;

  return (
    <section
      className={`tool-panel solution-panel ${result.success ? "solved" : "failed"}`}
      aria-labelledby="solution-title"
    >
      <div className="panel-header compact">
        <h2 id="solution-title">Solution</h2>
        <span>{result.success ? "Solved" : "Stopped"}</span>
      </div>

      <div className="playback-summary" aria-label="Playback status">
        <div>
          <span className="summary-label">Move</span>
          <strong>
            {currentMoveIndex} / {totalMoves}
          </strong>
        </div>
        <div>
          <span className="summary-label">Stage</span>
          <strong>{currentStage}</strong>
        </div>
        <div>
          <span className="summary-label">Current</span>
          <strong>{currentMove ?? "Start"}</strong>
        </div>
      </div>

      {result.error ? <p className="solution-error">{result.error}</p> : null}

      <div className="playback-controls" aria-label="Playback controls">
        <button
          type="button"
          className="playback-button"
          disabled={currentMoveIndex === 0}
          onClick={onPrevious}
        >
          Previous
        </button>
        <button
          type="button"
          className="playback-button"
          disabled={currentMoveIndex >= totalMoves}
          onClick={onNext}
        >
          Next
        </button>
        <button type="button" className="playback-button" onClick={onResetToInitial}>
          Reset to Start
        </button>
      </div>

      <div className="solution-algorithm" aria-label="Full solution">
        {totalMoves > 0 ? formatAlgorithm(result.moves) : "No moves"}
      </div>

      {stageSummaries.length > 0 ? (
        <div className="stage-move-list" aria-label="Moves by stage">
          {stageSummaries.map((stage) => (
            <section className="stage-move-group" key={stage.stage}>
              <div className="stage-move-heading">
                <h3>{stage.label}</h3>
                <span>{stage.moves.length} moves</span>
              </div>
              {stage.moves.length > 0 ? (
                <div className="move-token-list">
                  {stage.moves.map((move, index) => {
                    const moveIndex = stage.startMove + index;

                    return (
                      <button
                        type="button"
                        className={`move-token${
                          currentMoveIndex === moveIndex ? " active" : ""
                        }${currentMoveIndex > moveIndex ? " completed" : ""}`}
                        key={`${stage.stage}-${moveIndex}`}
                        onClick={() => onJumpToMove(moveIndex)}
                      >
                        {move}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="stage-empty">No moves.</p>
              )}
              {!stage.success && stage.message ? (
                <p className="solution-error">{stage.message}</p>
              ) : null}
            </section>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function createStageSummaries(stages: SolverStageResult[]): StageSummary[] {
  let nextMove = 1;

  return stages.map((stage) => {
    const startMove = nextMove;
    const endMove = nextMove + stage.moves.length - 1;
    nextMove = endMove + 1;

    return {
      label: STAGE_LABELS[stage.stage],
      stage: stage.stage,
      moves: stage.moves,
      startMove,
      endMove,
      success: stage.success,
      message: stage.message,
    };
  });
}

function getCurrentStageLabel(
  stages: StageSummary[],
  currentMoveIndex: number,
  isSolved: boolean,
): string {
  if (currentMoveIndex === 0) {
    return isSolved && stages.every((stage) => stage.moves.length === 0)
      ? "Solved"
      : "Initial State";
  }

  const activeStage = stages.find(
    (stage) =>
      stage.moves.length > 0 &&
      currentMoveIndex >= stage.startMove &&
      currentMoveIndex <= stage.endMove,
  );

  return activeStage?.label ?? (isSolved ? "Solved" : "Stopped");
}
