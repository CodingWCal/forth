// Keyboard navigation for the WAI-ARIA Tabs pattern.
//
// Kept as a pure function so the focus-movement contract is unit-testable
// without a DOM. The Realm Map project switcher (components/forth-app.tsx)
// owns the roving `tabIndex` and the actual focus calls; this module only
// answers "given a key, which tab should receive focus next?".
//
// Reference: https://www.w3.org/WAI/ARIA/apg/patterns/tabs/

export type TabNavigationKey =
  | "ArrowRight"
  | "ArrowLeft"
  | "Home"
  | "End";

const NAVIGATION_KEYS: ReadonlySet<string> = new Set<TabNavigationKey>([
  "ArrowRight",
  "ArrowLeft",
  "Home",
  "End",
]);

export function isTabNavigationKey(key: string): key is TabNavigationKey {
  return NAVIGATION_KEYS.has(key);
}

/**
 * Resolve the index of the tab that should receive focus after a key press,
 * following the horizontal Tabs pattern with wraparound.
 *
 * Returns `null` when the key is not a navigation key or when there is
 * nothing to focus, so the caller can leave the event untouched.
 */
export function resolveTabNavigation(
  key: string,
  currentIndex: number,
  count: number,
): number | null {
  if (count <= 0) return null;
  if (!isTabNavigationKey(key)) return null;

  // Clamp an out-of-range starting point (e.g. the active tab was removed)
  // so navigation still lands on a real tab.
  const safeIndex =
    currentIndex >= 0 && currentIndex < count ? currentIndex : 0;

  switch (key) {
    case "ArrowRight":
      return (safeIndex + 1) % count;
    case "ArrowLeft":
      return (safeIndex - 1 + count) % count;
    case "Home":
      return 0;
    case "End":
      return count - 1;
    default:
      return null;
  }
}
