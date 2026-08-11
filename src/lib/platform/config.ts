export type PlatformClientConfig = {
  baseUrl: string;
  productCode: string;
  accessScope: string;
  loginUrl?: string;
};

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "");

const readPublicPlatformEnv = (): Record<string, string | undefined> => ({
  NEXT_PUBLIC_PLATFORM_BASE_URL: process.env.NEXT_PUBLIC_PLATFORM_BASE_URL,
  NEXT_PUBLIC_PLATFORM_PRODUCT_CODE: process.env.NEXT_PUBLIC_PLATFORM_PRODUCT_CODE,
  NEXT_PUBLIC_PLATFORM_ACCESS_SCOPE: process.env.NEXT_PUBLIC_PLATFORM_ACCESS_SCOPE,
  NEXT_PUBLIC_PLATFORM_LOGIN_URL: process.env.NEXT_PUBLIC_PLATFORM_LOGIN_URL,
});

const readServerPlatformEnv = (): Record<string, string | undefined> => ({
  PLATFORM_BASE_URL: process.env.PLATFORM_BASE_URL,
  PLATFORM_PRODUCT_CODE: process.env.PLATFORM_PRODUCT_CODE,
  PLATFORM_ACCESS_SCOPE: process.env.PLATFORM_ACCESS_SCOPE,
  PLATFORM_LOGIN_URL: process.env.PLATFORM_LOGIN_URL,
  ...readPublicPlatformEnv(),
});

export const resolvePlatformClientConfig = (
  env: Record<string, string | undefined> = readPublicPlatformEnv(),
): PlatformClientConfig | null => {
  const baseUrl = env.NEXT_PUBLIC_PLATFORM_BASE_URL?.trim();
  const productCode = env.NEXT_PUBLIC_PLATFORM_PRODUCT_CODE?.trim();
  const accessScope = env.NEXT_PUBLIC_PLATFORM_ACCESS_SCOPE?.trim();

  if (!baseUrl || !productCode || !accessScope) {
    return null;
  }

  return {
    baseUrl: trimTrailingSlash(baseUrl),
    productCode,
    accessScope,
    loginUrl: env.NEXT_PUBLIC_PLATFORM_LOGIN_URL?.trim()
      ? trimTrailingSlash(env.NEXT_PUBLIC_PLATFORM_LOGIN_URL.trim())
      : undefined,
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
    loginUrl: env.PLATFORM_LOGIN_URL?.trim()
      ? trimTrailingSlash(env.PLATFORM_LOGIN_URL.trim())
      : env.NEXT_PUBLIC_PLATFORM_LOGIN_URL?.trim()
        ? trimTrailingSlash(env.NEXT_PUBLIC_PLATFORM_LOGIN_URL.trim())
        : undefined,
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

export const buildPlatformSocialLoginStartUrl = ({
  baseUrl,
  provider,
  redirectUrl,
}: {
  baseUrl: string;
  provider: "wechat" | "qq";
  redirectUrl: string;
}) => {
  const url = new URL(`/api/v1/identity/social/${provider}/start`, baseUrl);
  url.searchParams.set("redirect", redirectUrl);
  return url.toString();
};

export const buildPlatformUnifiedLoginUrl = ({
  baseUrl,
  loginUrl,
  productCode,
  accessScope,
  returnUrl,
}: {
  baseUrl: string;
  loginUrl?: string;
  productCode: string;
  accessScope: string;
  returnUrl: string;
}) => {
  const resolvedLoginUrl = loginUrl || "https://app.singseq.com/login";
  const url = new URL(
    resolvedLoginUrl,
    /^https?:\/\//i.test(resolvedLoginUrl) ? undefined : baseUrl,
  );
  url.searchParams.set("return_url", returnUrl);
  url.searchParams.set("redirect_url", returnUrl);
  url.searchParams.set("product_code", productCode);
  url.searchParams.set("access_scope", accessScope);
  return url.toString();
};

export const buildPlatformOAuthLoginUrl = ({
  baseUrl,
  loginUrl,
  clientId,
  productCode,
  accessScope,
  redirectUri,
  codeChallenge,
  state,
}: {
  baseUrl: string;
  loginUrl?: string;
  clientId: string;
  productCode: string;
  accessScope: string;
  redirectUri: string;
  codeChallenge: string;
  state: string;
}) => {
  const resolvedLoginUrl = loginUrl || "https://app.singseq.com/login";
  const url = new URL(
    resolvedLoginUrl,
    /^https?:\/\//i.test(resolvedLoginUrl) ? undefined : baseUrl,
  );
  url.searchParams.set("return_url", redirectUri);
  url.searchParams.set("redirect_url", redirectUri);
  url.searchParams.set("product_code", productCode);
  url.searchParams.set("access_scope", accessScope);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("code_challenge", codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("state", state);
  return url.toString();
};
