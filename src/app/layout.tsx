import type { Metadata, Viewport } from "next";
import "react-iztro/lib/theme/default.css";
import "react-iztro/lib/Iztrolabe/Iztrolabe.css";
import "react-iztro/lib/Izpalace/Izpalace.css";
import "react-iztro/lib/IzpalaceCenter/IzpalaceCenter.css";
import "@douyinfe/semi-ui/lib/es/_base/base.css";
import "./globals.css";
import "./paipan/paipan.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://shengtian.singseq.com"),
  title: "胜天半子",
  description: "世界线观测工作台：以奇门、八字、紫微与序列排盘观测命运，在收束之前重构选择。",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "胜天半子",
    description: "世界线观测工作台：以奇门、八字、紫微与序列排盘观测命运，在收束之前重构选择。",
    url: "/",
    siteName: "胜天半子",
    locale: "zh_CN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "胜天半子",
    description: "世界线观测工作台：以奇门、八字、紫微与序列排盘观测命运，在收束之前重构选择。",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

// Without this declaration mobile browsers use a desktop layout viewport and
// shrink the whole workbench. Responsive breakpoints must operate on the real
// device width so the chart switches to its compact canvas before hydration.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
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
