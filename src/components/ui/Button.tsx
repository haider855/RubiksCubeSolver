import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  fullWidth?: boolean;
  variant?: ButtonVariant;
};

export function Button({
  children,
  className = "",
  fullWidth = false,
  variant = "secondary",
  ...props
}: ButtonProps) {
  const classes = [
    "button",
    `button-${variant}`,
    fullWidth ? "button-full" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button className={classes} type="button" {...props}>
      {children}
    </button>
  );
}
