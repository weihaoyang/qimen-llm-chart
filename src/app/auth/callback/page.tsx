import { ChartWorkbenchEntry } from "@/components/app-shell-entry";

// The registered callback delegates PKCE validation and session exchange to the workbench.
export const dynamic = "force-dynamic";

export default function OAuthCallbackPage() {
  return <ChartWorkbenchEntry />;
}
