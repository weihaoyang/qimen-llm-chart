import { PlatformClient, type PlatformSession } from "@singularity-sequence/web-sdk";
import { requirePlatformClientConfig } from "@/lib/platform/config";

export const createPlatformClient = (options?: {
  accessToken?: string | null;
  csrfToken?: string | null;
  onUnauthorized?: () => void;
  getTraceId?: () => string | null;
}) => {
  const config = requirePlatformClientConfig();

  return new PlatformClient({
    baseUrl: config.baseUrl,
    getAccessToken: () => options?.accessToken ?? null,
    getCsrfToken: () => options?.csrfToken ?? null,
    getTraceId: options?.getTraceId,
    onUnauthorized: options?.onUnauthorized,
  });
};

export type PlatformIdentity = {
  session: PlatformSession;
  profile: {
    user_id: string;
    phone_number: string;
    display_name: string;
    locale: string;
    region_code: string;
  };
};
