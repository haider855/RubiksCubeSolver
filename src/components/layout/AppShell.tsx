import type { ReactNode } from "react";
import { Header } from "./Header.js";
import type { ThemeMode } from "./Header.js";

type AppShellProps = {
  children: ReactNode;
  onToggleTheme: () => void;
  themeMode: ThemeMode;
};

export function AppShell({
  children,
  onToggleTheme,
  themeMode,
}: AppShellProps) {
  return (
    <div className="app-shell" data-theme={themeMode}>
      <Header onToggleTheme={onToggleTheme} themeMode={themeMode} />
      {children}
    </div>
  );
}
