import type { PlatformSession } from "@singularity-sequence/web-sdk";

const PLATFORM_SESSION_STORAGE_KEY = "qmdj.platform.session.v1";

const canUseStorage = () => typeof window !== "undefined" && typeof window.localStorage !== "undefined";

export const loadPlatformSession = (): PlatformSession | null => {
  if (!canUseStorage()) {
    return null;
  }

  const raw = window.localStorage.getItem(PLATFORM_SESSION_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as PlatformSession;
  } catch {
    window.localStorage.removeItem(PLATFORM_SESSION_STORAGE_KEY);
    return null;
  }
};

export const savePlatformSession = (session: PlatformSession) => {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(PLATFORM_SESSION_STORAGE_KEY, JSON.stringify(session));
};

export const clearPlatformSession = () => {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.removeItem(PLATFORM_SESSION_STORAGE_KEY);
};

export const isPlatformSessionExpired = (session: PlatformSession) => {
  const expiresAt = Date.parse(session.expires_at_iso);
  return Number.isFinite(expiresAt) ? expiresAt <= Date.now() : true;
};

export const isPlatformRefreshExpired = (session: PlatformSession) => {
  const expiresAt = Date.parse(session.refresh_expires_at_iso);
  return Number.isFinite(expiresAt) ? expiresAt <= Date.now() : true;
};
