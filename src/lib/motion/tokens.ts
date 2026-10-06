/**
 * Restrained motion principles for SYLQEN.
 * Prefer CSS transitions and Tailwind duration utilities over JS animation libraries.
 * Always respect `prefers-reduced-motion`.
 */

export const motion = {
  duration: {
    fast: "120ms",
    base: "200ms",
    slow: "300ms",
  },
  easing: {
    /** Soft deceleration for overlays and panels */
    out: "cubic-bezier(0.16, 1, 0.3, 1)",
    /** Standard UI transitions */
    standard: "cubic-bezier(0.4, 0, 0.2, 1)",
  },
  /**
   * Tailwind-friendly class fragments for common interactions.
   * Pair with `motion-safe:` where reduced-motion must disable animation.
   */
  classes: {
    hoverLift: "motion-safe:transition-transform motion-safe:duration-200 motion-safe:hover:-translate-y-px",
    fadeIn: "motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200",
    overlayIn:
      "motion-safe:data-[state=open]:animate-in motion-safe:data-[state=closed]:animate-out motion-safe:data-[state=closed]:fade-out-0 motion-safe:data-[state=open]:fade-in-0",
    contentIn:
      "motion-safe:data-[state=open]:animate-in motion-safe:data-[state=closed]:animate-out motion-safe:data-[state=closed]:fade-out-0 motion-safe:data-[state=open]:fade-in-0 motion-safe:data-[state=closed]:zoom-out-95 motion-safe:data-[state=open]:zoom-in-95",
    sidebar: "motion-safe:transition-[transform,width] motion-safe:duration-300 motion-safe:ease-[cubic-bezier(0.16,1,0.3,1)]",
  },
} as const;
