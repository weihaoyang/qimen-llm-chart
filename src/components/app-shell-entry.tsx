import { AppShell } from "@/components/app-shell";
import { requirePlatformServerConfig } from "@/lib/platform/config";

const getPublicPlatformConfig = () => {
  const config = requirePlatformServerConfig(process.env);
  return {
    baseUrl: config.baseUrl,
    productCode: config.productCode,
    accessScope: config.accessScope,
    loginUrl: config.loginUrl,
  };
};

export function ChartWorkbenchEntry() {
  return <AppShell platformConfig={getPublicPlatformConfig()} />;
}
