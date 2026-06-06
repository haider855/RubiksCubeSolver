export type ThemeMode = "light" | "dark";

type HeaderProps = {
  onToggleTheme: () => void;
  themeMode: ThemeMode;
};

export function Header({ onToggleTheme, themeMode }: HeaderProps) {
  return (
    <header className="site-header">
      <a className="brand" href="#solver" aria-label="Cube Solver home">
        <span className="brand-mark" aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
        </span>
        <span>Cube Solver</span>
      </a>

      <nav className="site-nav" aria-label="Primary navigation">
        <a className="active" href="#solver">
          Solver
        </a>
      </nav>

      <button
        className="theme-toggle"
        type="button"
        aria-label={`Switch to ${themeMode === "dark" ? "light" : "dark"} theme`}
        onClick={onToggleTheme}
      >
        {themeMode === "dark" ? "Light" : "Dark"}
      </button>
    </header>
  );
}
