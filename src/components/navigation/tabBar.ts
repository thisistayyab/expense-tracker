/**
 * Shared geometry for the floating tab bar. The bar is an overlay (it does not
 * take layout space), so every screen pads its scroll content by
 * `insets.bottom + TAB_BAR_CLEARANCE` to keep the last row above the capsule.
 */
export const TAB_BAR_HEIGHT = 62;
export const TAB_BAR_BOTTOM_GAP = 6;
export const TAB_BAR_SIDE = 12;

/** Bar height, its gap to the safe area, and breathing room for content. */
export const TAB_BAR_CLEARANCE = TAB_BAR_HEIGHT + TAB_BAR_BOTTOM_GAP + 12;
