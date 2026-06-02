import type { ValidationResult } from "../validation/index.js";

type ValidationPanelProps = {
  result: ValidationResult;
};

export function ValidationPanel({ result }: ValidationPanelProps) {
  return (
    <section
      className={`tool-panel validation-panel ${result.isValid ? "valid" : "invalid"}`}
      aria-labelledby="validation-title"
    >
      <div className="panel-header compact">
        <h2 id="validation-title">Validation</h2>
        <span>{result.isValid ? "Valid" : "Invalid"}</span>
      </div>

      {result.isValid ? (
        <p>Basic validation passed.</p>
      ) : (
        <ul className="issue-list">
          {result.issues.map((issue) => (
            <li key={`${issue.code}-${issue.message}`}>{issue.message}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
