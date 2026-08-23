import { ChartWorkbenchEntry } from "@/components/app-shell-entry";

// The workbench HTML carries build-specific chunk references. Keep the document
// revalidated so a deployment can never leave browsers or shared proxies pinned
// to an older shell while the hashed assets have already changed.
export const dynamic = "force-dynamic";

export const metadata = {
  title: "知几 · 术数排盘工作台",
  description: "知几：奇门遁甲、八字、紫微斗数与三式研究的专业排盘工具。",
};

export default function ChartWorkbenchPage() {
  return <ChartWorkbenchEntry />;
}
