import type { HTMLAttributes } from "react";
import SemiCard from "@douyinfe/semi-ui/lib/es/card";

function Card({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <SemiCard bordered className={className} {...props}>
      {children}
    </SemiCard>
  );
}

function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={className} {...props} />;
}

function CardHeader(props: HTMLAttributes<HTMLDivElement>) { return <div {...props} />; }
function CardTitle(props: HTMLAttributes<HTMLDivElement>) { return <div {...props} />; }
function CardDescription(props: HTMLAttributes<HTMLDivElement>) { return <div {...props} />; }
function CardAction(props: HTMLAttributes<HTMLDivElement>) { return <div {...props} />; }
function CardFooter(props: HTMLAttributes<HTMLDivElement>) { return <div {...props} />; }

export { Card, CardHeader, CardFooter, CardTitle, CardAction, CardDescription, CardContent };
