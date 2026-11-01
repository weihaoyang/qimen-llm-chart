import { createPlatformClient as createSdkClient } from "@singseq/platform-sdk";
import type { PlatformProfile, PlatformSession } from "./types";
import { requirePlatformClientConfig } from "@/lib/platform/config";

type ClientOptions = {
  accessToken?: string | null;
};

const buildOptions = (options?: ClientOptions) => {
  const config = requirePlatformClientConfig();
  return { baseUrl: config.baseUrl, accessToken: options?.accessToken ?? "" };
};

/** The only client available to ordinary qmdj product code. */
export const createProductPlatformClient = (options?: ClientOptions) => {
  const built = buildOptions(options);
  return createSdkClient({ baseUrl: built.baseUrl, auth: { type: "bearer", token: () => built.accessToken } });
};

export type PlatformIdentity = {
  session: PlatformSession;
  profile: PlatformProfile;
};
