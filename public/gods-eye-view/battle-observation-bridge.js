(() => {
  "use strict";

  const battleIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const params = new URLSearchParams(window.location.search);
  const battleId = params.get("battleId") || "";
  const readOnly = params.get("readOnly") === "1";
  if (!battleIdPattern.test(battleId)) return;

  const CALIBRATION_KEY = "godsEyeView.cctv.calibration.v2";
  const CALIBRATION_HYDRATED_KEY = `qmdj.gev.calibration-hydrated:${battleId}`;
  let hydratingCalibration = false;
  let lastCalibration = {};

  function id() {
    return globalThis.crypto?.randomUUID?.() || `world-pulse-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }

  function getMapSnapshot() {
    const app = window.__godsEyeView;
    const viewer = app?.viewer;
    if (!viewer?.camera?.positionCartographic || !window.Cesium) throw new Error("地图仍在初始化，请稍候再保存。");
    const cartographic = viewer.camera.positionCartographic;
    const toDegrees = window.Cesium.Math.toDegrees;
    const latitude = Number(toDegrees(cartographic.latitude).toFixed(6));
    const longitude = Number(toDegrees(cartographic.longitude).toFixed(6));
    const height = Math.round(cartographic.height);
    const enabledLayers = [...(app?.dataManager?.layers || new Map()).entries()]
      .filter(([, value]) => value?.enabled)
      .map(([layerId, value]) => ({ layerId, lifecycle: value.lifecycleState || "enabled" }))
      .slice(0, 40);
    const observedAt = new Date().toISOString();
    return {
      observationKey: `viewport:${observedAt}:${latitude}:${longitude}:${height}`,
      observedAt,
      location: {
        latitude,
        longitude,
        heightMeters: height,
        headingDegrees: Number(toDegrees(viewer.camera.heading).toFixed(2)),
        pitchDegrees: Number(toDegrees(viewer.camera.pitch).toFixed(2)),
        rollDegrees: Number(toDegrees(viewer.camera.roll).toFixed(2)),
      },
      snapshot: {
        mapStack: app?.mapStackController?.currentStack || null,
        enabledLayers,
        capturedBy: "user_confirmed_viewport",
      },
      title: `世界脉冲视角 · ${latitude.toFixed(3)}°, ${longitude.toFixed(3)}°`,
    };
  }

  function readCalibrationStore() {
    try {
      const value = JSON.parse(window.localStorage.getItem(CALIBRATION_KEY) || "{}");
      return value && typeof value === "object" ? value : {};
    } catch { return {}; }
  }

  function calibrationKey(cameraId, values) {
    return `calibration:${cameraId}:${Object.keys(values).sort().map((key) => `${key}=${values[key]}`).join(",")}`.slice(0, 160);
  }

  async function hydrateCalibrations() {
    if (sessionStorage.getItem(CALIBRATION_HYDRATED_KEY) === "1") return;
    try {
      const response = await fetch(`/api/battles/${battleId}/world-pulse/calibrations`, { credentials: "include", cache: "no-store" });
      if (!response.ok) return;
      const payload = await response.json();
      const remote = {};
      for (const item of (Array.isArray(payload.calibrations) ? payload.calibrations : [])) {
        if (item?.cameraId && item?.values && typeof item.values === "object") remote[item.cameraId] = { values: item.values, source: "manual", savedAt: Date.parse(item.savedAt) || Date.now() };
      }
      const current = readCalibrationStore();
      if (JSON.stringify(current) === JSON.stringify(remote)) {
        sessionStorage.setItem(CALIBRATION_HYDRATED_KEY, "1");
        return;
      }
      hydratingCalibration = true;
      window.localStorage.setItem(CALIBRATION_KEY, JSON.stringify(remote));
      lastCalibration = remote;
      sessionStorage.setItem(CALIBRATION_HYDRATED_KEY, "1");
      hydratingCalibration = false;
      window.location.reload();
    } catch { /* map remains usable when the battle API is unavailable */ }
  }

  function installCalibrationPersistence() {
    if (readOnly || window.__qmdjCalibrationBridgeInstalled) return;
    window.__qmdjCalibrationBridgeInstalled = true;
    lastCalibration = readCalibrationStore();
    const originalSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      originalSetItem.call(this, key, value);
      if (this !== window.localStorage || key !== CALIBRATION_KEY || hydratingCalibration) return;
      let next = {};
      try { next = JSON.parse(value); } catch { return; }
      const previous = lastCalibration;
      lastCalibration = next && typeof next === "object" ? next : {};
      for (const [cameraId, entry] of Object.entries(lastCalibration)) {
        const values = entry?.values;
        if (!values || JSON.stringify(values) === JSON.stringify(previous[cameraId]?.values)) continue;
        const idempotencyKey = calibrationKey(cameraId, values);
        void fetch(`/api/battles/${battleId}/world-pulse/calibrations`, {
          method: "PUT", credentials: "include", headers: { "content-type": "application/json", "idempotency-key": idempotencyKey },
          body: JSON.stringify({ cameraId, values, idempotencyKey }),
        }).catch(() => undefined);
      }
      for (const cameraId of Object.keys(previous)) {
        if (Object.prototype.hasOwnProperty.call(lastCalibration, cameraId)) continue;
        void fetch(`/api/battles/${battleId}/world-pulse/calibrations?cameraId=${encodeURIComponent(cameraId)}`, { method: "DELETE", credentials: "include" }).catch(() => undefined);
      }
    };
  }

  function mount() {
    if (document.getElementById("battle-observation-dock")) return;
    const dock = document.createElement("aside");
    dock.id = "battle-observation-dock";
    dock.setAttribute("aria-label", "战局观察记录");
    dock.innerHTML = `<strong>战局观察</strong><span data-status>仅在你点击保存时记录当前视角和已启用图层。</span><button type="button" ${readOnly ? "disabled" : ""}>${readOnly ? "只读战局" : "保存当前视角"}</button>`;
    const style = document.createElement("style");
    style.textContent = `#battle-observation-dock{position:fixed;right:16px;bottom:84px;z-index:10001;display:grid;gap:7px;max-width:230px;padding:10px 12px;border:1px solid rgba(88,233,255,.52);border-radius:9px;background:rgba(4,16,29,.9);box-shadow:0 8px 25px rgba(0,0,0,.45);font:11px/1.35 Inter,system-ui,sans-serif;color:#c7f7ff}#battle-observation-dock strong{font:600 12px/1.2 'JetBrains Mono',monospace;letter-spacing:.08em;color:#64e9ff}#battle-observation-dock span{color:#a4bec8}#battle-observation-dock button{border:1px solid #41d9ef;border-radius:5px;padding:7px 9px;background:#06394b;color:#dbfbff;font:600 11px 'JetBrains Mono',monospace;cursor:pointer}#battle-observation-dock button:disabled{opacity:.55;cursor:not-allowed}`;
    document.head.appendChild(style);
    document.body.appendChild(dock);
    installCalibrationPersistence();
    void hydrateCalibrations();
    const button = dock.querySelector("button");
    const status = dock.querySelector("[data-status]");
    if (readOnly || !button || !status) return;
    fetch(`/api/battles/${battleId}/world-pulse/observations`, { credentials: "include", headers: { accept: "application/json" }, cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((payload) => {
        if (payload && Array.isArray(payload.observations) && payload.observations.length) {
          status.textContent = `已恢复 ${payload.observations.length} 条观察记录；可继续保存当前视角。`;
        }
      })
      .catch(() => { /* loading the map remains usable when the battle API is unavailable */ });
    button.addEventListener("click", async () => {
      button.disabled = true;
      status.textContent = "正在保存当前视角…";
      try {
        const view = getMapSnapshot();
        const idempotencyKey = id();
        const response = await fetch(`/api/battles/${battleId}/world-pulse/observations`, {
          method: "POST",
          credentials: "include",
          headers: { "content-type": "application/json", "idempotency-key": idempotencyKey },
          body: JSON.stringify({ source: "gods-eye-view", observationType: "viewport", idempotencyKey, ...view }),
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload?.error || `HTTP ${response.status}`);
        status.textContent = "已保存到当前战局；刷新或换设备后仍可恢复。";
      } catch (error) {
        status.textContent = error?.message || "保存失败，请检查战局权限后重试。";
      } finally {
        button.disabled = false;
      }
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount, { once: true });
  else mount();
})();
