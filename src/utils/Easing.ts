/**
 * Easing functions for smooth, natural animations.
 * All functions take a value t in [0, 1] and return a value in approximately [0, 1].
 */
export const Easing = {
  /**
   * Linear interpolation (no easing)
   */
  linear: (t: number): number => t,

  /**
   * Smooth start and end - good for general transitions
   */
  easeInOutQuad: (t: number): number =>
    t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2,

  /**
   * Smooth start - accelerates from zero
   */
  easeInQuad: (t: number): number => t * t,

  /**
   * Smooth end - decelerates to zero
   */
  easeOutQuad: (t: number): number => 1 - (1 - t) * (1 - t),

  /**
   * Cubic ease in/out - more pronounced than quad
   */
  easeInOutCubic: (t: number): number =>
    t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,

  /**
   * Quick start, slow end - good for falling
   */
  easeOutCubic: (t: number): number => 1 - Math.pow(1 - t, 3),

  /**
   * Slow start, quick end - good for anticipation
   */
  easeInCubic: (t: number): number => t * t * t,

  /**
   * Bouncy end - overshoots then settles (good for UI popups, powerup spawns)
   */
  easeOutBack: (t: number): number => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },

  /**
   * Anticipation start - pulls back before moving forward
   */
  easeInBack: (t: number): number => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return c3 * t * t * t - c1 * t * t;
  },

  /**
   * Elastic bounce - springs past target and oscillates (good for powerup creation)
   */
  easeOutElastic: (t: number): number => {
    const c4 = (2 * Math.PI) / 3;
    if (t === 0) return 0;
    if (t === 1) return 1;
    return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  },

  /**
   * Elastic start - springs from starting position
   */
  easeInElastic: (t: number): number => {
    const c4 = (2 * Math.PI) / 3;
    if (t === 0) return 0;
    if (t === 1) return 1;
    return -Math.pow(2, 10 * t - 10) * Math.sin((t * 10 - 10.75) * c4);
  },

  /**
   * Physical bounce - like a ball bouncing (good for tile falling)
   */
  easeOutBounce: (t: number): number => {
    const n1 = 7.5625;
    const d1 = 2.75;

    if (t < 1 / d1) {
      return n1 * t * t;
    } else if (t < 2 / d1) {
      return n1 * (t -= 1.5 / d1) * t + 0.75;
    } else if (t < 2.5 / d1) {
      return n1 * (t -= 2.25 / d1) * t + 0.9375;
    } else {
      return n1 * (t -= 2.625 / d1) * t + 0.984375;
    }
  },

  /**
   * Bounce start - bounces at beginning
   */
  easeInBounce: (t: number): number => {
    return 1 - Easing.easeOutBounce(1 - t);
  },

  /**
   * Exponential ease out - fast start, very slow end
   */
  easeOutExpo: (t: number): number => {
    return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
  },

  /**
   * Exponential ease in - very slow start, fast end
   */
  easeInExpo: (t: number): number => {
    return t === 0 ? 0 : Math.pow(2, 10 * t - 10);
  },

  /**
   * Sine ease - gentle, smooth motion
   */
  easeInOutSine: (t: number): number => {
    return -(Math.cos(Math.PI * t) - 1) / 2;
  },

  /**
   * Custom: Pop effect - quick overshoot and settle (good for tile clear)
   */
  pop: (t: number): number => {
    const c = 2.5;
    if (t < 0.5) {
      return 4 * t * t * t;
    }
    const t2 = (t - 0.5) * 2;
    return 0.5 + 0.5 * (1 + c * Math.pow(t2 - 1, 3) + (c - 1) * Math.pow(t2 - 1, 2));
  },

  /**
   * Custom: Squash effect - compress then expand (good for anticipation)
   */
  squash: (t: number): number => {
    if (t < 0.3) {
      // Squash down
      return 1 - (t / 0.3) * 0.2;
    } else {
      // Expand back
      const t2 = (t - 0.3) / 0.7;
      return 0.8 + 0.2 * Easing.easeOutBack(t2);
    }
  },
};

/**
 * Apply an easing function over time
 * @param easingFn The easing function to use
 * @param startValue Starting value
 * @param endValue Ending value
 * @param progress Progress from 0 to 1
 */
export function applyEasing(
  easingFn: (t: number) => number,
  startValue: number,
  endValue: number,
  progress: number
): number {
  const clampedProgress = Math.max(0, Math.min(1, progress));
  const easedProgress = easingFn(clampedProgress);
  return startValue + (endValue - startValue) * easedProgress;
}

/**
 * Animation timing recommendations for different actions
 */
export const ANIMATION_TIMING = {
  TILE_SWAP: { duration: 150, easing: 'easeInOutQuad' },
  TILE_FALL: { duration: 200, easing: 'easeOutBounce' },
  TILE_CLEAR: { duration: 100, easing: 'easeOutBack' },
  POWERUP_SPAWN: { duration: 300, easing: 'easeOutElastic' },
  UI_POPUP: { duration: 200, easing: 'easeOutBack' },
  COMBO_TEXT: { duration: 500, easing: 'easeOutQuad' },
  SCORE_POPUP: { duration: 800, easing: 'easeOutQuad' },
} as const;
