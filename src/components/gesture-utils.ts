/**
 * Is a dialog, sheet or drawer currently open? MUI keeps some modals
 * mounted while closed (e.g. SwipeableDrawer) and marks them with
 * `MuiModal-hidden`, so a plain existence check would give false positives.
 */
export function openModal(): Element | null {
  return document.querySelector(".MuiModal-root:not(.MuiModal-hidden)");
}
