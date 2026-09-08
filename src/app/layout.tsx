import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  metadataBase: new URL("https://qmdj.singseq.com"),
  title: "知几 · 术数排盘工作台",
  description: "知几：奇门遁甲、八字、紫微斗数与三式研究的专业排盘工具。",
  alternates: {
    canonical: "/paipan",
  },
  openGraph: {
    title: "知几 · 术数排盘工作台",
    description: "知几：奇门遁甲、八字、紫微斗数与三式研究的专业排盘工具。",
    url: "/paipan",
    siteName: "知几",
    locale: "zh_CN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "知几 · 术数排盘工作台",
    description: "知几：奇门遁甲、八字、紫微斗数与三式研究的专业排盘工具。",
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
