/** Platform detection for presentation-only tweaks (macOS window chrome). */
export const isMac: boolean =
  typeof navigator !== "undefined" &&
  /Mac|iPhone|iPad|iPod/i.test(
    (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData?.platform ||
      navigator.platform ||
      navigator.userAgent,
  );

/** Adds `is-mac` to <html>. In dev, `?mac` forces it so the layout can be previewed anywhere. */
export function applyPlatformClass(): boolean {
  const forced = import.meta.env.DEV && new URLSearchParams(window.location.search).has("mac");
  const mac = isMac || forced;
  if (mac) document.documentElement.classList.add("is-mac");
  return mac;
}
