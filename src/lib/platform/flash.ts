const PLATFORM_FLASH_STORAGE_KEY = "qmdj.platform.flash.v1";

const canUseStorage = () =>
  typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";

export type PlatformFlashMessage = {
  type: "info" | "success" | "warning" | "error";
  text: string;
};

export const savePlatformFlashMessage = (value: PlatformFlashMessage) => {
  if (!canUseStorage()) {
    return;
  }

  window.sessionStorage.setItem(PLATFORM_FLASH_STORAGE_KEY, JSON.stringify(value));
};

export const popPlatformFlashMessage = (): PlatformFlashMessage | null => {
  if (!canUseStorage()) {
    return null;
  }

  const raw = window.sessionStorage.getItem(PLATFORM_FLASH_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  window.sessionStorage.removeItem(PLATFORM_FLASH_STORAGE_KEY);

  try {
    const parsed = JSON.parse(raw) as Partial<PlatformFlashMessage>;
    if (
      (parsed.type === "info" ||
        parsed.type === "success" ||
        parsed.type === "warning" ||
        parsed.type === "error") &&
      typeof parsed.text === "string" &&
      parsed.text.trim()
    ) {
      return {
        type: parsed.type,
        text: parsed.text.trim(),
      };
    }
  } catch {
    return null;
  }

  return null;
};
