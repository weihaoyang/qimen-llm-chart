import type { ButtonHTMLAttributes } from "react";
import SemiButton from "@douyinfe/semi-ui/lib/es/button";

type ButtonVariant = "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
type ButtonSize = "default" | "xs" | "sm" | "lg" | "icon" | "icon-xs" | "icon-sm" | "icon-lg";

type ButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type"> & {
  type?: ButtonHTMLAttributes<HTMLButtonElement>["type"];
  variant?: ButtonVariant;
  size?: ButtonSize;
  asChild?: never;
};

const variantToSemiType: Record<ButtonVariant, "primary" | "danger" | "secondary" | "tertiary"> = {
  default: "primary",
  destructive: "danger",
  outline: "secondary",
  secondary: "secondary",
  ghost: "tertiary",
  link: "tertiary",
};

const sizeToSemiSize: Record<ButtonSize, "small" | "default" | "large"> = {
  default: "default",
  xs: "small",
  sm: "small",
  lg: "large",
  icon: "default",
  "icon-xs": "small",
  "icon-sm": "small",
  "icon-lg": "large",
};

function Button({ className, variant = "default", size = "default", type, ...props }: ButtonProps) {
  return (
    <SemiButton
      className={className}
      htmlType={type ?? "button"}
      size={sizeToSemiSize[size]}
      type={variantToSemiType[variant]}
      {...props}
    />
  );
}

export { Button };
