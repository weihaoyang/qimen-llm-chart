import { PlatformClient, ProductPlatformClient, type PlatformSession } from "@singularity-sequence/web-sdk";
import { requirePlatformClientConfig } from "@/lib/platform/config";

type ClientOptions = {
  accessToken?: string | null;
  csrfToken?: string | null;
  onUnauthorized?: () => void;
  getTraceId?: () => string | null;
};

const buildOptions = (options?: ClientOptions) => {
  const config = requirePlatformClientConfig();
  return {
    baseUrl: config.baseUrl,
    getAccessToken: () => options?.accessToken ?? null,
    getCsrfToken: () => options?.csrfToken ?? null,
    getTraceId: options?.getTraceId,
    onUnauthorized: options?.onUnauthorized,
  };
};

/** The only client available to ordinary qmdj product code. */
export const createProductPlatformClient = (options?: ClientOptions) => {
  return new ProductPlatformClient(buildOptions(options));
};

/** Admin operations stay isolated from the product-facing client surface. */
export const createPlatformAdminClient = (options?: ClientOptions) => {
  return new PlatformClient(buildOptions(options));
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
