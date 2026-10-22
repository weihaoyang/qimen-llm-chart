import { ChartWorkbenchEntry } from "@/components/app-shell-entry";

// Keep the path callback available during the platform's hash-to-path
// transition. The client workbench owns PKCE validation and session exchange.
export const dynamic = "force-dynamic";

export default function OAuthCallbackPage() {
  return <ChartWorkbenchEntry />;
}
