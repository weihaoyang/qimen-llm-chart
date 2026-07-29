"use client";

import dynamic from "next/dynamic";

const AppShell = dynamic(
  () => import("@/components/app-shell").then((module) => module.AppShell),
  {
    ssr: false,
    loading: () => <div className="empty-panel">工作台加载中。</div>,
  },
);

export function AppShellEntry() {
  return <AppShell />;
}
