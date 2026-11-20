"use client";

export const AD_SMARTLINK = "https://asiafilm.org/4/a771342c35642ef4a403b79f54efa159";

// Anti-popup-blocker cooldown (10 seconds)
// This ensures modern browsers (Chrome, Safari, Edge, Firefox) treat each click as a
// valid single user gesture and do NOT trigger popup blockers or flag the domain.
let lastAdTriggerTime = 0;
const AD_COOLDOWN_MS = 10000;

export function triggerAdClick(force: boolean = false) {
  if (typeof window === "undefined") return;

  const now = Date.now();
  if (force || now - lastAdTriggerTime >= AD_COOLDOWN_MS) {
    lastAdTriggerTime = now;
    try {
      window.open(AD_SMARTLINK, "_blank", "noopener,noreferrer");
    } catch (e) {
      console.warn("[AD-TRIGGER] Popup blocked or failed:", e);
    }
  }
}
