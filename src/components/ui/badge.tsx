import type { ComponentType, HTMLAttributes } from "react";
import Tag from "@douyinfe/semi-ui/lib/es/tag";
import type { TagColor } from "@douyinfe/semi-ui/lib/es/tag";

const TagCompat = Tag as unknown as ComponentType<Record<string, unknown>>;

type BadgeProps = Omit<HTMLAttributes<HTMLSpanElement>, "color"> & {
  variant?: "default" | "secondary" | "destructive" | "outline" | "ghost" | "link";
  asChild?: never;
};

function Badge({ className, variant = "default", children, ...props }: BadgeProps) {
  const color: TagColor = variant === "destructive" ? "red" : variant === "default" ? "orange" : "grey";
  return (
    <TagCompat className={className} color={color} type="light" {...props}>
      {children}
    </TagCompat>
  );
}

export { Badge };
