import type { Metadata } from "next";
import "react-iztro/lib/theme/default.css";
import "react-iztro/lib/Iztrolabe/Iztrolabe.css";
import "react-iztro/lib/Izpalace/Izpalace.css";
import "react-iztro/lib/IzpalaceCenter/IzpalaceCenter.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "胜天半子",
  description: "胜天半子的命理三盘统一工作台，支持奇门、八字、紫微与 AI 分析。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
