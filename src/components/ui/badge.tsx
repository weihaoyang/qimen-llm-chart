import type { ComponentType, HTMLAttributes } from "react";
import Tag from "@douyinfe/semi-ui/lib/es/tag";
import type { TagColor } from "@douyinfe/semi-ui/lib/es/tag";

const TagCompat = Tag as unknown as ComponentType<Record<string, unknown>>;

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: "default" | "secondary" | "destructive" | "outline" | "ghost" | "link";
  asChild?: never;
};

function Badge({ className, variant = "default", children, ...props }: BadgeProps) {
  const color: TagColor = variant === "destructive" ? "red" : variant === "default" ? "orange" : "grey";
  const { color: _htmlColor, ...tagProps } = props;
  return (
    <TagCompat className={className} color={color} type="light" {...tagProps}>
      {children}
    </TagCompat>
  );
}

export { Badge };
