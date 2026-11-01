import productManifest from "../../../config/ai-product-manifest.json";

export type PlatformClientConfig = {
  baseUrl: string;
  productCode: string;
  clientId?: string;
};
type PublicProductContract = {
  platform_api_origin: string;
  product_code: string;
  oauth_client_id: string;
};

// Public identity and platform coordinates are product contract data, not
// deployment secrets. Keeping them in the manifest prevents a standalone
// build from losing OAuth/gate configuration when only server env is mounted.
const PUBLIC_PRODUCT_CONTRACT: PublicProductContract = {
  platform_api_origin: productManifest.platform_api_origin,
  product_code: productManifest.product_code,
  oauth_client_id: productManifest.oauth_client_id,
};

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "");

const readPublicPlatformEnv = (): Record<string, string | undefined> => ({
  NEXT_PUBLIC_PLATFORM_BASE_URL: process.env.NEXT_PUBLIC_PLATFORM_BASE_URL,
  NEXT_PUBLIC_PLATFORM_PRODUCT_CODE: process.env.NEXT_PUBLIC_PLATFORM_PRODUCT_CODE,
  NEXT_PUBLIC_PLATFORM_OAUTH_CLIENT_ID: process.env.NEXT_PUBLIC_PLATFORM_OAUTH_CLIENT_ID,
});

const readServerPlatformEnv = (): Record<string, string | undefined> => ({
  PLATFORM_BASE_URL: process.env.PLATFORM_BASE_URL,
  PLATFORM_PRODUCT_CODE: process.env.PLATFORM_PRODUCT_CODE,
  PLATFORM_OAUTH_CLIENT_ID: process.env.PLATFORM_OAUTH_CLIENT_ID,
  ...readPublicPlatformEnv(),
});

export const resolvePlatformClientConfig = (
  env: Record<string, string | undefined> = readPublicPlatformEnv(),
): PlatformClientConfig | null => {
  const baseUrl = env.NEXT_PUBLIC_PLATFORM_BASE_URL?.trim() || PUBLIC_PRODUCT_CONTRACT.platform_api_origin;
  const productCode = env.NEXT_PUBLIC_PLATFORM_PRODUCT_CODE?.trim() || PUBLIC_PRODUCT_CONTRACT.product_code;

  if (!baseUrl || !productCode) {
    return null;
  }

  return {
    baseUrl: trimTrailingSlash(baseUrl),
    productCode,
    clientId: env.NEXT_PUBLIC_PLATFORM_OAUTH_CLIENT_ID?.trim() || PUBLIC_PRODUCT_CONTRACT.oauth_client_id,
  };
};

export const requirePlatformClientConfig = (
  env: Record<string, string | undefined> = readPublicPlatformEnv(),
): PlatformClientConfig => {
  const config = resolvePlatformClientConfig(env);

  if (!config) {
    throw new Error(
      "缺少平台接入配置，请设置 NEXT_PUBLIC_PLATFORM_BASE_URL、NEXT_PUBLIC_PLATFORM_PRODUCT_CODE。",
    );
  }

  return config;
};

export const resolvePlatformServerConfig = (
  env: Record<string, string | undefined> = readServerPlatformEnv(),
): PlatformClientConfig | null => {
  const baseUrl =
    env.PLATFORM_BASE_URL?.trim() ?? env.NEXT_PUBLIC_PLATFORM_BASE_URL?.trim();
  const productCode =
    env.PLATFORM_PRODUCT_CODE?.trim() ?? env.NEXT_PUBLIC_PLATFORM_PRODUCT_CODE?.trim();

  if (!baseUrl || !productCode) {
    return null;
  }

  return {
    baseUrl: trimTrailingSlash(baseUrl),
    productCode,
    clientId: env.PLATFORM_OAUTH_CLIENT_ID?.trim() || env.NEXT_PUBLIC_PLATFORM_OAUTH_CLIENT_ID?.trim() || PUBLIC_PRODUCT_CONTRACT.oauth_client_id,
  };
};

export const requirePlatformServerConfig = (
  env: Record<string, string | undefined> = readServerPlatformEnv(),
): PlatformClientConfig => {
  const config = resolvePlatformServerConfig(env);

  if (!config) {
    throw new Error(
      "缺少平台服务端配置，请设置 PLATFORM_BASE_URL / PLATFORM_PRODUCT_CODE，或对应 NEXT_PUBLIC_ 变量。",
    );
  }

  return config;
};
