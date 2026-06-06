import type { Dispatch } from "react";
import { Button } from "../ui/Button.js";
import { Card } from "../ui/Card.js";
import { Divider } from "../ui/Divider.js";
import type { CubeAction } from "../../state/cubeTypes.js";
import { MOVE_DESCRIPTIONS } from "../../state/solutionMock.js";
import type { Move } from "../../cube/index.js";
import type { FullSolverResult } from "../../solver/index.js";

type SolutionPanelProps = {
  currentMoveIndex: number;
  dispatch: Dispatch<CubeAction>;
  isSolving: boolean;
  onSolve: () => void;
  solverResult: FullSolverResult | null;
  validationIsValid: boolean;
};

export function SolutionPanel({
  currentMoveIndex,
  dispatch,
  isSolving,
  onSolve,
  solverResult,
  validationIsValid,
}: SolutionPanelProps) {
  const moves = solverResult?.moves ?? [];
  const hasSteps = moves.length > 0;
  const currentMove = currentMoveIndex > 0 ? moves[currentMoveIndex - 1] : null;
  const description = currentMove
    ? MOVE_DESCRIPTIONS[currentMove] ?? "Move the cube according to this notation."
    : solverResult?.success
      ? "Start at the entered cube state, then step through the solution."
      : "No moves yet.";
  const solveDisabled = isSolving || !validationIsValid;
  const statusText = isSolving
    ? "Solving"
    : solverResult?.success
      ? "Solved"
      : solverResult?.error
        ? "Failed"
        : "Ready";

  return (
    <Card className="side-panel solution-panel">
      <div className="section-kicker">2. Get Solution</div>
      <div className="panel-title-row">
        <h2>Generate steps</h2>
        <span className="panel-status" data-status={statusText.toLowerCase()}>
          {statusText}
        </span>
      </div>
      <Button
        fullWidth
        variant="primary"
        disabled={solveDisabled}
        onClick={onSolve}
      >
        {isSolving ? "Solving..." : "Solve Cube"}
      </Button>
      {!validationIsValid ? (
        <p className="panel-note">Fix validation issues before solving.</p>
      ) : null}

      <Divider />

      <div className="section-kicker">3. Solution Steps</div>
      <div className="step-controls">
        <Button
          aria-label="Previous move"
          disabled={!hasSteps || currentMoveIndex === 0}
          onClick={() => dispatch({ type: "PREVIOUS_MOVE" })}
        >
          {"<"}
        </Button>
        <span className="step-count">
          {hasSteps ? `${currentMoveIndex} / ${moves.length}` : "0 / -"}
        </span>
        <Button
          aria-label="Next move"
          disabled={!hasSteps || currentMoveIndex === moves.length}
          onClick={() => dispatch({ type: "NEXT_MOVE" })}
        >
          {">"}
        </Button>
      </div>

      <div className="move-display" data-empty={!hasSteps && !solverResult?.error}>
        <span className="move-label">Current Move</span>
        <strong>{currentMove ?? "-"}</strong>
        <p>{solverResult?.error ?? description}</p>
      </div>

      {solverResult?.success ? (
        <MoveList
          currentMoveIndex={currentMoveIndex}
          dispatch={dispatch}
          moves={moves}
        />
      ) : null}

      <Button fullWidth onClick={() => dispatch({ type: "RESET_STEPS" })}>
        Reset Steps
      </Button>
    </Card>
  );
}

type MoveListProps = {
  currentMoveIndex: number;
  dispatch: Dispatch<CubeAction>;
  moves: Move[];
};

function MoveList({ currentMoveIndex, dispatch, moves }: MoveListProps) {
  return (
    <div className="compact-move-list" aria-label="Solution moves">
      {moves.map((move, index) => (
        <button
          key={`${move}-${index}`}
          type="button"
          className="compact-move-token"
          data-active={currentMoveIndex === index + 1}
          data-completed={currentMoveIndex > index + 1}
          onClick={() => dispatch({ type: "JUMP_TO_MOVE", index: index + 1 })}
        >
          {move}
        </button>
      ))}
    </div>
  );
}
