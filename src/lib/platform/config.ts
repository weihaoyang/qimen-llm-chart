import productManifest from "../../../config/ai-product-manifest.json";

export type PlatformClientConfig = {
  baseUrl: string;
  productCode: string;
  accessScope: string;
  clientId?: string;
};
type PublicProductContract = {
  platform_api_origin: string;
  product_code: string;
  access_scope: string;
};

// Public identity and platform coordinates are product contract data, not
// deployment secrets. Keeping them in the manifest prevents a standalone
// build from losing OAuth/gate configuration when only server env is mounted.
const PUBLIC_PRODUCT_CONTRACT: PublicProductContract = {
  platform_api_origin: productManifest.platform_api_origin,
  product_code: productManifest.product_code,
  access_scope: productManifest.access_scope,
};

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "");

const readPublicPlatformEnv = (): Record<string, string | undefined> => ({
  NEXT_PUBLIC_PLATFORM_BASE_URL: process.env.NEXT_PUBLIC_PLATFORM_BASE_URL,
  NEXT_PUBLIC_PLATFORM_PRODUCT_CODE: process.env.NEXT_PUBLIC_PLATFORM_PRODUCT_CODE,
  NEXT_PUBLIC_PLATFORM_ACCESS_SCOPE: process.env.NEXT_PUBLIC_PLATFORM_ACCESS_SCOPE,
  NEXT_PUBLIC_PLATFORM_OAUTH_CLIENT_ID: process.env.NEXT_PUBLIC_PLATFORM_OAUTH_CLIENT_ID,
});

const readServerPlatformEnv = (): Record<string, string | undefined> => ({
  PLATFORM_BASE_URL: process.env.PLATFORM_BASE_URL,
  PLATFORM_PRODUCT_CODE: process.env.PLATFORM_PRODUCT_CODE,
  PLATFORM_ACCESS_SCOPE: process.env.PLATFORM_ACCESS_SCOPE,
  PLATFORM_OAUTH_CLIENT_ID: process.env.PLATFORM_OAUTH_CLIENT_ID,
  ...readPublicPlatformEnv(),
});

export const resolvePlatformClientConfig = (
  env: Record<string, string | undefined> = readPublicPlatformEnv(),
): PlatformClientConfig | null => {
  const baseUrl = env.NEXT_PUBLIC_PLATFORM_BASE_URL?.trim() || PUBLIC_PRODUCT_CONTRACT.platform_api_origin;
  const productCode = env.NEXT_PUBLIC_PLATFORM_PRODUCT_CODE?.trim() || PUBLIC_PRODUCT_CONTRACT.product_code;
  const accessScope = env.NEXT_PUBLIC_PLATFORM_ACCESS_SCOPE?.trim() || PUBLIC_PRODUCT_CONTRACT.access_scope;

  if (!baseUrl || !productCode || !accessScope) {
    return null;
  }

  return {
    baseUrl: trimTrailingSlash(baseUrl),
    productCode,
    accessScope,
    clientId: env.NEXT_PUBLIC_PLATFORM_OAUTH_CLIENT_ID?.trim() || undefined,
  };
};

export const requirePlatformClientConfig = (
  env: Record<string, string | undefined> = readPublicPlatformEnv(),
): PlatformClientConfig => {
  const config = resolvePlatformClientConfig(env);

  if (!config) {
    throw new Error(
      "缺少平台接入配置，请设置 NEXT_PUBLIC_PLATFORM_BASE_URL、NEXT_PUBLIC_PLATFORM_PRODUCT_CODE、NEXT_PUBLIC_PLATFORM_ACCESS_SCOPE。",
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
  const accessScope =
    env.PLATFORM_ACCESS_SCOPE?.trim() ?? env.NEXT_PUBLIC_PLATFORM_ACCESS_SCOPE?.trim();

  if (!baseUrl || !productCode || !accessScope) {
    return null;
  }

  return {
    baseUrl: trimTrailingSlash(baseUrl),
    productCode,
    accessScope,
    clientId: env.PLATFORM_OAUTH_CLIENT_ID?.trim() || env.NEXT_PUBLIC_PLATFORM_OAUTH_CLIENT_ID?.trim() || undefined,
  };
};

export const requirePlatformServerConfig = (
  env: Record<string, string | undefined> = readServerPlatformEnv(),
): PlatformClientConfig => {
  const config = resolvePlatformServerConfig(env);

  if (!config) {
    throw new Error(
      "缺少平台服务端配置，请设置 PLATFORM_BASE_URL / PLATFORM_PRODUCT_CODE / PLATFORM_ACCESS_SCOPE，或对应 NEXT_PUBLIC_ 变量。",
    );
  }

  return config;
};
