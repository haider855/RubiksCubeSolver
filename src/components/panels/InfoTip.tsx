import type { ReactNode } from "react";

type InfoTipProps = {
  children: ReactNode;
};

export function InfoTip({ children }: InfoTipProps) {
  return <p className="info-tip">{children}</p>;
}
