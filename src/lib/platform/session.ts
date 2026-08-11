import type { PlatformSession } from "@singularity-sequence/web-sdk";

const PLATFORM_SESSION_STORAGE_KEY = "qmdj.platform.session.v1";

type StoredPlatformSession = Omit<PlatformSession, "access_token" | "refresh_token">;

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
    const parsed = JSON.parse(raw) as Partial<PlatformSession> & StoredPlatformSession;
    if (!parsed.user_id || !parsed.expires_at_iso || !parsed.refresh_expires_at_iso) {
      window.localStorage.removeItem(PLATFORM_SESSION_STORAGE_KEY);
      return null;
    }
    const safeSession: PlatformSession = {
      access_token: "",
      refresh_token: "",
      csrf_token: typeof parsed.csrf_token === "string" ? parsed.csrf_token : "",
      expires_at_iso: parsed.expires_at_iso,
      refresh_expires_at_iso: parsed.refresh_expires_at_iso,
      user_id: parsed.user_id,
      phone_number: parsed.phone_number ?? "",
      current_subject_type: parsed.current_subject_type ?? "user",
      current_subject_id: parsed.current_subject_id ?? parsed.user_id,
    };
    // Replace any legacy token-bearing record immediately on read.
    window.localStorage.setItem(PLATFORM_SESSION_STORAGE_KEY, JSON.stringify({
      csrf_token: safeSession.csrf_token,
      expires_at_iso: safeSession.expires_at_iso,
      refresh_expires_at_iso: safeSession.refresh_expires_at_iso,
      user_id: safeSession.user_id,
      phone_number: safeSession.phone_number,
      current_subject_type: safeSession.current_subject_type,
      current_subject_id: safeSession.current_subject_id,
    }));
    return safeSession;
  } catch {
    window.localStorage.removeItem(PLATFORM_SESSION_STORAGE_KEY);
    return null;
  }
};

export const savePlatformSession = (session: PlatformSession) => {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(PLATFORM_SESSION_STORAGE_KEY, JSON.stringify({
    csrf_token: session.csrf_token,
    expires_at_iso: session.expires_at_iso,
    refresh_expires_at_iso: session.refresh_expires_at_iso,
    user_id: session.user_id,
    phone_number: session.phone_number,
    current_subject_type: session.current_subject_type,
    current_subject_id: session.current_subject_id,
  }));
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
