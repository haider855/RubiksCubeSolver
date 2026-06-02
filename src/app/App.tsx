export default function App() {
  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">From-scratch 3x3 solver</p>
          <h1>Rubik's Cube Solver</h1>
        </div>
        <button type="button" disabled>
          Solve
        </button>
      </header>

      <div className="workspace-grid">
        <section className="cube-workspace" aria-labelledby="cube-input-title">
          <div className="panel-header">
            <h2 id="cube-input-title">Cube Input</h2>
            <span>0 / 54 stickers set</span>
          </div>
          <div className="cube-net-placeholder" aria-hidden="true">
            <div className="face face-up" />
            <div className="face face-left" />
            <div className="face face-front" />
            <div className="face face-right" />
            <div className="face face-back" />
            <div className="face face-down" />
          </div>
        </section>

        <aside className="side-panels" aria-label="Solver status">
          <section className="status-panel" aria-labelledby="validation-title">
            <h2 id="validation-title">Validation</h2>
            <p>Waiting for cube input.</p>
          </section>

          <section className="status-panel" aria-labelledby="solution-title">
            <h2 id="solution-title">Solution</h2>
            <p>No solution generated.</p>
          </section>
        </aside>
      </div>
    </main>
  );
}
