(() => {
  "use strict";

  const battleIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const params = new URLSearchParams(window.location.search);
  const battleId = params.get("battleId") || "";
  const readOnly = params.get("readOnly") === "1";
  if (!battleIdPattern.test(battleId)) return;

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
